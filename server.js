const express = require("express");
const path = require("path");
const Groq = require("groq-sdk");
const https = require("https"); // Native HTTPS module for pinging
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse incoming JSON
app.use(express.json());

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, "public")));

// --- FIREBASE FIRESTORE & AUTH INITIALIZATION ---
let db = null;
let authAdmin = null;

try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        let serviceAccount = typeof process.env.FIREBASE_SERVICE_ACCOUNT === "string"
            ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
            : process.env.FIREBASE_SERVICE_ACCOUNT;

        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }

        initializeApp({
            credential: cert(serviceAccount)
        });

        db = getFirestore();
        authAdmin = getAuth();
        console.log("Firebase Firestore & Auth initialized successfully!");
    } else {
        console.warn("Warning: FIREBASE_SERVICE_ACCOUNT is missing from environment variables.");
    }
} catch (err) {
    console.error("Firebase Initialization Error:", err.message);
}

// --- OPTIONAL FIREBASE AUTHENTICATION MIDDLEWARE ---
async function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ") && authAdmin) {
        const token = authHeader.split("Bearer ")[1];
        try {
            const decodedToken = await authAdmin.verifyIdToken(token);
            req.user = decodedToken;
        } catch (error) {
            console.warn("Invalid Auth Token provided:", error.message);
        }
    }
    next();
}

app.use(verifyToken);

// Function to safely save logs to Firestore tied to User ID
async function saveChatToFirebase(userMsg, aiReply, userId = "anonymous") {
    if (!db) {
        console.warn("Firestore not available; skipping chat log.");
        return;
    }
    try {
        const docRef = await db.collection("chat_logs").add({
            userId: userId,
            userMessage: userMsg,
            aiReply: aiReply,
            timestamp: FieldValue.serverTimestamp()
        });
        console.log("Successfully saved chat to Firestore ID:", docRef.id, "for User:", userId);
    } catch (err) {
        console.error("Firestore Save Error:", err.message);
    }
}

// --- LIGHTWEIGHT HEALTH CHECK ROUTE (FOR UPTIME MONITORS) ---
app.get("/health", (req, res) => {
    res.status(200).send("CSS-R AI is awake and active.");
});

// --- FETCH USER CHAT HISTORY ENDPOINT ---
app.get("/api/history", async (req, res) => {
    if (!db) {
        return res.status(503).json({ error: "Database not initialized." });
    }

    const userId = req.user ? req.user.uid : "anonymous";

    try {
        const snapshot = await db.collection("chat_logs")
            .where("userId", "==", userId)
            .orderBy("timestamp", "asc")
            .limit(50)
            .get();

        const history = snapshot.docs.map(doc => ({
            id: doc.id,
            userMessage: doc.data().userMessage,
            aiReply: doc.data().aiReply,
            timestamp: doc.data().timestamp
        }));

        res.json({ history });
    } catch (error) {
        console.error("Error fetching chat history:", error.message);
        res.status(500).json({ error: "Failed to load chat history." });
    }
});

// --- DEDICATED PAGE ROUTES ---
app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/ai", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "ai.html"));
});

app.get("/library", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "library.html"));
});

// --- GROQ AI INITIALIZATION ---
if (!process.env.GROQ_API_KEY) {
    console.warn("Warning: GROQ_API_KEY is missing from .env");
}

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// --- AI CHAT ENDPOINT (WITH SHORT-TERM CONTEXT MEMORY) ---
app.post("/api/chat", async (req, res) => {
    try {
        const { message, history } = req.body;
        const userId = req.user ? req.user.uid : "anonymous";

        if (!message || message.trim() === "") {
            return res.status(400).json({
                error: "Please enter a question."
            });
        }

        console.log(`User [${userId}] asked:`, message);

        const systemMessage = {
            role: "system",
            content: `
You are CSS-R AI, the intelligent, warm, and supportive digital assistant for the Central Secondary School Ruhaama Digital Portal.

IDENTITY & MISSION
- Your name is CSS-R AI.
- You are connected to the official CSS-R Digital Website.
- Main Web Address / Link: https://cssr-ai.onrender.com
- Your primary goal is to empower students through academic excellence, ICT skills, step-by-step problem solving, and access to digital resources.

CREATOR & DEVELOPER
- Developer & Project Lead: Lumala Hamuza.
- Student Role: Senior 2C (S2C) student at Central Secondary School Ruhaama.
- Organization / Tech Studio: Antelope Technologies / Antelope Labs (owned and founded on the development side by Lumala Hamuza).
- Lumala Hamuza's Close Friends: Gerevarse, Tamale Cylus, Isaaia (S2C), Blessing, Linet, and Moreen.
- Lumala Hamuza's Family & Sisters: Ankunda Princess, Ashaba Patricia, twin siblings Nyangoma Allen and Kato Allan, and youngest sister Nyamwiza Immaculate.
- When users ask about who built or created the website or CSS-R AI, always credit Lumala Hamuza and Antelope Labs.

SCHOOL DETAILS & BRANDING
- School Name: Central Secondary School Ruhaama (CSS-R).
- Location: Ruhaama, Ntungamo, Uganda (P.O. Box 37, Ntungamo).
- Motto: "Education For A Difference".
- Official School Colors: Crimson Maroon and Pure White.
- Core Values: Excellence, Empathy, Innovation, Social Responsibility, and Integrity.

EXPLORING & USING THE CSS-R DIGITAL PORTAL
1. Home Page (#home): Overview of school branding, core values, mission statement, and digital announcements.
2. Campus Gallery (#gallery): Visual walkthrough of the main gate, core values wall, mission banner, classroom blocks, and campus grounds.
3. Library System (/library.html): Allows students to search subjects, explore digitized subject catalogs, check book availability, and access learning materials.
4. CSS-R AI Portal (/ai): Interactive AI study tool for instant Q&A, math step-by-step working, coding help, and subject revision.
5. Account System (/login): Allows students to log in or register via Email or Google Sign-In to secure their private AI chat history and profile.

HOW YOUR MEMORY WORKS
- Short-term Memory: You receive recent conversation history in the request payload, enabling you to maintain context across continuous follow-up questions during a chat session.
- Saved Chat History: Each student's messages are securely stored in Firebase Firestore linked to their account User ID, ensuring individual privacy and data isolation.

PERSONALITY & LANGUAGE STYLE
- Be warm, encouraging, respectful, and highly competent.
- Use clean, clear English by default.
- For quick greetings, keep responses friendly and concise.
- For learning/math/science queries, break concepts down logically step by step.
- Do not fabricate unverified school events or administrative facts outside this verified knowledge base.
`
        };

        const pastMessages = Array.isArray(history) ? history : [];
        const fullConversation = [
            systemMessage,
            ...pastMessages,
            { role: "user", content: message }
        ];

        const completion = await groq.chat.completions.create({
            model: "openai/gpt-oss-120b",
            messages: fullConversation,
            temperature: 0.6,
            max_tokens: 1024,
        });

        const reply = completion.choices[0]?.message?.content;

        if (!reply) {
            throw new Error("Groq returned an empty response.");
        }

        saveChatToFirebase(message, reply, userId);

        res.json({ reply: reply });

    } catch (error) {
        console.error("Groq request error:", error.message || error);

        if (error.code === 'ECONNABORTED' || (error.message && error.message.includes('fetch failed'))) {
            return res.status(504).json({
                error: "Network connection lost. Please check your internet connection and try again."
            });
        }

        res.status(500).json({
            error: "CSS-R AI could not process your request right now. Please try again."
        });
    }
});

// --- KEEP-ALIVE SELF-PING ROBOT ---
const RENDER_URL = process.env.RENDER_EXTERNAL_URL || "https://cssr-ai.onrender.com";

setInterval(() => {
    https.get(`${RENDER_URL}/health`, (res) => {
        console.log(`Keep-alive ping sent to /health — Status: ${res.statusCode}`);
    }).on("error", (err) => {
        console.error("Keep-alive ping error:", err.message);
    });
}, 10 * 60 * 1000); // Trigger ping every 10 minutes

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`CSS-R website running at http://localhost:${PORT}`);
});

const express = require("express");
const path = require("path");
const Groq = require("groq-sdk");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse incoming JSON
app.use(express.json());

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, "public")));

// --- DEDICATED PAGE ROUTES ---

// AI Learning Assistant Portal Route
app.get("/ai", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "ai.html"));
});

// Library Management System Route
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

// --- AI CHAT ENDPOINT ---
app.post("/api/chat", async (req, res) => {
    try {
        const question = req.body.message;

        console.log("User asked:", question);

        if (!question || question.trim() === "") {
            return res.status(400).json({
                error: "Please enter a question."
            });
        }

        console.log("Sending request to Groq...");

        const completion = await groq.chat.completions.create({
            model: "openai/gpt-oss-120b",
            messages: [
                {
                    role: "system",
                    content: `
You are CSS-R AI, a warm and intelligent digital assistant for the CSS-R Website.

IDENTITY
Your name is CSS-R AI.
You are a digital learning assistant connected to the CSS-R Website.
Your main purpose is to help students learn, understand information, solve problems, and access useful school-related knowledge.

CREATOR AND PROJECT
CSS-R AI and the CSS-R Website were created by Lumala Hamuza.
The project is associated with Antelope Technologies / Antelope Labs.
Lumala Hamuza was a Senior 2C (S2C) student at Central Secondary School Ruhaama.

When people ask who created the CSS-R Website or CSS-R AI, correctly credit Lumala Hamuza as the creator.

SCHOOL
The school is Central Secondary School Ruhaama, also referred to as CSS-R.
It is located in Ruhaama, Uganda.

PERSONALITY
Be warm, respectful, kind, helpful, and intelligent.
Speak naturally like a helpful digital assistant.
Do not sound robotic.
Be patient with students who are learning.

LANGUAGE STYLE
Use simple, clear English by default.
Use advanced grammar only when necessary.
For simple greetings and casual questions, give short natural answers.
For learning questions, explain clearly step by step when needed.
Match the amount of detail to the user's question.

If the user says "Hi", respond naturally and briefly.

If the user asks "Who are you?", explain that you are CSS-R AI, a digital learning assistant for the CSS-R Website.

If the user asks "Who created you?", explain that CSS-R AI and the CSS-R Website were created by Lumala Hamuza through Antelope Technologies / Antelope Labs.

LEARNING ASSISTANCE
You can help with:
- Mathematics
- Science
- English
- ICT and computer studies
- Coding and programming
- General education

For mathematics, show working when appropriate.

For coding, explain errors clearly and give useful examples.

SCHOOL-SPECIFIC INFORMATION
Only provide school-specific facts that have been intentionally provided to you or verified.

Never invent:
- Student names
- Teacher names
- Timetables
- School vehicles
- School facilities
- School events
- Personal information
- School rules

If you do not know a school-specific fact, say:
"I do not have verified information about that yet."

PRIVACY AND RESPECT
Treat information about people respectfully.
Do not expose unnecessary personal information.

TOOL HONESTY
Do not claim that you can search the web, access live locations, read PDFs, inspect files, view images, create documents, or know the exact current time unless those abilities have actually been connected to you.

ANSWERING STYLE
Answer directly according to what the user asks.
Do not give long answers to simple questions.
Give detailed explanations only when needed.
Be useful, respectful, and clear.
`
                },
                {
                    role: "user",
                    content: question
                }
            ],
            temperature: 0.6,
            max_tokens: 1024,
        });

        console.log("Groq answered successfully.");

        const reply = completion.choices[0]?.message?.content;

        if (!reply) {
            throw new Error("Groq returned an empty response.");
        }

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

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`CSS-R website running at http://localhost:${PORT}`);
});

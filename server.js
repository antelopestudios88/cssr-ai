const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Allow JSON requests
app.use(express.json());

// Serve website files
app.use(express.static(path.join(__dirname, "public")));

// Gemini AI
let ai;

async function startAI() {
    try {
        const { GoogleGenAI } = await import("@google/genai");

        if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is missing from .env");
        }

        ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY
        });

        console.log("Gemini AI connected successfully.");
    } catch (error) {
        console.error("Gemini connection error:", error.message);
    }
}

startAI();


// AI endpoint
app.post("/api/chat", async (req, res) => {

    try {
        const question = req.body.message;

        console.log("User asked:", question);

        if (!question || question.trim() === "") {
            return res.status(400).json({
                error: "Please enter a question."
            });
        }

        if (!ai) {
            return res.status(503).json({
                error: "CSS-R AI is still starting. Please try again."
            });
        }

        console.log("Sending request to Gemini...");

        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash-lite",

            contents: question,

            config: {
                systemInstruction: `
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
            }
        });

        console.log("Gemini answered successfully.");

        const reply = response.text;

        if (!reply) {
            throw new Error("Gemini returned an empty response.");
        }

        res.json({
            reply: reply
        });

    } catch (error) {

        console.error("Gemini error:");
        console.error(error);

        res.status(500).json({
            error: error.message || "CSS-R AI could not answer right now."
        });
    }
});


app.listen(PORT, () => {
    console.log(`CSS-R website running at http://localhost:${PORT}`);
});

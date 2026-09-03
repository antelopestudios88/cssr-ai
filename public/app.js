function toggleMenu() {
    const nav = document.getElementById("navLinks");
    nav.classList.toggle("show");
}

let isThinking = false;

async function sendMessage() {
    const input = document.getElementById("userInput");
    const messages = document.getElementById("chatMessages");

    // Don't allow another request while AI is thinking
    if (isThinking) {
        return;
    }

    const question = input.value.trim();

    if (question === "") {
        return;
    }

    isThinking = true;
    input.disabled = true;

    // Show student's message
    const userMessage = document.createElement("div");
    userMessage.className = "message user-message";

    userMessage.innerHTML = `
        <strong>You</strong>
        <p>${question}</p>
    `;

    messages.appendChild(userMessage);

    input.value = "";
    messages.scrollTop = messages.scrollHeight;

    // Show thinking message with rotating diamond
    const aiMessage = document.createElement("div");
    aiMessage.className = "message ai-message";

    aiMessage.innerHTML = `
        <strong>CSS-R AI</strong>
        <div class="ai-thinking">
            <img src="/ai-diamond.png" class="ai-diamond" alt="CSS-R AI">
            <span>Thinking...</span>
        </div>
    `;

    messages.appendChild(aiMessage);
    messages.scrollTop = messages.scrollHeight;

    // Wait up to 60 seconds before stopping the browser request
    const controller = new AbortController();

    const timeout = setTimeout(() => {
        controller.abort();
    }, 60000);

    try {
        const response = await fetch("/api/chat", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                message: question
            }),

            signal: controller.signal
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "AI request failed");
        }

        // Display AI answer
        aiMessage.innerHTML = `
            <strong>CSS-R AI</strong>
            <p>${data.reply || "Sorry, I couldn't generate an answer."}</p>
        `;

    } catch (error) {
        console.error("AI error:", error);

        if (error.name === "AbortError") {
            aiMessage.innerHTML = `
                <strong>CSS-R AI</strong>
                <p>
                    ⏱️ The AI is taking longer than expected.
                    Please try again.
                </p>
            `;
        } else {
            aiMessage.innerHTML = `
                <strong>CSS-R AI</strong>
                <p>
                    ❌ Sorry, I couldn't connect to the AI.
                    <br><br>
                    ${error.message}
                </p>
            `;
        }

    } finally {
        // Always clean up
        clearTimeout(timeout);

        isThinking = false;
        input.disabled = false;
        input.focus();

        messages.scrollTop = messages.scrollHeight;
    }
}


// Allow Enter key to send
document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("userInput");

    if (input) {
        input.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                sendMessage();
            }
        });
    }
});

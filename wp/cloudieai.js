document.addEventListener('DOMContentLoaded', () => {
console.log("DOM fully loaded for chat script.");

const API_ENDPOINT = "https://cloudieai.app.n8n.cloud/webhook/b76d02c0-b406-4d21-b6bf-8ad2c623def3/chat";
const HISTORY_KEY = "chatHistory";
const HISTORY_EXPIRATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Load chat history from localStorage if it's within 7 days.
function loadChatHistory() {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (!stored) return [];
    try {
    const parsed = JSON.parse(stored);
    if (Date.now() - parsed.timestamp > HISTORY_EXPIRATION) {
        localStorage.removeItem(HISTORY_KEY);
        return [];
    }
    return parsed.messages;
    } catch (error) {
    console.error("Error parsing chat history:", error);
    localStorage.removeItem(HISTORY_KEY);
    return [];
    }
}

// Save chat history to localStorage with current timestamp.
function saveChatHistory(messages) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify({
    timestamp: Date.now(),
    messages: messages
    }));
}

// Append a message bubble to the chat log and update localStorage.
// Each message bubble is wrapped in a div with class "chat-text".
// User messages receive the "user-text" class and bot messages receive the "cloudie-text" class.
function appendMessage(sender, text) {
    const chatLog = document.getElementById('chat-log');
    if (!chatLog) return;
    
    // Create wrapper for the message.
    const wrapper = document.createElement('div');
    wrapper.classList.add("chat-text");
    
    // Create the actual message bubble.
    const bubble = document.createElement('div');
    bubble.style.textAlign = sender === "user" ? 'right' : 'left';
    bubble.style.margin = '10px';
    bubble.textContent = text;
    if (sender === "user") {
    bubble.classList.add("user-text");
    } else {
    bubble.classList.add("cloudie-text");
    }
    
    // Append the bubble into the wrapper and then into the chat log.
    wrapper.appendChild(bubble);
    chatLog.appendChild(wrapper);
    chatLog.scrollTop = chatLog.scrollHeight;
    
    // Update stored history.
    let history = loadChatHistory();
    history.push({ sender, text });
    saveChatHistory(history);
}

// Function to initialize chat event listeners, load history, and attach the expandChat icon listener.
function initChat() {
    const chatContainer = document.getElementById('chat-container');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatLog = document.getElementById('chat-log');
    const sendButton = document.getElementById('send-button');

    if (!chatContainer || !chatForm || !chatInput || !chatLog || !sendButton) {
    console.error("Missing one or more chat elements:", { chatContainer, chatForm, chatInput, chatLog, sendButton });
    return;
    }

    // Load and display conversation history.
    const history = loadChatHistory();
    if (history.length > 0) {
    console.log("Loading chat history:", history);
    // Clear current log.
    chatLog.innerHTML = "";
    history.forEach(msg => {
        // Create wrapper for each message.
        const wrapper = document.createElement('div');
        wrapper.classList.add("chat-text");
        const bubble = document.createElement('div');
        bubble.style.textAlign = msg.sender === "user" ? 'right' : 'left';
        bubble.style.margin = '10px';
        bubble.textContent = msg.text;
        if (msg.sender === "user") {
        bubble.classList.add("user-text");
        } else {
        bubble.classList.add("cloudie-text");
        }
        wrapper.appendChild(bubble);
        chatLog.appendChild(wrapper);
    });
    chatLog.scrollTop = chatLog.scrollHeight;
    }

    // If listeners have already been attached, skip.
    if (chatForm.dataset.listenersAttached === "true") {
    console.log("Chat listeners already attached.");
    } else {
    console.log("Attaching chat event listeners.");
    chatForm.dataset.listenersAttached = "true";

    async function sendMessage() {
        const userMessage = chatInput.value.trim();
        console.log("sendMessage called, userMessage:", userMessage);
        if (!userMessage) return;

        appendMessage("user", userMessage);
        chatInput.value = '';

        // Add a typing indicator with the "think-text" class.
        const typingIndicator = document.createElement('div');
        typingIndicator.style.textAlign = 'left';
        typingIndicator.style.margin = '10px';
        typingIndicator.textContent = "Cloudie is thinking...";
        typingIndicator.classList.add("think-text");
        chatLog.appendChild(typingIndicator);
        chatLog.scrollTop = chatLog.scrollHeight;

        try {
        console.log("Sending fetch request to API:", API_ENDPOINT);
        const res = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Use key "chatInput" per n8n chat configuration.
            body: JSON.stringify({ chatInput: userMessage })
        });
        console.log("Fetch request complete, status:", res.status);
        let data;
        try {
            data = await res.json();
        } catch (parseError) {
            console.error("Error parsing JSON response:", parseError);
            data = { response: "Sorry, there was a problem understanding the response." };
        }
        console.log("Received data:", data);
        typingIndicator.remove();
        if (data.response) {
            appendMessage("bot", data.response);
        } else if (data.output) {
            appendMessage("bot", data.output);
        } else {
            console.error("No response field in the data:", data);
            appendMessage("bot", "Sorry, no response received from Cloudie.");
        }
        } catch (error) {
        console.error("Error in sendMessage:", error);
        typingIndicator.remove();
        appendMessage("bot", "Sorry, something went wrong.");
        }
    }

    sendButton.addEventListener('click', async (e) => {
        console.log("Send button clicked.");
        e.preventDefault();
        await sendMessage();
    });
    chatForm.addEventListener('submit', async (e) => {
        console.log("Chat form submitted via Enter key.");
        e.preventDefault();
        await sendMessage();
    });
    }

    // Attach the expandChat icon toggle listener.
    const expandChatIcon = document.getElementById('expandChat');
    if (expandChatIcon) {
    expandChatIcon.removeEventListener('click', toggleChatFull);
    expandChatIcon.addEventListener('click', toggleChatFull);
    console.log("Expand chat icon listener attached.");
    } else {
    console.error("Expand Chat icon with id 'expandChat' not found.");
    }
}

// Toggle function to add/remove the "chat-full" class on the body.
function toggleChatFull() {
    document.body.classList.toggle('chat-full');
    if (document.body.classList.contains('chat-full')) {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    } else {
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    }
    console.log("Toggled chat-full class on body. Overflow settings updated.");
}

// Attach event listeners for the dialog-close-button to remove "chat-full" class.
function attachDialogCloseListeners() {
    const closeButtons = document.querySelectorAll('.dialog-close-button');
    if (closeButtons.length > 0) {
    closeButtons.forEach(button => {
        button.removeEventListener('click', dialogCloseHandler);
        button.addEventListener('click', dialogCloseHandler);
    });
    console.log("Dialog close button listeners attached.");
    } else {
    console.error("No elements with class 'dialog-close-button' found.");
    }
}

// Handler for dialog-close-button clicks.
function dialogCloseHandler() {
    document.body.classList.remove('chat-full');
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    console.log("Dialog close button clicked. Removed chat-full class from body.");
}

// Use MutationObserver to monitor when the chat container is inserted and visible.
const observer = new MutationObserver((mutations, obs) => {
    const chatContainer = document.getElementById('chat-container');
    if (chatContainer && chatContainer.offsetParent !== null) {
    const chatForm = document.getElementById('chat-form');
    if (chatForm && chatForm.dataset.listenersAttached !== "true") {
        console.log("Chat container is visible. Initializing chat functionality.");
        initChat();
        attachDialogCloseListeners();
    }
    }
});
observer.observe(document.body, { childList: true, subtree: true });
});
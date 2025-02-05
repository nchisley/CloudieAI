document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM fully loaded for chat script.");

  const API_ENDPOINT = "https://cloudieai-production.up.railway.app/api/chat";
  const HISTORY_KEY = "chatHistory";
  const HISTORY_EXPIRATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  // If you want a week instead, change to: 7 * 24 * 60 * 60 * 1000

  // -------------------
  // Chat History Functions
  // -------------------
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

  function saveChatHistory(messages) {
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        messages: messages
      })
    );
  }

  function appendMessage(sender, text) {
    const chatLog = document.getElementById("chat-log");
    if (!chatLog) return;
    const bubble = document.createElement("div");
    bubble.style.textAlign = sender === "user" ? "right" : "left";
    bubble.style.margin = "10px";
    bubble.textContent = text;
    chatLog.appendChild(bubble);
    chatLog.scrollTop = chatLog.scrollHeight;
    // Update stored history.
    let history = loadChatHistory();
    history.push({ sender: sender, text: text });
    saveChatHistory(history);
  }

  // -------------------
  // Chat Initialization
  // -------------------
  function initChat() {
    const chatForm = document.getElementById("chat-form");
    const chatInput = document.getElementById("chat-input");
    const chatLog = document.getElementById("chat-log");
    const sendButton = document.getElementById("send-button");

    if (!chatForm || !chatInput || !chatLog || !sendButton) {
      console.error("Missing one or more chat elements:", { chatForm, chatInput, chatLog, sendButton });
      return;
    }

    // Load and display conversation history.
    const history = loadChatHistory();
    if (history.length > 0) {
      console.log("Loading chat history:", history);
      chatLog.innerHTML = ""; // Clear existing log to prevent duplicates.
      history.forEach(msg => {
        const bubble = document.createElement("div");
        bubble.style.textAlign = msg.sender === "user" ? "right" : "left";
        bubble.style.margin = "10px";
        bubble.textContent = msg.text;
        chatLog.appendChild(bubble);
      });
      chatLog.scrollTop = chatLog.scrollHeight;
    }

    // Prevent duplicate event listeners.
    if (chatForm.dataset.listenersAttached === "true") {
      console.log("Chat listeners already attached.");
      return;
    }
    console.log("Attaching chat event listeners.");
    chatForm.dataset.listenersAttached = "true";

    async function sendMessage() {
      const userMessage = chatInput.value.trim();
      console.log("sendMessage called, userMessage:", userMessage);
      if (!userMessage) return;
      appendMessage("user", userMessage);
      chatInput.value = "";

      // Insert typing indicator.
      const typingBubble = document.createElement("div");
      typingBubble.style.textAlign = "left";
      typingBubble.style.margin = "10px";
      typingBubble.textContent = "Cloudie is typing...";
      chatLog.appendChild(typingBubble);
      chatLog.scrollTop = chatLog.scrollHeight;

      try {
        console.log("Sending fetch request to API:", API_ENDPOINT);
        const res = await fetch(API_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: userMessage })
        });
        console.log("Fetch request complete, status:", res.status);
        const data = await res.json();
        console.log("Received data:", data);
        if (chatLog.contains(typingBubble)) {
          chatLog.removeChild(typingBubble);
        }
        appendMessage("bot", data.response);
      } catch (error) {
        console.error("Error in sendMessage:", error);
        if (chatLog.contains(typingBubble)) {
          chatLog.removeChild(typingBubble);
        }
        appendMessage("bot", "Sorry, something went wrong.");
      }
    }

    sendButton.addEventListener("click", async (e) => {
      console.log("Send button clicked.");
      e.preventDefault();
      await sendMessage();
    });

    chatForm.addEventListener("submit", async (e) => {
      console.log("Chat form submitted via Enter key.");
      e.preventDefault();
      await sendMessage();
    });
  }

  // -------------------
  // MutationObserver for Popup
  // -------------------
  const observer = new MutationObserver((mutations, obs) => {
    const chatContainer = document.getElementById("chat-container");
    // Check if the chat container exists and is visible.
    if (chatContainer && chatContainer.offsetParent !== null) {
      console.log("Chat container is visible. Initializing chat functionality.");
      const chatForm = document.getElementById("chat-form");
      if (chatForm && chatForm.dataset.listenersAttached !== "true") {
        initChat();
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
});

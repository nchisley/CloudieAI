document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM fully loaded for chat script.");

  // Check if URL has the fullscreen parameter.
  let forceFullScreen = window.location.search.includes('fullscreen=1');
  
  // CloudieAI
  const API_ENDPOINT = "https://cloudieai.app.n8n.cloud/webhook/b76d02c0-b406-4d21-b6bf-8ad2c623def3/chat";
  const HISTORY_KEY = "chatHistory";
  const HISTORY_EXPIRATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  // Function to add target="_blank" to any <a> tags.
  function addTargetToLinks(text) {
    return text.replace(/<a\s+(?!.*?target=["']_blank["'])([^>]+)>/gi, '<a $1 target="_blank">');
  }

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
  // User messages receive the "user-text" class and bot messages receive the "agent-text" class.
  function appendMessage(sender, text) {
    const chatLog = document.getElementById('chat-log');
    if (!chatLog) return;
    
    const wrapper = document.createElement('div');
    wrapper.classList.add("chat-text");
    
    const bubble = document.createElement('div');
    bubble.style.textAlign = sender === "user" ? 'right' : 'left';
    bubble.style.margin = '0';
    
    let formattedText = text.replace(/\*\*/g, '').replace(/(\r\n|\r|\n)/gm, '<br>');
    formattedText = addTargetToLinks(formattedText);
    bubble.innerHTML = formattedText;
    
    if (sender === "user") {
      bubble.classList.add("user-text");
    } else {
      bubble.classList.add("agent-text");
    }
    
    wrapper.appendChild(bubble);
    chatLog.appendChild(wrapper);
    chatLog.scrollTop = chatLog.scrollHeight;
    
    let history = loadChatHistory();
    history.push({ sender, text });
    saveChatHistory(history);
  }

  // Function to initialize chat event listeners, load history, etc.
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

    const history = loadChatHistory();
    if (history.length > 0) {
      console.log("Loading chat history:", history);
      chatLog.innerHTML = "";
      history.forEach(msg => {
        const wrapper = document.createElement('div');
        wrapper.classList.add("chat-text");
        const bubble = document.createElement('div');
        bubble.style.textAlign = msg.sender === "user" ? 'right' : 'left';
        bubble.style.margin = '0';
        let formattedText = msg.text.replace(/\*\*/g, '').replace(/(\r\n|\r|\n)/gm, '<br>');
        formattedText = addTargetToLinks(formattedText);
        bubble.innerHTML = formattedText;
        if (msg.sender === "user") {
          bubble.classList.add("user-text");
        } else {
          bubble.classList.add("agent-text");
        }
        wrapper.appendChild(bubble);
        chatLog.appendChild(wrapper);
      });
      chatLog.scrollTop = chatLog.scrollHeight;
    }

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

        const typingIndicator = document.createElement('div');
        typingIndicator.style.textAlign = 'left';
        typingIndicator.style.margin = '0';
        typingIndicator.textContent = "Cloudie is thinking...";
        typingIndicator.classList.add("think-text");
        chatLog.appendChild(typingIndicator);
        chatLog.scrollTop = chatLog.scrollHeight;

        try {
          console.log("Sending fetch request to API:", API_ENDPOINT);
          const res = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
            appendMessage("bot", "Sorry, no response received from Synthia.");
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

    const expandChatIcon = document.getElementById('expandChat');
    if (expandChatIcon) {
      expandChatIcon.removeEventListener('click', toggleChatFull);
      expandChatIcon.addEventListener('click', toggleChatFull);
      console.log("Expand chat icon listener attached.");
    } else {
      console.error("Expand Chat icon with id 'expandChat' not found.");
    }
  }

  // Function to save the chat history to a text file and prompt the native save dialog.
  function saveChatToFile() {
    const chatLog = document.getElementById('chat-log');
    if (!chatLog) return;
    
    const now = new Date();
    const month = ('0' + (now.getMonth() + 1)).slice(-2);
    const day = ('0' + now.getDate()).slice(-2);
    const year = now.getFullYear();
    const dateStr = month + day + year;
    
    const hours = ('0' + now.getHours()).slice(-2);
    const minutes = ('0' + now.getMinutes()).slice(-2);
    const seconds = ('0' + now.getSeconds()).slice(-2);
    const timeStr = hours + minutes + seconds;
    
    const header = 
`Synthia Chat Transcript
Date: ${month}/${day}/${year}
Time: ${now.toTimeString().split(' ')[0]}
Session ID: ${dateStr}-${timeStr}
Disclaimer: Informational only. Not legal advice.
Privacy: Data processed as per our Privacy Policy.
Confidential: Content is confidential and non-binding.
Terms: Use implies acceptance of our Terms & Conditions.
Copyright: All rights reserved.

`;
    
    let text = header;
    document.querySelectorAll('#chat-log .chat-text').forEach(wrapper => {
      const bubble = wrapper.querySelector('div');
      if (bubble) {
        let senderTag = bubble.classList.contains('user-text') ? "User: " : "Synthia: ";
        text += senderTag + bubble.innerText + "\n\n";
      }
    });
    const blob = new Blob([text], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const fileName = `synthia-chat-${dateStr}-${timeStr}.txt`;
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  // MutationObserver to attach listener when "save-chat" element appears.
  function observeSaveChatButton() {
    const observer = new MutationObserver((mutations, obs) => {
      const saveChatButton = document.getElementById('save-chat');
      if (saveChatButton) {
        saveChatButton.addEventListener('click', (e) => {
          e.preventDefault();
          saveChatToFile();
        });
        console.log("Save Chat button listener attached via MutationObserver.");
        obs.disconnect(); // Stop observing once attached.
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
  observeSaveChatButton();

  function toggleChatFull(e) {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
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

  function forceOpenChatFull() {
    if (!document.body.classList.contains('chat-full')) {
      toggleChatFull();
    }
    console.log("Chat forced to full screen mode.");
  }

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

  function dialogCloseHandler() {
    document.body.classList.remove('chat-full');
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    console.log("Dialog close button clicked. Removed chat-full class from body.");
  }

  const observer = new MutationObserver((mutations, obs) => {
    const chatContainer = document.getElementById('chat-container');
    if (chatContainer && chatContainer.offsetParent !== null) {
      const chatForm = document.getElementById('chat-form');
      if (chatForm && chatForm.dataset.listenersAttached !== "true") {
        console.log("Chat container is visible. Initializing chat functionality.");
        initChat();
        attachDialogCloseListeners();
        if (forceFullScreen) {
          forceOpenChatFull();
          forceFullScreen = false;
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
});
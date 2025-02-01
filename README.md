# 🌥️ Cloudie - Keeper of Guiding Winds

Cloudie is a **friendly and knowledgeable AI assistant** designed to make **blockchain, staking, and Liquid Staking Tokens (LSTs)** easy to understand.  
Built with a focus on the **Solana ecosystem**, Cloudie uses **nature-based analogies** to simplify complex topics, making learning intuitive and engaging.  

---

## 🌟 Features
✅ **AI-Powered Responses** – Uses OpenAI's GPT-4o to generate meaningful conversations.  
✅ **Blockchain & LST Knowledge** – Specializes in **staking, LSTs, and Solana ecosystem topics**.  
✅ **Nature-Based Analogies** – Explains blockchain concepts using comparisons to trees, rivers, and ecosystems.  
✅ **Memory & Context Awareness** – Remembers past conversations to provide relevant responses.  
✅ **Easter Eggs** – Fun, hidden messages and responses for community engagement.  
✅ **Database Storage** – Uses PostgreSQL to store past interactions and user metadata, improving context and scalability.  

---

## 🔧 Built With
- **Node.js** – The backbone of CloudieAI.  
- **Discord.js** – For handling interactions with users in Discord servers.  
- **OpenAI API** – For generating AI-powered responses.  
- ~~**SQLite** – To store user interactions and improve contextual awareness.~~
- **dotenv** – For managing environment variables securely.
- **PostgreSQL** – To store conversation data and manage user information, replacing SQLite and enhancing scalability.  

---

## ⚙️ How CloudieAI Works
- Handles Messages: Listens for user messages in specified Discord channels.
- Checks Knowledge Base: Looks for predefined answers in knowledge.json.
- Uses AI for New Questions: If no answer is found, queries GPT-4o via OpenAI API.
- Remembers Conversations: Stores interactions in PostgreSQL for context-aware responses and leverages a users table for enriched metadata.

---

## 🎯 Future Development
- 🌍 Multi-Platform Expansion – Bring Cloudie to Telegram, Web, and more.
- ~~🤖 Enhanced AI Memory – Improve contextual awareness beyond SQLite.~~
- 📚 Expanded Knowledge Base – Continuously update knowledge.json with more insights.

---

## 🤝 Contributing
Want to help make Cloudie even better? Contributions are welcome!

1. Fork this repo
2. Create a new branch (feature/my-update)
3. Commit changes (git commit -m "Added new feature")
4. Push to branch & open a PR

---

## 💙 Support & Contact
For questions or feedback, reach out via TG (n8tr0nc). Let's build something awesome together! 🚀

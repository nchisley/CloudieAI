# 🌥️ Cloudie - Keeper of Guiding Winds

Cloudie is a **friendly and knowledgeable AI assistant** designed to make **blockchain, staking, and Liquid Staking Tokens (LSTs)** easy to understand.  
Built with a focus on the **Solana ecosystem**, Cloudie uses **nature-based analogies** to simplify complex topics, making learning intuitive and engaging.

---

## 🌟 Features
- ✅ **AI-Powered Responses** – Uses OpenAI's GPT-4o to generate meaningful, dynamic conversations.  
- ✅ **Blockchain & LST Knowledge** – Specializes in **staking, LSTs, and Solana ecosystem topics**.  
- ✅ **Nature-Based Analogies** – Explains blockchain concepts using comparisons to trees, rivers, and ecosystems.  
- ✅ **Memory & Context Awareness** – Remembers past conversations to provide relevant responses.  
- ✅ **Easter Eggs** – Fun, hidden messages and responses for community engagement.  
- ✅ **Dynamic Training** – Allows training with optional "details" so Cloudie can generate unique explanations rather than repeating fixed responses.  
- ✅ **Database Storage** – Uses PostgreSQL to store past interactions and user metadata, replacing SQLite and enhancing scalability.

---

## 🔧 Built With
- **Node.js** – The backbone of CloudieAI.  
- **Discord.js** – For handling interactions with users in Discord servers.  
- **OpenAI API** – For generating AI-powered responses and dynamic explanations.  
- ~~**SQLite** – To store user interactions and improve contextual awareness.~~  
- **dotenv** – For managing environment variables securely.  
- **PostgreSQL** – To store conversation data and manage user information, replacing SQLite and enhancing scalability.  
- **Railway** – For hosting and deploying Cloudie efficiently. [Start using Railway here >](https://railway.app/?referralCode=3G_cuV)

---

## ⚙️ How CloudieAI Works
- **Handles Messages:** Listens for user messages in specified Discord channels.  
- **Checks Knowledge Base:** Looks for predefined training entries in the database; if a keyword is detected and has associated "details," Cloudie uses it to generate a dynamic explanation via OpenAI.  
- **Uses AI for New Questions:** If no answer is found in the training data, queries GPT-4o via the OpenAI API to generate responses.  
- **Remembers Conversations:** Stores interactions in PostgreSQL for context-aware responses and leverages a dedicated users table for enriched metadata.

---

## 🎯 Future Development
- Multi-Platform Expansion – Bring Cloudie to Telegram, Web, and more.  
- ~~Enhanced AI Memory – Improve contextual awareness beyond SQLite.~~  
- Expanded Knowledge Base – Continuously update the training data with more insights and dynamic explanation prompts.  
- Add User-Specific Responses – Update database and commands to support responses tailored to specific users.
- Integrate Google API – Enhance Cloudie's capabilities by incorporating the Google API for advanced web search and data retrieval.


---

## 🤝 Contributing
Want to help make Cloudie even better? Contributions are welcome!

1. Fork this repo  
2. Create a new branch (feature/my-update)  
3. Commit changes (`git commit -m "Added new feature"`)  
4. Push to branch & open a PR  

---

## 💙 Support & Contact
For questions or feedback, reach out via TG (n8tr0nc). Let's build something awesome together! 🚀

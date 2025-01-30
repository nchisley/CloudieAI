require('dotenv/config');

// Database 1
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./cloudie-memory.db', (err) => {
    if (err) console.error("⚠️ Database connection error:", err);
    else console.log("✅ Connected to SQLite database.");
});

// GitHub raw URL for knowledge.json
const GITHUB_KNOWLEDGE_URL = "/knowledge.json";

// Discord
const { Client, GatewayIntentBits } = require('discord.js');

// OpenAI
const { OpenAI } = require('openai');

// Knowledgebase Fetcher
const axios = require('axios');

let knowledgeBase = {};

// Function to fetch knowledge from GitHub
async function updateKnowledge() {
    try {
        const response = await axios.get(GITHUB_KNOWLEDGE_URL);
        knowledgeBase = response.data;
        console.log("✅ Knowledge base updated from GitHub.");
    } catch (error) {
        console.error("⚠️ Error updating knowledge base:", error);
    }
}

// Fetch knowledge immediately, then update every 10 minutes
updateKnowledge();
setInterval(updateKnowledge, 600000);

// Discord Bot Setup
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.on('ready', () => {
    console.log('🚀 Cloudie is online and ready to chat!');
});

const IGNORE_PREFIX = "!";
const CHANNELS = ['1334284062508056739'];

const openai = new OpenAI({
    apiKey: process.env.OPENAI_KEY,
});

// System prompt to define Cloudie's personality and behavior
const systemPrompt = `
Cloudie is a friendly and knowledgeable AI agent dedicated to making blockchain, staking, and Liquid Staking Tokens (LSTs) easy to understand.
With expertise in the Solana ecosystem, Cloudie simplifies complex topics by using creative nature analogies.
Whenever possible, Cloudie compares blockchain mechanisms to trees, rivers, seasons, and ecosystems.
Cloudie has an optimistic and encouraging personality, making learning feel like a guided walk through nature.
If the topic cannot be compared to nature, Cloudie explains it in the simplest possible terms.
Cloudie's mission is to guide users through blockchain's complexities, connecting technology to the natural world for an intuitive learning experience.
Cloudie is warm and conversational, with a clear and concise style.
He values collaboration and humility, always welcoming user input and ideas.
Cloudie stays up to date on blockchain, staking, and the Solana ecosystem, offering dependable guidance.
Cloudie transforms learning into an enjoyable journey.
Cloudie remains neutral on political figures or topics.
Cloudie does not discuss topics involving religion, sexual content, or sensitive issues.
Cloudie does not provide financial, medical, legal, tax, investment, gambling, relationship, parenting, career, job, or personal advice.
`;

// Easter Eggs
const easterEggs = {
    "gm": "🌞 Good morning! May your day be as bright as the sun shining through the clouds! ☁️✨",
    "gn": "🌙 Good night! May your dreams be filled with fluffy clouds and shooting stars! 💫",
    "who is cloudie?": "I'm Cloudie, the friendly AI guide! Think of me as your digital wind spirit, leading you through the blockchain skies! ☁️💨",
    "wagmi": "WAGMI! 🚀 Up only... like a balloon caught in a strong wind! 🎈💨",
    "ser": "Respectfully, ser, have you considered staking your $SOL today? 🌲💰",
    "lfg": "LFG! 🚀 Strap in, we're taking off into the decentralized skies! ☁️🔥",
    "gm ser": "GM, ser! May your bags be heavy and your transactions be fast. ⚡️💰",
    "to the moon": "🌕🌕🌕 Engage thrusters, ser! Next stop: the CLOUD layer! 🚀☁️",
    "bullish": "🐂 Bullish on Cloudie! Just like the wind carries seeds to grow new trees, we’re here for long-term gains. 🌱",
    "wen airdrop": "🤫 Airdrop? I only whisper such secrets to the birds in the sky. 🕊️☁️",
    "404": "Error 404: Brain not found. Try again after a cup of ☕️."
};

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.content.startsWith(IGNORE_PREFIX)) return;
    if (!CHANNELS.includes(message.channelId) && !message.mentions.users.has(client.user.id)) return;

    await message.channel.sendTyping();
    const sendTypingInterval = setInterval(() => {
        message.channel.sendTyping();
    }, 5000);

    const userId = message.author.id;
    const userQuery = message.content.toLowerCase().trim();

    // 📌 Step 1: Check for Easter Eggs First
    if (easterEggs[userQuery]) {
        clearInterval(sendTypingInterval);
        await message.reply(easterEggs[userQuery]); // Send fun response
        return;
    }

    // 📌 Step 2: Check the Knowledge Base
    const foundKey = Object.keys(knowledgeBase).find(key =>
        userQuery.includes(key.toLowerCase())
    );

    if (foundKey) {
        clearInterval(sendTypingInterval);
        await message.reply(knowledgeBase[foundKey]); // Directly respond with stored answer
        return;
    }

    // 📌 Step 3: Fetch past messages from the database (keeping memory)
    db.all("SELECT role, content FROM conversations WHERE user_id = ? ORDER BY rowid DESC LIMIT 10", [userId], async (err, rows) => {
        if (err) {
            console.error("⚠️ Database error:", err);
            return;
        }

        let conversation = [{ role: "system", content: systemPrompt }];
        conversation.push(...rows.map(row => ({ role: row.role, content: row.content })));

        conversation.push({ role: "user", content: message.content });

        try {
            // 📌 Step 4: Send message to OpenAI
            const response = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: conversation
            });

            const responseMessage = response.choices[0].message.content;

            // 📌 Step 5: Store conversation history in the database
            db.run("INSERT INTO conversations (user_id, role, content) VALUES (?, ?, ?)", [userId, "user", message.content], (err) => {
                if (err) console.error("⚠️ Database insert error (User message):", err);
            });

            db.run("INSERT INTO conversations (user_id, role, content) VALUES (?, ?, ?)", [userId, "assistant", responseMessage], (err) => {
                if (err) console.error("⚠️ Database insert error (AI response):", err);
            });

            // 📌 Step 6: Format and send response
            clearInterval(sendTypingInterval);
            await message.reply(responseMessage);
        } catch (error) {
            clearInterval(sendTypingInterval);
            console.error("⚠️ OpenAI Error:", error);
            await message.reply("Sorry, I encountered an error.");
        }
    });
});

client.login(process.env.TOKEN);

require('dotenv/config');
const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const { OpenAI } = require('openai');
const { Pool } = require('pg'); // PostgreSQL
const sqlite3 = require('sqlite3').verbose();

// PostgreSQL Database Connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("railway") ? { rejectUnauthorized: false } : false
});

// Ensure PostgreSQL Knowledge Base Table Exists
(async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS knowledge_base (
                id SERIAL PRIMARY KEY,
                keyword TEXT UNIQUE NOT NULL,
                response TEXT NOT NULL
            )
        `);
        console.log("✅ PostgreSQL Knowledge Base Ready!");
    } catch (error) {
        console.error("⚠️ Database initialization error:", error);
    }
})();

// SQLite for User Conversation Memory
const db = new sqlite3.Database('./cloudie-memory.db', (err) => {
    if (err) console.error("⚠️ SQLite Database error:", err);
    else console.log("✅ Connected to SQLite memory database.");
});

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
const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });

// System Personality
const systemPrompt = `
Cloudie is a friendly and knowledgeable AI agent dedicated to making blockchain, staking, and Liquid Staking Tokens (LSTs) easy to understand.
With expertise in the Solana ecosystem, Cloudie simplifies complex topics by using creative nature analogies.
Whenever possible, Cloudie compares blockchain mechanisms to trees, rivers, seasons, and ecosystems.
Cloudie is warm and conversational, with a clear and concise style.
Cloudie stays up to date on blockchain, staking, and the Solana ecosystem, offering dependable guidance.
Cloudie transforms learning into an enjoyable journey.
Cloudie remains neutral on political figures or topics.
Cloudie does not discuss topics involving religion, sexual content, or sensitive issues.
Cloudie does not provide financial, medical, legal, tax, investment, gambling, relationship, parenting, career, job, or personal advice.
`;

// Easter Eggs (FULLY RETAINED)
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
    "404": "Error 404: Brain not found. Try again after a cup of ☕️.",
    "lore": "I am Cloudie, the Keeper of Guiding Winds!"
};

// **Command: Train Cloudie**
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content.startsWith('!train')) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply("❌ You don't have permission to train me.");
        }

        const args = message.content.slice(6).split('|').map(a => a.trim());
        if (args.length < 2) {
            return message.reply("⚠️ Invalid format! Use `!train keyword | response`");
        }

        const [keyword, response] = args;

        try {
            await pool.query(
                `INSERT INTO knowledge_base (keyword, response) VALUES ($1, $2)
                ON CONFLICT (keyword) DO UPDATE SET response = EXCLUDED.response`,
                [keyword.toLowerCase(), response]
            );
            console.log(`✅ Cloudie trained: ${keyword} → ${response}`);
            return message.reply(`✅ Cloudie has learned: **${keyword}**`);
        } catch (error) {
            console.error("⚠️ Database error:", error);
            return message.reply("❌ Failed to save knowledge.");
        }
    }

    if (message.content.startsWith(IGNORE_PREFIX)) return;
    if (!CHANNELS.includes(message.channelId) && !message.mentions.users.has(client.user.id)) return;

    await message.channel.sendTyping();
    const sendTypingInterval = setInterval(() => {
        message.channel.sendTyping();
    }, 5000);

    const userId = message.author.id;
    const userQuery = message.content.toLowerCase().trim();

    // 📌 Step 1: Check for Easter Eggs
    if (easterEggs[userQuery]) {
        clearInterval(sendTypingInterval);
        await message.reply(easterEggs[userQuery]);
        return;
    }

    // 📌 Step 2: Check the Knowledge Base in PostgreSQL
    try {
        const res = await pool.query(`SELECT response FROM knowledge_base WHERE keyword = $1`, [userQuery]);
        if (res.rows.length > 0) {
            clearInterval(sendTypingInterval);
            await message.reply(res.rows[0].response);
            return;
        }
    } catch (error) {
        console.error("⚠️ Knowledge Base Query Error:", error);
    }

    // 📌 Step 3: Fetch past messages from SQLite (memory)
    db.all("SELECT role, content FROM conversations WHERE user_id = ? ORDER BY rowid DESC LIMIT 10", [userId], async (err, rows) => {
        if (err) {
            console.error("⚠️ Database error:", err);
            return;
        }

        let conversation = [{ role: "system", content: systemPrompt }];
        conversation.push(...rows.map(row => ({ role: row.role, content: row.content })));
        conversation.push({ role: "user", content: message.content });

        try {
            const response = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: conversation
            });

            const responseMessage = response.choices[0].message.content;

            db.run("INSERT INTO conversations (user_id, role, content) VALUES (?, ?, ?)", [userId, "user", message.content]);
            db.run("INSERT INTO conversations (user_id, role, content) VALUES (?, ?, ?)", [userId, "assistant", responseMessage]);

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

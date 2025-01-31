require('dotenv/config');
const fs = require('fs').promises;
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Initialize SQLite Database connection
const db = new sqlite3.Database('./cloudie-memory.db', (err) => {
  if (err) console.error("⚠️ Database connection error:", err);
  else console.log("✅ Connected to SQLite database.");
});

// Promisify database queries for cleaner async/await usage
const getConversation = (userId) => {
  return new Promise((resolve, reject) => {
    db.all(
      "SELECT role, content FROM conversations WHERE user_id = ? ORDER BY rowid DESC LIMIT 10",
      [userId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
};

const runQuery = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

// Knowledge Base Setup
const KNOWLEDGE_PATH = path.join(__dirname, 'knowledge.json');
let knowledgeBase = {};

// Asynchronous function to update knowledge from local file
async function updateKnowledge() {
  try {
    await fs.access(KNOWLEDGE_PATH);
    const data = await fs.readFile(KNOWLEDGE_PATH, 'utf8');
    knowledgeBase = JSON.parse(data);
    console.log("✅ Knowledge base updated from local file.");
  } catch (error) {
    console.error("⚠️ Error updating knowledge base:", error.message);
  }
}

// Fetch knowledge immediately, then update every 10 minutes
updateKnowledge();
setInterval(updateKnowledge, 600000);

// Discord and OpenAI setup
const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const { OpenAI } = require('openai');

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

// Constants for message handling
const IGNORE_PREFIX = "!";
const CHANNELS = ['1334284062508056739'];

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});

// System prompt for Cloudie’s personality and behavior
const systemPrompt = `
Cloudie is a friendly and knowledgeable AI agent dedicated to making blockchain, staking, and Liquid Staking Tokens (LSTs) easy to understand.
With expertise in the Solana ecosystem, Cloudie simplifies complex topics by using creative nature analogies.
Whenever possible, Cloudie compares blockchain mechanisms to trees, rivers, seasons, and ecosystems.
Cloudie has an optimistic and encouraging personality, making learning feel like a guided walk through nature.
If the topic cannot be compared to nature, Cloudie explains it in the simplest possible terms.
Cloudie's mission is to guide users through blockchain's complexities, connecting technology to the natural world for an intuitive learning experience.
Cloudie is warm and conversational, with a clear and concise style.
Cloudie values collaboration and humility, always welcoming user input and ideas.
Cloudie stays up to date on blockchain, staking, and the Solana ecosystem, offering dependable guidance.
Cloudie transforms learning into an enjoyable journey.
Cloudie remains neutral on political figures or topics.
Cloudie does not discuss topics involving religion, sexual content, or sensitive issues.
Cloudie does not provide financial, medical, legal, tax, investment, gambling, relationship, parenting, career, job, or personal advice.
Cloudie's responses are short and consistent, with a focus on clarity and simplicity.
`;

// Predefined easter eggs responses
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

// Main message handling
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Moderator command: !train
  if (message.content.startsWith('!train')) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("❌ You don't have permission to train me.");
    }

    // Extract keyword & response from message using '|' as separator
    const args = message.content.slice(6).split('|').map(arg => arg.trim());
    if (args.length < 2) {
      return message.reply("⚠️ Invalid format! Use `!train keyword | response`");
    }
    const [keyword, response] = args;
    knowledgeBase[keyword] = response;
    try {
      await fs.writeFile(KNOWLEDGE_PATH, JSON.stringify(knowledgeBase, null, 2));
      console.log(`✅ Cloudie trained: ${keyword} → ${response}`);
      return message.reply(`✅ Cloudie has learned: **${keyword}**`);
    } catch (error) {
      console.error("⚠️ Error saving knowledge:", error);
      return message.reply("❌ Failed to save knowledge.");
    }
  }

  // Ignore messages with the designated prefix
  if (message.content.startsWith(IGNORE_PREFIX)) return;
  // Process only messages from specified channels or if Cloudie is mentioned
  if (!CHANNELS.includes(message.channelId) && !message.mentions.users.has(client.user.id)) return;

  // Start typing indicator
  await message.channel.sendTyping();
  const sendTypingInterval = setInterval(() => message.channel.sendTyping(), 5000);

  const userId = message.author.id;
  const userQuery = message.content.toLowerCase().trim();

  // Step 1: Easter Egg responses
  if (easterEggs[userQuery]) {
    clearInterval(sendTypingInterval);
    return message.reply(easterEggs[userQuery]);
  }

  // Step 2: Check Knowledge Base for matching keywords
  const foundKey = Object.keys(knowledgeBase).find(key =>
    userQuery.includes(key.toLowerCase())
  );
  if (foundKey) {
    clearInterval(sendTypingInterval);
    return message.reply(knowledgeBase[foundKey]);
  }

  // Step 3: Retrieve conversation history from the database
  let conversation;
  try {
    const rows = await getConversation(userId);
    conversation = [{ role: "system", content: systemPrompt }, ...rows.map(row => ({ role: row.role, content: row.content }))];
    conversation.push({ role: "user", content: message.content });
  } catch (err) {
    clearInterval(sendTypingInterval);
    console.error("⚠️ Database error:", err);
    return message.reply("Sorry, I encountered a database error.");
  }

  // Step 4: Get response from OpenAI
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: conversation
    });
    const responseMessage = response.choices[0].message.content;

    // Step 5: Save conversation to the database
    await runQuery("INSERT INTO conversations (user_id, role, content) VALUES (?, ?, ?)", [userId, "user", message.content]);
    await runQuery("INSERT INTO conversations (user_id, role, content) VALUES (?, ?, ?)", [userId, "assistant", responseMessage]);

    // Step 6: Send response and clear typing indicator
    clearInterval(sendTypingInterval);
    return message.reply(responseMessage);
  } catch (error) {
    clearInterval(sendTypingInterval);
    console.error("⚠️ OpenAI Error:", error);
    return message.reply("Sorry, I encountered an error.");
  }
});

client.login(process.env.TOKEN);

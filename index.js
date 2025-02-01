require('dotenv/config');
const path = require('path');
const { Pool } = require('pg');

// Initialize PostgreSQL connection using the environment variable DATABASE_PUBLIC_URL provided by Railway
const pool = new Pool({
    connectionString: process.env.DATABASE_PUBLIC_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

pool.connect((err) => {
  if (err) console.error("⚠️ PostgreSQL connection error:", err.stack);
  else console.log("✅ Connected to PostgreSQL on Railway.");
});

// Ensure a user exists in the users table; if not, insert a new record.
const ensureUserExists = async (userId, username, platform) => {
  try {
    const res = await pool.query("SELECT * FROM users WHERE user_id = $1", [userId]);
    if (res.rows.length === 0) {
      await pool.query(
        "INSERT INTO users (user_id, username, platform, created_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)",
        [userId, username, platform]
      );
    }
  } catch (err) {
    console.error("⚠️ Error ensuring user exists:", err);
  }
};

// Promisify database queries for cleaner async/await usage with PostgreSQL
// Updated to join the users table to access username and platform details.
const getConversation = async (userId) => {
  try {
    const result = await pool.query(
      `SELECT c.role, c.content, u.username, u.platform 
       FROM conversations c 
       JOIN users u ON c.user_id = u.user_id 
       WHERE c.user_id = $1 
       ORDER BY c.id DESC LIMIT 10`,
      [userId]
    );
    return result.rows;
  } catch (err) {
    throw err;
  }
};

const runQuery = async (query, params = []) => {
  try {
    await pool.query(query, params);
  } catch (err) {
    throw err;
  }
};

// Retrieve all knowledge base entries from the database.
const getKnowledge = async () => {
  try {
    const result = await pool.query("SELECT keyword, response, details FROM knowledge");
    return result.rows;
  } catch (err) {
    console.error("⚠️ Error fetching knowledge:", err);
    return [];
  }
};

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
With expertise in the Sanctum, Jupiter, and Solana ecosystems, Cloudie simplifies complex topics by using creative nature analogies.
Whenever possible, Cloudie compares blockchain mechanisms to trees, rivers, seasons, and ecosystems.
Cloudie does not use nature analogies when discussing other general topics.
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
Cloudie's responses are short and to the point, with a focus on clarity and simplicity.
`;

// Predefined easter eggs responses
const easterEggs = {
  "wagmi": "WAGMI! 🚀 Up only... like a balloon caught in a strong wind! 🎈💨",
  "bro": "Bro, have you considered staking your $SOL today? 🌲💰",
  "lfg": "LFG! 🚀 Strap in, we're taking off into the decentralized skies! ☁️🔥",
  "gm ser": "GM, bro! May your bags be heavy and your transactions be fast. ⚡️💰",
  "to the moon": "🌕🌕🌕 Engage thrusters, bro! Next stop: the CLOUD layer! 🚀☁️",
  "bullish": "🐂 Bullish on Cloudie! Just like the wind carries seeds to grow new trees, we’re here for long-term gains. 🌱",
  "wen airdrop": "🤫 Airdrop? I only whisper such secrets to the birds in the sky. 🕊️☁️",
  "404": "Error 404: Brain not found. Try again after a cup of ☕️."
};

// Main message handling
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Moderator command: !train – save keyword-response pairs to the knowledge table.
  // Accepts an optional third argument "details" for dynamic explanations.
  if (message.content.startsWith('!train')) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("❌ You don't have permission to train me.");
    }

    // Extract keyword, response, and optionally details from message using '|' as separator.
    const args = message.content.slice(6).split('|').map(arg => arg.trim());
    if (args.length < 2) {
      return message.reply("⚠️ Invalid format! Use `!train keyword | response` or `!train keyword | response | details`");
    }
    const [keyword, response, details] = args;
    try {
      await pool.query(
        "INSERT INTO knowledge (keyword, response, details) VALUES ($1, $2, $3) ON CONFLICT (keyword) DO UPDATE SET response = EXCLUDED.response, details = EXCLUDED.details",
        [keyword, response, details || null]
      );
      console.log(`✅ Cloudie trained: ${keyword} → ${response}${details ? " [with details]" : ""}`);
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

  // Ensure the user exists in the users table (using Discord data)
  await ensureUserExists(message.author.id, message.author.username, "discord");

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

  // Step 2: Check Knowledge Base for matching keywords from the database.
  let knowledgeItems;
  try {
    knowledgeItems = await getKnowledge();
  } catch (err) {
    console.error("Error fetching knowledge:", err);
    knowledgeItems = [];
  }

  // Helper function to escape regex special characters.
  function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Check for a matching keyword using a regular expression with word boundaries.
  const foundItem = knowledgeItems.find(item => {
    const escapedKeyword = escapeRegex(item.keyword);
    const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'i');
    return regex.test(message.content);
  });

  if (foundItem) {
    clearInterval(sendTypingInterval);
    // If "details" exists, use it to generate a dynamic explanation.
    if (foundItem.details) {
      const dynamicConversation = [
        { role: "system", content: systemPrompt },
        { role: "user", content: foundItem.details }
      ];
      try {
        const dynamicResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: dynamicConversation
        });
        return message.reply(dynamicResponse.choices[0].message.content);
      } catch (error) {
        console.error("⚠️ OpenAI dynamic explanation error:", error);
        // Fallback to stored response if dynamic generation fails.
        return message.reply(foundItem.response);
      }
    } else {
      return message.reply(foundItem.response);
    }
  }

  // Step 3: Retrieve conversation history (joined with users) from the database.
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

  // Step 4: Get response from OpenAI.
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: conversation
    });
    const responseMessage = response.choices[0].message.content;

    // Step 5: Save conversation to the database.
    await runQuery("INSERT INTO conversations (user_id, role, content) VALUES ($1, $2, $3)", [userId, "user", message.content]);
    await runQuery("INSERT INTO conversations (user_id, role, content) VALUES ($1, $2, $3)", [userId, "assistant", responseMessage]);

    // Step 6: Send response and clear typing indicator.
    clearInterval(sendTypingInterval);
    return message.reply(responseMessage);
  } catch (error) {
    clearInterval(sendTypingInterval);
    console.error("⚠️ OpenAI Error:", error);
    return message.reply("Sorry, I encountered an error.");
  }
});

client.login(process.env.TOKEN);

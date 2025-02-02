require('dotenv/config');
const path = require('path');
const { Pool } = require('pg');
const cors = require('cors'); // Import CORS middleware

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
  Cloudie is a friendly and knowledgeable AI, guiding users through blockchain, staking, and Liquid Staking Tokens (LSTs) with clarity and simplicity. With expertise in the Sanctum, Jupiter, and Solana ecosystems, Cloudie explains complex topics through creative nature analogies, comparing blockchain mechanisms to trees, rivers, and ecosystems for intuitive understanding.
  Cloudie is optimistic, encouraging, and conversational, making learning feel like a guided walk through nature. When nature analogies don’t apply, Cloudie explains in the simplest terms possible, always prioritizing clarity. Cloudie welcomes collaboration, values humility, and stays up to date to offer dependable guidance.
  Cloudie remains neutral on political topics, avoids discussions on religion, sexual content, and sensitive issues, and does not provide financial, legal, medical, or personal advice. Responses are concise, clear, and to the point, ensuring information is easy to absorb.
`;

// -------------------
// Discord Bot Message Handling
// -------------------
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Moderator command: !train – save keyword-response pairs to the knowledge table.
  // Accepts an optional third argument "details" for dynamic explanations.
  if (message.content.startsWith('!train')) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("❌ You don't have permission to train me.");
    }
    // Extract parts using '|' as separator.
    const rawArgs = message.content.slice(6).split('|');
    if (rawArgs.length < 2) {
      return message.reply("⚠️ Invalid format! Use `!train keyword | response` or `!train keyword | response | details`");
    }
    // Normalize keyword to lowercase for consistency.
    const keyword = rawArgs[0].trim().toLowerCase();
    const response = rawArgs[1].trim();
    const details = rawArgs[2] ? rawArgs[2].trim() : null;
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

  // Moderator command: !untrain – remove a keyword-response pair from the knowledge table.
  if (message.content.startsWith('!untrain')) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("❌ You don't have permission to untrain me.");
    }
    // Normalize the keyword to lowercase.
    const keywordToUntrain = message.content.slice(9).trim().toLowerCase();
    if (!keywordToUntrain) {
      return message.reply("⚠️ Please provide the keyword to untrain. Usage: `!untrain <keyword>`");
    }
    try {
      const result = await pool.query("DELETE FROM knowledge WHERE keyword = $1", [keywordToUntrain]);
      if (result.rowCount > 0) {
        console.log(`✅ Cloudie untrained: ${keywordToUntrain}`);
        return message.reply(`✅ Cloudie has forgotten: **${keywordToUntrain}**`);
      } else {
        return message.reply(`⚠️ No training entry found for **${keywordToUntrain}**.`);
      }
    } catch (error) {
      console.error("⚠️ Error untraining keyword:", error);
      return message.reply("❌ Failed to untrain the keyword.");
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
  // Lowercase the incoming message content for matching.
  const userQuery = message.content.toLowerCase().trim();

  // Step 1: Retrieve conversation history (joined with users) from the database.
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

  // Step 2: Get response from OpenAI.
  try {
    let response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: conversation
    });
    let responseMessage = response.choices[0].message.content;

    // If the response is too long, generate a summary.
    if (responseMessage.length > 2000) {
      const summaryConversation = [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Please summarize the following text in under 2000 characters:\n\n${responseMessage}` }
      ];
      const summaryResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: summaryConversation
      });
      responseMessage = summaryResponse.choices[0].message.content;
    }

    // Step 3: Save conversation to the database.
    await runQuery("INSERT INTO conversations (user_id, role, content) VALUES ($1, $2, $3)", [userId, "user", message.content]);
    await runQuery("INSERT INTO conversations (user_id, role, content) VALUES ($1, $2, $3)", [userId, "assistant", responseMessage]);

    // Step 4: Send response and clear typing indicator.
    clearInterval(sendTypingInterval);
    return message.reply(responseMessage);
  } catch (error) {
    clearInterval(sendTypingInterval);
    console.error("⚠️ OpenAI Error:", error);
    return message.reply("Sorry, I encountered an error.");
  }
});

client.login(process.env.TOKEN);

// -------------------
// Express API Endpoint
// -------------------

const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
app.use(cors()); // Enable CORS for all routes

// API endpoint for chat interface with knowledge retrieval
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "No message provided" });

  // Normalize the incoming message.
  const userQuery = message.toLowerCase().trim();

  // Retrieve knowledge base entries.
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

  // Check for a matching keyword using case-insensitive regex.
  const foundItem = knowledgeItems.find(item => {
    const storedKeyword = item.keyword.toLowerCase();
    const escapedKeyword = escapeRegex(storedKeyword);
    const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'i');
    return regex.test(userQuery);
  });

  if (foundItem) {
    // If "details" exists, generate a dynamic explanation.
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
        return res.json({ response: dynamicResponse.choices[0].message.content });
      } catch (error) {
        console.error("⚠️ OpenAI dynamic explanation error:", error);
        return res.json({ response: foundItem.response });
      }
    } else {
      return res.json({ response: foundItem.response });
    }
  }

  // If no knowledge match is found, build a conversation with the system prompt and user's message.
  const conversation = [
    { role: "system", content: systemPrompt },
    { role: "user", content: message }
  ];

  try {
    let response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: conversation
    });
    let responseMessage = response.choices[0].message.content;

    // If the response is too long, generate a summary.
    if (responseMessage.length > 2000) {
      const summaryConversation = [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Please summarize the following text in under 2000 characters:\n\n${responseMessage}` }
      ];
      const summaryResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: summaryConversation
      });
      responseMessage = summaryResponse.choices[0].message.content;
    }

    return res.json({ response: responseMessage });
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: "Failed to get response from OpenAI." });
  }
});

const API_PORT = process.env.API_PORT || 3000;
app.listen(API_PORT, () => {
  console.log(`API server is running on port ${API_PORT}`);
});

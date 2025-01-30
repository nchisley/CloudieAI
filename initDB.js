const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./cloudie-memory.db');

// Create conversations table if it doesn’t exist
db.run(`
    CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        role TEXT,
        content TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`, (err) => {
    if (err) {
        console.error("⚠️ Database initialization failed:", err);
    } else {
        console.log("✅ Database initialized successfully!");
    }
    db.close();
});

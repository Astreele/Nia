const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

const dbPath = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(dbPath);
}
const db = new Database(path.join(dbPath, 'database.sqlite'));

function setupDatabase() {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        current_exp INTEGER DEFAULT 0,
        total_exp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS monthly_exp (
        user_id TEXT,
        month TEXT, /* YYYY-MM format */
        exp INTEGER,
        PRIMARY KEY (user_id, month)
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        message_content TEXT,
        char_count INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    logger.info('Database tables initialized.');
  } catch (err) {
    logger.error('Database setup failed:', err);
  }
}

setupDatabase();

module.exports = db;

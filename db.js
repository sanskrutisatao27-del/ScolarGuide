const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'scolarguide.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS profiles (
    user_id INTEGER PRIMARY KEY,
    income INTEGER,
    category TEXT,
    gender TEXT,
    level TEXT,
    percentage REAL,
    disability INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS scholarships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    provider_type TEXT NOT NULL,      -- 'Government' or 'Private'
    provider TEXT NOT NULL,
    description TEXT NOT NULL,
    max_income INTEGER,               -- NULL = no income limit
    categories TEXT NOT NULL,         -- 'ALL' or 'SC,ST,OBC'
    gender TEXT NOT NULL,             -- 'ALL' or 'Female'
    levels TEXT NOT NULL,             -- 'ALL' or 'UG,PG,Diploma'
    min_percentage REAL,              -- NULL = no minimum
    disability_required INTEGER DEFAULT 0,
    link TEXT NOT NULL
  );
`);

module.exports = db;
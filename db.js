// db.js
require('dotenv').config({ path: '.env.development.local' });
const { createClient } = require('@libsql/client/web');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Helper for schema setup (run once on cold start)
async function initDb() {
  await db.batch([
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student'
    )`,
    `CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      first_name TEXT, last_name TEXT, email TEXT UNIQUE,
      phone TEXT, date_of_birth TEXT, grade_level TEXT,
      status TEXT DEFAULT 'active'
    )`,
    // ... add your courses table schema here ...
  ], "write");
}

module.exports = { db, initDb };
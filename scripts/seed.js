// scripts/seed.js
// Creates the first owner account from .env.local values.
// Run with: npm run seed

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Load .env.local manually (no dotenv dependency needed)
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

const DB_PATH = path.join(process.cwd(), 'database.sqlite');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'operator',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tournaments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    buy_in INTEGER DEFAULT 0,
    starting_chips INTEGER NOT NULL,
    status TEXT DEFAULT 'setup',
    current_level INTEGER DEFAULT 1,
    timer_seconds_remaining INTEGER,
    total_prize_pool INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS blind_levels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL,
    level_number INTEGER NOT NULL,
    small_blind INTEGER NOT NULL,
    big_blind INTEGER NOT NULL,
    ante INTEGER DEFAULT 0,
    duration_minutes INTEGER NOT NULL,
    is_break BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
  );

  CREATE TABLE IF NOT EXISTS payouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
  );

  CREATE TABLE IF NOT EXISTS tournament_players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL,
    player_name TEXT NOT NULL,
    seat_number TEXT,
    entries INTEGER DEFAULT 1,
    chips INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    finish_position INTEGER,
    eliminated_at DATETIME,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
  );
`);

const username = process.env.OWNER_USERNAME || 'admin';
const password = process.env.OWNER_PASSWORD || 'changeme123';
const displayName = process.env.OWNER_DISPLAY_NAME || 'Admin';

const passwordHash = bcrypt.hashSync(password, 12);

const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);

if (existing) {
  db.prepare(
    'UPDATE users SET password_hash = ?, display_name = ?, role = ? WHERE username = ?'
  ).run(passwordHash, displayName, 'owner', username);
  console.log(`✓ Owner account updated: ${username}`);
} else {
  db.prepare(
    'INSERT INTO users (username, display_name, password_hash, role) VALUES (?, ?, ?, ?)'
  ).run(username, displayName, passwordHash, 'owner');
  console.log(`✓ Owner account created: ${username}`);
}
console.log(`  Display name: ${displayName}`);
console.log(`  Role: owner`);
console.log('\nYou can now log in at /admin/login');

db.close();

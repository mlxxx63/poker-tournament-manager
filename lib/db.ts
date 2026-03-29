import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'database.sqlite');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initializeSchema(db);
  }
  return db;
}

function initializeSchema(db: Database.Database) {
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
}

export default getDb;

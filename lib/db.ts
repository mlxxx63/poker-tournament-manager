import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'database.sqlite');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initializeSchema(db);
    migrate(db);
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
      estimated_entries INTEGER DEFAULT 0,
      re_entries_allowed INTEGER DEFAULT 0,
      max_re_entries INTEGER DEFAULT 0,
      re_entry_period_level INTEGER DEFAULT 0,
      re_entry_chips INTEGER DEFAULT 0,
      addon_allowed INTEGER DEFAULT 0,
      addon_chips INTEGER DEFAULT 0,
      addon_cost INTEGER DEFAULT 0,
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
      percentage REAL DEFAULT 0,
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
    );

    CREATE TABLE IF NOT EXISTS tournament_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL,
      player_name TEXT NOT NULL,
      seat_number TEXT,
      entries INTEGER DEFAULT 1,
      addons INTEGER DEFAULT 0,
      chips INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      finish_position INTEGER,
      eliminated_at DATETIME,
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id)
    );
  `);
}

// Safe migrations — adds columns that may not exist on older databases.
// SQLite will throw if a column already exists; we catch and ignore that.
function migrate(db: Database.Database) {
  const newColumns: [string, string][] = [
    ['tournaments', 'estimated_entries INTEGER DEFAULT 0'],
    ['tournaments', 're_entries_allowed INTEGER DEFAULT 0'],
    ['tournaments', 'max_re_entries INTEGER DEFAULT 0'],
    ['tournaments', 're_entry_period_level INTEGER DEFAULT 0'],
    ['tournaments', 're_entry_chips INTEGER DEFAULT 0'],
    ['tournaments', 'addon_allowed INTEGER DEFAULT 0'],
    ['tournaments', 'addon_chips INTEGER DEFAULT 0'],
    ['tournaments', 'addon_cost INTEGER DEFAULT 0'],
    ['tournament_players', 'addons INTEGER DEFAULT 0'],
    ['payouts', 'percentage REAL DEFAULT 0'],
  ];

  for (const [table, columnDef] of newColumns) {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`);
    } catch {
      // Column already exists — safe to ignore
    }
  }
}

export default getDb;

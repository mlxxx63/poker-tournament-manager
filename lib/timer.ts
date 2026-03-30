/**
 * Server-side timer management.
 * Uses a module-level Map so intervals survive across requests within the same Node process.
 * State is always persisted to SQLite so it survives server restarts.
 */
import getDb from './db';

const activeTimers = new Map<number, NodeJS.Timeout>();

// ── Public API ──────────────────────────────────────────────────────────────

/** Call this when the SSE endpoint starts — restarts any in-memory timer that should be running. */
export function ensureTimer(tournamentId: number): void {
  if (activeTimers.has(tournamentId)) return;
  const db = getDb();
  const t = db.prepare("SELECT status FROM tournaments WHERE id = ?").get(tournamentId) as { status: string } | undefined;
  if (t?.status === 'running') startInterval(tournamentId);
}

export function startTimer(tournamentId: number): void {
  const db = getDb();
  const t = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId) as TournamentRow | undefined;
  if (!t) return;

  // Initialize timer seconds from blind level if not already set
  if (!t.timer_seconds_remaining) {
    const levelRow = db
      .prepare('SELECT duration_minutes FROM blind_levels WHERE tournament_id = ? AND level_number = ?')
      .get(tournamentId, t.current_level) as { duration_minutes: number } | undefined;
    const secs = levelRow ? levelRow.duration_minutes * 60 : 1200;
    db.prepare("UPDATE tournaments SET status = 'running', timer_seconds_remaining = ? WHERE id = ?").run(secs, tournamentId);
  } else {
    db.prepare("UPDATE tournaments SET status = 'running' WHERE id = ?").run(tournamentId);
  }

  stopInterval(tournamentId);
  startInterval(tournamentId);
}

export function pauseTimer(tournamentId: number): void {
  const db = getDb();
  db.prepare("UPDATE tournaments SET status = 'paused' WHERE id = ?").run(tournamentId);
  stopInterval(tournamentId);
}

export function skipLevel(tournamentId: number): void {
  const db = getDb();
  const t = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId) as TournamentRow | undefined;
  if (!t) return;
  const wasRunning = t.status === 'running';
  if (wasRunning) stopInterval(tournamentId);
  advanceLevel(tournamentId);
  if (wasRunning) startInterval(tournamentId);
}

export function goBackLevel(tournamentId: number): void {
  const db = getDb();
  const t = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId) as TournamentRow | undefined;
  if (!t || t.current_level <= 1) return;
  const wasRunning = t.status === 'running';
  if (wasRunning) stopInterval(tournamentId);

  const prevLevelNum = t.current_level - 1;
  const levelRow = db
    .prepare('SELECT duration_minutes FROM blind_levels WHERE tournament_id = ? AND level_number = ?')
    .get(tournamentId, prevLevelNum) as { duration_minutes: number } | undefined;
  const secs = levelRow ? levelRow.duration_minutes * 60 : 1200;

  db.prepare('UPDATE tournaments SET current_level = ?, timer_seconds_remaining = ? WHERE id = ?')
    .run(prevLevelNum, secs, tournamentId);

  if (wasRunning) startInterval(tournamentId);
}

// ── Internal ────────────────────────────────────────────────────────────────

interface TournamentRow {
  id: number;
  status: string;
  current_level: number;
  timer_seconds_remaining: number;
}

function startInterval(tournamentId: number): void {
  const interval = setInterval(() => tick(tournamentId), 1000);
  activeTimers.set(tournamentId, interval);
}

function stopInterval(tournamentId: number): void {
  const existing = activeTimers.get(tournamentId);
  if (existing) {
    clearInterval(existing);
    activeTimers.delete(tournamentId);
  }
}

function tick(tournamentId: number): void {
  const db = getDb();
  const t = db
    .prepare('SELECT status, timer_seconds_remaining FROM tournaments WHERE id = ?')
    .get(tournamentId) as { status: string; timer_seconds_remaining: number } | undefined;

  if (!t || t.status !== 'running') {
    stopInterval(tournamentId);
    return;
  }

  if (t.timer_seconds_remaining > 1) {
    db.prepare('UPDATE tournaments SET timer_seconds_remaining = timer_seconds_remaining - 1 WHERE id = ?')
      .run(tournamentId);
  } else {
    advanceLevel(tournamentId);
  }
}

function advanceLevel(tournamentId: number): void {
  const db = getDb();
  const t = db.prepare('SELECT current_level FROM tournaments WHERE id = ?').get(tournamentId) as { current_level: number } | undefined;
  if (!t) return;

  const nextLevelNum = t.current_level + 1;
  const nextLevel = db
    .prepare('SELECT level_number, duration_minutes FROM blind_levels WHERE tournament_id = ? AND level_number = ?')
    .get(tournamentId, nextLevelNum) as { level_number: number; duration_minutes: number } | undefined;

  if (!nextLevel) {
    db.prepare("UPDATE tournaments SET status = 'finished', timer_seconds_remaining = 0 WHERE id = ?").run(tournamentId);
    stopInterval(tournamentId);
  } else {
    db.prepare('UPDATE tournaments SET current_level = ?, timer_seconds_remaining = ? WHERE id = ?')
      .run(nextLevelNum, nextLevel.duration_minutes * 60, tournamentId);
  }
}

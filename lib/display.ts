import getDb from './db';

export interface BlindLevelRow {
  id: number;
  level_number: number;
  small_blind: number;
  big_blind: number;
  ante: number;
  duration_minutes: number;
  is_break: number;
}

export interface PayoutRow {
  position: number;
  amount: number; // cents
  percentage: number;
}

export interface DisplayState {
  id: number;
  name: string;
  status: 'setup' | 'running' | 'paused' | 'finished';
  currentLevel: number;
  timerSecondsRemaining: number;
  currentLevelData: BlindLevelRow | null;
  nextLevelData: BlindLevelRow | null;
  nextBreak: BlindLevelRow | null;
  nextBreakMinutes: number; // minutes of play until next break starts
  allLevels: BlindLevelRow[];
  totalLevels: number;
  payouts: PayoutRow[];
  prizePool: number; // cents
  activePlayers: number;
  totalEntries: number;
  avgChips: number;
}

export function getDisplayState(tournamentId: number): DisplayState | null {
  const db = getDb();

  const t = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId) as {
    id: number; name: string; status: string; current_level: number;
    timer_seconds_remaining: number; buy_in: number; addon_cost: number;
    starting_chips: number; addon_chips: number; total_prize_pool: number;
  } | undefined;

  if (!t) return null;

  const blindLevels = db
    .prepare('SELECT * FROM blind_levels WHERE tournament_id = ? ORDER BY level_number')
    .all(tournamentId) as BlindLevelRow[];

  const rawPayouts = db
    .prepare('SELECT position, amount, percentage FROM payouts WHERE tournament_id = ? ORDER BY position')
    .all(tournamentId) as PayoutRow[];

  const playerStats = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0) AS active_players,
      COALESCE(SUM(entries), 0) AS total_entries,
      COALESCE(SUM(addons), 0) AS total_addons
    FROM tournament_players WHERE tournament_id = ?
  `).get(tournamentId) as { active_players: number; total_entries: number; total_addons: number };

  const totalChipsInPlay =
    t.starting_chips * playerStats.total_entries +
    t.addon_chips * playerStats.total_addons;

  const avgChips =
    playerStats.active_players > 0
      ? Math.round(totalChipsInPlay / playerStats.active_players)
      : 0;

  const prizePool =
    t.total_prize_pool > 0
      ? t.total_prize_pool
      : t.buy_in * playerStats.total_entries + t.addon_cost * playerStats.total_addons;

  const currentLevelData =
    blindLevels.find((l) => l.level_number === t.current_level) ?? null;

  const nextLevelData =
    blindLevels.find((l) => l.level_number === t.current_level + 1) ?? null;

  const nextBreak =
    blindLevels.find((l) => l.level_number > t.current_level && l.is_break) ?? null;

  // Minutes of play until next break: remaining time in current level + full durations of levels in between
  let nextBreakMinutes = 0;
  if (nextBreak) {
    nextBreakMinutes = Math.ceil((t.timer_seconds_remaining ?? 0) / 60);
    for (const l of blindLevels) {
      if (l.level_number > t.current_level && l.level_number < nextBreak.level_number && !l.is_break) {
        nextBreakMinutes += l.duration_minutes;
      }
    }
  }

  const totalLevels = blindLevels.filter((l) => !l.is_break).length;

  const payouts: PayoutRow[] = rawPayouts.map((p) => ({
    position: p.position,
    percentage: p.percentage ?? 0,
    amount: (p.percentage ?? 0) > 0 ? Math.round(prizePool * (p.percentage ?? 0) / 100) : p.amount,
  }));

  return {
    id: t.id,
    name: t.name,
    status: t.status as DisplayState['status'],
    currentLevel: t.current_level,
    timerSecondsRemaining: t.timer_seconds_remaining ?? 0,
    currentLevelData,
    nextLevelData,
    nextBreak,
    nextBreakMinutes,
    allLevels: blindLevels,
    totalLevels,
    payouts,
    prizePool,
    activePlayers: playerStats.active_players,
    totalEntries: playerStats.total_entries,
    avgChips,
  };
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import getDb from '@/lib/db';

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const db = getDb();
  const tournaments = db
    .prepare('SELECT * FROM tournaments ORDER BY created_at DESC')
    .all();

  return NextResponse.json(tournaments);
}

export async function POST(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const {
    name,
    date,
    buy_in_dollars,
    starting_chips,
    estimated_entries,
    re_entries_allowed,
    max_re_entries,
    re_entry_period_level,
    re_entry_chips,
    addon_allowed,
    addon_chips,
    addon_cost_dollars,
    blind_levels,
    payouts,
  } = body;

  if (!name || !date || !starting_chips) {
    return NextResponse.json(
      { error: 'name, date, and starting_chips are required' },
      { status: 400 }
    );
  }

  const db = getDb();
  const buy_in = Math.round((buy_in_dollars ?? 0) * 100);
  const addon_cost = Math.round((addon_cost_dollars ?? 0) * 100);

  const id = db.transaction(() => {
    const t = db
      .prepare(
        `INSERT INTO tournaments
          (name, date, buy_in, starting_chips, estimated_entries,
           re_entries_allowed, max_re_entries, re_entry_period_level, re_entry_chips,
           addon_allowed, addon_chips, addon_cost)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        name.trim(),
        date,
        buy_in,
        Number(starting_chips),
        Number(estimated_entries ?? 0),
        re_entries_allowed ? 1 : 0,
        Number(max_re_entries ?? 0),
        Number(re_entry_period_level ?? 0),
        Number(re_entry_chips ?? 0),
        addon_allowed ? 1 : 0,
        Number(addon_chips ?? 0),
        addon_cost
      );

    const tournamentId = t.lastInsertRowid as number;

    if (Array.isArray(blind_levels) && blind_levels.length > 0) {
      const ins = db.prepare(
        'INSERT INTO blind_levels (tournament_id, level_number, small_blind, big_blind, ante, duration_minutes, is_break) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      blind_levels.forEach(
        (l: { small_blind: number; big_blind: number; ante: number; duration_minutes: number; is_break: boolean }, idx: number) => {
          ins.run(
            tournamentId,
            idx + 1,
            l.is_break ? 0 : Number(l.small_blind),
            l.is_break ? 0 : Number(l.big_blind),
            l.is_break ? 0 : Number(l.ante ?? 0),
            Number(l.duration_minutes),
            l.is_break ? 1 : 0
          );
        }
      );
    }

    if (Array.isArray(payouts) && payouts.length > 0) {
      const ins = db.prepare(
        'INSERT INTO payouts (tournament_id, position, amount) VALUES (?, ?, ?)'
      );
      payouts.forEach((p: { position: number; amount_dollars: number }) => {
        ins.run(tournamentId, p.position, Math.round(p.amount_dollars * 100));
      });
    }

    return tournamentId;
  })();

  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id);
  return NextResponse.json(tournament, { status: 201 });
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import getDb from '@/lib/db';

interface Tournament {
  id: number;
  starting_chips: number;
  addon_chips: number;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const db = getDb();

  const tournament = db.prepare('SELECT id FROM tournaments WHERE id = ?').get(Number(id));
  if (!tournament) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const players = db
    .prepare('SELECT * FROM tournament_players WHERE tournament_id = ? ORDER BY status ASC, id ASC')
    .all(Number(id));

  return NextResponse.json(players);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const db = getDb();

  const tournament = db
    .prepare('SELECT id, starting_chips FROM tournaments WHERE id = ?')
    .get(Number(id)) as Tournament | undefined;
  if (!tournament) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const playerName = typeof body.player_name === 'string' ? body.player_name.trim() : '';
  if (!playerName) return NextResponse.json({ error: 'player_name is required' }, { status: 400 });

  const seatNumber = typeof body.seat_number === 'string' ? body.seat_number.trim() || null : null;

  const result = db
    .prepare(
      'INSERT INTO tournament_players (tournament_id, player_name, seat_number, entries, addons, chips, status) VALUES (?, ?, ?, 1, 0, ?, ?)'
    )
    .run(Number(id), playerName, seatNumber, tournament.starting_chips, 'active');

  const player = db
    .prepare('SELECT * FROM tournament_players WHERE id = ?')
    .get(result.lastInsertRowid);

  return NextResponse.json(player, { status: 201 });
}

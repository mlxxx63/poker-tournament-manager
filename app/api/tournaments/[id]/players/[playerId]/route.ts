import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import getDb from '@/lib/db';

interface Tournament {
  id: number;
  starting_chips: number;
  re_entry_chips: number;
  addon_chips: number;
  re_entries_allowed: number;
  max_re_entries: number;
}

interface Player {
  id: number;
  tournament_id: number;
  player_name: string;
  seat_number: string | null;
  entries: number;
  addons: number;
  chips: number;
  status: string;
  finish_position: number | null;
  eliminated_at: string | null;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; playerId: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id, playerId } = await params;
  const db = getDb();

  const tournament = db
    .prepare('SELECT * FROM tournaments WHERE id = ?')
    .get(Number(id)) as Tournament | undefined;
  if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });

  const player = db
    .prepare('SELECT * FROM tournament_players WHERE id = ? AND tournament_id = ?')
    .get(Number(playerId), Number(id)) as Player | undefined;
  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

  const body = await req.json();
  const action = body.action as string;

  if (action === 'eliminate') {
    if (player.status === 'eliminated') {
      return NextResponse.json({ error: 'Player already eliminated' }, { status: 400 });
    }
    // Finish position = number of active players right now (including this player)
    const activeCount = (
      db
        .prepare("SELECT COUNT(*) as cnt FROM tournament_players WHERE tournament_id = ? AND status = 'active'")
        .get(Number(id)) as { cnt: number }
    ).cnt;

    db.prepare(
      "UPDATE tournament_players SET status = 'eliminated', finish_position = ?, eliminated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(activeCount, Number(playerId));

  } else if (action === 're_entry') {
    if (!tournament.re_entries_allowed) {
      return NextResponse.json({ error: 'Re-entries not allowed for this tournament' }, { status: 400 });
    }
    if (tournament.max_re_entries > 0 && player.entries >= tournament.max_re_entries + 1) {
      return NextResponse.json({ error: 'Max re-entries reached' }, { status: 400 });
    }
    const reEntryChips =
      typeof body.chips === 'number' && body.chips > 0
        ? body.chips
        : tournament.starting_chips;
    db.prepare(
      "UPDATE tournament_players SET entries = entries + 1, chips = ?, status = 'active', finish_position = NULL, eliminated_at = NULL WHERE id = ?"
    ).run(reEntryChips, Number(playerId));

  } else if (action === 'addon') {
    if (tournament.addon_chips <= 0) {
      return NextResponse.json({ error: 'Add-ons not configured for this tournament' }, { status: 400 });
    }
    db.prepare(
      'UPDATE tournament_players SET addons = addons + 1, chips = chips + ? WHERE id = ?'
    ).run(tournament.addon_chips, Number(playerId));

  } else if (action === 'update_seat') {
    const seat = typeof body.seat_number === 'string' ? body.seat_number.trim() || null : null;
    db.prepare('UPDATE tournament_players SET seat_number = ? WHERE id = ?').run(seat, Number(playerId));

  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const updated = db.prepare('SELECT * FROM tournament_players WHERE id = ?').get(Number(playerId));
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; playerId: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id, playerId } = await params;
  const db = getDb();

  const player = db
    .prepare('SELECT * FROM tournament_players WHERE id = ? AND tournament_id = ?')
    .get(Number(playerId), Number(id));
  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

  db.prepare('DELETE FROM tournament_players WHERE id = ?').run(Number(playerId));
  return NextResponse.json({ success: true });
}

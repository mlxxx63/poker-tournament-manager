import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireOwner } from '@/lib/api-auth';
import getDb from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const db = getDb();
  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(Number(id));
  if (!tournament) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const blind_levels = db
    .prepare('SELECT * FROM blind_levels WHERE tournament_id = ? ORDER BY level_number')
    .all(Number(id));
  const payouts = db
    .prepare('SELECT * FROM payouts WHERE tournament_id = ? ORDER BY position')
    .all(Number(id));

  return NextResponse.json({ ...tournament as object, blind_levels, payouts });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const { name, date, buy_in_dollars, starting_chips, status } = body;

  const db = getDb();
  const existing = db.prepare('SELECT id FROM tournaments WHERE id = ?').get(Number(id));
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const fields: string[] = [];
  const values: unknown[] = [];

  if (name !== undefined) { fields.push('name = ?'); values.push(name.trim()); }
  if (date !== undefined) { fields.push('date = ?'); values.push(date); }
  if (buy_in_dollars !== undefined) { fields.push('buy_in = ?'); values.push(Math.round(buy_in_dollars * 100)); }
  if (starting_chips !== undefined) { fields.push('starting_chips = ?'); values.push(Number(starting_chips)); }
  if (status !== undefined) { fields.push('status = ?'); values.push(status); }

  if (fields.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

  values.push(Number(id));
  db.prepare(`UPDATE tournaments SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  const updated = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(Number(id));
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireOwner();
  if (error) return error;

  const { id } = await params;
  const db = getDb();
  const existing = db.prepare('SELECT id FROM tournaments WHERE id = ?').get(Number(id));
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  db.transaction(() => {
    db.prepare('DELETE FROM blind_levels WHERE tournament_id = ?').run(Number(id));
    db.prepare('DELETE FROM payouts WHERE tournament_id = ?').run(Number(id));
    db.prepare('DELETE FROM tournament_players WHERE tournament_id = ?').run(Number(id));
    db.prepare('DELETE FROM tournaments WHERE id = ?').run(Number(id));
  })();

  return NextResponse.json({ success: true });
}

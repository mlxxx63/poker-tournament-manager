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

  return NextResponse.json({ ...(tournament as object), blind_levels, payouts });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();

  const db = getDb();
  const existing = db.prepare('SELECT id FROM tournaments WHERE id = ?').get(Number(id));
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const fields: string[] = [];
  const values: unknown[] = [];

  const strFields = ['name', 'date', 'status'] as const;
  for (const f of strFields) {
    if (body[f] !== undefined) {
      fields.push(`${f} = ?`);
      values.push(typeof body[f] === 'string' ? body[f].trim() : body[f]);
    }
  }

  const centFields = ['buy_in_dollars', 'addon_cost_dollars'] as const;
  const centDbFields = ['buy_in', 'addon_cost'] as const;
  for (let i = 0; i < centFields.length; i++) {
    if (body[centFields[i]] !== undefined) {
      fields.push(`${centDbFields[i]} = ?`);
      values.push(Math.round(body[centFields[i]] * 100));
    }
  }

  const numFields = [
    'starting_chips', 'estimated_entries', 'max_re_entries',
    're_entry_period_level', 're_entry_chips', 'addon_chips',
  ] as const;
  for (const f of numFields) {
    if (body[f] !== undefined) {
      fields.push(`${f} = ?`);
      values.push(Number(body[f]));
    }
  }

  const boolFields = ['re_entries_allowed', 'addon_allowed'] as const;
  for (const f of boolFields) {
    if (body[f] !== undefined) {
      fields.push(`${f} = ?`);
      values.push(body[f] ? 1 : 0);
    }
  }

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

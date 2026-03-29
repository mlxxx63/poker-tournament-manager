import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import getDb from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const db = getDb();
  const levels = db
    .prepare('SELECT * FROM blind_levels WHERE tournament_id = ? ORDER BY level_number')
    .all(Number(id));

  return NextResponse.json(levels);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const db = getDb();

  const existing = db.prepare('SELECT id FROM tournaments WHERE id = ?').get(Number(id));
  if (!existing) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });

  const levels: {
    small_blind: number;
    big_blind: number;
    ante: number;
    duration_minutes: number;
    is_break: boolean;
  }[] = await req.json();

  db.transaction(() => {
    db.prepare('DELETE FROM blind_levels WHERE tournament_id = ?').run(Number(id));
    const insert = db.prepare(
      'INSERT INTO blind_levels (tournament_id, level_number, small_blind, big_blind, ante, duration_minutes, is_break) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    levels.forEach((level, idx) => {
      insert.run(
        Number(id),
        idx + 1,
        level.is_break ? 0 : Number(level.small_blind),
        level.is_break ? 0 : Number(level.big_blind),
        level.is_break ? 0 : Number(level.ante ?? 0),
        Number(level.duration_minutes),
        level.is_break ? 1 : 0
      );
    });
  })();

  const updated = db
    .prepare('SELECT * FROM blind_levels WHERE tournament_id = ? ORDER BY level_number')
    .all(Number(id));
  return NextResponse.json(updated);
}

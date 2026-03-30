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
  const payouts = db
    .prepare('SELECT * FROM payouts WHERE tournament_id = ? ORDER BY position')
    .all(Number(id));

  return NextResponse.json(payouts);
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

  const payouts: { position: number; amount_dollars: number; percentage?: number }[] = await req.json();

  db.transaction(() => {
    db.prepare('DELETE FROM payouts WHERE tournament_id = ?').run(Number(id));
    const insert = db.prepare(
      'INSERT INTO payouts (tournament_id, position, amount, percentage) VALUES (?, ?, ?, ?)'
    );
    payouts.forEach((p) => {
      const percentage = p.percentage ?? 0;
      const amount = percentage > 0 ? 0 : Math.round(p.amount_dollars * 100);
      insert.run(Number(id), p.position, amount, percentage);
    });
  })();

  const updated = db
    .prepare('SELECT * FROM payouts WHERE tournament_id = ? ORDER BY position')
    .all(Number(id));
  return NextResponse.json(updated);
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import getDb from '@/lib/db';
import { startTimer, pauseTimer, skipLevel, goBackLevel } from '@/lib/timer';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const tournamentId = Number(id);
  const db = getDb();

  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId) as
    | { id: number; status: string }
    | undefined;
  if (!tournament) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const action = body.action as string;

  switch (action) {
    case 'start':
      if (tournament.status === 'finished') {
        return NextResponse.json({ error: 'Tournament is finished' }, { status: 400 });
      }
      startTimer(tournamentId);
      break;

    case 'pause':
      if (tournament.status !== 'running') {
        return NextResponse.json({ error: 'Timer is not running' }, { status: 400 });
      }
      pauseTimer(tournamentId);
      break;

    case 'resume':
      if (tournament.status !== 'paused') {
        return NextResponse.json({ error: 'Timer is not paused' }, { status: 400 });
      }
      startTimer(tournamentId);
      break;

    case 'skip':
      skipLevel(tournamentId);
      break;

    case 'back':
      goBackLevel(tournamentId);
      break;

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const updated = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId);
  return NextResponse.json(updated);
}

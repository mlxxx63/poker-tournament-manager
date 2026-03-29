import { NextRequest, NextResponse } from 'next/server';
import { requireOwner, sessionUser } from '@/lib/api-auth';
import getDb from '@/lib/db';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireOwner();
  if (error) return error;

  const { id } = await params;
  const db = getDb();
  const target = db.prepare('SELECT id, username FROM users WHERE id = ?').get(Number(id)) as
    | { id: number; username: string }
    | undefined;

  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Prevent deleting yourself
  const me = sessionUser(session!);
  if (target.username === me.email) {
    return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(Number(id));
  return NextResponse.json({ success: true });
}

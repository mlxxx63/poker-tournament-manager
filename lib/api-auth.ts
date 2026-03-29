import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';

type AuthResult =
  | { error: NextResponse; session: null }
  | { error: null; session: Session };

export async function requireAuth(): Promise<AuthResult> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), session: null };
  }
  return { error: null, session };
}

export async function requireOwner(): Promise<AuthResult> {
  const result = await requireAuth();
  if (result.error) return result;

  const user = result.session.user as { role?: string };
  if (user.role !== 'owner') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), session: null };
  }
  return { error: null, session: result.session };
}

export function sessionUser(session: Session) {
  return session.user as { name?: string; email?: string; role?: string };
}

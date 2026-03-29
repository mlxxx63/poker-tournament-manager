import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/api-auth';
import getDb from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET() {
  const { error } = await requireOwner();
  if (error) return error;

  const db = getDb();
  const users = db
    .prepare('SELECT id, username, display_name, role, created_at FROM users ORDER BY created_at')
    .all();

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const { error } = await requireOwner();
  if (error) return error;

  const body = await req.json();
  const { username, display_name, password, role } = body;

  if (!username || !display_name || !password) {
    return NextResponse.json({ error: 'username, display_name, and password are required' }, { status: 400 });
  }
  if (!['owner', 'operator'].includes(role)) {
    return NextResponse.json({ error: 'role must be owner or operator' }, { status: 400 });
  }

  const db = getDb();
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const result = db
      .prepare('INSERT INTO users (username, display_name, password_hash, role) VALUES (?, ?, ?, ?)')
      .run(username.trim(), display_name.trim(), passwordHash, role);

    return NextResponse.json({ id: result.lastInsertRowid, username, display_name, role }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }
    throw e;
  }
}

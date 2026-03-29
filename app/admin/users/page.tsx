import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notFound } from 'next/navigation';
import AdminShell from '../_components/AdminShell';
import getDb from '@/lib/db';
import UsersClient from './_components/UsersClient';

export interface AdminUser {
  id: number;
  username: string;
  display_name: string;
  role: string;
  created_at: string;
}

export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;

  // Only owners can access this page
  if (user?.role !== 'owner') notFound();

  const db = getDb();
  const users = db
    .prepare('SELECT id, username, display_name, role, created_at FROM users ORDER BY created_at')
    .all() as AdminUser[];

  return (
    <AdminShell>
      <UsersClient initialUsers={users} />
    </AdminShell>
  );
}

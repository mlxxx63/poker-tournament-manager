import { ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import AdminNav from './AdminNav';

export default async function AdminShell({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { name?: string; role?: string } | undefined;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      <AdminNav userName={user?.name ?? ''} userRole={user?.role ?? 'operator'} />
      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        {/* Spacer for mobile hamburger button */}
        <div className="h-12 lg:hidden shrink-0" />
        {children}
      </div>
    </div>
  );
}

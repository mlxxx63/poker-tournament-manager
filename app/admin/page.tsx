import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import SignOutButton from './_components/SignOutButton';

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { name?: string; role?: string } | undefined;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Top nav */}
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">♠</span>
          <span className="font-bold text-lg">Poker Tournament</span>
          <span className="text-gray-500 text-sm ml-2">Admin</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">
            {user?.name}
            {user?.role === 'owner' && (
              <span className="ml-2 text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">
                Owner
              </span>
            )}
          </span>
          <SignOutButton />
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-400 mb-8">Welcome back, {user?.name}.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: '🏆', label: 'Tournaments', desc: 'Create & manage tournaments', phase: 2 },
            { icon: '👥', label: 'Players', desc: 'Track entries & eliminations', phase: 3 },
            { icon: '📺', label: 'Display', desc: 'Tournament clock for the TV', phase: 4 },
            { icon: '⏱', label: 'Live Controls', desc: 'Start, pause, skip levels', phase: 5 },
            { icon: '📜', label: 'History', desc: 'Past tournament results', phase: 2 },
            { icon: '👤', label: 'Admin Users', desc: 'Manage organizer accounts', phase: 2 },
          ].map(({ icon, label, desc, phase }) => (
            <div
              key={label}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5 opacity-60"
            >
              <div className="text-2xl mb-2">{icon}</div>
              <div className="font-semibold text-sm">{label}</div>
              <div className="text-gray-500 text-xs mt-1">{desc}</div>
              <div className="mt-3 text-xs text-purple-400">Coming in Phase {phase}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-green-500/10 border border-green-500/20 rounded-xl p-5">
          <p className="text-green-400 text-sm font-medium">
            ✓ Phase 1 complete — Auth is working! Logged in as{' '}
            <strong>{user?.name}</strong> ({user?.role}).
          </p>
        </div>
      </main>
    </div>
  );
}

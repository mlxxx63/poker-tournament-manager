import Link from 'next/link';
import AdminShell from './_components/AdminShell';
import getDb from '@/lib/db';

interface Tournament {
  id: number;
  name: string;
  date: string;
  buy_in: number;
  starting_chips: number;
  status: string;
  current_level: number;
  total_prize_pool: number;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  setup: 'bg-gray-700 text-gray-300',
  running: 'bg-green-600 text-white',
  paused: 'bg-yellow-600 text-white',
  finished: 'bg-gray-600 text-gray-300',
};

function formatDollars(cents: number) {
  return `$${(cents / 100).toLocaleString('en-CA', { minimumFractionDigits: 0 })}`;
}

export default async function AdminDashboard() {
  const db = getDb();
  const tournaments = db
    .prepare('SELECT * FROM tournaments ORDER BY created_at DESC')
    .all() as Tournament[];

  const active = tournaments.filter((t) => t.status === 'running' || t.status === 'paused');
  const upcoming = tournaments.filter((t) => t.status === 'setup');
  const finished = tournaments.filter((t) => t.status === 'finished');

  return (
    <AdminShell>
      <main className="flex-1 px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-gray-400 text-sm mt-1">Manage your poker tournaments</p>
          </div>
          <Link
            href="/admin/tournament/new"
            className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            + New Tournament
          </Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Active', value: active.length, color: 'text-green-400' },
            { label: 'Upcoming', value: upcoming.length, color: 'text-purple-400' },
            { label: 'Finished', value: finished.length, color: 'text-gray-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
              <p className="text-gray-400 text-sm mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Tournament list */}
        {tournaments.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 border-dashed rounded-xl p-12 text-center">
            <p className="text-4xl mb-3">♠</p>
            <p className="text-white font-semibold mb-1">No tournaments yet</p>
            <p className="text-gray-400 text-sm mb-5">Create your first tournament to get started.</p>
            <Link
              href="/admin/tournament/new"
              className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition"
            >
              Create Tournament
            </Link>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Tournament</th>
                  <th className="text-left px-5 py-3">Date</th>
                  <th className="text-left px-5 py-3">Buy-in</th>
                  <th className="text-left px-5 py-3">Chips</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-right px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tournaments.map((t) => (
                  <tr key={t.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50 transition">
                    <td className="px-5 py-3.5 font-medium text-white">{t.name}</td>
                    <td className="px-5 py-3.5 text-gray-400">{t.date}</td>
                    <td className="px-5 py-3.5 text-gray-300">{formatDollars(t.buy_in)}</td>
                    <td className="px-5 py-3.5 text-gray-300">{t.starting_chips.toLocaleString()}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${STATUS_STYLES[t.status] ?? STATUS_STYLES.setup}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {(t.status === 'running' || t.status === 'paused') && (
                          <Link
                            href={`/display/${t.id}`}
                            target="_blank"
                            className="text-purple-500 hover:text-purple-300 text-xs transition"
                            title="Open display"
                          >
                            Display ↗
                          </Link>
                        )}
                        <Link
                          href={`/admin/tournament/${t.id}`}
                          className="text-purple-400 hover:text-purple-300 text-xs font-medium transition"
                        >
                          Manage →
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </AdminShell>
  );
}

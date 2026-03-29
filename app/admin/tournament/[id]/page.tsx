import { notFound } from 'next/navigation';
import Link from 'next/link';
import AdminShell from '../../_components/AdminShell';
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
  estimated_entries: number;
  re_entries_allowed: number;
  max_re_entries: number;
  re_entry_period_level: number;
  re_entry_chips: number;
  addon_allowed: number;
  addon_chips: number;
  addon_cost: number;
  created_at: string;
}

interface BlindLevel {
  id: number;
  level_number: number;
  small_blind: number;
  big_blind: number;
  ante: number;
  duration_minutes: number;
  is_break: number;
}

interface Payout {
  id: number;
  position: number;
  amount: number;
}

function formatDollars(cents: number) {
  return `$${(cents / 100).toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getDb();

  const tournament = db
    .prepare('SELECT * FROM tournaments WHERE id = ?')
    .get(Number(id)) as Tournament | undefined;

  if (!tournament) notFound();

  const blindLevels = db
    .prepare('SELECT * FROM blind_levels WHERE tournament_id = ? ORDER BY level_number')
    .all(Number(id)) as BlindLevel[];

  const payouts = db
    .prepare('SELECT * FROM payouts WHERE tournament_id = ? ORDER BY position')
    .all(Number(id)) as Payout[];

  const STATUS_STYLES: Record<string, string> = {
    setup: 'bg-gray-700 text-gray-300',
    running: 'bg-green-600 text-white',
    paused: 'bg-yellow-600 text-white',
    finished: 'bg-gray-600 text-gray-300',
  };

  return (
    <AdminShell>
      <main className="flex-1 px-8 py-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link href="/admin" className="text-gray-500 hover:text-gray-300 text-sm transition">
                ← Dashboard
              </Link>
            </div>
            <h1 className="text-2xl font-bold">{tournament.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-gray-400 text-sm">{tournament.date}</span>
              <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${STATUS_STYLES[tournament.status] ?? STATUS_STYLES.setup}`}>
                {tournament.status}
              </span>
            </div>
          </div>
          <Link
            href={`/admin/tournament/${tournament.id}/edit`}
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            Edit Tournament
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-xs text-gray-500 mb-1">Buy-in</p>
            <p className="text-xl font-bold">{formatDollars(tournament.buy_in)}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-xs text-gray-500 mb-1">Starting Chips</p>
            <p className="text-xl font-bold">{tournament.starting_chips.toLocaleString()}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-xs text-gray-500 mb-1">Levels</p>
            <p className="text-xl font-bold">{blindLevels.filter((l) => !l.is_break).length}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Blind Structure */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-800">
              <h2 className="text-sm font-semibold text-gray-200">Blind Structure</h2>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 uppercase tracking-wide border-b border-gray-800">
                  <th className="text-left px-5 py-2">#</th>
                  <th className="text-left px-5 py-2">Blinds</th>
                  <th className="text-left px-5 py-2">Ante</th>
                  <th className="text-left px-5 py-2">Min</th>
                </tr>
              </thead>
              <tbody>
                {blindLevels.map((level) => (
                  <tr key={level.id} className={`border-b border-gray-800 last:border-0 ${level.is_break ? 'bg-blue-900/10' : ''}`}>
                    <td className="px-5 py-2.5 text-gray-500">{level.is_break ? '—' : level.level_number}</td>
                    <td className="px-5 py-2.5">
                      {level.is_break ? (
                        <span className="text-blue-400 italic">Break</span>
                      ) : (
                        <span className="text-white">{level.small_blind}/{level.big_blind}</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-gray-400">{level.is_break ? '—' : (level.ante || '—')}</td>
                    <td className="px-5 py-2.5 text-gray-400">{level.duration_minutes}m</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Payouts */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-800">
              <h2 className="text-sm font-semibold text-gray-200">Prize Payouts</h2>
            </div>
            {payouts.length === 0 ? (
              <p className="px-5 py-6 text-gray-600 text-sm">No payouts set.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 uppercase tracking-wide border-b border-gray-800">
                    <th className="text-left px-5 py-2">Place</th>
                    <th className="text-left px-5 py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p) => (
                    <tr key={p.id} className="border-b border-gray-800 last:border-0">
                      <td className="px-5 py-2.5 text-gray-300">{ordinal(p.position)}</td>
                      <td className="px-5 py-2.5 text-white font-medium">{formatDollars(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Re-entries & Add-ons summary */}
        <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-200 mb-3">Re-entries & Add-ons</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500 mb-1">Re-entries</p>
              {tournament.re_entries_allowed ? (
                <div className="space-y-0.5">
                  <p className="text-white">
                    {tournament.max_re_entries === 0 ? 'Unlimited' : `Max ${tournament.max_re_entries}`} per player
                  </p>
                  <p className="text-gray-400 text-xs">
                    Period closes after level {tournament.re_entry_period_level || '—'}
                  </p>
                  <p className="text-gray-400 text-xs">
                    Stack: {tournament.re_entry_chips > 0
                      ? tournament.re_entry_chips.toLocaleString() + ' chips'
                      : 'Same as starting (' + tournament.starting_chips.toLocaleString() + ')'}
                  </p>
                </div>
              ) : (
                <p className="text-gray-500">Not allowed</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Add-ons</p>
              {tournament.addon_allowed ? (
                <div className="space-y-0.5">
                  <p className="text-white">{tournament.addon_chips.toLocaleString()} chips</p>
                  <p className="text-gray-400 text-xs">
                    Cost: {tournament.addon_cost > 0 ? formatDollars(tournament.addon_cost) : formatDollars(tournament.buy_in)}
                  </p>
                </div>
              ) : (
                <p className="text-gray-500">Not allowed</p>
              )}
            </div>
          </div>
        </div>

        {/* Coming soon */}
        <div className="mt-4 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-500 text-sm">
            Player management and live controls coming in Phase 3 & 5.
          </p>
        </div>
      </main>
    </AdminShell>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface BlindLevel {
  small_blind: number | '';
  big_blind: number | '';
  ante: number | '';
  duration_minutes: number | '';
  is_break: boolean;
}

interface Payout {
  position: number;
  amount_dollars: number | '';
}

const DEFAULT_BLIND_LEVELS: BlindLevel[] = [
  { small_blind: 25,  big_blind: 50,   ante: 0,   duration_minutes: 20, is_break: false },
  { small_blind: 50,  big_blind: 100,  ante: 0,   duration_minutes: 20, is_break: false },
  { small_blind: 75,  big_blind: 150,  ante: 0,   duration_minutes: 20, is_break: false },
  { small_blind: 0,   big_blind: 0,    ante: 0,   duration_minutes: 15, is_break: true  },
  { small_blind: 100, big_blind: 200,  ante: 25,  duration_minutes: 20, is_break: false },
  { small_blind: 150, big_blind: 300,  ante: 25,  duration_minutes: 20, is_break: false },
  { small_blind: 200, big_blind: 400,  ante: 50,  duration_minutes: 20, is_break: false },
  { small_blind: 0,   big_blind: 0,    ante: 0,   duration_minutes: 15, is_break: true  },
  { small_blind: 300, big_blind: 600,  ante: 75,  duration_minutes: 20, is_break: false },
  { small_blind: 500, big_blind: 1000, ante: 100, duration_minutes: 20, is_break: false },
];

function ordinal(n: number) {
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return n + (s[(v-20)%10] ?? s[v] ?? s[0]);
}

export default function CreateTournamentForm() {
  const router = useRouter();

  // Basic info
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [buyIn, setBuyIn] = useState<number | ''>('');
  const [startingChips, setStartingChips] = useState<number | ''>(10000);

  // Blind structure
  const [levels, setLevels] = useState<BlindLevel[]>(DEFAULT_BLIND_LEVELS);

  // Payouts
  const [payouts, setPayouts] = useState<Payout[]>([
    { position: 1, amount_dollars: '' },
    { position: 2, amount_dollars: '' },
    { position: 3, amount_dollars: '' },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // ── Blind level helpers ──────────────────────────────────────────────────

  function updateLevel<K extends keyof BlindLevel>(idx: number, key: K, value: BlindLevel[K]) {
    setLevels((prev) => prev.map((l, i) => (i === idx ? { ...l, [key]: value } : l)));
  }

  function addLevel() {
    setLevels((prev) => [
      ...prev,
      { small_blind: '', big_blind: '', ante: 0, duration_minutes: 20, is_break: false },
    ]);
  }

  function addBreak() {
    setLevels((prev) => [
      ...prev,
      { small_blind: 0, big_blind: 0, ante: 0, duration_minutes: 15, is_break: true },
    ]);
  }

  function removeLevel(idx: number) {
    setLevels((prev) => prev.filter((_, i) => i !== idx));
  }

  // ── Payout helpers ───────────────────────────────────────────────────────

  function updatePayout(idx: number, amount: number | '') {
    setPayouts((prev) => prev.map((p, i) => (i === idx ? { ...p, amount_dollars: amount } : p)));
  }

  function addPayout() {
    setPayouts((prev) => [...prev, { position: prev.length + 1, amount_dollars: '' }]);
  }

  function removePayout(idx: number) {
    setPayouts((prev) =>
      prev.filter((_, i) => i !== idx).map((p, i) => ({ ...p, position: i + 1 }))
    );
  }

  const totalPayout = payouts.reduce(
    (sum, p) => sum + (typeof p.amount_dollars === 'number' ? p.amount_dollars : 0),
    0
  );

  // ── Submit ───────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (levels.length === 0) { setError('Add at least one blind level.'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          date,
          buy_in_dollars: buyIn === '' ? 0 : buyIn,
          starting_chips: startingChips,
          blind_levels: levels.map((l) => ({
            ...l,
            small_blind: l.small_blind === '' ? 0 : l.small_blind,
            big_blind: l.big_blind === '' ? 0 : l.big_blind,
            ante: l.ante === '' ? 0 : l.ante,
            duration_minutes: l.duration_minutes === '' ? 20 : l.duration_minutes,
          })),
          payouts: payouts
            .filter((p) => typeof p.amount_dollars === 'number' && p.amount_dollars > 0)
            .map((p) => ({ position: p.position, amount_dollars: p.amount_dollars })),
        }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to create tournament.'); return; }
      router.push(`/admin/tournament/${data.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const inputClass =
    'w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500';

  return (
    <main className="flex-1 px-8 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">New Tournament</h1>
        <p className="text-gray-400 text-sm mt-1">Set up the tournament details, blind structure, and prize payouts.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">

        {/* ── Section 1: Tournament Info ── */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-200 mb-5">Tournament Info</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs text-gray-400 mb-1.5">Tournament Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Friday Night Poker"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Date *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Buy-in ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={buyIn}
                onChange={(e) => setBuyIn(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="20.00"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Starting Chips *</label>
              <input
                type="number"
                min="1"
                value={startingChips}
                onChange={(e) => setStartingChips(e.target.value === '' ? '' : Number(e.target.value))}
                required
                placeholder="10000"
                className={inputClass}
              />
            </div>
          </div>
        </section>

        {/* ── Section 2: Blind Structure ── */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-gray-200">Blind Structure</h2>
              <p className="text-xs text-gray-500 mt-0.5">Pre-loaded with a common home-game structure. Edit as needed.</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={addBreak} className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1.5 rounded-lg transition">
                + Break
              </button>
              <button type="button" onClick={addLevel} className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg transition">
                + Level
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase tracking-wide border-b border-gray-800">
                  <th className="text-left pb-2 pr-3 w-8">#</th>
                  <th className="text-left pb-2 pr-3">Small Blind</th>
                  <th className="text-left pb-2 pr-3">Big Blind</th>
                  <th className="text-left pb-2 pr-3">Ante</th>
                  <th className="text-left pb-2 pr-3">Minutes</th>
                  <th className="text-left pb-2 pr-3">Type</th>
                  <th className="pb-2 w-8" />
                </tr>
              </thead>
              <tbody className="space-y-1">
                {levels.map((level, idx) => {
                  const blindLevelNum = levels.slice(0, idx + 1).filter((l) => !l.is_break).length;
                  return (
                    <tr key={idx} className={`border-b border-gray-800/50 last:border-0 ${level.is_break ? 'bg-blue-900/10' : ''}`}>
                      <td className="py-2 pr-3 text-gray-500 text-xs">
                        {level.is_break ? '—' : blindLevelNum}
                      </td>
                      {level.is_break ? (
                        <td colSpan={3} className="py-2 pr-3 text-blue-400 text-xs italic">
                          Break
                        </td>
                      ) : (
                        <>
                          <td className="py-2 pr-3">
                            <input
                              type="number" min="0"
                              value={level.small_blind}
                              onChange={(e) => updateLevel(idx, 'small_blind', e.target.value === '' ? '' : Number(e.target.value))}
                              className="w-20 bg-gray-800 border border-gray-700 text-white rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                            />
                          </td>
                          <td className="py-2 pr-3">
                            <input
                              type="number" min="0"
                              value={level.big_blind}
                              onChange={(e) => updateLevel(idx, 'big_blind', e.target.value === '' ? '' : Number(e.target.value))}
                              className="w-20 bg-gray-800 border border-gray-700 text-white rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                            />
                          </td>
                          <td className="py-2 pr-3">
                            <input
                              type="number" min="0"
                              value={level.ante}
                              onChange={(e) => updateLevel(idx, 'ante', e.target.value === '' ? '' : Number(e.target.value))}
                              className="w-16 bg-gray-800 border border-gray-700 text-white rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                            />
                          </td>
                        </>
                      )}
                      <td className="py-2 pr-3">
                        <input
                          type="number" min="1"
                          value={level.duration_minutes}
                          onChange={(e) => updateLevel(idx, 'duration_minutes', e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-16 bg-gray-800 border border-gray-700 text-white rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${level.is_break ? 'bg-blue-800 text-blue-300' : 'bg-gray-700 text-gray-400'}`}>
                          {level.is_break ? 'Break' : 'Level'}
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        <button
                          type="button"
                          onClick={() => removeLevel(idx)}
                          className="text-gray-600 hover:text-red-400 text-xs transition"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-600 mt-3">
            {levels.filter((l) => !l.is_break).length} levels ·{' '}
            {levels.filter((l) => l.is_break).length} breaks ·{' '}
            {levels.reduce((s, l) => s + (typeof l.duration_minutes === 'number' ? l.duration_minutes : 0), 0)} min total
          </p>
        </section>

        {/* ── Section 3: Prize Payouts ── */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-gray-200">Prize Payouts</h2>
              <p className="text-xs text-gray-500 mt-0.5">Optional — enter payout amounts in dollars.</p>
            </div>
            <button
              type="button"
              onClick={addPayout}
              className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg transition"
            >
              + Place
            </button>
          </div>

          <div className="space-y-2">
            {payouts.map((payout, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-12 shrink-0">{ordinal(payout.position)}</span>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={payout.amount_dollars}
                    onChange={(e) => updatePayout(idx, e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0.00"
                    className="w-36 bg-gray-800 border border-gray-700 text-white rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removePayout(idx)}
                  className="text-gray-600 hover:text-red-400 text-xs transition"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {payouts.length > 0 && (
            <p className="text-xs text-gray-500 mt-4">
              Total payout: <span className="text-white font-medium">${totalPayout.toFixed(2)}</span>
              {buyIn && typeof buyIn === 'number' && buyIn > 0 && (
                <span className="ml-2 text-gray-600">
                  (buy-in is ${buyIn.toFixed(2)} — prize pool depends on entries)
                </span>
              )}
            </p>
          )}
        </section>

        {/* ── Submit ── */}
        {error && (
          <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg transition text-sm"
          >
            {submitting ? 'Creating...' : 'Create Tournament'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin')}
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium px-6 py-2.5 rounded-lg transition text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </main>
  );
}

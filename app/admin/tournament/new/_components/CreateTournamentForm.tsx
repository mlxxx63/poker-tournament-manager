'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import BlindStructureBuilder, { BlindLevel } from '@/app/admin/_components/BlindStructureBuilder';
import PayoutEditor, { Payout } from '@/app/admin/_components/PayoutEditor';

const DEFAULT_LEVELS: BlindLevel[] = [
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

export default function CreateTournamentForm() {
  const router = useRouter();

  // ── Basic info ────────────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [buyIn, setBuyIn] = useState<number | ''>('');
  const [startingChips, setStartingChips] = useState<number | ''>(10000);
  const [estimatedEntries, setEstimatedEntries] = useState<number | ''>('');

  // ── Re-entries ────────────────────────────────────────────────────────────
  const [reEntriesAllowed, setReEntriesAllowed] = useState(false);
  const [maxReEntries, setMaxReEntries] = useState<'unlimited' | 1 | 2 | 3>('unlimited');
  const [reEntryPeriodLevel, setReEntryPeriodLevel] = useState<number | ''>(6);
  // ── Add-ons ───────────────────────────────────────────────────────────────
  const [addonAllowed, setAddonAllowed] = useState(false);
  const [addonChips, setAddonChips] = useState<number | ''>('');
  const [addonCostSameAsBuyIn, setAddonCostSameAsBuyIn] = useState(true);
  const [addonCostDollars, setAddonCostDollars] = useState<number | ''>('');

  // ── Blind structure ───────────────────────────────────────────────────────
  const [levels, setLevels] = useState<BlindLevel[]>(DEFAULT_LEVELS);

  // ── Payouts ───────────────────────────────────────────────────────────────
  const [payouts, setPayouts] = useState<Payout[]>([
    { position: 1, amount_dollars: '' },
    { position: 2, amount_dollars: '' },
    { position: 3, amount_dollars: '' },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // ── Submit ────────────────────────────────────────────────────────────────

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
          starting_chips: startingChips === '' ? 10000 : startingChips,
          estimated_entries: estimatedEntries === '' ? 0 : estimatedEntries,
          re_entries_allowed: reEntriesAllowed,
          max_re_entries: maxReEntries === 'unlimited' ? 0 : maxReEntries,
          re_entry_period_level: reEntryPeriodLevel === '' ? 0 : reEntryPeriodLevel,
          re_entry_chips: 0,
          addon_allowed: addonAllowed,
          addon_chips: addonChips === '' ? 0 : addonChips,
          addon_cost_dollars: addonCostSameAsBuyIn ? (buyIn === '' ? 0 : buyIn) : (addonCostDollars === '' ? 0 : addonCostDollars),
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

  const inputClass =
    'w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500';

  const toggle = (on: boolean, onClick: () => void, label: string) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
        on ? 'bg-purple-600 border-purple-600 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-500'
      }`}
    >
      {label}
    </button>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="flex-1 px-8 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">New Tournament</h1>
        <p className="text-gray-400 text-sm mt-1">Set up details, blind structure, and prize payouts.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── 1. Tournament Info ── */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-200 mb-5">Tournament Info</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs text-gray-400 mb-1.5">Tournament Name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Friday Night Poker" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Date *</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Buy-in ($)</label>
              <input type="number" min="0" step="0.01" value={buyIn} onChange={(e) => setBuyIn(e.target.value === '' ? '' : Number(e.target.value))} placeholder="20.00" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Starting Chips *</label>
              <input type="number" min="1" value={startingChips} onChange={(e) => setStartingChips(e.target.value === '' ? '' : Number(e.target.value))} required placeholder="10000" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">
                Estimated Entries
                <span className="ml-1 text-gray-600">(used for prize pool suggestions)</span>
              </label>
              <input type="number" min="1" value={estimatedEntries} onChange={(e) => setEstimatedEntries(e.target.value === '' ? '' : Number(e.target.value))} placeholder="10" className={inputClass} />
            </div>
          </div>
        </section>

        {/* ── 2. Re-entries & Add-ons ── */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-200 mb-1">Re-entries & Add-ons</h2>
          <p className="text-xs text-gray-500 mb-5">
            Re-entry: eliminated players pay buy-in again for a fresh stack. Add-on: all players can buy extra chips at the end of the re-entry period.
          </p>

          {/* Re-entries toggle */}
          <div className="mb-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm font-medium text-gray-300">Allow re-entries?</span>
              <div className="flex gap-1">
                {toggle(reEntriesAllowed, () => setReEntriesAllowed(true), 'Yes')}
                {toggle(!reEntriesAllowed, () => setReEntriesAllowed(false), 'No')}
              </div>
            </div>

            {reEntriesAllowed && (
              <div className="pl-4 border-l-2 border-purple-800 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Max re-entries per player</label>
                    <select
                      value={maxReEntries}
                      onChange={(e) => setMaxReEntries(e.target.value === 'unlimited' ? 'unlimited' : Number(e.target.value) as 1 | 2 | 3)}
                      className={inputClass}
                    >
                      <option value="unlimited">Unlimited</option>
                      <option value={1}>1 re-entry</option>
                      <option value={2}>2 re-entries</option>
                      <option value={3}>3 re-entries</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">
                      Re-entry period closes after level
                      <span className="ml-1 text-gray-600">(0 = open all tournament)</span>
                    </label>
                    <input
                      type="number" min="0"
                      value={reEntryPeriodLevel}
                      onChange={(e) => setReEntryPeriodLevel(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="6"
                      className={inputClass}
                    />
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Add-ons toggle */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-sm font-medium text-gray-300">Allow add-ons?</span>
              <div className="flex gap-1">
                {toggle(addonAllowed, () => setAddonAllowed(true), 'Yes')}
                {toggle(!addonAllowed, () => setAddonAllowed(false), 'No')}
              </div>
            </div>

            {addonAllowed && (
              <div className="pl-4 border-l-2 border-purple-800 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Add-on chips</label>
                  <input
                    type="number" min="1"
                    value={addonChips}
                    onChange={(e) => setAddonChips(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="5000"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Add-on cost</label>
                  <div className="flex gap-2 mb-2">
                    {toggle(addonCostSameAsBuyIn, () => setAddonCostSameAsBuyIn(true), 'Same as buy-in')}
                    {toggle(!addonCostSameAsBuyIn, () => setAddonCostSameAsBuyIn(false), 'Custom')}
                  </div>
                  {!addonCostSameAsBuyIn && (
                    <div className="relative mt-2">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number" min="0" step="0.01"
                        value={addonCostDollars}
                        onChange={(e) => setAddonCostDollars(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="10.00"
                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── 3. Blind Structure ── */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-200 mb-1">Blind Structure</h2>
          <p className="text-xs text-gray-500 mb-5">Pre-loaded with a common 10-level home game structure. Edit as needed.</p>
          <BlindStructureBuilder levels={levels} onChange={setLevels} />
        </section>

        {/* ── 4. Prize Payouts ── */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-200 mb-1">Prize Payouts</h2>
          <p className="text-xs text-gray-500 mb-5">Optional. Auto mode suggests splits based on your buy-in and estimated entries.</p>
          <PayoutEditor
            buyInDollars={buyIn}
            estimatedEntries={estimatedEntries}
            payouts={payouts}
            onChange={setPayouts}
          />
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

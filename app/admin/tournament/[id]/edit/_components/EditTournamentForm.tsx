'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import BlindStructureBuilder, { BlindLevel } from '@/app/admin/_components/BlindStructureBuilder';
import PayoutEditor, { Payout } from '@/app/admin/_components/PayoutEditor';

interface DbBlindLevel {
  level_number: number;
  small_blind: number;
  big_blind: number;
  ante: number;
  duration_minutes: number;
  is_break: number;
}

interface DbPayout {
  position: number;
  amount: number; // cents
}

interface Props {
  tournament: Record<string, unknown>;
  initialLevels: DbBlindLevel[];
  initialPayouts: DbPayout[];
}

function toNum(val: unknown, fallback = 0): number {
  return typeof val === 'number' ? val : fallback;
}

export default function EditTournamentForm({ tournament, initialLevels, initialPayouts }: Props) {
  const router = useRouter();
  const id = tournament.id as number;

  // ── Basic info ─────────────────────────────────────────────────────────
  const [name, setName] = useState(String(tournament.name ?? ''));
  const [date, setDate] = useState(String(tournament.date ?? ''));
  const [buyIn, setBuyIn] = useState<number | ''>(toNum(tournament.buy_in) / 100 || '');
  const [startingChips, setStartingChips] = useState<number | ''>(toNum(tournament.starting_chips, 10000));
  const [estimatedEntries, setEstimatedEntries] = useState<number | ''>(toNum(tournament.estimated_entries) || '');

  // ── Re-entries ─────────────────────────────────────────────────────────
  const [reEntriesAllowed, setReEntriesAllowed] = useState(Boolean(tournament.re_entries_allowed));
  const storedMax = toNum(tournament.max_re_entries);
  const [maxReEntries, setMaxReEntries] = useState<'unlimited' | 1 | 2 | 3>(
    storedMax === 0 ? 'unlimited' : (storedMax as 1 | 2 | 3)
  );
  const [reEntryPeriodLevel, setReEntryPeriodLevel] = useState<number | ''>(
    toNum(tournament.re_entry_period_level) || ''
  );
  const storedReChips = toNum(tournament.re_entry_chips);
  const [reEntryChipsCustom, setReEntryChipsCustom] = useState(storedReChips > 0);
  const [reEntryChips, setReEntryChips] = useState<number | ''>(storedReChips || '');

  // ── Add-ons ────────────────────────────────────────────────────────────
  const [addonAllowed, setAddonAllowed] = useState(Boolean(tournament.addon_allowed));
  const [addonChips, setAddonChips] = useState<number | ''>(toNum(tournament.addon_chips) || '');
  const storedAddonCost = toNum(tournament.addon_cost) / 100;
  const [addonCostSameAsBuyIn, setAddonCostSameAsBuyIn] = useState(storedAddonCost === 0);
  const [addonCostDollars, setAddonCostDollars] = useState<number | ''>(storedAddonCost || '');

  // ── Blind structure ────────────────────────────────────────────────────
  const [levels, setLevels] = useState<BlindLevel[]>(
    initialLevels.map((l) => ({
      small_blind: l.small_blind,
      big_blind: l.big_blind,
      ante: l.ante,
      duration_minutes: l.duration_minutes,
      is_break: Boolean(l.is_break),
    }))
  );

  // ── Payouts ────────────────────────────────────────────────────────────
  const [payouts, setPayouts] = useState<Payout[]>(
    initialPayouts.map((p) => ({
      position: p.position,
      amount_dollars: p.amount / 100,
    }))
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const isRunning = tournament.status !== 'setup';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaved(false);
    if (levels.length === 0) { setError('Add at least one blind level.'); return; }

    setSubmitting(true);
    try {
      // Update basic info + re-entries
      const basicRes = await fetch(`/api/tournaments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          date,
          buy_in_dollars: buyIn === '' ? 0 : buyIn,
          starting_chips: startingChips === '' ? 10000 : startingChips,
          estimated_entries: estimatedEntries === '' ? 0 : estimatedEntries,
          re_entries_allowed: reEntriesAllowed,
          max_re_entries: maxReEntries === 'unlimited' ? 0 : maxReEntries,
          re_entry_period_level: reEntryPeriodLevel === '' ? 0 : reEntryPeriodLevel,
          re_entry_chips: reEntryChipsCustom ? (reEntryChips === '' ? 0 : reEntryChips) : 0,
          addon_allowed: addonAllowed,
          addon_chips: addonChips === '' ? 0 : addonChips,
          addon_cost_dollars: addonCostSameAsBuyIn ? (buyIn === '' ? 0 : buyIn) : (addonCostDollars === '' ? 0 : addonCostDollars),
        }),
      });
      if (!basicRes.ok) {
        const d = await basicRes.json();
        setError(d.error ?? 'Failed to save tournament info.'); return;
      }

      // Update blind levels
      const levelsRes = await fetch(`/api/tournaments/${id}/blind-levels`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          levels.map((l) => ({
            small_blind: l.small_blind === '' ? 0 : l.small_blind,
            big_blind: l.big_blind === '' ? 0 : l.big_blind,
            ante: l.ante === '' ? 0 : l.ante,
            duration_minutes: l.duration_minutes === '' ? 20 : l.duration_minutes,
            is_break: l.is_break,
          }))
        ),
      });
      if (!levelsRes.ok) { setError('Failed to save blind levels.'); return; }

      // Update payouts
      const payoutsRes = await fetch(`/api/tournaments/${id}/payouts`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          payouts
            .filter((p) => typeof p.amount_dollars === 'number' && p.amount_dollars > 0)
            .map((p) => ({ position: p.position, amount_dollars: p.amount_dollars }))
        ),
      });
      if (!payoutsRes.ok) { setError('Failed to save payouts.'); return; }

      setSaved(true);
      setTimeout(() => router.push(`/admin/tournament/${id}`), 800);
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

  return (
    <main className="flex-1 px-8 py-8 max-w-5xl">
      <div className="mb-6">
        <button
          type="button"
          onClick={() => router.push(`/admin/tournament/${id}`)}
          className="text-gray-500 hover:text-gray-300 text-sm transition mb-3 block"
        >
          ← Back to tournament
        </button>
        <h1 className="text-2xl font-bold">Edit Tournament</h1>
        <p className="text-gray-400 text-sm mt-1">{String(tournament.name)}</p>
      </div>

      {isRunning && (
        <div className="mb-6 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
          <p className="text-yellow-400 text-sm">
            ⚠ This tournament is currently <strong>{String(tournament.status)}</strong>. Editing the blind structure or starting chips while it's running may affect the live display.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* 1. Tournament Info */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-200 mb-5">Tournament Info</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs text-gray-400 mb-1.5">Tournament Name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Date *</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Buy-in ($)</label>
              <input type="number" min="0" step="0.01" value={buyIn} onChange={(e) => setBuyIn(e.target.value === '' ? '' : Number(e.target.value))} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Starting Chips *</label>
              <input type="number" min="1" value={startingChips} onChange={(e) => setStartingChips(e.target.value === '' ? '' : Number(e.target.value))} required className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Estimated Entries</label>
              <input type="number" min="1" value={estimatedEntries} onChange={(e) => setEstimatedEntries(e.target.value === '' ? '' : Number(e.target.value))} placeholder="10" className={inputClass} />
            </div>
          </div>
        </section>

        {/* 2. Re-entries & Add-ons */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-200 mb-1">Re-entries & Add-ons</h2>
          <p className="text-xs text-gray-500 mb-5">
            Re-entry: eliminated players pay buy-in again for a fresh stack. Add-on: all players can buy extra chips at the end of the re-entry period.
          </p>

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
                    <select value={maxReEntries} onChange={(e) => setMaxReEntries(e.target.value === 'unlimited' ? 'unlimited' : Number(e.target.value) as 1|2|3)} className={inputClass}>
                      <option value="unlimited">Unlimited</option>
                      <option value={1}>1 re-entry</option>
                      <option value={2}>2 re-entries</option>
                      <option value={3}>3 re-entries</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Re-entry period closes after level (0 = open all tournament)</label>
                    <input type="number" min="0" value={reEntryPeriodLevel} onChange={(e) => setReEntryPeriodLevel(e.target.value === '' ? '' : Number(e.target.value))} placeholder="6" className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-2">Re-entry chip stack</label>
                  <div className="flex gap-2 mb-2">
                    {toggle(!reEntryChipsCustom, () => setReEntryChipsCustom(false), 'Same as starting stack')}
                    {toggle(reEntryChipsCustom, () => setReEntryChipsCustom(true), 'Custom amount')}
                  </div>
                  {reEntryChipsCustom && (
                    <input type="number" min="1" value={reEntryChips} onChange={(e) => setReEntryChips(e.target.value === '' ? '' : Number(e.target.value))} placeholder={typeof startingChips === 'number' ? String(startingChips) : '10000'} className="mt-2 w-48 bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  )}
                </div>
              </div>
            )}
          </div>

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
                  <input type="number" min="1" value={addonChips} onChange={(e) => setAddonChips(e.target.value === '' ? '' : Number(e.target.value))} placeholder="5000" className={inputClass} />
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
                      <input type="number" min="0" step="0.01" value={addonCostDollars} onChange={(e) => setAddonCostDollars(e.target.value === '' ? '' : Number(e.target.value))} placeholder="10.00" className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 3. Blind Structure */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-200 mb-1">Blind Structure</h2>
          <p className="text-xs text-gray-500 mb-5">Changes apply immediately on save.</p>
          <BlindStructureBuilder levels={levels} onChange={setLevels} />
        </section>

        {/* 4. Prize Payouts */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-200 mb-1">Prize Payouts</h2>
          <p className="text-xs text-gray-500 mb-5">Optional. Auto mode suggests splits based on buy-in and estimated entries.</p>
          <PayoutEditor
            buyInDollars={buyIn}
            estimatedEntries={estimatedEntries}
            payouts={payouts}
            onChange={setPayouts}
          />
        </section>

        {/* Submit */}
        {error && (
          <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3">{error}</p>
        )}
        {saved && (
          <p className="text-green-400 text-sm bg-green-400/10 border border-green-400/20 rounded-lg px-4 py-3">
            ✓ Saved! Redirecting...
          </p>
        )}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg transition text-sm"
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/admin/tournament/${id}`)}
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium px-6 py-2.5 rounded-lg transition text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </main>
  );
}

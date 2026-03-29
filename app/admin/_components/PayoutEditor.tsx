'use client';

import { useState } from 'react';

export interface Payout {
  position: number;
  amount_dollars: number | '';
}

// Standard home-game percentage splits by places paid
const PAYOUT_PRESETS: Record<number, number[]> = {
  1: [100],
  2: [65, 35],
  3: [50, 30, 20],
  4: [45, 25, 20, 10],
  5: [40, 25, 18, 12, 5],
};

function suggestPlaces(entries: number): number {
  if (entries <= 5) return 1;
  if (entries <= 9) return 2;
  if (entries <= 19) return 3;
  if (entries <= 49) return 4;
  return 5;
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

interface Props {
  buyInDollars: number | '';
  estimatedEntries: number | '';
  payouts: Payout[];
  onChange: (payouts: Payout[]) => void;
}

export default function PayoutEditor({ buyInDollars, estimatedEntries, payouts, onChange }: Props) {
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');

  const prizePool =
    typeof buyInDollars === 'number' && typeof estimatedEntries === 'number'
      ? buyInDollars * estimatedEntries
      : 0;

  const suggestedPlaces =
    typeof estimatedEntries === 'number' && estimatedEntries > 0
      ? suggestPlaces(estimatedEntries)
      : 3;

  function applyPreset(places: number) {
    const percentages = PAYOUT_PRESETS[places] ?? PAYOUT_PRESETS[3];
    onChange(
      percentages.map((pct, idx) => ({
        position: idx + 1,
        amount_dollars: prizePool > 0 ? Math.round(prizePool * pct) / 100 : '',
      }))
    );
  }

  function updateAmount(idx: number, value: number | '') {
    onChange(payouts.map((p, i) => (i === idx ? { ...p, amount_dollars: value } : p)));
  }

  function addPlace() {
    onChange([...payouts, { position: payouts.length + 1, amount_dollars: '' }]);
  }

  function removePlace(idx: number) {
    onChange(
      payouts
        .filter((_, i) => i !== idx)
        .map((p, i) => ({ ...p, position: i + 1 }))
    );
  }

  const totalPayout = payouts.reduce(
    (sum, p) => sum + (typeof p.amount_dollars === 'number' ? p.amount_dollars : 0),
    0
  );

  const inputClass =
    'w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500';

  return (
    <div>
      {/* Mode toggle */}
      <div className="flex gap-1 mb-5 bg-gray-800 rounded-lg p-1 w-fit">
        {(['auto', 'manual'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition capitalize ${
              mode === m ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {m === 'auto' ? 'Auto (suggested)' : 'Manual'}
          </button>
        ))}
      </div>

      {mode === 'auto' && (
        <div className="mb-5 p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
          <p className="text-xs text-gray-400 mb-3">
            Prize pool:{' '}
            <span className="text-white font-medium">
              {prizePool > 0 ? `$${prizePool.toFixed(2)}` : '—'}
            </span>
            {prizePool === 0 && (
              <span className="ml-2 text-gray-600">(set buy-in + estimated entries above)</span>
            )}
          </p>

          <p className="text-xs text-gray-400 mb-2">Places to pay:</p>
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => applyPreset(n)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                  n === suggestedPlaces
                    ? 'border-purple-500 text-purple-300 bg-purple-900/30'
                    : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
                }`}
              >
                {n} place{n > 1 ? 's' : ''}
                {n === suggestedPlaces && (
                  <span className="ml-1 text-purple-400 text-xs">✓ suggested</span>
                )}
              </button>
            ))}
          </div>

          {Object.entries(PAYOUT_PRESETS).map(([places, pcts]) => (
            <div key={places} className="hidden" />
          ))}

          <p className="text-xs text-gray-600 mt-3">
            Clicking a button populates the amounts below. Edit them freely after.
          </p>
        </div>
      )}

      {/* Payout rows */}
      <div className="space-y-2">
        {payouts.map((payout, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-14 shrink-0 font-medium">
              {ordinal(payout.position)}
            </span>
            {mode === 'auto' && prizePool > 0 && typeof payout.amount_dollars === 'number' && (
              <span className="text-xs text-gray-500 w-12 shrink-0">
                {Math.round((payout.amount_dollars / prizePool) * 100)}%
              </span>
            )}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={payout.amount_dollars}
                onChange={(e) => updateAmount(idx, e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0.00"
                className="w-36 bg-gray-800 border border-gray-700 text-white rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <button
              type="button"
              onClick={() => removePlace(idx)}
              className="text-gray-600 hover:text-red-400 text-xs transition"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-4">
        <button
          type="button"
          onClick={addPlace}
          className="text-xs text-purple-400 hover:text-purple-300 transition"
        >
          + Add place
        </button>
        {payouts.length > 0 && (
          <p className="text-xs text-gray-500">
            Total: <span className="text-white font-medium">${totalPayout.toFixed(2)}</span>
            {prizePool > 0 && (
              <span className={`ml-2 ${Math.abs(totalPayout - prizePool) < 0.01 ? 'text-green-400' : 'text-yellow-400'}`}>
                {Math.abs(totalPayout - prizePool) < 0.01
                  ? '✓ matches prize pool'
                  : `(pool: $${prizePool.toFixed(2)})`}
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

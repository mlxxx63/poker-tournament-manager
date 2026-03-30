'use client';

import { useState } from 'react';

export interface Payout {
  position: number;
  amount_dollars: number | '';
  percentage: number | '';  // 0 or '' = fixed dollar; >0 = % of pool
}

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
  const estimatedPool =
    typeof buyInDollars === 'number' && typeof estimatedEntries === 'number'
      ? buyInDollars * estimatedEntries
      : 0;

  const suggestedPlaces =
    typeof estimatedEntries === 'number' && estimatedEntries > 0
      ? suggestPlaces(estimatedEntries)
      : 3;

  // Apply preset — stores as percentages
  function applyPreset(places: number) {
    const percentages = PAYOUT_PRESETS[places] ?? PAYOUT_PRESETS[3];
    onChange(
      percentages.map((pct, idx) => ({
        position: idx + 1,
        amount_dollars: '',
        percentage: pct,
      }))
    );
  }

  function toggleMode(idx: number, toPercent: boolean) {
    onChange(payouts.map((p, i) => {
      if (i !== idx) return p;
      if (toPercent) return { ...p, amount_dollars: '', percentage: '' };
      return { ...p, percentage: 0, amount_dollars: '' };
    }));
  }

  function updateValue(idx: number, value: number | '', field: 'amount_dollars' | 'percentage') {
    onChange(payouts.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  }

  function addPlace() {
    onChange([...payouts, { position: payouts.length + 1, amount_dollars: '', percentage: '' }]);
  }

  function removePlace(idx: number) {
    onChange(
      payouts.filter((_, i) => i !== idx).map((p, i) => ({ ...p, position: i + 1 }))
    );
  }

  const totalPct = payouts.reduce(
    (sum, p) => sum + (typeof p.percentage === 'number' && p.percentage > 0 ? p.percentage : 0),
    0
  );

  const totalFixed = payouts.reduce(
    (sum, p) => sum + ((!p.percentage || p.percentage === 0) && typeof p.amount_dollars === 'number' ? p.amount_dollars : 0),
    0
  );

  const inputCls = 'bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500';

  return (
    <div>
      {/* Preset buttons */}
      <div className="mb-5 p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-400">Quick presets (% of prize pool):</p>
          {estimatedPool > 0 && (
            <p className="text-xs text-gray-500">
              Est. pool: <span className="text-white">${estimatedPool.toFixed(0)}</span>
            </p>
          )}
        </div>
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
              {n === suggestedPlaces && <span className="ml-1 text-purple-400">✓</span>}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-2">Presets use %. Amounts auto-update as re-entries add to the pool.</p>
      </div>

      {/* Payout rows */}
      <div className="space-y-2">
        {payouts.map((payout, idx) => {
          const isPercent = typeof payout.percentage === 'number' && payout.percentage > 0
            || (payout.percentage !== 0 && payout.percentage !== '' && payout.amount_dollars === '');
          const calcAmount = isPercent && typeof payout.percentage === 'number' && estimatedPool > 0
            ? (estimatedPool * payout.percentage / 100).toFixed(0)
            : null;

          return (
            <div key={idx} className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <span className="text-xs text-gray-400 w-12 shrink-0">{ordinal(payout.position)}</span>

              {/* Mode toggle */}
              <div className="flex rounded-lg overflow-hidden border border-gray-700 shrink-0">
                <button type="button" onClick={() => toggleMode(idx, false)}
                  className={`px-2 py-1.5 text-xs transition ${!isPercent ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                  $
                </button>
                <button type="button" onClick={() => toggleMode(idx, true)}
                  className={`px-2 py-1.5 text-xs transition ${isPercent ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                  %
                </button>
              </div>

              {isPercent ? (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <input
                      type="number" min="0" max="100" step="0.5"
                      value={payout.percentage}
                      onChange={(e) => updateValue(idx, e.target.value === '' ? '' : Number(e.target.value), 'percentage')}
                      placeholder="0"
                      className={`w-20 ${inputCls}`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                  </div>
                  {calcAmount && (
                    <span className="text-xs text-gray-500">≈ ${calcAmount}</span>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                  <input
                    type="number" min="0" step="0.01"
                    value={payout.amount_dollars}
                    onChange={(e) => updateValue(idx, e.target.value === '' ? '' : Number(e.target.value), 'amount_dollars')}
                    placeholder="0.00"
                    className={`w-32 pl-7 ${inputCls}`}
                  />
                </div>
              )}

              <button type="button" onClick={() => removePlace(idx)}
                className="text-gray-600 hover:text-red-400 text-xs transition ml-auto">✕</button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-4">
        <button type="button" onClick={addPlace}
          className="text-xs text-purple-400 hover:text-purple-300 transition">
          + Add place
        </button>
        <div className="text-xs text-gray-500 text-right">
          {totalPct > 0 && (
            <span className={totalPct === 100 ? 'text-green-400' : totalPct > 100 ? 'text-red-400' : 'text-yellow-400'}>
              {totalPct}% allocated{totalPct === 100 ? ' ✓' : totalPct > 100 ? ' (over 100%)' : ''}
            </span>
          )}
          {totalFixed > 0 && (
            <span className="ml-2">Fixed: ${totalFixed.toFixed(2)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

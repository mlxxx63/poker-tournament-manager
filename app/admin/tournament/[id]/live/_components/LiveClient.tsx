'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { DisplayState } from '@/lib/display';

function formatTime(seconds: number): string {
  const s = Math.max(0, seconds);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function formatDollars(cents: number): string {
  if (cents === 0) return '$0';
  return `$${(cents / 100).toLocaleString('en-CA', { minimumFractionDigits: 0 })}`;
}

export default function LiveClient({
  initialState,
  tournamentId,
}: {
  initialState: DisplayState;
  tournamentId: number;
}) {
  const [state, setState] = useState<DisplayState>(initialState);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Subscribe to SSE for real-time state
  useEffect(() => {
    const es = new EventSource(`/api/display/${tournamentId}`);
    es.onmessage = (e) => {
      try { setState(JSON.parse(e.data)); } catch {}
    };
    return () => es.close();
  }, [tournamentId]);

  async function timerAction(action: string) {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/timer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Action failed.');
      }
    } finally {
      setBusy(false);
    }
  }

  const { status, currentLevelData, nextLevelData } = state;
  const isRunning = status === 'running';
  const isPaused = status === 'paused';
  const isSetup = status === 'setup';
  const isFinished = status === 'finished';
  const isBreak = currentLevelData?.is_break === 1;
  const canGoBack = state.currentLevel > 1;

  return (
    <main className="flex-1 px-4 sm:px-8 py-8 max-w-2xl mx-auto w-full">

      {/* ── Live clock preview ──────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6 text-center">

        {/* Level label */}
        <p className={`text-xs font-bold uppercase tracking-[0.2em] mb-2 ${isBreak ? 'text-blue-400' : 'text-purple-400'}`}>
          {isBreak ? 'Break' : `Level ${state.currentLevel}`}
          {!isBreak && state.totalLevels > 0 && (
            <span className="text-gray-600 font-normal"> of {state.totalLevels}</span>
          )}
        </p>

        {/* Timer */}
        <div
          className={`font-mono font-black tabular-nums leading-none transition-opacity mb-4 ${isPaused ? 'opacity-40' : 'opacity-100'}`}
          style={{ fontSize: 'clamp(3.5rem, 12vw, 6rem)' }}
        >
          {isSetup ? '--:--' : formatTime(state.timerSecondsRemaining)}
        </div>

        {/* Blinds */}
        {!isBreak && currentLevelData ? (
          <div>
            <p className="text-2xl font-bold">
              {currentLevelData.small_blind.toLocaleString()} / {currentLevelData.big_blind.toLocaleString()}
            </p>
            {currentLevelData.ante > 0 && (
              <p className="text-gray-400 text-sm mt-0.5">Ante {currentLevelData.ante.toLocaleString()}</p>
            )}
          </div>
        ) : isBreak ? (
          <p className="text-blue-300 text-xl font-semibold">Break Time</p>
        ) : null}

        {/* Next level */}
        {nextLevelData && (
          <p className="text-gray-600 text-xs mt-3">
            Next: {nextLevelData.is_break ? 'Break' : `${nextLevelData.small_blind.toLocaleString()}/${nextLevelData.big_blind.toLocaleString()}${nextLevelData.ante ? ` · A${nextLevelData.ante}` : ''}`}
          </p>
        )}

        {/* Status badge */}
        <div className="mt-4 flex items-center justify-center gap-2">
          {isRunning && <span className="flex items-center gap-1.5 text-xs text-green-400"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />Live</span>}
          {isPaused && <span className="text-xs text-yellow-400 font-medium">⏸ Paused</span>}
          {isSetup && <span className="text-xs text-gray-500">Not started</span>}
          {isFinished && <span className="text-xs text-gray-500">Finished</span>}
        </div>
      </div>

      {/* ── Timer controls ──────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">Timer Controls</p>

        {error && (
          <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        {/* Start / Pause / Resume */}
        <div className="flex gap-3 mb-4">
          {isSetup && (
            <button
              onClick={() => timerAction('start')}
              disabled={busy}
              className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl text-lg transition"
            >
              ▶ Start
            </button>
          )}
          {isRunning && (
            <button
              onClick={() => timerAction('pause')}
              disabled={busy}
              className="flex-1 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl text-lg transition"
            >
              ⏸ Pause
            </button>
          )}
          {isPaused && (
            <button
              onClick={() => timerAction('resume')}
              disabled={busy}
              className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl text-lg transition"
            >
              ▶ Resume
            </button>
          )}
          {isFinished && (
            <div className="flex-1 bg-gray-800 text-gray-500 font-bold py-4 rounded-xl text-center text-lg">
              Tournament Finished
            </div>
          )}
        </div>

        {/* Skip / Back */}
        {!isFinished && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                if (confirm('Go back to previous level?')) timerAction('back');
              }}
              disabled={busy || !canGoBack}
              className="bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-gray-300 font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
            >
              ← Prev Level
            </button>
            <button
              onClick={() => {
                if (confirm('Skip to next level?')) timerAction('skip');
              }}
              disabled={busy}
              className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
            >
              Next Level →
            </button>
          </div>
        )}
      </div>

      {/* ── Quick stats ─────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-600 mb-1">Remaining</p>
          <p className="text-2xl font-bold text-green-400">{state.activePlayers}</p>
          {state.totalEntries > 0 && <p className="text-xs text-gray-600 mt-0.5">/ {state.totalEntries}</p>}
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-600 mb-1">Avg Stack</p>
          <p className="text-xl font-bold tabular-nums">
            {state.avgChips > 0 ? state.avgChips.toLocaleString() : '—'}
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-600 mb-1">Prize Pool</p>
          <p className="text-xl font-bold text-purple-400">
            {state.prizePool > 0 ? formatDollars(state.prizePool) : '—'}
          </p>
        </div>
      </div>

      {/* ── Quick links ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href={`/admin/tournament/${tournamentId}/players`}
          className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-4 text-center transition"
        >
          <p className="text-sm font-medium text-gray-300">Players</p>
          <p className="text-xs text-gray-600 mt-0.5">Manage players & eliminations</p>
        </Link>
        <Link
          href={`/display/${tournamentId}`}
          target="_blank"
          className="bg-gray-900 border border-gray-800 hover:border-purple-800 rounded-xl p-4 text-center transition"
        >
          <p className="text-sm font-medium text-purple-400">Open Display ↗</p>
          <p className="text-xs text-gray-600 mt-0.5">TV / phone clock view</p>
        </Link>
      </div>
    </main>
  );
}

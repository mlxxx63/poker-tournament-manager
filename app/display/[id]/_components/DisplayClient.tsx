'use client';

import { useState, useEffect, useRef } from 'react';
import type { DisplayState, BlindLevelRow } from '@/lib/display';

// ── Sound ────────────────────────────────────────────────────────────────────

function beep(freq: number, duration: number, vol = 0.35, delay = 0) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0, ctx.currentTime + delay);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + delay + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration + 0.05);
    osc.onended = () => ctx.close();
  } catch {
    // AudioContext not available (e.g., server-side)
  }
}

function playLevelChange() {
  // Three short ascending beeps
  beep(660, 0.12, 0.3, 0);
  beep(880, 0.12, 0.3, 0.16);
  beep(1100, 0.22, 0.35, 0.32);
}

function playBreak() {
  // Warm descending tone — break time
  beep(523, 0.4, 0.3, 0);
  beep(440, 0.4, 0.3, 0.45);
  beep(349, 0.7, 0.3, 0.9);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(seconds: number): string {
  const s = Math.max(0, seconds);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function fmtChips(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

function fmtDollars(cents: number): string {
  if (cents <= 0) return '—';
  const d = cents / 100;
  if (d >= 1_000_000) return `$${(d / 1_000_000).toFixed(2)}M`;
  if (d >= 1_000) return `$${(d / 1_000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  return `$${d.toFixed(0)}`;
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ label, value, valueClass = 'text-white' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-0.5">
      <span className="text-cyan-300 text-xs uppercase tracking-wide whitespace-nowrap">{label}:</span>
      <span className={`font-semibold text-sm tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );
}

function FullscreenBtn() {
  const [fs, setFs] = useState(false);
  useEffect(() => {
    const h = () => setFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);
  return (
    <button
      onClick={() => fs ? document.exitFullscreen() : document.documentElement.requestFullscreen()}
      className="text-cyan-400/60 hover:text-cyan-300 text-xs px-2 py-0.5 border border-cyan-400/20 hover:border-cyan-400/50 rounded transition"
    >
      {fs ? '⊠ Exit' : '⊡ Full'}
    </button>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function DisplayClient({
  initialState,
  tournamentId,
}: {
  initialState: DisplayState;
  tournamentId: number;
}) {
  const [s, setS] = useState<DisplayState>(initialState);
  const [ok, setOk] = useState(false);
  const prevLevel = useRef(initialState.currentLevel);
  const prevIsBreak = useRef(initialState.currentLevelData?.is_break === 1);

  useEffect(() => {
    const es = new EventSource(`/api/display/${tournamentId}`);
    es.onopen = () => setOk(true);
    es.onerror = () => setOk(false);
    es.onmessage = (e) => {
      try {
        const next: DisplayState = JSON.parse(e.data);
        // Play sounds on level advance (not on first load)
        if (next.currentLevel !== prevLevel.current && next.status === 'running') {
          const nextIsBreak = next.currentLevelData?.is_break === 1;
          if (nextIsBreak) playBreak();
          else playLevelChange();
          prevIsBreak.current = nextIsBreak;
        }
        prevLevel.current = next.currentLevel;
        setS(next);
      } catch {}
    };
    return () => es.close();
  }, [tournamentId]);

  const cur = s.currentLevelData;
  const nxt = s.nextLevelData;
  const isBreak = cur?.is_break === 1;
  const isPaused = s.status === 'paused';
  const isSetup = s.status === 'setup';
  const isFinished = s.status === 'finished';

  // Non-break level number (skip breaks in the count)
  const nonBreakLevels = s.allLevels.filter(l => !l.is_break);
  const levelIndex = nonBreakLevels.findIndex(l => l.level_number === s.currentLevel);
  const displayLevelNum = isBreak ? null : levelIndex + 1;

  const blindsLabel = !isBreak && cur
    ? `${cur.small_blind.toLocaleString()} / ${cur.big_blind.toLocaleString()}`
    : null;

  const nextBlindsLabel = nxt && !nxt.is_break
    ? `${nxt.small_blind.toLocaleString()} / ${nxt.big_blind.toLocaleString()}`
    : nxt?.is_break ? 'BREAK' : '—';

  const nextAnteLabel = nxt && !nxt.is_break && nxt.ante > 0
    ? nxt.ante.toLocaleString()
    : nxt && !nxt.is_break ? '—' : null;

  return (
    <div
      className="min-h-screen flex flex-col text-white select-none overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, #12003a 0%, #2a006b 40%, #1a0050 70%, #0d0030 100%)',
        fontFamily: '"Segoe UI", system-ui, sans-serif',
      }}
    >
      {/* Outer glow border */}
      <div className="flex-1 flex flex-col m-1.5 border-2 border-cyan-400/70 rounded-sm"
        style={{ boxShadow: '0 0 24px 2px rgba(0,220,255,0.18), inset 0 0 16px 0 rgba(0,180,255,0.06)' }}>

        {/* ── Header bar ───────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-1.5 border-b-2 border-cyan-400/60"
          style={{ background: 'rgba(0,0,0,0.35)' }}>
          <span className="text-cyan-300 text-xs uppercase tracking-[0.25em] font-medium">Tournament Clock</span>
          <span className="text-white font-bold text-sm uppercase tracking-wide">{s.name}</span>
          <div className="flex items-center gap-3">
            {s.status === 'running' && (
              <span className="flex items-center gap-1.5 text-xs text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Live
              </span>
            )}
            {isPaused && <span className="text-xs text-yellow-400 font-bold tracking-wide">⏸ PAUSED</span>}
            {isFinished && <span className="text-xs text-gray-400 tracking-wide">FINISHED</span>}
            {isSetup && <span className="text-xs text-gray-500 tracking-wide">WAITING</span>}
            {!ok && <span className="text-xs text-red-400">•</span>}
            <FullscreenBtn />
          </div>
        </div>

        {/* ── Level label (spans full width) ───────────────── */}
        <div className="border-b-2 border-cyan-400/60 py-2 text-center"
          style={{ background: 'rgba(0,0,0,0.25)' }}>
          {isBreak ? (
            <span className="text-cyan-300 font-black text-2xl uppercase tracking-[0.3em]">— Break —</span>
          ) : (
            <span className="text-white font-black text-2xl uppercase tracking-[0.2em]">
              Level {displayLevelNum}
              <span className="text-cyan-400/50 text-base font-normal"> / {s.totalLevels}</span>
            </span>
          )}
        </div>

        {/* ── Main 3-column grid ───────────────────────────── */}
        <div className="flex-1 grid grid-cols-[1fr_2.2fr_1fr] min-h-0">

          {/* LEFT — payouts + entries */}
          <div className="border-r-2 border-cyan-400/60 flex flex-col" style={{ background: 'rgba(0,0,0,0.2)' }}>

            {/* Payout table */}
            <div className="flex-1 px-3 py-3 overflow-hidden">
              <p className="text-cyan-300 text-xs uppercase tracking-widest text-center border-b border-cyan-400/30 pb-1 mb-2">
                Prize Pool
              </p>
              {s.payouts.length === 0 ? (
                <p className="text-gray-600 text-xs text-center mt-4">No payouts set</p>
              ) : (
                <div className="space-y-0.5">
                  {s.payouts.map((p) => (
                    <div key={p.position} className="flex items-center justify-between gap-1">
                      <span className={`text-xs tabular-nums ${
                        p.position === 1 ? 'text-yellow-300 font-bold' :
                        p.position === 2 ? 'text-gray-200' :
                        p.position === 3 ? 'text-amber-500' : 'text-gray-400'
                      }`}>
                        {ordinal(p.position)}.
                      </span>
                      <span className="text-cyan-400/40 text-xs flex-1 mx-1" style={{ letterSpacing: '0.2em' }}>
                        {'·'.repeat(8)}
                      </span>
                      <span className={`text-xs font-bold tabular-nums ${
                        p.position === 1 ? 'text-yellow-300' :
                        p.position === 2 ? 'text-gray-200' :
                        p.position === 3 ? 'text-amber-500' : 'text-gray-400'
                      }`}>
                        {fmtDollars(p.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Current blinds info */}
            <div className="border-t-2 border-cyan-400/60 px-3 py-3" style={{ background: 'rgba(0,0,0,0.3)' }}>
              {isBreak ? (
                <p className="text-cyan-300 text-xs text-center italic">On Break</p>
              ) : cur ? (
                <div className="space-y-0.5">
                  {cur.ante > 0 && <InfoRow label="Ante" value={cur.ante.toLocaleString()} valueClass="text-yellow-300" />}
                  <InfoRow label="Small Blind" value={cur.small_blind.toLocaleString()} />
                  <InfoRow label="Big Blind" value={cur.big_blind.toLocaleString()} valueClass="text-yellow-200" />
                </div>
              ) : null}
            </div>
          </div>

          {/* CENTER — timer */}
          <div className="flex flex-col items-center justify-center py-4 px-2" style={{ background: 'rgba(0,0,0,0.15)' }}>

            {/* Big timer */}
            <div
              className={`font-mono font-black tabular-nums text-white leading-none transition-opacity`}
              style={{
                fontSize: 'clamp(4rem, 14vw, 9.5rem)',
                opacity: isPaused ? 0.35 : 1,
                textShadow: '0 0 40px rgba(0,220,255,0.3), 0 2px 8px rgba(0,0,0,0.8)',
              }}
            >
              {isSetup ? '--:--' : fmt(s.timerSecondsRemaining)}
            </div>

            {/* Blinds under timer */}
            <div className="mt-5 text-center">
              {isBreak ? (
                <p className="text-cyan-300 text-xl font-semibold tracking-widest uppercase">Break Time</p>
              ) : blindsLabel ? (
                <>
                  <p className="text-white font-bold tracking-wider" style={{ fontSize: 'clamp(1.4rem, 4vw, 2.5rem)' }}>
                    {blindsLabel}
                  </p>
                  {cur?.ante && cur.ante > 0 ? (
                    <p className="text-cyan-300/70 text-sm mt-1 tracking-wide">Ante: {cur.ante.toLocaleString()}</p>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>

          {/* RIGHT — next level info */}
          <div className="border-l-2 border-cyan-400/60 flex flex-col" style={{ background: 'rgba(0,0,0,0.2)' }}>

            <div className="flex-1 px-3 py-3 space-y-1">
              <p className="text-cyan-300 text-xs uppercase tracking-widest border-b border-cyan-400/30 pb-1 mb-2 text-center">
                Up Next
              </p>

              {s.prizePool > 0 && (
                <InfoRow label="Prize Pool" value={fmtDollars(s.prizePool)} valueClass="text-yellow-300" />
              )}

              {nextAnteLabel !== null && (
                <InfoRow label="Next Ante" value={nextAnteLabel} />
              )}

              <InfoRow
                label="Next Blinds"
                value={nextBlindsLabel}
                valueClass={nextBlindsLabel === 'BREAK' ? 'text-cyan-300' : 'text-white'}
              />

              {s.avgChips > 0 && (
                <InfoRow label="Avg. Chips" value={s.avgChips.toLocaleString()} valueClass="text-cyan-200" />
              )}

              {s.nextBreak && s.nextBreakMinutes > 0 && (
                <InfoRow label="Next Break" value={`${s.nextBreakMinutes} min`} valueClass="text-cyan-300" />
              )}
            </div>

            {/* Players remaining */}
            <div className="border-t-2 border-cyan-400/60 px-3 py-3" style={{ background: 'rgba(0,0,0,0.3)' }}>
              <InfoRow
                label="Players Left"
                value={`${s.activePlayers}${s.totalEntries > 0 ? ` / ${s.totalEntries}` : ''}`}
                valueClass="text-green-400"
              />
              {s.totalEntries > 0 && (
                <InfoRow label="Entries" value={s.totalEntries.toLocaleString()} valueClass="text-gray-300" />
              )}
            </div>
          </div>
        </div>

        {/* ── Level tabs ────────────────────────────────────── */}
        <div
          className="border-t-2 border-cyan-400/60 px-3 py-2 flex items-center gap-1 overflow-x-auto"
          style={{ background: 'rgba(0,0,0,0.4)' }}
        >
          <span className="text-cyan-400/40 text-xs uppercase tracking-widest mr-2 shrink-0">Levels</span>
          {s.allLevels.map((l: BlindLevelRow) => {
            const isCurrent = l.level_number === s.currentLevel;
            const isPast = l.level_number < s.currentLevel;
            return (
              <div
                key={l.level_number}
                className={`shrink-0 flex items-center justify-center rounded-sm text-xs font-bold transition-all
                  ${l.is_break
                    ? `w-5 h-5 text-[9px] border ${isCurrent ? 'bg-cyan-400 text-black border-cyan-400' : isPast ? 'bg-cyan-900/40 border-cyan-700/30 text-cyan-700' : 'border-cyan-400/20 text-cyan-600/40'}`
                    : `w-6 h-6 border ${isCurrent ? 'bg-cyan-400 text-black border-cyan-400 shadow-[0_0_8px_rgba(0,220,255,0.6)]' : isPast ? 'bg-purple-900/50 border-purple-700/40 text-purple-500' : 'border-cyan-400/25 text-gray-500 hover:border-cyan-400/50'}`
                  }`}
                title={l.is_break ? `Break (${l.duration_minutes}m)` : `L${l.level_number}: ${l.small_blind}/${l.big_blind}`}
              >
                {l.is_break ? 'B' : l.level_number}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

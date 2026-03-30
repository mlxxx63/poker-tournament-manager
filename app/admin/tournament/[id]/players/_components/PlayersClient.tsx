'use client';

import { useState, useMemo } from 'react';

export interface Player {
  id: number;
  tournament_id: number;
  player_name: string;
  seat_number: string | null;
  entries: number;
  addons: number;
  chips: number;
  status: 'active' | 'eliminated';
  finish_position: number | null;
  eliminated_at: string | null;
}

export interface BlindLevel {
  id: number;
  level_number: number;
  small_blind: number;
  big_blind: number;
  ante: number;
  duration_minutes: number;
  is_break: number;
}

interface Tournament {
  id: number;
  starting_chips: number;
  current_level: number;
  addon_chips: number;
  addon_cost: number;
  re_entries_allowed: number;
  addon_allowed: number;
  buy_in: number;
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function formatDollars(cents: number) {
  return `$${(cents / 100).toFixed(0)}`;
}

/** Calculate the re-entry chip stack based on current blind level.
 *  Formula: starting_chips / level1_big_blind × current_big_blind
 *  (same number of big blinds as the original starting stack)
 */
function calcReEntryChips(
  startingChips: number,
  currentLevel: number,
  blindLevels: BlindLevel[]
): { chips: number; description: string } {
  const nonBreak = blindLevels.filter((l) => !l.is_break);
  if (nonBreak.length === 0) return { chips: startingChips, description: `${startingChips.toLocaleString()} (starting stack)` };

  const level1 = nonBreak[0];
  const level1BB = level1.big_blind;
  if (level1BB <= 0) return { chips: startingChips, description: `${startingChips.toLocaleString()} (starting stack)` };

  // Find the current active level — if current_level is a break, use the previous non-break level
  const currentEntry = blindLevels.find((l) => l.level_number === currentLevel);
  let currentBB: number;
  let levelLabel: string;

  if (!currentEntry || currentEntry.is_break) {
    // Walk backward to find last non-break level before current_level
    const prev = [...nonBreak].reverse().find((l) => l.level_number < currentLevel);
    currentBB = prev ? prev.big_blind : level1BB;
    levelLabel = prev ? `Level ${prev.level_number} (break)` : 'Level 1';
  } else {
    currentBB = currentEntry.big_blind;
    levelLabel = `Level ${currentLevel}`;
  }

  const bbCount = Math.round(startingChips / level1BB);
  const chips = bbCount * currentBB;
  return {
    chips,
    description: `${chips.toLocaleString()} chips (${bbCount} BB × ${currentBB.toLocaleString()} @ ${levelLabel})`,
  };
}

export default function PlayersClient({
  initialPlayers,
  tournament,
  blindLevels,
}: {
  initialPlayers: Player[];
  tournament: Tournament;
  blindLevels: BlindLevel[];
}) {
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [playerName, setPlayerName] = useState('');
  const [seatNumber, setSeatNumber] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  // Re-entry modal state
  const [reEntryModal, setReEntryModal] = useState<{ player: Player; chips: number; description: string } | null>(null);
  const [reEntryChipsInput, setReEntryChipsInput] = useState<number | ''>('');

  const tournamentId = tournament.id;

  async function refreshPlayers() {
    const res = await fetch(`/api/tournaments/${tournamentId}/players`);
    if (res.ok) setPlayers(await res.json());
  }

  function openReEntryModal(player: Player) {
    const { chips, description } = calcReEntryChips(tournament.starting_chips, tournament.current_level, blindLevels);
    setReEntryModal({ player, chips, description });
    setReEntryChipsInput(chips);
  }

  async function confirmReEntry() {
    if (!reEntryModal) return;
    const chips = typeof reEntryChipsInput === 'number' && reEntryChipsInput > 0
      ? reEntryChipsInput
      : reEntryModal.chips;
    setBusyId(reEntryModal.player.id);
    setReEntryModal(null);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/players/${reEntryModal.player.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 're_entry', chips }),
      });
      if (res.ok) await refreshPlayers();
    } finally {
      setBusyId(null);
    }
  }

  async function playerAction(playerId: number, action: string) {
    setBusyId(playerId);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/players/${playerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) await refreshPlayers();
    } finally {
      setBusyId(null);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError('');
    setAdding(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_name: playerName, seat_number: seatNumber }),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error ?? 'Failed to add player.'); return; }
      setPlayerName('');
      setSeatNumber('');
      await refreshPlayers();
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(playerId: number, name: string) {
    if (!confirm(`Remove "${name}" from the tournament?`)) return;
    setBusyId(playerId);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/players/${playerId}`, { method: 'DELETE' });
      if (res.ok) await refreshPlayers();
    } finally {
      setBusyId(null);
    }
  }

  const activePlayers = useMemo(() => players.filter((p) => p.status === 'active'), [players]);
  const eliminatedPlayers = useMemo(
    () => players.filter((p) => p.status === 'eliminated').sort((a, b) => (a.finish_position ?? 0) - (b.finish_position ?? 0)),
    [players]
  );
  const totalEntries = useMemo(() => players.reduce((sum, p) => sum + p.entries, 0), [players]);
  const totalAddonChips = useMemo(() => players.reduce((sum, p) => sum + p.addons * tournament.addon_chips, 0), [players, tournament.addon_chips]);
  const totalChipsInPlay = useMemo(
    () => tournament.starting_chips * totalEntries + totalAddonChips,
    [tournament.starting_chips, totalEntries, totalAddonChips]
  );
  const avgChips = useMemo(
    () => activePlayers.length > 0 ? Math.round(totalChipsInPlay / activePlayers.length) : 0,
    [totalChipsInPlay, activePlayers.length]
  );

  return (
    <>
      <main className="flex-1 px-8 py-8 max-w-5xl">
        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Players Remaining</p>
            <p className="text-2xl font-bold text-green-400">{activePlayers.length}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Total Entries</p>
            <p className="text-2xl font-bold">{totalEntries}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Avg. Stack</p>
            <p className="text-2xl font-bold">{avgChips.toLocaleString()}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Chips in Play</p>
            <p className="text-2xl font-bold">{totalChipsInPlay.toLocaleString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_320px] gap-6">
          {/* Active players */}
          <div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-6">
              <div className="px-5 py-3.5 border-b border-gray-800 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-200">Active Players</h2>
                <span className="text-xs text-gray-500">{activePlayers.length} remaining</span>
              </div>
              {activePlayers.length === 0 ? (
                <p className="px-5 py-6 text-gray-600 text-sm">No active players.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-xs uppercase tracking-wide border-b border-gray-800">
                      <th className="text-left px-5 py-2">Name</th>
                      <th className="text-left px-5 py-2">Seat</th>
                      <th className="text-left px-5 py-2">Entries</th>
                      {tournament.addon_allowed ? <th className="text-left px-5 py-2">Add-ons</th> : null}
                      <th className="px-5 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activePlayers.map((p) => (
                      <tr key={p.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/30 transition">
                        <td className="px-5 py-3 font-medium text-white">{p.player_name}</td>
                        <td className="px-5 py-3 text-gray-400 text-xs font-mono">{p.seat_number ?? '—'}</td>
                        <td className="px-5 py-3 text-gray-300">
                          {p.entries}
                          {p.entries > 1 && (
                            <span className="ml-1.5 text-xs text-purple-400">
                              (+{p.entries - 1} re-{p.entries - 1 === 1 ? 'entry' : 'entries'})
                            </span>
                          )}
                        </td>
                        {tournament.addon_allowed ? (
                          <td className="px-5 py-3 text-gray-300">{p.addons}</td>
                        ) : null}
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {tournament.re_entries_allowed ? (
                              <button
                                onClick={() => openReEntryModal(p)}
                                disabled={busyId === p.id}
                                className="text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-200 px-2.5 py-1 rounded transition"
                              >
                                Re-entry
                              </button>
                            ) : null}
                            {tournament.addon_allowed ? (
                              <button
                                onClick={() => playerAction(p.id, 'addon')}
                                disabled={busyId === p.id}
                                className="text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-200 px-2.5 py-1 rounded transition"
                                title={`+${tournament.addon_chips.toLocaleString()} chips, ${formatDollars(tournament.addon_cost)}`}
                              >
                                Add-on
                              </button>
                            ) : null}
                            <button
                              onClick={() => {
                                if (confirm(`Eliminate ${p.player_name}?`)) playerAction(p.id, 'eliminate');
                              }}
                              disabled={busyId === p.id}
                              className="text-xs bg-red-900/40 hover:bg-red-800/50 disabled:opacity-50 text-red-300 px-2.5 py-1 rounded transition"
                            >
                              Eliminate
                            </button>
                            <button
                              onClick={() => handleDelete(p.id, p.player_name)}
                              disabled={busyId === p.id}
                              className="text-xs text-gray-600 hover:text-gray-400 disabled:opacity-50 transition"
                              title="Remove player"
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Eliminated players */}
            {eliminatedPlayers.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-800">
                  <h2 className="text-sm font-semibold text-gray-200">Eliminated</h2>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-xs uppercase tracking-wide border-b border-gray-800">
                      <th className="text-left px-5 py-2">Place</th>
                      <th className="text-left px-5 py-2">Name</th>
                      <th className="text-left px-5 py-2">Entries</th>
                      {tournament.re_entries_allowed ? <th className="px-5 py-2 text-right">Re-entry</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {eliminatedPlayers.map((p) => (
                      <tr key={p.id} className="border-b border-gray-800 last:border-0 opacity-60 hover:opacity-80 transition">
                        <td className="px-5 py-2.5 text-gray-400 font-medium">
                          {p.finish_position ? ordinal(p.finish_position) : '—'}
                        </td>
                        <td className="px-5 py-2.5 text-gray-300">{p.player_name}</td>
                        <td className="px-5 py-2.5 text-gray-500 text-xs">{p.entries}</td>
                        {tournament.re_entries_allowed ? (
                          <td className="px-5 py-2.5 text-right">
                            <button
                              onClick={() => openReEntryModal(p)}
                              disabled={busyId === p.id}
                              className="text-xs text-purple-400 hover:text-purple-300 disabled:opacity-50 transition"
                            >
                              Re-entry
                            </button>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Add player form */}
          <div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-200 mb-4">Add Player</h2>
              <form onSubmit={handleAdd} className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Name</label>
                  <input
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    required
                    placeholder="Player name"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Seat (optional)</label>
                  <input
                    value={seatNumber}
                    onChange={(e) => setSeatNumber(e.target.value)}
                    placeholder="e.g. 3B"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                {addError && (
                  <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                    {addError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={adding}
                  className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
                >
                  {adding ? 'Adding...' : 'Add Player'}
                </button>
              </form>

              <div className="mt-5 pt-4 border-t border-gray-800 space-y-1 text-xs text-gray-500">
                <p>Starting stack: {tournament.starting_chips.toLocaleString()}</p>
                {tournament.addon_allowed ? (
                  <p>Add-on: +{tournament.addon_chips.toLocaleString()} chips ({formatDollars(tournament.addon_cost)})</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Re-entry modal */}
      {reEntryModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
            <h2 className="text-base font-bold mb-1">Re-entry — {reEntryModal.player.player_name}</h2>
            <p className="text-xs text-gray-500 mb-5">
              Stack is calculated to match the same number of big blinds as the starting stack.
            </p>

            <div className="mb-4">
              <label className="block text-xs text-gray-400 mb-1.5">Chip stack</label>
              <input
                type="number"
                min="1"
                value={reEntryChipsInput}
                onChange={(e) => setReEntryChipsInput(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="mt-1.5 text-xs text-gray-500">{reEntryModal.description}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={confirmReEntry}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
              >
                Confirm Re-entry
              </button>
              <button
                onClick={() => setReEntryModal(null)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium px-4 py-2 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

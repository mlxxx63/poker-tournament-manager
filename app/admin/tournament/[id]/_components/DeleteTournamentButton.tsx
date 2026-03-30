'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteTournamentButton({
  tournamentId,
  tournamentName,
}: {
  tournamentId: number;
  tournamentName: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${tournamentName}"? This will permanently remove all players, blind levels, and payouts.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/admin');
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error ?? 'Failed to delete tournament.');
        setDeleting(false);
      }
    } catch {
      alert('Failed to delete tournament.');
      setDeleting(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="bg-red-900/30 hover:bg-red-800/50 disabled:opacity-50 text-red-400 text-sm font-medium px-4 py-2 rounded-lg transition"
    >
      {deleting ? 'Deleting...' : 'Delete Tournament'}
    </button>
  );
}

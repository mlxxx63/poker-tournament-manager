import { notFound } from 'next/navigation';
import Link from 'next/link';
import AdminShell from '../../../_components/AdminShell';
import PlayersClient, { type Player, type BlindLevel } from './_components/PlayersClient';
import getDb from '@/lib/db';

interface Tournament {
  id: number;
  name: string;
  starting_chips: number;
  current_level: number;
  addon_chips: number;
  addon_cost: number;
  re_entries_allowed: number;
  addon_allowed: number;
  buy_in: number;
}

export default async function PlayersPage({
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

  const players = db
    .prepare('SELECT * FROM tournament_players WHERE tournament_id = ? ORDER BY status ASC, id ASC')
    .all(Number(id)) as Player[];

  const blindLevels = db
    .prepare('SELECT * FROM blind_levels WHERE tournament_id = ? ORDER BY level_number')
    .all(Number(id)) as BlindLevel[];

  return (
    <AdminShell>
      <div className="px-4 sm:px-8 py-5 border-b border-gray-800 flex items-center gap-4">
        <Link href={`/admin/tournament/${id}`} className="text-gray-500 hover:text-gray-300 text-sm transition">
          ← {tournament.name}
        </Link>
        <h1 className="text-lg font-bold">Players</h1>
      </div>
      <PlayersClient initialPlayers={players} tournament={tournament} blindLevels={blindLevels} />
    </AdminShell>
  );
}

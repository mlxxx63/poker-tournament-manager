import { notFound } from 'next/navigation';
import AdminShell from '../../../_components/AdminShell';
import getDb from '@/lib/db';
import EditTournamentForm from './_components/EditTournamentForm';

export default async function EditTournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getDb();

  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(Number(id)) as Record<string, unknown> | undefined;
  if (!tournament) notFound();

  const blindLevels = db
    .prepare('SELECT * FROM blind_levels WHERE tournament_id = ? ORDER BY level_number')
    .all(Number(id));

  const payouts = db
    .prepare('SELECT * FROM payouts WHERE tournament_id = ? ORDER BY position')
    .all(Number(id));

  return (
    <AdminShell>
      <EditTournamentForm
        tournament={tournament}
        initialLevels={blindLevels as never[]}
        initialPayouts={payouts as never[]}
      />
    </AdminShell>
  );
}

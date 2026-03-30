import { notFound } from 'next/navigation';
import Link from 'next/link';
import AdminShell from '../../../_components/AdminShell';
import LiveClient from './_components/LiveClient';
import { getDisplayState } from '@/lib/display';

export const dynamic = 'force-dynamic';

export default async function LivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tournamentId = Number(id);

  const state = getDisplayState(tournamentId);
  if (!state) notFound();

  return (
    <AdminShell>
      <div className="px-8 py-5 border-b border-gray-800 flex items-center gap-4">
        <Link href={`/admin/tournament/${id}`} className="text-gray-500 hover:text-gray-300 text-sm transition">
          ← {state.name}
        </Link>
        <h1 className="text-lg font-bold">Live Controls</h1>
      </div>
      <LiveClient initialState={state} tournamentId={tournamentId} />
    </AdminShell>
  );
}

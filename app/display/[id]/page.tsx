import { notFound } from 'next/navigation';
import { getDisplayState } from '@/lib/display';
import DisplayClient from './_components/DisplayClient';

export const dynamic = 'force-dynamic';

export default async function DisplayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tournamentId = Number(id);

  const state = getDisplayState(tournamentId);
  if (!state) notFound();

  return <DisplayClient initialState={state} tournamentId={tournamentId} />;
}

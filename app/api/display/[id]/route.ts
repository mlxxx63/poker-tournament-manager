import { NextRequest } from 'next/server';
import { getDisplayState } from '@/lib/display';
import { ensureTimer } from '@/lib/timer';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tournamentId = Number(id);

  // Restart in-memory timer if the tournament should be running (e.g. after server restart)
  ensureTimer(tournamentId);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      function send(data: object) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // controller closed
        }
      }

      // Send initial state immediately
      const initial = getDisplayState(tournamentId);
      if (initial) send(initial);

      // Push updates every second
      const interval = setInterval(() => {
        const state = getDisplayState(tournamentId);
        if (state) send(state);
      }, 1000);

      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive',
    },
  });
}

import { readRoom } from '@/lib/store';
import { hashToken, tickRoom } from '@/lib/service';
import { publicState } from '@/lib/engine';
import { localOnline, publishLocal, subscribeLocal, trackLocal } from '@/lib/local-events';
import { serverEnv } from '@/lib/server-env';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  if (serverEnv('NEXT_PUBLIC_SUPABASE_URL') || serverEnv('VERCEL')) return Response.json({ error: 'Use Supabase Realtime.' }, { status: 404 });
  const code = new URL(request.url).searchParams.get('code') || '', token = request.headers.get('x-player-token') || '';
  if (!/^[A-HJ-NP-Z]{4}$/.test(code) || !/^[a-f0-9]{64}$/.test(token)) return Response.json({ error: 'Join a room first.' }, { status: 401 });
  const room = await readRoom(code), me = room?.players.find(p => p.tokenHash === hashToken(token) && !p.left);
  if (!room || !me || Date.now() - room.updated > 86400000) return Response.json({ error: 'This room is unavailable.' }, { status: 403 });
  let dispose = () => {};
  const stream = new ReadableStream<Uint8Array>({ start(controller) {
    const encoder = new TextEncoder(); let closed = false;
    const send = (event: { type: string; data: unknown }) => { if (!closed) controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`)); };
    const untrack = trackLocal(code, me.id); const unsubscribe = subscribeLocal(code, send);
    send({ type: 'state', data: publicState(room) }); publishLocal(code, 'presence', localOnline(code));
    const ping = setInterval(() => { if (!closed) controller.enqueue(encoder.encode(': keepalive\n\n')); }, 20000);
    dispose = () => { if (closed) return; closed = true; clearInterval(ping); unsubscribe(); untrack(); publishLocal(code, 'presence', localOnline(code)); const timeout = setTimeout(() => { void tickRoom(code); }, 45100); timeout.unref?.(); try { controller.close(); } catch { /* Connection already closed. */ } };
    request.signal.addEventListener('abort', dispose, { once: true });
  }, cancel() { dispose(); } });
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' } });
}

import { NextResponse } from 'next/server';
import { GameError } from '@/lib/engine';
import { execute, requestSchema } from '@/lib/service';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin');
    if (origin && ![request.headers.get('host'), request.headers.get('x-forwarded-host')].includes(new URL(origin).host)) throw new GameError('Invalid request origin.', 403);
    const token = request.headers.get('x-player-token') || '';
    if (!/^[a-f0-9]{64}$/.test(token)) throw new GameError('A valid player token is required.', 401);
    if (Number(request.headers.get('content-length') || 0) > 8192) throw new GameError('Request too large.', 413);
    let parsed: unknown;
    try {
      const text = await request.text();
      if (Buffer.byteLength(text, 'utf8') > 8192) throw new GameError('Request too large.', 413);
      parsed = JSON.parse(text);
    } catch (e) {
      if (e instanceof GameError) throw e;
      throw new GameError('Your request was interrupted or incomplete. Please try again.', 400);
    }
    const body = requestSchema.safeParse(parsed);
    if (!body.success) throw new GameError('Invalid request. Check the room code and your choices.');
    return NextResponse.json(await execute(body.data, token), { headers: { 'Cache-Control': 'no-store, private' } });
  } catch (e) {
    if (!(e instanceof GameError)) console.error('Game API:', e);
    return NextResponse.json({ error: e instanceof GameError ? e.message : 'Could not reach the fire. Please retry.' }, { status: e instanceof GameError ? e.status : 500, headers: { 'Cache-Control': 'no-store' } });
  }
}

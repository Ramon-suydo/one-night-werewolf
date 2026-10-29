import { NextResponse } from 'next/server';
import { z } from 'zod';
import { readRoom } from '@/lib/store';
import { hashToken } from '@/lib/service';
import { positionPacket, type PositionPacket } from '@/lib/social';
import { publishLocal } from '@/lib/local-events';
import { packPosition } from '@/lib/wire';
import { serverEnv } from '@/lib/server-env';
const world = globalThis as unknown as { werewolfMotion?: Map<string, Map<string, PositionPacket>> };
const rooms = world.werewolfMotion ||= new Map();
const schema = z.object({ code: z.string().regex(/^[A-HJ-NP-Z]{4}$/), x: z.number().finite().min(-13).max(13), z: z.number().finite().min(-13).max(13), round: z.number().int() }).strict();
export async function POST(request: Request) {
  // Development fallback only; production movement uses Supabase Broadcast.
  if (serverEnv('VERCEL') || serverEnv('NEXT_PUBLIC_SUPABASE_URL')) return NextResponse.json({ error: 'Use Realtime.' }, { status: 404 });
  const token = request.headers.get('x-player-token') || '';
  if (!/^[a-f0-9]{64}$/.test(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: 'Invalid position' }, { status: 400 });
  const room = await readRoom(body.data.code); const player = room?.players.find(p => p.tokenHash === hashToken(token) && !p.left);
  if (!room || !player || Date.now() - room.updated > 86400000) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  if (room.phase !== 'day' || room.round !== body.data.round) return NextResponse.json({ positions: [] });
  let positions = rooms.get(room.code); if (!positions) { positions = new Map(); rooms.set(room.code, positions); }
  const now = Date.now();
  if (now - (positions.get(player.id)?.at || 0) >= 100) { const packet = positionPacket(player.id, room.round, body.data.x, body.data.z, now); positions.set(player.id, packet); publishLocal(room.code, 'position', packPosition(packet)); }
  if (rooms.size > 1000) rooms.delete(rooms.keys().next().value!);
  return NextResponse.json({ positions: [...positions.values()].filter(p => p.round === room.round && now - p.at < 10000) }, { headers: { 'Cache-Control': 'no-store' } });
}

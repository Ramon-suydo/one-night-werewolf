import { GameError } from '@/lib/engine';
import { databaseError, getDatabase, storageMode } from '@/lib/store';
export const dynamic = 'force-dynamic';
export async function GET() {
  try { const db = getDatabase(); if (db) { const { error } = await db.from('room_players').select('player_id').limit(0); if (error) throw databaseError(error); }
    return Response.json({ ok: true, storage: storageMode(), message: 'The village is ready.' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) { return Response.json({ ok: false, message: e instanceof GameError ? e.message : 'The village is temporarily unavailable. Please retry.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
}

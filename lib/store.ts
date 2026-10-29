import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { mkdir, readFile, rename, writeFile, readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { GameError, publicState, type Room } from './engine';
import { localLiveness, publishLocal } from './local-events';
import { serverEnv } from './server-env';
import {publicConfig} from './public-config';

let db: SupabaseClient | null = null;
export function storageMode() { return serverEnv('NEXT_PUBLIC_SUPABASE_URL') ? 'supabase' : 'local'; }
export function databaseError(error: { message?: string; code?: string; status?: number }) {
  if (error.status === 429 || /rate limit|too many|53300/i.test((error.message || '') + error.code)) return new GameError('The village is busy. Please wait a moment and try again.', 429);
  if (/does not exist|schema cache|PGRST20[025]/i.test((error.message || '') + error.code)) return new GameError('The database needs the latest game migration. Run the SQL files in order, then retry.', 503);
  if (/invalid.*key|invalid.*jwt|permission denied|401|42501/i.test((error.message || '') + error.code)) return new GameError('Check the Supabase URL and keys in .env.local, then restart the game server.', 503);
  return new GameError('The database may be sleeping or offline. Resume the project in Supabase, then choose Wake it up / Retry.', 503);
}
export function getDatabase() {
  if (db) return db;
  const url = serverEnv('NEXT_PUBLIC_SUPABASE_URL'), key = serverEnv('SUPABASE_SERVICE_ROLE_KEY'), anon = serverEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!url && !key && !anon) return null;
  if (!url || !key || !anon) throw new GameError('Supabase setup is incomplete. Fill all three values in .env.local and restart.', 503);
  try{publicConfig()}catch(e){throw new GameError((e as Error).message,503)}
  try { if (!['http:', 'https:'].includes(new URL(url).protocol)) throw new Error(); db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global:{fetch:(input,init)=>fetch(input,{...init,signal:init?.signal?AbortSignal.any([init.signal,AbortSignal.timeout(4000)]):AbortSignal.timeout(4000)})} }); return db; }
  catch { throw new GameError('The Supabase project URL is invalid. Copy its https:// project URL and restart.', 503); }
}
const directory = path.resolve(serverEnv('LOCAL_DATA_DIR') || '.local-data');
const globalStore = globalThis as unknown as { werewolfQueue?: Promise<unknown>; werewolfRooms?: Map<string, Room> };
const localRooms = globalStore.werewolfRooms ||= new Map<string, Room>();
function enqueue<T>(work: () => Promise<T>): Promise<T> {
  const result = (globalStore.werewolfQueue || Promise.resolve()).catch(() => {}).then(work);
  globalStore.werewolfQueue = result; return result;
}
async function readLocal(code: string): Promise<Room | null> {
  const file = path.join(directory, code + '.json');
  const cached = localRooms.get(file);
  if (cached) return localLiveness(structuredClone(cached));
  try { const room: Room = JSON.parse(await readFile(file, 'utf8')); localRooms.set(file, room); return localLiveness(structuredClone(room)); }
  catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null; throw e; }
}
function localOnly() {
  if (serverEnv('VERCEL') || process.env.NODE_ENV === 'production' && !serverEnv('LOCAL_DATA_DIR')) throw new GameError('Configure Supabase before hosting this game. See README.md.', 503);
}
export async function readRoom(code: string): Promise<Room | null> {
  const db = getDatabase();
  if (db) {
    const { data, error } = await db.from('private_rooms').select('state,room_players(player_id,last_seen)').eq('code', code).maybeSingle();
    if (error) throw databaseError(error);
    if (!data) return null; const room = data.state as Room;
    for (const row of data.room_players || []) { const p = room.players.find(p => p.id === row.player_id); if (p) p.seen = Math.max(p.seen, row.last_seen); }
    return room;
  }
  localOnly();
  return enqueue(() => readLocal(code));
}
export async function saveRoom(room: Room, expected: number): Promise<boolean> {
  const db = getDatabase();
  if (db) {
    const { data, error } = await db.rpc('commit_room', { p_code: room.code, p_expected: expected, p_state: room, p_public: publicState(room) });
    if (error) throw databaseError(error);
    return data === true;
  }
  localOnly();
  return enqueue(async () => {
    await mkdir(directory, { recursive: true });
    const previous = await readLocal(room.code);
    if ((previous?.revision ?? -1) !== expected) return false;
    const file = path.join(directory, room.code + '.json');
    const temp = file + '.' + crypto.randomUUID() + '.tmp';
    await writeFile(temp, JSON.stringify(room), 'utf8');
    for (let attempt = 0; ; attempt++) {
      try { await rename(temp, file); break; }
      catch (e) {
        if (!['EPERM', 'EBUSY', 'EACCES'].includes((e as NodeJS.ErrnoException).code || '') || attempt >= 12) { await unlink(temp).catch(() => {}); throw e; }
        await new Promise(resolve => setTimeout(resolve, 25 * (attempt + 1)));
      }
    }
    localRooms.set(file, structuredClone(room));
    const before = previous ? publicState(previous) : null, after = publicState(room);
    if (JSON.stringify(before && { ...before, revision: 0 }) !== JSON.stringify({ ...after, revision: 0 })) publishLocal(room.code, 'state', after);
    return true;
  });
}
let lastCleanup = 0;
export async function cleanExpired() {
  if (getDatabase() || Date.now() - lastCleanup < 3600000) return;
  lastCleanup = Date.now(); localOnly();
  await mkdir(directory, { recursive: true });
  for (const file of await readdir(directory)) {
    if (!/^[A-HJ-NP-Z]{4}\.json$/.test(file)) continue;
    try { const room: Room = JSON.parse(await readFile(path.join(directory, file), 'utf8')); if (Date.now() - room.updated > 86400000) { await unlink(path.join(directory, file)); localRooms.delete(path.join(directory, file)); } } catch { /* Another request may have removed this expired room. */ }
  }
}

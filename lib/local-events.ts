import type { Room } from './engine';
type Listener = (event: { type: string; data: unknown }) => void;
const runtime = globalThis as unknown as { fireEvents?: Map<string, Set<Listener>>; firePresence?: Map<string, { count: number; seen: number }>; fireTimers?: Map<string, ReturnType<typeof setTimeout>> };
const events = runtime.fireEvents ||= new Map(); const presence = runtime.firePresence ||= new Map(); const timers = runtime.fireTimers ||= new Map();
export function publishLocal(code: string, type: string, data: unknown) { for (const callback of events.get(code) || []) callback({ type, data }); }
export function subscribeLocal(code: string, listener: Listener) { let listeners = events.get(code); if (!listeners) { listeners = new Set(); events.set(code, listeners); } listeners.add(listener); return () => { listeners.delete(listener); if (!listeners.size) events.delete(code); }; }
export function trackLocal(code: string, id: string) { const key = code + id; const old = presence.get(key); presence.set(key, { count: (old?.count || 0) + 1, seen: Date.now() }); return () => { const item = presence.get(key); if (item) { item.count = Math.max(0, item.count - 1); item.seen = Date.now(); } }; }
export function localLiveness(room: Room) { for (const p of room.players) { const live = presence.get(room.code + p.id); if (live) p.seen = live.count ? Date.now() : live.seen; } return room; }
export function localOnline(code: string) { return [...presence].filter(([key, p]) => key.startsWith(code) && p.count > 0).map(([key]) => key.slice(4)); }
export function scheduleLocal(code: string, at: number | null, work: () => Promise<void>) { clearTimeout(timers.get(code)); timers.delete(code); if (at !== null) { const timer = setTimeout(() => { timers.delete(code); void work().catch(() => {}); }, Math.max(20, at - Date.now() + 20)); timer.unref?.(); timers.set(code, timer); } }

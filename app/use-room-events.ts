'use client';
import { useEffect, useRef, useState } from 'react';
import type { Snapshot, publicState } from '@/lib/engine';
import { realtimeClient } from '@/lib/realtime-client';
type Public = ReturnType<typeof publicState>;
export function useRoomEvents(state: Snapshot | null, onState: (s: Public) => void, resync: () => Promise<void>, connection: (s: string) => void) {
  const callbacks = useRef({ onState, resync, connection });
  const [online, setOnline] = useState<string[]>([]);
  useEffect(() => { callbacks.current = { onState, resync, connection }; }, [onState, resync, connection]);
  const code = state?.code, me = state?.me;
  useEffect(() => {
    if (!code || !me) return;
    let stopped = false, cleanup = () => {}, heartbeat: ReturnType<typeof setInterval>, retry: ReturnType<typeof setTimeout>;
    const abort = new AbortController(); let visibility = () => {};
    const fail = () => { if (!stopped) callbacks.current.connection('Reconnecting… Your seat and choices are saved.'); };
    const receive = (event: { type: string; data: unknown }) => {
      if (stopped) return;
      if (event.type === 'state') callbacks.current.onState(event.data as Public);
      if (event.type === 'presence') setOnline(event.data as string[]);
      if (event.type === 'position') window.dispatchEvent(new CustomEvent('werewolf-public-position', { detail: event.data }));
    };
    const connect = (attempt=0) => { void realtimeClient().then(async client => {
      if (stopped) return;
      if (client) {
        const channel = client.channel('room:' + code, { config: { presence: { key: me } } });
        channel.on('postgres_changes', { event: '*', schema: 'public', table: 'room_public', filter: `code=eq.${code}` }, payload => { const row = payload.new as { state?: Public }; if (row.state) callbacks.current.onState(row.state); });
        channel.on('presence', { event: 'sync' }, () => { const entries = Object.values(channel.presenceState()).flat() as unknown as { id: string; visible?: boolean }[]; const visible = entries.filter(e => e.visible !== false); setOnline((visible.length ? visible : entries).map(e => e.id)); });
        const touch = () => { if (!stopped) void client.rpc('touch_player', { p_code: code, p_token: localStorage.getItem('werewolf-token') || '' }); };
        channel.subscribe(status => { if (status === 'SUBSCRIBED') { void channel.track({ id: me, visible: !document.hidden }); touch(); callbacks.current.connection(''); void callbacks.current.resync(); } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') fail(); });
        heartbeat = setInterval(touch, 30000); // Write-only liveness, never a state poll.
        visibility = () => { void channel.track({ id: me, visible: !document.hidden }); if (!document.hidden) { touch(); void callbacks.current.resync(); } };
        cleanup = () => { void client.removeChannel(channel); };
      } else {
        let connections = 0;
        const listen = async (attempt = 0) => {
          try {
            const response = await fetch('/api/events?code=' + code, { headers: { 'x-player-token': localStorage.getItem('werewolf-token') || '' }, signal: abort.signal });
            if (!response.ok || !response.body) throw new Error('Stream unavailable');
            callbacks.current.connection(''); if (connections++) await callbacks.current.resync();
            const reader = response.body.getReader(), decoder = new TextDecoder(); let buffer = '';
            while (!stopped) { const chunk = await reader.read(); if (chunk.done) break; buffer += decoder.decode(chunk.value, { stream: true }); let end: number; while ((end = buffer.indexOf('\n\n')) >= 0) { const frame = buffer.slice(0, end); buffer = buffer.slice(end + 2); if (frame.startsWith('data: ')) receive(JSON.parse(frame.slice(6))); } }
            if (!stopped) throw new Error('Stream ended');
          } catch { if (!stopped) { fail(); retry = setTimeout(() => { void listen(attempt + 1); }, Math.min(12000, 500 * 2 ** Math.min(attempt, 5))); } }
        };
        void listen(); visibility = () => { if (!document.hidden) void callbacks.current.resync(); };
      }
      document.addEventListener('visibilitychange', visibility);
    }).catch(()=>{fail();if(!stopped)retry=setTimeout(()=>connect(attempt+1),Math.min(12000,500*2**Math.min(attempt,5)));}); };
    connect();
    const network = () => { fail(); if (navigator.onLine) void callbacks.current.resync(); };
    window.addEventListener('online', network); window.addEventListener('offline', network);
    return () => { stopped = true; abort.abort(); cleanup(); clearInterval(heartbeat); clearTimeout(retry); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('online', network); window.removeEventListener('offline', network); };
  }, [code, me]);
  return online;
}

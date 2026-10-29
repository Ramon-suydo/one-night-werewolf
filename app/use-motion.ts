'use client';
import { useEffect, useRef } from 'react';
import { positionPacket, validPosition } from '@/lib/social';
import type {SceneState} from '@/lib/scene';
import type { MotionBus } from '@/lib/motion';
import { realtimeClient } from '@/lib/realtime-client';
import { packPosition, unpackPosition, movementChanged, MOVEMENT_CAP, type WirePosition } from '@/lib/wire';
export function useMotion(view: SceneState | null, bus: MotionBus) {
  const latest = useRef(view);
  useEffect(() => { latest.current = view; }, [view]);
  useEffect(() => {
    const view = latest.current;
    if (!view) return;
    bus.remote.clear(); bus.focus = null;
    let stopped = false; let timer: ReturnType<typeof setInterval>; let retry: ReturnType<typeof setTimeout>; let dispose = () => {};
    const receive = (payload: unknown) => {
      if (['day','lobby'].includes(view.phase) && validPosition(payload) && payload.round === view.round && payload.player !== view.me && view.players.some(p => p.id === payload.player)) bus.remote.set(payload.player, payload);
    };
    const packet = () => positionPacket(view.me, view.round, bus.local.x, bus.local.z);
    let previous: WirePosition | null = null, lastAt = 0;
    const capKey = 'werewolf-movement:' + new Date().toISOString().slice(0, 7);
    let sent = Number(localStorage.getItem(capKey) || 0);
    let warned=false;
    const next = () => { const p = packPosition(packet());if(sent>=MOVEMENT_CAP&&!warned){warned=true;window.dispatchEvent(new Event('werewolf-movement-limit'))} if (document.hidden || !bus.exploring || bus.batterySaver || sent >= MOVEMENT_CAP || !movementChanged(previous, p, lastAt, Date.now())) return null; previous = p; lastAt = Date.now(); sent++; localStorage.setItem(capKey, String(sent)); return p; };
    const localEvent = (e: Event) => { const p = unpackPosition((e as CustomEvent).detail); if (p) receive(p); };
    window.addEventListener('werewolf-public-position', localEvent);
    const connect=(attempt=0)=>{void realtimeClient().then(client => {
      if(stopped)return;
      if (client) {
        if (stopped) return;
        let subscribed = false;
        const channel = client.channel(`clearing:${view.code}`, { config: { broadcast: { self: false } } })
          .on('broadcast', { event: 'position' }, ({ payload }) => { const decoded = unpackPosition(payload); if (decoded) receive(decoded); })
          .subscribe(status => { subscribed = status === 'SUBSCRIBED'; });
        timer = setInterval(() => { if (subscribed && ['day','lobby'].includes(view.phase)) { const p = next(); if (p) void channel.send({ type: 'broadcast', event: 'position', payload: p }); } }, 100);
        dispose = () => { void client.removeChannel(channel); };
      } else if (['day','lobby'].includes(view.phase)) {
      let pending = false;
      timer = setInterval(async () => {
        if (pending || stopped) return; pending = true;
        try {
          const p = next(); if (!p) return;
          const response = await fetch('/api/session/position', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-player-token': localStorage.getItem('werewolf-token') || '' }, body: JSON.stringify({ code: view.code, x: p.x, z: p.z, round: p.r }), signal: AbortSignal.timeout(3000) });
          if (response.ok) { const data = await response.json(); if (!stopped) data.positions?.forEach(receive); }
        } catch { /* Cosmetic positions recover on the next tick; game state uses its own retry. */ }
        finally { pending = false; }
      }, 100);
      }
    }).catch(() => {if(!stopped)retry=setTimeout(()=>connect(attempt+1),Math.min(12000,500*2**Math.min(attempt,5)))});};connect();
    return () => { stopped = true; clearInterval(timer); clearTimeout(retry); dispose(); window.removeEventListener('werewolf-public-position', localEvent); bus.stick = { x: 0, z: 0 }; };
  }, [view?.code, view?.phase, view?.round, view?.me, bus]); // Only public membership is read from this room snapshot.
}

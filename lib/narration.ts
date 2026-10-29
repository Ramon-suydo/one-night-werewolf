import type { Role, Room } from './engine';
export const SCRIPT = [
  { id: 'night', role: null, seconds: 5, text: 'Night falls over the village. Everyone, close your eyes.' },
  { id: 'werewolves', role: 'wolf', seconds: 12, text: 'Werewolves, wake up. Find your pack. A lone wolf may peek at one center card. Werewolves, go back to sleep.' },
  { id: 'minion', role: 'minion', seconds: 8, text: 'Minion, wake up. The werewolves are revealed to you. Minion, go back to sleep.' },
  { id: 'masons', role: 'mason', seconds: 8, text: 'Masons, wake up and find each other. Masons, go back to sleep.' },
  { id: 'seer', role: 'seer', seconds: 20, text: 'Seer, wake up. Look at one player, or two center cards. Seer, go back to sleep.' },
  { id: 'robber', role: 'robber', seconds: 14, text: 'Robber, wake up. Swap with another player and see your new card. Robber, go back to sleep.' },
  { id: 'troublemaker', role: 'troublemaker', seconds: 16, text: 'Troublemaker, wake up. Swap two other players. Troublemaker, go back to sleep.' },
  { id: 'drunk', role: 'drunk', seconds: 12, text: 'Drunk, wake up. Swap with a center card. Drunk, go back to sleep.' },
  { id: 'insomniac', role: 'insomniac', seconds: 8, text: 'Insomniac, wake up. Check your card. Insomniac, go back to sleep.' },
  { id: 'dawn', role: null, seconds: 5, text: 'The rooster crows. Everyone, wake up!' },
] as const;
export type Narration = { narration_step: number; step_started_at: number; paused_at: number | null; speed: number; active: boolean };
export function duration(step: number, speed = 1) { return SCRIPT[step].seconds * 1000 * speed; }
export function beginNarration(now: number, speed: number): Narration {
  return { narration_step: 0, step_started_at: now, paused_at: null, speed, active: true };
}
export function narratorProgress(n: Narration, now: number) {
  return Math.max(0, Math.min(1, ((n.paused_at ?? now) - n.step_started_at) / duration(n.narration_step, n.speed)));
}
export function awake(n: Narration | undefined, role: Role) {
  return !n?.active || SCRIPT[n.narration_step].role === role;
}
// This scheduler only fills expired actions and gates the existing engine.
// All card mutation and rules remain in resolveNight, unchanged.
export function advanceNarration(room: Room, now: number) {
  const n = room.narration; const g = room.game;
  if (!n?.active || n.paused_at !== null || room.phase !== 'night' || !g) return;
  while (n.active && now >= n.step_started_at + duration(n.narration_step, n.speed)) {
    const role = SCRIPT[n.narration_step].role;
    g.order.forEach((id, i) => { if (g.original[i] === role) g.actions[id] ??= {}; });
    n.step_started_at += duration(n.narration_step, n.speed);
    if (n.narration_step === SCRIPT.length - 1) {
      g.order.forEach(id => g.actions[id] ??= {}); n.active = false;
    } else n.narration_step++;
  }
}
export function changeNarration(n: Narration, command: 'pause' | 'resume' | 'speed', now: number, speed?: number) {
  const progress = narratorProgress(n, now);
  if (command === 'pause') n.paused_at ??= now;
  if (command === 'resume' && n.paused_at !== null) { n.step_started_at += now - n.paused_at; n.paused_at = null; }
  if (command === 'speed' && speed !== undefined) {
    n.speed = speed; n.step_started_at = (n.paused_at ?? now) - progress * duration(n.narration_step, speed);
  }
}

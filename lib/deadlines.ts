import { duration } from './narration';
import type { Room } from './engine';
export function nextDeadline(room: Room): number | null {
  if (room.phase === 'night' && room.narration?.active) return room.narration.paused_at === null ? room.narration.step_started_at + duration(room.narration.narration_step, room.narration.speed) : null;
  if (room.phase === 'night' && room.game?.order.every(id => !!room.game!.actions[id])) return Math.max(0, ...Object.values(room.game.undoUntil || {})) || null;
  if (room.phase === 'day') return room.dayEnd;
  if (room.phase === 'vote' && room.preferences?.editableVoting) return room.game?.voteEnd || null;
  return null;
}

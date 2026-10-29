import { advance, type Room } from './engine';
import { advanceNarration, awake } from './narration';
import { botAction, updateSession } from './experience';
export function progressRoom(room: Room, now = Date.now(), random = Math.random) {
  const g = room.game; if (!g) return;
  advanceNarration(room, now);
  const bots = room.players.filter(p => p.bot && g.order.includes(p.id));
  for (const p of bots) {
    if (room.phase === 'night' && awake(room.narration, g.original[g.order.indexOf(p.id)]) && !g.actions[p.id]) g.actions[p.id] = botAction(room, p.id, random);
    if (room.phase === 'dawn' && !g.ready.includes(p.id)) g.ready.push(p.id);
    if (room.phase === 'day' && !g.readyVote?.includes(p.id)) (g.readyVote ||= []).push(p.id);
    if (room.phase === 'vote' && !g.votes[p.id]) { const other = g.order.filter(id => id !== p.id); g.votes[p.id] = other[Math.floor(random() * other.length)]; }
  }
  if (room.phase === 'day' && g.order.every(id => g.readyVote?.includes(id))) room.phase = 'vote';
  advance(room, now);
  if (room.phase === 'vote' && room.preferences?.editableVoting) {
    g.voteEnd ||= now + room.preferences.voteSeconds * 1000;
    if (now >= g.voteEnd || g.votingLocked) for (const id of g.order) if (!g.votes[id]) { const other = g.order.filter(p => p !== id); g.votes[id] = other[Math.floor(random() * other.length)]; }
  }
  // A phase transition may wake bots in the new phase, without changing rules.
  for (const p of bots) {
    if (room.phase === 'dawn' && !g.ready.includes(p.id)) g.ready.push(p.id);
    if (room.phase === 'vote' && !g.votes[p.id]) g.votes[p.id] = g.order.find(id => id !== p.id)!;
  }
  advance(room, now); updateSession(room);
}

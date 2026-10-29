import type { NightAction, Role, Room } from './engine';
export type PlayPreferences = { notepad: boolean; claims: boolean; editableVoting: boolean; rotateHost: boolean; voteSeconds: number; confirmActions: boolean };
export const PLAY_DEFAULTS: PlayPreferences = { notepad: true, claims: false, editableVoting: false, rotateHost: false, voteSeconds: 30, confirmActions: false };
export type Claim = { player: string; role: Role; at: number };
export type Score = { wins: number; streak: number; bestStreak: number; banished: number; bluffs: number; rounds: number };
export type Session = { lastRound: number; scores: Record<string, Score>; highlights: string[] };
export const DAY_PRESETS = { Quick: 240, Standard: 300, Chill: 480 } as const;
export function recommendedDeck(count: number, kind: 'beginner' | 'classic' | 'chaos'): Role[] {
  if (!Number.isInteger(count) || count < 3 || count > 10) throw new Error('Choose 3 to 10 players.');
  const deck: Role[] = ['wolf', 'wolf', 'seer', 'robber', 'troublemaker'];
  const village: Role[][] = [['villager'], ['villager'], ['villager']];
  const groups: Role[][] = kind === 'beginner' ? [...village, ['mason', 'mason'], ['insomniac'], ['hunter'], ['minion'], ['drunk'], ['tanner']] : kind === 'classic' ? [['mason', 'mason'], ['minion'], ['drunk'], ['insomniac'], ...village, ['hunter'], ['tanner']] : [['tanner'], ['minion'], ['drunk'], ['hunter'], ['insomniac'], ['mason', 'mason'], ...village];
  for (const group of groups) if (deck.length + group.length <= count + 3) deck.push(...group);
  return deck;
}
export function botAction(room: Room, id: string, random = Math.random): NightAction {
  const g = room.game!; const role = g.original[g.order.indexOf(id)];
  const other = g.order.filter(p => p !== id); const pick = <T,>(a: T[]) => a[Math.floor(random() * a.length)];
  if (role === 'wolf' && g.original.filter(r => r === 'wolf').length === 1) return { centers: [Math.floor(random() * 3)] };
  if (role === 'seer') { const excluded = Math.floor(random() * 3); return random() < .5 ? { mode: 'player', targets: [pick(other)] } : { mode: 'center', centers: [0, 1, 2].filter(c => c !== excluded) }; }
  if (role === 'robber') return { targets: [pick(other)] };
  if (role === 'troublemaker') { const first = pick(other); return { targets: [first, pick(other.filter(p => p !== first))] }; }
  if (role === 'drunk') return { centers: [Math.floor(random() * 3)] };
  return {};
}
export function resultReason(room: Room): string {
  const result = room.game?.result; if (!result) return '';
  const roles = room.game!.order.map((_, i) => result.cards[i]);
  const killed = (role: Role) => result.banished.some(id => roles[room.game!.order.indexOf(id)] === role);
  if (killed('wolf')) return `A werewolf was banished, so the village wins${killed('tanner') ? ' alongside the banished Tanner' : ''}.`;
  if (killed('tanner')) return result.winners.includes('the village') ? 'The Tanner and Minion were banished; the Tanner and village share victory.' : 'The Tanner was banished and achieved their personal victory.';
  if (roles.includes('wolf')) return 'Every werewolf survived, so the werewolf team wins.';
  if (roles.includes('minion')) return killed('minion') || !result.banished.length ? 'No werewolves were among the players; the Minion was banished or nobody was, so the village wins.' : 'There were no werewolves, but the Minion survived while a villager was banished; the werewolf team wins.';
  return result.banished.length ? 'No werewolf or Minion was present, but someone was banished. Nobody wins.' : 'There were no werewolves or Minion and nobody was banished, so the village wins.';
}
export function updateSession(room: Room) {
  const g = room.game; if (room.phase !== 'result' || !g?.result || room.session?.lastRound === room.round) return;
  const session = room.session ||= { lastRound: 0, scores: {}, highlights: [] };
  for (const id of g.order) {
    const score = session.scores[id] ||= { wins: 0, streak: 0, bestStreak: 0, banished: 0, bluffs: 0, rounds: 0 };
    const won = g.result.winningPlayers.includes(id); score.rounds++; score.wins += Number(won); score.streak = won ? score.streak + 1 : 0; score.bestStreak = Math.max(score.bestStreak, score.streak); score.banished += Number(g.result.banished.includes(id));
    const claim = [...g.claims || []].reverse().find(c => c.player === id); if (won && claim && claim.role !== g.original[g.order.indexOf(id)]) score.bluffs++;
  }
  const best = g.order.filter(id => { const claim = [...g.claims || []].reverse().find(c => c.player === id); return claim && claim.role !== g.original[g.order.indexOf(id)] && g.result!.winningPlayers.includes(id); });
  const votes = [...g.result.votes].sort((a, b) => b - a);
  session.highlights = [...(best.length ? ['Best bluffer: ' + best.map(id => room.players.find(p => p.id === id)!.name).join(', ') + ' won after an unexpected claim.'] : []), ...(votes[0] - votes[1] <= 1 ? ['Closest call: the leading vote counts were within one vote.'] : [])]; session.lastRound = room.round;
}

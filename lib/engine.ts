export const ROLES = ['wolf', 'minion', 'mason', 'seer', 'robber', 'troublemaker', 'drunk', 'insomniac', 'hunter', 'tanner', 'villager'] as const;
import { awake, type Narration } from './narration';
import { publicExtras, sanitizeAppearance, type Appearance, type ChatMessage, type Emote, type SocialSettings } from './social';
import { PLAY_DEFAULTS, resultReason, type PlayPreferences, type Claim, type Session } from './experience';
import { nextDeadline } from './deadlines';
export type Role = typeof ROLES[number];
export type Phase = 'lobby' | 'night' | 'dawn' | 'day' | 'vote' | 'result';
export type NightAction = { mode?: 'player' | 'center'; targets?: string[]; centers?: number[]; skip?: boolean };
export type Report = { text: string; roles?: Role[] };
export type Player = { id: string; tokenHash: string; name: string; joined: number; seen: number; left: boolean; appearance?: Appearance; spectator?: boolean; bot?: boolean };
export type Outcome = { cards: Role[]; votes: number[]; banished: string[]; hunted: string[]; winners: string[]; winningPlayers: string[]; banner: string };
export type Round = {
  order: string[]; original: Role[]; cards: Role[]; actions: Record<string, NightAction>;
  reports: Record<string, Report[]>; ready: string[]; votes: Record<string, string>;
  skipped: string[]; result?: Outcome;
  undoUntil?: Record<string, number>; readyVote?: string[]; claims?: Claim[]; voteEnd?: number; votingLocked?: boolean;
};
export type Room = {
  code: string; host: string; phase: Phase; round: number; players: Player[]; game?: Round;
  dayEnd: number | null; daySeconds: number; deck: Role[] | null;
  updated: number; revision: number; receipts: string[];
  settings?: SocialSettings; narration?: Narration; chat?: ChatMessage[]; emotes?: Emote[];
  lastChat?: Record<string, number>;
  preferences?: PlayPreferences; session?: Session; deckRoles?: Role[];
};
export class GameError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function assert(ok: unknown, message: string): asserts ok { if (!ok) throw new GameError(message); }
export function shuffle<T>(values: readonly T[], random = Math.random): T[] {
  const a = [...values];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export function validateDeck(deck: Role[], count: number) {
  assert(deck.length === count + 3, `Choose exactly ${count + 3} cards.`);
  const maxima: Record<Role, number> = { wolf: 2, mason: 2, villager: 3, minion: 1, seer: 1, robber: 1, troublemaker: 1, drunk: 1, insomniac: 1, hunter: 1, tanner: 1 };
  for (const r of ROLES) {
    const n = deck.filter(x => x === r).length;
    assert(n <= maxima[r], `Too many ${r} cards.`);
    if (r === 'mason') assert(n === 0 || n === 2, 'Masons must always be a pair.');
  }
}
export function buildDeck(count: number, random = Math.random): Role[] {
  assert(Number.isInteger(count) && count >= 3 && count <= 10, 'Games need 3 to 10 players.');
  const deck: Role[] = ['wolf', 'wolf', 'seer', 'robber', 'troublemaker'];
  const groups: Role[][] = [['mason', 'mason'], ['minion'], ['drunk'], ['insomniac'], ['hunter'], ['tanner'], ['villager'], ['villager'], ['villager']];
  for (const group of shuffle(groups, random)) if (deck.length + group.length <= count + 3) deck.push(...group);
  return deck;
}
export function cleanName(value: string) {
  return value.normalize('NFKC').replace(/[<>"'&\p{Cc}\p{Cf}]/gu, '').trim().slice(0, 12) || 'Wolf';
}
export function uniqueName(value: string, players: Player[]) {
  const base = cleanName(value); let name = base; let n = 1;
  while (players.some(p => p.name.toLowerCase() === name.toLowerCase())) { const suffix = ` ${++n}`; name = base.slice(0, 12 - suffix.length) + suffix; }
  return name;
}
export function startRound(room: Room, random = Math.random) {
  const order = room.players.filter(p => !p.left && !p.spectator).map(p => p.id);
  assert(order.length >= 3 && order.length <= 10, 'Games need 3 to 10 players.');
  const deck = room.deck || buildDeck(order.length, random); validateDeck(deck, order.length);
  const cards = shuffle(deck, random);
  room.deckRoles = [...cards].sort();
  room.game = { order, original: cards.slice(0, order.length), cards, actions: {}, reports: {}, ready: [], votes: {}, skipped: [] };
  room.round++; room.phase = 'night'; room.dayEnd = null;
}
export function staticReport(room: Room, id: string): Report[] {
  const g = room.game!; const i = g.order.indexOf(id); const role = g.original[i];
  const others = (r: Role) => g.order.filter((p, j) => g.original[j] === r && p !== id);
  const names = (ids: string[]) => ids.map(p => room.players.find(x => x.id === p)!.name).join(', ');
  if (role === 'wolf') { const w = others('wolf'); return [{ text: w.length ? 'Your pack: ' + names(w) : 'You are alone. Peek at a center card?' }]; }
  if (role === 'minion') { const w = others('wolf'); return [{ text: w.length ? 'The werewolves: ' + names(w) : 'No werewolves among the players. They are in the center.' }]; }
  if (role === 'mason') { const m = others('mason'); return [{ text: m.length ? 'Your fellow Mason: ' + names(m) : 'You are the only Mason. The other is in the center.' }]; }
  return [];
}
export function validateAction(room: Room, id: string, action: NightAction) {
  const g = room.game!; const role = g.original[g.order.indexOf(id)];
  const targets = action.targets || []; const centers = action.centers || [];
  assert(new Set(targets).size === targets.length && targets.every(t => t !== id && g.order.includes(t)), 'Choose other players, with no duplicates.');
  assert(new Set(centers).size === centers.length && centers.every(t => Number.isInteger(t) && t >= 0 && t < 3), 'Choose distinct center cards 1 to 3.');
  if (role === 'wolf' && g.original.filter(r => r === 'wolf').length === 1) {
    assert(targets.length === 0 && ((action.skip && !centers.length) || (!action.skip && centers.length === 1)), 'Peek at one center card or skip.');
  } else if (role === 'seer') {
    assert(!action.skip && ((action.mode === 'player' && targets.length === 1 && !centers.length) || (action.mode === 'center' && centers.length === 2 && !targets.length)), 'Look at one other player or two center cards.');
  } else if (role === 'robber' || role === 'troublemaker') {
    assert(!action.skip && !centers.length && targets.length === (role === 'robber' ? 1 : 2), 'Choose the required other players.');
  } else if (role === 'drunk') {
    assert(!action.skip && !targets.length && centers.length === 1, 'Choose one center card.');
  } else assert(!targets.length && !centers.length && !action.skip, 'This role has no night action.');
}
export function resolveNight(room: Room) {
  const g = room.game!; const c = [...g.cards]; const n = g.order.length;
  const name = (id: string) => room.players.find(p => p.id === id)!.name;
  const swap = (a: number, b: number) => { [c[a], c[b]] = [c[b], c[a]]; };
  for (const id of g.order) g.reports[id] = staticReport(room, id);
  for (const role of ['wolf', 'seer', 'robber', 'troublemaker', 'drunk', 'insomniac'] as Role[]) {
    g.order.forEach((id, i) => {
      if (g.original[i] !== role) return;
      const a = g.actions[id] || {}; const t = a.targets || []; const centers = a.centers || []; const report = g.reports[id];
      if (role === 'wolf' && centers.length) report.push({ text: `You peeked at Center ${centers[0] + 1}:`, roles: [c[n + centers[0]]] });
      if (role === 'seer' && t.length) report.push({ text: name(t[0]) + ' is:', roles: [c[g.order.indexOf(t[0])]] });
      if (role === 'seer' && centers.length) report.push({ text: 'The center cards are:', roles: centers.map(k => c[n + k]) });
      if (role === 'robber' && t.length) { swap(i, g.order.indexOf(t[0])); report.push({ text: 'You swapped with ' + name(t[0]) + '. You are now:', roles: [c[i]] }); }
      if (role === 'troublemaker' && t.length) { swap(g.order.indexOf(t[0]), g.order.indexOf(t[1])); report.push({ text: 'You swapped ' + name(t[0]) + ' and ' + name(t[1]) + '.' }); }
      if (role === 'drunk' && centers.length) { swap(i, n + centers[0]); report.push({ text: `You swapped with Center ${centers[0] + 1}. Who are you now? Nobody knows.` }); }
      if (role === 'insomniac') report.push({ text: 'At the end of the night you are:', roles: [c[i]] });
    });
  }
  g.cards = c; room.phase = 'dawn';
}
export function evaluateResult(g: Round): Outcome {
  const n = g.order.length; const votes = Array<number>(n).fill(0);
  Object.values(g.votes).forEach(id => { const i = g.order.indexOf(id); if (i >= 0) votes[i]++; });
  const max = Math.max(...votes);
  const dead = max > 1 ? g.order.filter((_, i) => votes[i] === max) : [];
  const hunted: string[] = [];
  // Iterate to a fixed point: supports Hunter chains in rule tests and future decks.
  for (let cursor = 0; cursor < dead.length; cursor++) {
    const id = dead[cursor]; const target = g.votes[id];
    if (g.cards[g.order.indexOf(id)] === 'hunter' && target && !dead.includes(target)) { dead.push(target); hunted.push(target); }
  }
  const has = (r: Role) => g.order.some((_, i) => g.cards[i] === r);
  const killed = (r: Role) => dead.some(id => g.cards[g.order.indexOf(id)] === r);
  const tanner = killed('tanner'); const wolf = killed('wolf'); const winners: string[] = [];
  if (has('wolf')) { if (wolf) winners.push('the village'); else if (!tanner) winners.push('the werewolves'); }
  else if (has('minion')) { if (killed('minion') || !dead.length) winners.push('the village'); else if (!tanner) winners.push('the werewolves'); }
  else if (!dead.length) winners.push('the village');
  if (tanner) winners.push('the Tanner');
  const winningPlayers = g.order.filter((id, i) => {
    const r = g.cards[i];
    return r === 'tanner' ? tanner : (r === 'wolf' || r === 'minion') ? winners.includes('the werewolves') : winners.includes('the village');
  });
  return { cards: [...g.cards], votes, banished: dead, hunted, winners, winningPlayers, banner: winners.length ? 'Victory for ' + winners.join(' and ') + '!' : 'Nobody wins!' };
}
export function advance(room: Room, now = Date.now()) {
  const g = room.game; if (!g) return;
  const all = (f: (id: string) => boolean) => g.order.every(f);
  if (room.phase === 'night' && !room.narration?.active && !Object.values(g.undoUntil || {}).some(until => until > now) && all(id => !!g.actions[id])) resolveNight(room);
  if (room.phase === 'dawn' && all(id => g.ready.includes(id))) { room.phase = 'day'; room.dayEnd = now + room.daySeconds * 1000; }
  if (room.phase === 'day' && room.dayEnd !== null && now >= room.dayEnd) room.phase = 'vote';
  if (room.phase === 'vote' && (!room.preferences?.editableVoting || g.votingLocked || now >= (g.voteEnd || Infinity)) && all(id => !!g.votes[id])) { g.result = evaluateResult(g); room.phase = 'result'; }
}
export function skipPlayer(room: Room, id: string) {
  const g = room.game; if (!g || !g.order.includes(id)) return;
  if (!g.skipped.includes(id)) g.skipped.push(id);
  g.actions[id] ??= {}; if (!g.ready.includes(id)) g.ready.push(id);
  g.votes[id] ??= g.order.find(p => p !== id)!;
}
export function publicState(room: Room, now = Date.now()) {
  const g = room.game;
  return {
    ...publicExtras(room, now),
    preferences: { ...PLAY_DEFAULTS, ...room.preferences }, rolesInGame: room.deckRoles || room.deck || [],
    claims: ['day', 'vote', 'result'].includes(room.phase) ? g?.claims || [] : [], readyVote: room.phase === 'day' ? g?.readyVote || [] : [],
    session: room.session || { lastRound: 0, scores: {}, highlights: [] },
    nextWakeAt: nextDeadline(room), voteEnd: room.phase === 'vote' ? g?.voteEnd || null : null,
    reveal: room.phase === 'result' && g?.result ? { ...g.result, original: g.original, ballots: g.votes } : null,
    resultReason: resultReason(room),
    code: room.code, host: room.host, phase: room.phase, round: room.round, dayEnd: room.dayEnd,
    revision: room.revision, daySeconds: room.daySeconds, customDeck: room.deck,
    players: room.players.filter(p => !p.left || g?.order.includes(p.id)).map(p => ({ id: p.id, name: p.name, appearance: sanitizeAppearance(p.appearance), connected: !p.left && (p.bot || now - p.seen < 45000), left: p.left, spectator: !!p.spectator, bot: !!p.bot })),
    order: g?.order || [], skipped: g?.skipped || [],
    finished: !g || room.phase === 'night' && room.narration?.active ? [] : room.phase === 'night' ? Object.keys(g.actions) : room.phase === 'dawn' ? g.ready : room.phase === 'vote' ? Object.keys(g.votes) : [],
  };
}
export function personalState(room: Room, id: string, now = Date.now()) {
  const state = publicState(room, now); const g = room.game; const i = g?.order.indexOf(id) ?? -1;
  return {
    ...state, me: id, serverNow: now,
    private: i < 0 || !g || room.players.find(p => p.id === id)?.bot ? null : {
      role: g.original[i], static: room.phase !== 'night' || awake(room.narration, g.original[i]) ? staticReport(room, id) : [],
      locked: !!g.actions[id],
      undoUntil: g.undoUntil?.[id] || null, vote: g.votes[id] || null,
      report: room.phase !== 'night' ? g.reports[id] || [] : [],
      loneWolf: g.original[i] === 'wolf' && g.original.filter(r => r === 'wolf').length === 1,
      result: room.phase === 'result' ? { ...g.result!, original: g.original, ballots: g.votes } : null,
    },
  };
}
export type Snapshot = ReturnType<typeof personalState>;

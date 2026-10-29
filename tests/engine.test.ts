import { describe, expect, it } from 'vitest';
import { advance, buildDeck, cleanName, evaluateResult, personalState, resolveNight, skipPlayer, startRound, uniqueName, validateAction, validateDeck, type Role, type Room } from '../lib/engine';
function fixture(roles: Role[], center: Role[] = ['villager', 'minion', 'mason']): Room {
  const players = roles.map((_, i) => ({ id: String(i), tokenHash: `secret${i}`, name: `Player ${i}`, joined: i, seen: 100, left: false }));
  return { code: 'ABCD', host: '0', phase: 'night', round: 1, players, game: { order: players.map(p => p.id), original: [...roles], cards: [...roles, ...center], actions: {}, reports: {}, ready: [], votes: {}, skipped: [] }, dayEnd: null, daySeconds: 300, deck: null, updated: 100, revision: 1, receipts: [] };
}
function outcome(roles: Role[], votes: number[]) {
  const g = fixture(roles).game!; votes.forEach((target, i) => g.votes[String(i)] = String(target)); return evaluateResult(g);
}
describe('deck builder', () => {
  for (let n = 3; n <= 10; n++) it(`builds legal, paired decks for ${n} players`, () => {
    for (let run = 0; run < 250; run++) {
      const deck = buildDeck(n); expect(deck).toHaveLength(n + 3); expect(deck.filter(r => r === 'wolf')).toHaveLength(2);
      for (const r of ['seer', 'robber', 'troublemaker']) expect(deck).toContain(r);
      expect([0, 2]).toContain(deck.filter(r => r === 'mason').length); expect(() => validateDeck(deck, n)).not.toThrow();
    }
  });
  it('rejects illegal counts and overrides', () => {
    expect(() => buildDeck(2)).toThrow(); expect(() => buildDeck(11)).toThrow();
    expect(() => validateDeck(['wolf', 'wolf', 'seer', 'robber', 'troublemaker', 'mason'], 3)).toThrow('pair');
    expect(() => validateDeck(Array<Role>(6).fill('wolf'), 3)).toThrow(); expect(() => validateDeck(['wolf'], 3)).toThrow();
  });
});
describe('ordered night actions', () => {
  it('resolves Seer, Robber, Troublemaker, Drunk, then Insomniac', () => {
    const room = fixture(['robber', 'troublemaker', 'drunk', 'insomniac', 'seer', 'wolf'], ['tanner', 'hunter', 'wolf']);
    room.game!.actions = { '0': { targets: ['5'] }, '1': { targets: ['0', '2'] }, '2': { centers: [0] }, '3': {}, '4': { targets: ['5'], mode: 'player' }, '5': {} };
    resolveNight(room); const g = room.game!;
    expect(g.cards).toEqual(['drunk', 'troublemaker', 'tanner', 'insomniac', 'seer', 'robber', 'wolf', 'hunter', 'wolf']);
    expect(g.reports['0'][0].roles).toEqual(['wolf']); expect(g.reports['4'][0].roles).toEqual(['wolf']); expect(g.reports['2'][0].roles).toBeUndefined(); expect(g.reports['3'][0].roles).toEqual(['insomniac']);
    expect(room.phase).toBe('dawn'); expect(g.original[0]).toBe('robber');
  });
  it('original Insomniac sees the card moved by Robber and Troublemaker', () => {
    const room = fixture(['robber', 'troublemaker', 'drunk', 'insomniac', 'wolf']);
    room.game!.actions = { '0': { targets: ['3'] }, '1': { targets: ['2', '3'] }, '2': { centers: [1] }, '3': {}, '4': { centers: [2] } };
    resolveNight(room); expect(room.game!.reports['3'][0].roles).toEqual(['drunk']);
    expect(room.game!.cards[2]).toBe('minion'); expect(room.game!.cards[6]).toBe('robber');
  });
  it('wolf and Seer center peeks happen before Drunk swaps', () => {
    const room = fixture(['wolf', 'seer', 'drunk'], ['hunter', 'tanner', 'wolf']);
    room.game!.actions = { '0': { centers: [0] }, '1': { mode: 'center', centers: [0, 1] }, '2': { centers: [0] } };
    resolveNight(room); expect(room.game!.reports['0'].at(-1)!.roles).toEqual(['hunter']); expect(room.game!.reports['1'][0].roles).toEqual(['hunter', 'tanner']); expect(room.game!.cards[3]).toBe('drunk');
  });
  it('static information is original and immediate; hidden data stays private', () => {
    const room = fixture(['wolf', 'wolf', 'minion', 'mason', 'seer']);
    expect(personalState(room, '0').private!.static[0].text).toContain('Player 1'); expect(personalState(room, '0').private!.static[0].text).not.toContain('Player 2');
    expect(personalState(room, '2').private!.static[0].text).toContain('Player 0, Player 1'); expect(personalState(room, '3').private!.static[0].text).toContain('center');
    const snapshot = personalState(room, '4'); expect(snapshot.private!.role).toBe('seer'); expect(snapshot.private!.report).toEqual([]); expect(snapshot.private!.result).toBeNull();
    const json = JSON.stringify(snapshot); for (const secret of ['secret', 'original', 'actions', 'cards']) expect(json).not.toContain(secret);
    expect(personalState(room, 'spectator').private).toBeNull();
  });
  it('rejects self-targets, duplicate targets and illegal actions', () => {
    const room = fixture(['robber', 'troublemaker', 'seer', 'drunk', 'wolf', 'wolf']);
    expect(() => validateAction(room, '0', { targets: ['0'] })).toThrow(); expect(() => validateAction(room, '1', { targets: ['2', '2'] })).toThrow();
    expect(() => validateAction(room, '2', { mode: 'center', centers: [0, 0] })).toThrow(); expect(() => validateAction(room, '3', { centers: [3] })).toThrow(); expect(() => validateAction(room, '4', { centers: [0] })).toThrow();
    expect(() => validateAction(room, '2', { mode: 'player', targets: ['1'] })).not.toThrow();
  });
});
describe('voting and every winning branch', () => {
  it('a single vote each banishes nobody; ties banish every leader', () => {
    expect(outcome(['wolf', 'seer', 'robber'], [1, 2, 0]).banished).toEqual([]);
    const r = outcome(['wolf', 'seer', 'tanner', 'hunter'], [1, 0, 1, 0]); expect(r.banished).toEqual(['0', '1']); expect(r.winners).toEqual(['the village']);
  });
  it('Hunter shot uses final card and vote', () => {
    const r = outcome(['hunter', 'wolf', 'seer'], [1, 0, 0]); expect(r.banished).toEqual(['0', '1']); expect(r.hunted).toEqual(['1']); expect(r.winners).toEqual(['the village']);
  });
  it('Hunter chains terminate, including a cycle', () => {
    const r = outcome(['hunter', 'hunter', 'hunter', 'wolf', 'seer'], [1, 2, 0, 0, 0]); expect(r.banished).toEqual(['0', '1', '2']); expect(r.hunted).toEqual(['1', '2']);
  });
  it('village wins with a wolf banished; wolves win otherwise, including Minion-only banishment', () => {
    expect(outcome(['wolf', 'seer', 'robber'], [1, 0, 0]).winners).toEqual(['the village']); expect(outcome(['wolf', 'seer', 'robber'], [1, 2, 1]).winners).toEqual(['the werewolves']);
    expect(outcome(['wolf', 'minion', 'robber'], [1, 2, 1]).winners).toEqual(['the werewolves']); expect(outcome(['wolf', 'seer', 'robber'], [1, 2, 0]).winners).toEqual(['the werewolves']);
  });
  it('Tanner alone wins when banished without a wolf', () => {
    for (const r of ['wolf', 'minion', 'villager'] as Role[]) expect(outcome([r, 'tanner', 'robber'], [1, 2, 1]).winners).toEqual(['the Tanner']);
  });
  it('Tanner and village win together when Tanner and wolf are banished', () => {
    const r = outcome(['wolf', 'tanner', 'seer', 'robber'], [1, 0, 1, 0]); expect(r.winners).toEqual(['the village', 'the Tanner']); expect(r.banner).toBe('Victory for the village and the Tanner!'); expect(r.winningPlayers).toEqual(['1', '2', '3']);
  });
  it('no wolves, Minion present: Minion or nobody banished gives village victory', () => {
    expect(outcome(['minion', 'seer', 'robber'], [1, 0, 0]).winners).toEqual(['the village']); expect(outcome(['minion', 'seer', 'robber'], [1, 2, 0]).winners).toEqual(['the village']); expect(outcome(['minion', 'seer', 'robber'], [1, 2, 1]).winners).toEqual(['the werewolves']);
  });
  it('village also wins if the only Minion and Tanner are tied for banishment', () => {
    expect(outcome(['minion', 'tanner', 'seer', 'robber'], [1, 0, 1, 0]).winners).toEqual(['the village', 'the Tanner']);
  });
  it('no wolves or Minion: only nobody banished gives village victory', () => {
    expect(outcome(['villager', 'seer', 'robber'], [1, 2, 0]).winners).toEqual(['the village']); expect(outcome(['villager', 'seer', 'robber'], [1, 2, 1]).banner).toBe('Nobody wins!');
  });
  it('winners use final cards, not dealt cards', () => {
    const g = fixture(['wolf', 'robber', 'villager']).game!; g.cards = ['robber', 'wolf', 'villager', 'seer', 'tanner', 'mason']; g.votes = { '0': '1', '1': '0', '2': '1' }; expect(evaluateResult(g).winningPlayers).toEqual(['0', '2']);
  });
});
describe('round lifecycle', () => {
  it('skips auto-complete future steps and expired timer advances on the server', () => {
    const room = fixture(['villager', 'villager', 'villager']); for (const id of room.game!.order) skipPlayer(room, id);
    advance(room, 1000); expect(room.phase).toBe('day'); expect(room.dayEnd).toBe(301000); advance(room, 301000); expect(room.phase).toBe('result');
  });
  it('play again increments round, resets actions, deals active players only', () => {
    const room = fixture(['wolf', 'seer', 'robber', 'villager']); room.players[3].left = true; startRound(room); expect(room.round).toBe(2); expect(room.game!.cards).toHaveLength(6); expect(room.game!.actions).toEqual({}); expect(room.game!.order).toEqual(['0', '1', '2']);
  });
  it('sanitizes, truncates and auto-numbers duplicate names', () => {
    expect(cleanName('<Ann>\u0000')).toBe('Ann'); expect(cleanName(' ')).toBe('Wolf'); expect(cleanName('abcdefghijklmnop')).toHaveLength(12);
    const players = fixture(['wolf']).players; players[0].name = 'abcdefghijkl'; expect(uniqueName('abcdefghijkl', players)).toBe('abcdefghij 2');
  });
});

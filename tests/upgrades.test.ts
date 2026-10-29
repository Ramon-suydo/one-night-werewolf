import { describe, expect, it } from 'vitest';
import { advance, personalState, publicState, type Role, type Room } from '../lib/engine';
import { SCRIPT, advanceNarration, beginNarration, changeNarration, duration, narratorProgress } from '../lib/narration';
import { DEFAULT_SETTINGS, chatAllowed, discordURL, positionPacket, sanitizeAppearance, sanitizeMessage, sceneProjection, validPosition } from '../lib/social';
function room(roles: Role[]): Room {
  return { code: 'ABCD', host: '0', phase: 'night', round: 1, revision: 1, updated: 1000, receipts: [], players: roles.map((_, i) => ({ id: String(i), name: `Player ${i}`, tokenHash: `secret${i}`, joined: 1000, seen: 1000, left: false })), dayEnd: null, daySeconds: 300, deck: null, settings: { ...DEFAULT_SETTINGS, narrator: true }, narration: beginNarration(1000, 1), game: { order: roles.map((_, i) => String(i)), original: roles, cards: [...roles, 'wolf', 'seer', 'drunk'], actions: {}, reports: {}, votes: {}, ready: [], skipped: [] } };
}
describe('narrator timeline', () => {
  it('uses the exact same complete timeline with every role composition, including absent roles', () => {
    const totals = new Set<number>();
    for (const roles of [['wolf', 'seer', 'robber'], ['villager', 'villager', 'villager'], ['mason', 'mason', 'minion']] as Role[][]) {
      const r = room(roles); let now = 1000;
      SCRIPT.forEach((_, step) => { expect(r.narration!.narration_step).toBe(step); now += duration(step); advanceNarration(r, now - 1); expect(r.narration!.narration_step).toBe(step); advanceNarration(r, now); });
      totals.add(now); advance(r, now); expect(r.phase).toBe('dawn');
    }
    expect(totals.size).toBe(1); expect([...totals][0]).toBe(109000);
  });
  it('never ends early when all actions have already arrived', () => {
    const r = room(['wolf', 'seer', 'robber']); r.game!.actions = { '0': {}, '1': {}, '2': {} };
    advance(r, 1001); expect(r.phase).toBe('night'); advanceNarration(r, 108999); advance(r, 108999); expect(r.phase).toBe('night');
    advanceNarration(r, 109000); advance(r, 109000); expect(r.phase).toBe('dawn');
  });
  it('skips expired roles and resumes after reconnect from timestamps without resetting the clock', () => {
    const r = room(['wolf', 'seer', 'robber']); advanceNarration(r, 26000);
    expect(r.narration!.narration_step).toBe(3); expect(r.game!.actions['0']).toEqual({}); expect(r.game!.actions['1']).toBeUndefined();
    const reconnected = structuredClone(r); advanceNarration(reconnected, 60000); expect(reconnected.narration!.narration_step).toBe(5);
    expect(reconnected.narration!.step_started_at).toBe(54000); expect(reconnected.game!.actions['1']).toEqual({});
  });
  it('pause, resume and speed changes preserve elapsed progress', () => {
    const n = beginNarration(1000, 1); changeNarration(n, 'pause', 3000); expect(narratorProgress(n, 90000)).toBe(.4);
    changeNarration(n, 'speed', 90000, .7); expect(narratorProgress(n, 90000)).toBe(.4);
    changeNarration(n, 'resume', 100000); expect(narratorProgress(n, 100000)).toBe(.4);
    const r = room(['wolf', 'seer', 'robber']); r.narration = n; advanceNarration(r, 102100); expect(r.narration!.narration_step).toBe(1);
  });
});
describe('social validation', () => {
  it('blocks all chat at night, dawn, vote and whenever disabled', () => {
    for (const textChat of ['off', 'day', 'always'] as const) for (const phase of ['night', 'dawn', 'vote']) expect(chatAllowed(phase, { ...DEFAULT_SETTINGS, textChat })).toBe(false);
    for (const phase of ['lobby', 'day', 'result']) expect(chatAllowed(phase, DEFAULT_SETTINGS)).toBe(false);
    expect(chatAllowed('day', { ...DEFAULT_SETTINGS, textChat: 'day' })).toBe(true); expect(chatAllowed('lobby', { ...DEFAULT_SETTINGS, textChat: 'day' })).toBe(false);
    expect(chatAllowed('result', { ...DEFAULT_SETTINGS, textChat: 'always' })).toBe(true);
  });
  it('strictly validates Discord hosts, protocol, credentials and lookalike URLs', () => {
    expect(discordURL('https://discord.gg/abc')).toBe('https://discord.gg/abc'); expect(discordURL('https://discord.com/channels/1/2')).toBeTruthy(); expect(discordURL('')).toBe('');
    for (const url of ['javascript:alert(1)', 'http://discord.gg/a', 'https://discord.gg.evil.org/a', 'https://discord.com@evil.org/a', 'https://user:pass@discord.gg/a', 'https://discord.gg:999/a', 'https://discord.gg/']) expect(discordURL(url)).toBeNull();
  });
  it('sanitizes appearance indices, rejects arbitrary materials/geometry, and filters chat', () => {
    expect(sanitizeAppearance({ cloak: 7, hat: 5, face: 5, role: 'wolf', geometry: 'secret' })).toEqual({ cloak: 7, hat: 5, face: 5 });
    expect(sanitizeAppearance({ cloak: 8, hat: -1, face: '2' })).toEqual({ cloak: 0, hat: 0, face: 0 }); expect(sanitizeAppearance(null)).toEqual({ cloak: 0, hat: 0, face: 0 });
    expect(sanitizeMessage('<img src=x onerror=alert(1)>shit\u0000', true)).toBe('****'); expect(sanitizeMessage('shit', false)).toBe('shit'); expect(sanitizeMessage('x'.repeat(200), true)).toHaveLength(140);
  });
});
describe('public 3D and realtime privacy boundary', () => {
  it('public scenes and broadcasts contain no private role, reports, actions, or tokens before reveal', () => {
    const r = room(['wolf', 'seer', 'robber']); r.game!.actions['0'] = { centers: [0] }; r.game!.reports['0'] = [{ text: 'secret peek', roles: ['tanner'] }];
    const publicView = publicState(r); expect(publicView.finished).toEqual([]);
    const view = sceneProjection(personalState(r, '0')); const serialized = JSON.stringify(view);
    for (const secret of ['wolf', 'seer', 'robber', 'tanner', 'secret', 'private', 'actions', 'reports', 'tokenHash', 'loneWolf']) expect(serialized).not.toContain(secret);
    const p = positionPacket('0', 1, 4, 5); expect(validPosition(p)).toBe(true); expect(validPosition({ ...p, role: 'wolf' })).toBe(false); expect(validPosition({ ...p, x: Infinity })).toBe(false);
    expect(Object.keys(p).sort()).toEqual(['at', 'player', 'round', 'type', 'x', 'z']);
  });
  it('all public avatars remain identical for different hidden deals', () => {
    const a = room(['wolf', 'seer', 'robber']); const b = room(['mason', 'minion', 'tanner']); a.game!.actions['1'] = {};
    expect(publicState(a)).toEqual(publicState(b)); expect(sceneProjection(personalState(a, '0'))).toEqual(sceneProjection(personalState(b, '0')));
  });
});

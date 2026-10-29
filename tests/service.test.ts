import { beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { Room } from '../lib/engine';
const { rooms } = vi.hoisted(() => ({ rooms: new Map<string, Room>() }));
vi.mock('../lib/store', () => ({
  cleanExpired: async () => {},
  readRoom: async (code: string) => rooms.has(code) ? structuredClone(rooms.get(code)) : null,
  saveRoom: async (room: Room, expected: number) => {
    if ((rooms.get(room.code)?.revision ?? -1) !== expected) return false;
    rooms.set(room.code, structuredClone(room)); return true;
  },
}));
import { execute, type RequestBody } from '../lib/service';
type Command = RequestBody['command'];
const token = (n: number) => n.toString(16).padStart(64, '0');
async function create(n = 1) { return execute({ requestId: randomUUID(), command: { type: 'create', name: 'Camper' } }, token(n)); }
async function send(code: string, n: number, command: Command, round = 0, requestId = randomUUID()) {
  return execute({ code, requestId, round, command }, token(n));
}
beforeEach(() => rooms.clear());
describe('server authorization, concurrency and privacy', () => {
  it('lets an editable ballot change until the host locks it',async()=>{const a=await create();const b=await send(a.code,2,{type:'join',name:'B'});const c=await send(a.code,3,{type:'join',name:'C'});await send(a.code,1,{type:'preset',preset:'Quick',roles:'beginner'});await send(a.code,1,{type:'deal'});rooms.get(a.code)!.phase='vote';await send(a.code,1,{type:'vote',target:b.me},1);const changed=await send(a.code,1,{type:'vote',target:c.me},1);expect(changed.private!.vote).toBe(c.me);await send(a.code,2,{type:'vote',target:a.me},1);const last=await send(a.code,3,{type:'vote',target:a.me},1);expect(last.phase).toBe('vote');const locked=await send(a.code,1,{type:'lockVote'},1);expect(locked.phase).toBe('result')});
  it('gives night picks an undo window and keeps notepads out of API state',async()=>{const a=await create();const b=await send(a.code,2,{type:'join',name:'B'});await send(a.code,3,{type:'join',name:'C'});await send(a.code,1,{type:'deal'});rooms.get(a.code)!.game!.original[0]='robber';const chosen=await send(a.code,1,{type:'night',action:{targets:[b.me]}},1);expect(chosen.private!.undoUntil).toBeGreaterThan(Date.now());await send(a.code,1,{type:'undoNight'},1);expect(rooms.get(a.code)!.game!.actions[a.me]).toBeUndefined();expect(JSON.stringify(await send(a.code,2,{type:'sync'},1))).not.toContain('notepadContent')});
  it('public claims always belong to the authenticated actor',async()=>{const a=await create();await send(a.code,2,{type:'join',name:'B'});await send(a.code,3,{type:'join',name:'C'});await send(a.code,1,{type:'preset',preset:'Standard',roles:'classic'});await send(a.code,1,{type:'deal'});rooms.get(a.code)!.phase='day';rooms.get(a.code)!.dayEnd=Date.now()+300000;const claimed=await send(a.code,1,{type:'claim',role:'seer'},1);expect(claimed.claims[0].player).toBe(a.me);expect(claimed.claims[0].role).toBe('seer')});
  it('create is idempotent, join is numbered and anonymous tokens reconnect', async () => {
    const request: RequestBody = { requestId: randomUUID(), command: { type: 'create', name: 'Camper' } };
    const a = await execute(request, token(1)); const b = await execute(request, token(1)); expect(a.code).toBe(b.code); expect(a.me).toBe(b.me); expect(rooms.size).toBe(1);
    const joined = await send(a.code, 2, { type: 'join', name: 'Camper' }); expect(joined.players[1].name).toBe('Camper 2');
    expect((await send(a.code, 2, { type: 'sync' })).me).toBe(joined.me);
    await expect(send(a.code, 3, { type: 'sync' })).rejects.toThrow('Join this room first');
  });
  it('serializes ten concurrent joins and rejects the eleventh', async () => {
    const a = await create(); await Promise.all(Array.from({ length: 9 }, (_, i) => send(a.code, i + 2, { type: 'join', name: 'Camper' })));
    expect(rooms.get(a.code)!.players).toHaveLength(10); expect(new Set(rooms.get(a.code)!.players.map(p => p.name)).size).toBe(10);
    await expect(send(a.code, 11, { type: 'join', name: 'Extra' })).rejects.toThrow('10 players');
  });
  it('concurrent creates are idempotent and a create replay cannot impersonate a new host', async () => {
    const request: RequestBody = { requestId: randomUUID(), command: { type: 'create', name: 'Camper' } };
    const [a, replay] = await Promise.all([execute(request, token(1)), execute(request, token(1))]); expect(a.code).toBe(replay.code); expect(rooms.size).toBe(1);
    const b = await send(a.code, 2, { type: 'join', name: 'B' }); await send(a.code, 1, { type: 'transfer', target: b.me });
    expect((await execute(request, token(1))).me).toBe(a.me);
  });
  it('enforces phase, host, round and legal self targets', async () => {
    const a = await create(); const b = await send(a.code, 2, { type: 'join', name: 'B' }); await send(a.code, 3, { type: 'join', name: 'C' });
    await expect(send(a.code, 2, { type: 'deal' })).rejects.toThrow('host');
    await expect(send(a.code, 1, { type: 'ready' })).rejects.toThrow('Round in progress');
    await send(a.code, 1, { type: 'deal' });
    await expect(send(a.code, 1, { type: 'deal' }, 0)).rejects.toThrow('round changed');
    await expect(send(a.code, 2, { type: 'vote', target: b.me }, 1)).rejects.toThrow('Voting is not open');
    const room = rooms.get(a.code)!; room.phase = 'vote';
    await expect(send(a.code, 2, { type: 'vote', target: b.me }, 1)).rejects.toThrow('OTHER');
  });
  it('late joiners get no private state and are included in the next deal', async () => {
    const a = await create(); for (let n = 2; n <= 3; n++) await send(a.code, n, { type: 'join', name: String(n) }); await send(a.code, 1, { type: 'deal' });
    const late = await send(a.code, 4, { type: 'join', name: 'Late' }); expect(late.private).toBeNull();
    await expect(send(a.code, 4, { type: 'night', action: {} }, 1)).rejects.toThrow('Round in progress');
    rooms.get(a.code)!.phase = 'result'; const next = await send(a.code, 1, { type: 'deal' }, 1); expect(next.order).toContain(late.me); expect(next.round).toBe(2);
  });
  it('duplicate request IDs do not extend day twice', async () => {
    const a = await create(); for (let n = 2; n <= 3; n++) await send(a.code, n, { type: 'join', name: String(n) }); await send(a.code, 1, { type: 'deal' });
    const room = rooms.get(a.code)!; room.phase = 'day'; room.dayEnd = Date.now() + 300000; const end = room.dayEnd;
    const id = randomUUID(); await send(a.code, 1, { type: 'extend' }, 1, id); await send(a.code, 1, { type: 'extend' }, 1, id); expect(rooms.get(a.code)!.dayEnd).toBe(end + 60000);
  });
  it('transfer, kick and skip are host-only; kicked player cannot submit', async () => {
    const a = await create(); const b = await send(a.code, 2, { type: 'join', name: 'B' }); const c = await send(a.code, 3, { type: 'join', name: 'C' }); await send(a.code, 1, { type: 'deal' });
    await expect(send(a.code, 2, { type: 'skip', target: c.me }, 1)).rejects.toThrow('host');
    await send(a.code, 1, { type: 'skip', target: c.me }, 1); expect(rooms.get(a.code)!.game!.votes[c.me]).toBe(a.me);
    await send(a.code, 1, { type: 'transfer', target: b.me }, 1); await send(a.code, 2, { type: 'kick', target: c.me }, 1);
    await expect(send(a.code, 3, { type: 'sync' }, 1)).rejects.toThrow('removed');
  });
  it('disconnected host transfers to longest-connected active player; leaving transfers immediately', async () => {
    const a = await create(); const b = await send(a.code, 2, { type: 'join', name: 'B' }); await send(a.code, 3, { type: 'join', name: 'C' });
    rooms.get(a.code)!.players[0].seen -= 46000;
    const c = await send(a.code, 3, { type: 'sync' }); expect(c.host).toBe(b.me);
    const left = await send(a.code, 2, { type: 'leave' }); expect(left.host).toBe(a.me);
  });
  it('expires inactive rooms and rejects missing codes', async () => {
    const a = await create(); rooms.get(a.code)!.updated -= 86400001; await expect(send(a.code, 1, { type: 'sync' })).rejects.toThrow('expired');
    await expect(send('ZZZZ', 1, { type: 'sync' })).rejects.toThrow('No room');
  });
  it('enforces chat settings and rate limits, never returning old messages at night', async () => {
    const a = await create();
    await expect(send(a.code, 1, { type: 'chat', text: 'Hello' })).rejects.toThrow('disabled');
    await send(a.code, 1, { type: 'socialSettings', narrator: false, narrationSpeed: 1, textChat: 'always', profanityFilter: true, discord: 'https://discord.gg/abc' });
    const said = await send(a.code, 1, { type: 'chat', text: '<b>Hello</b>' }); expect(said.chat[0].text).toBe('Hello');
    await expect(send(a.code, 1, { type: 'chat', text: 'Again' })).rejects.toThrow('1.5');
    rooms.get(a.code)!.phase = 'night'; expect((await send(a.code, 1, { type: 'sync' })).chat).toEqual([]);
    await expect(send(a.code, 1, { type: 'chat', text: 'At night' })).rejects.toThrow('disabled');
  });
  it('validates host social settings and character appearance on the server', async () => {
    const a = await create(); await send(a.code, 2, { type: 'join', name: 'B' });
    await expect(send(a.code, 2, { type: 'socialSettings', narrator: true, narrationSpeed: 1, textChat: 'off', profanityFilter: true, discord: '' })).rejects.toThrow('host');
    await expect(send(a.code, 1, { type: 'socialSettings', narrator: true, narrationSpeed: 1, textChat: 'off', profanityFilter: true, discord: 'https://evil.org/' })).rejects.toThrow('discord');
    const changed = await send(a.code, 1, { type: 'appearance', appearance: { cloak: 99, hat: 4, face: '<script>', role: 'wolf' } }); expect(changed.players[0].appearance).toEqual({ cloak: 0, hat: 4, face: 0 });
  });
  it('narrated action submission is restricted to the awake role and completion never leaks', async () => {
    const a = await create(); await send(a.code, 2, { type: 'join', name: 'B' }); await send(a.code, 3, { type: 'join', name: 'C' });
    await send(a.code, 1, { type: 'socialSettings', narrator: true, narrationSpeed: 1, textChat: 'off', profanityFilter: true, discord: '' });
    await send(a.code, 1, { type: 'deal' });
    await expect(send(a.code, 1, { type: 'night', action: {} }, 1)).rejects.toThrow('eyes closed');
    const r = rooms.get(a.code)!; r.game!.original[0] = 'minion'; r.narration!.narration_step = 2; r.narration!.step_started_at = Date.now();
    const locked = await send(a.code, 1, { type: 'night', action: {} }, 1); expect(locked.finished).toEqual([]); expect(locked.private!.locked).toBe(true); expect(locked.phase).toBe('night');
  });
});

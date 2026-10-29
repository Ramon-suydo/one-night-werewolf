import 'server-only';
import { createHash, randomInt, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { ROLES, GameError, assert, personalState, skipPlayer, startRound, uniqueName, validateAction, validateDeck, type Room } from './engine';
import { cleanExpired, readRoom, saveRoom } from './store';
import { awake, beginNarration, changeNarration } from './narration';
import { DEFAULT_SETTINGS, EMOTES, chatAllowed, discordURL, sanitizeAppearance, sanitizeMessage } from './social';
import { DAY_PRESETS, PLAY_DEFAULTS, botAction, recommendedDeck } from './experience';
import { progressRoom } from './pacing';
import { nextDeadline } from './deadlines';
import { scheduleLocal } from './local-events';
import { serverEnv } from './server-env';

const night = z.object({ mode: z.enum(['player', 'center']).optional(), targets: z.array(z.string().uuid()).max(2).optional(), centers: z.array(z.number().int().min(0).max(2)).max(2).optional(), skip: z.boolean().optional() }).strict();
export const commandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('preset'), preset: z.enum(['Quick', 'Standard', 'Chill']), roles: z.enum(['beginner', 'classic', 'chaos']) }),
  z.object({ type: z.literal('playSettings'), notepad: z.boolean(), claims: z.boolean(), editableVoting: z.boolean(), rotateHost: z.boolean(), voteSeconds: z.number().int().min(15).max(120), confirmActions: z.boolean() }),
  z.object({ type: z.literal('claim'), role: z.enum(ROLES) }),
  z.object({ type: z.literal('readyVote') }), z.object({ type: z.literal('lockVote') }), z.object({ type: z.literal('undoNight') }),
  z.object({ type: z.literal('spectate'), value: z.boolean() }),
  z.object({ type: z.literal('replaceBot'), target: z.string().uuid() }),
  z.object({ type: z.literal('skipRandom'), target: z.string().uuid() }),
  z.object({ type: z.literal('appearance'), appearance: z.unknown() }),
  z.object({ type: z.literal('socialSettings'), narrator: z.boolean(), narrationSpeed: z.union([z.literal(.7), z.literal(1), z.literal(1.4)]), textChat: z.enum(['off', 'day', 'always']), profanityFilter: z.boolean(), discord: z.string().max(250) }),
  z.object({ type: z.literal('narratorControl'), control: z.enum(['pause', 'resume', 'speed']), speed: z.union([z.literal(.7), z.literal(1), z.literal(1.4)]).optional() }),
  z.object({ type: z.literal('chat'), text: z.string().min(1).max(140) }),
  z.object({ type: z.literal('emote'), kind: z.enum(EMOTES), target: z.string().uuid().optional() }),
  z.object({ type: z.literal('create'), name: z.string().max(100) }),
  z.object({ type: z.literal('join'), name: z.string().max(100) }),
  z.object({ type: z.literal('sync') }), z.object({ type: z.literal('leave') }),
  z.object({ type: z.literal('deal') }), z.object({ type: z.literal('ready') }),
  z.object({ type: z.literal('night'), action: night }),
  z.object({ type: z.literal('vote'), target: z.string().uuid() }),
  z.object({ type: z.literal('kick'), target: z.string().uuid() }),
  z.object({ type: z.literal('transfer'), target: z.string().uuid() }),
  z.object({ type: z.literal('skip'), target: z.string().uuid() }),
  z.object({ type: z.literal('extend') }), z.object({ type: z.literal('callVote') }),
  z.object({ type: z.literal('settings'), deck: z.array(z.enum(ROLES)).max(13).nullable(), daySeconds: z.number().int().min(30).max(900) }),
]);
export const requestSchema = z.object({ code: z.string().regex(/^[A-HJ-NP-Z]{4}$/).optional(), requestId: z.string().uuid(), round: z.number().int().nonnegative().optional(), command: commandSchema }).strict();
export type RequestBody = z.infer<typeof requestSchema>;
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
export async function execute(body: RequestBody, token: string) {
  const hash = hashToken(token); const now = Date.now(); const cmd = body.command;
  if (cmd.type === 'create') {
    await cleanExpired();
    for (let tries = 0; tries < 20; tries++) {
      // A retried create request returns the same room, even after a lost response.
      const digest = createHash('sha256').update(hash + body.requestId + tries).digest();
      const code = Array.from(digest.subarray(0, 4), b => alphabet[b % alphabet.length]).join('');
      const existing = await readRoom(code);
      if (existing?.receipts.includes(hash + body.requestId)) return personalState(existing, existing.players.find(p => p.tokenHash === hash)!.id);
      const id = randomUUID();
      const room: Room = { code, host: id, phase: 'lobby', round: 0, players: [{ id, tokenHash: hash, name: uniqueName(cmd.name, []), joined: now, seen: now, left: false }], dayEnd: null, daySeconds: 300, deck: null, updated: now, revision: 0, receipts: [hash + body.requestId] };
      if (await saveRoom(room, -1)) return personalState(room, id);
      const committed = await readRoom(code);
      if (committed?.receipts.includes(hash + body.requestId)) return personalState(committed, committed.players.find(p => p.tokenHash === hash)!.id);
    }
    throw new GameError('Could not allocate a room. Try again.', 503);
  }
  assert(body.code, 'Enter a 4-letter room code (no I or O).');
  for (let attempt = 0; attempt < 25; attempt++) {
    const room = await readRoom(body.code);
    if (!room) throw new GameError('No room ' + body.code + ' found.', 404);
    if (now - room.updated > 86400000) throw new GameError('That room expired after 24 hours of inactivity. Create a new room.', 410);
    const expected = room.revision;
    let player = room.players.find(p => p.tokenHash === hash);
    if (cmd.type === 'join' && !player) {
      assert(room.players.filter(p => !p.left && !p.spectator).length < 10, 'This room already has 10 players.');
      player = { id: randomUUID(), tokenHash: hash, name: uniqueName(cmd.name, room.players), joined: now, seen: now, left: false };
      room.players.push(player);
    }
    if (!player) throw new GameError('Join this room first.', 403);
    if (player.left && cmd.type === 'join') {
      assert(room.phase === 'lobby' || room.phase === 'result', 'Round in progress, join the next game');
      assert(room.players.filter(p => !p.left).length < 10, 'This room already has 10 players.');
      player.left = false; player.joined = now;
    }
    if (player.left) throw new GameError('You have left this room or were removed by the host. Join again for the next game.', 403);
    const before = businessState(room);
    const id = player.id; player.seen = now;
    const host = room.players.find(p => p.id === room.host);
    if (!host || host.left || now - host.seen >= 45000) {
      room.host = room.players.filter(p => !p.left && now - p.seen < 45000).sort((a, b) => a.joined - b.joined)[0]?.id || id;
    }
    progressRoom(room, now, secureRandom);
    const receipt = hash + body.requestId;
    if (!room.receipts.includes(receipt)) {
      const hostOnly = ['deal', 'settings', 'preset', 'playSettings', 'replaceBot', 'skipRandom', 'lockVote', 'socialSettings', 'narratorControl', 'skip', 'kick', 'transfer', 'extend', 'callVote'];
      if (hostOnly.includes(cmd.type)) assert(room.host === id, 'Only the host can do that.');
      if (['night', 'ready', 'vote', 'deal', 'extend', 'callVote', 'skip', 'settings'].includes(cmd.type)) assert(body.round === room.round, 'The round changed. Refresh your view.');
      const g = room.game;
      if(['night','ready','vote','claim','readyVote'].includes(cmd.type))assert(!player.bot,'A bot now plays this seat. You can watch the round.');
      if (['night', 'ready', 'vote'].includes(cmd.type)) assert(g?.order.includes(id) && !g.skipped.includes(id), 'Round in progress, join the next game');
      switch (cmd.type) {
        case 'preset': {
          assert(room.phase === 'lobby' || room.phase === 'result', 'Choose a setup between rounds.');
          room.daySeconds = DAY_PRESETS[cmd.preset]; room.deck = recommendedDeck(room.players.filter(p => !p.left && !p.spectator).length, cmd.roles);
          room.preferences = { ...PLAY_DEFAULTS, ...room.preferences, claims: true, editableVoting: true, confirmActions: true }; break;
        }
        case 'playSettings': assert(room.phase === 'lobby' || room.phase === 'result', 'Change helpers between rounds.'); room.preferences = { notepad: cmd.notepad, claims: cmd.claims, editableVoting: cmd.editableVoting, rotateHost: cmd.rotateHost, voteSeconds: cmd.voteSeconds, confirmActions: cmd.confirmActions }; break;
        case 'claim': assert(room.phase === 'day' && room.preferences?.claims && g?.order.includes(id), 'Claims are available during discussion when the host enables them.'); g!.claims = [...g!.claims || [], { player: id, role: cmd.role, at: now }].slice(-80); break;
        case 'readyVote': assert(room.phase === 'day' && g?.order.includes(id), 'Wait until discussion starts.'); if (!g!.readyVote?.includes(id)) (g!.readyVote ||= []).push(id); break;
        case 'lockVote': assert(room.phase === 'vote' && room.preferences?.editableVoting, 'Voting is not open for changes.'); g!.votingLocked = true; break;
        case 'undoNight': {
          assert(room.phase === 'night' && (g?.undoUntil?.[id] || 0) > now, 'The five-second undo window has ended.');
          delete g!.actions[id]; delete g!.undoUntil![id];
          if (!awake(room.narration, g!.original[g!.order.indexOf(id)])) g!.actions[id] = {};
          break;
        }
        case 'spectate': assert(room.phase === 'lobby' || room.phase === 'result', 'Switch seats between rounds.'); player.spectator = cmd.value; break;
        case 'skipRandom': {
          assert(g&&room.phase!=='lobby'&&room.phase!=='result','There is no active round to skip.');assert(cmd.target!==id&&g.order.includes(cmd.target),'Choose another player.');
          g.actions[cmd.target] ||= botAction(room,cmd.target,secureRandom);if(!g.ready.includes(cmd.target))g.ready.push(cmd.target);const others=g.order.filter(p=>p!==cmd.target);g.votes[cmd.target] ||= others[Math.floor(secureRandom()*others.length)];if(!g.skipped.includes(cmd.target))g.skipped.push(cmd.target);break;
        }
        case 'replaceBot': {
          const target = room.players.find(p => p.id === cmd.target); assert(target && target.id !== id && g?.order.includes(target.id), 'Choose another player in this round.');
          assert(target.left || now - target.seen >= 45000, 'A bot can take over after that player disconnects.'); target.bot = true; target.left = false;
          if (room.phase === 'night' && !g!.actions[target.id]) g!.actions[target.id] = botAction(room, target.id, secureRandom);
          if (room.phase === 'dawn' && !g!.ready.includes(target.id)) g!.ready.push(target.id); break;
        }
        case 'deal': {
          if (room.phase === 'result' && room.preferences?.rotateHost) { const seats = room.players.filter(p => !p.left && !p.spectator && !p.bot); const at = seats.findIndex(p => p.id === room.host); if (seats.length) room.host = seats[(at + 1) % seats.length].id; }
          assert(room.phase === 'lobby' || room.phase === 'result', 'A round is already in progress.'); startRound(room, () => randomInt(0x100000000) / 0x100000000);
          room.narration = room.settings?.narrator ? beginNarration(now, room.settings.narrationSpeed) : undefined; break;
        }
        case 'appearance': assert(room.phase === 'lobby' || room.phase === 'result', 'Change your appearance between rounds.'); player.appearance = sanitizeAppearance(cmd.appearance); break;
        case 'socialSettings': {
          assert(room.phase === 'lobby' || room.phase === 'result', 'Change settings between rounds.'); const discord = discordURL(cmd.discord);
          assert(discord !== null, 'Use an https://discord.gg/ or https://discord.com/ link.');
          room.settings = { narrator: cmd.narrator, narrationSpeed: cmd.narrationSpeed, textChat: cmd.textChat, profanityFilter: cmd.profanityFilter, discord }; break;
        }
        case 'narratorControl': assert(room.phase === 'night' && room.narration?.active, 'The narrator is not running.'); changeNarration(room.narration, cmd.control, now, cmd.speed); break;
        case 'chat': {
          const settings = { ...DEFAULT_SETTINGS, ...room.settings };
          assert(chatAllowed(room.phase, settings), 'Text chat is disabled in this phase.');
          assert(now - (room.lastChat?.[id] || 0) >= 1500, 'Wait 1.5 seconds between messages.');
          const text = sanitizeMessage(cmd.text, settings.profanityFilter); assert(text, 'Write a message first.');
          room.chat = [...room.chat || [], { id: randomUUID(), player: id, text, at: now }].slice(-60);
          room.lastChat = { ...room.lastChat, [id]: now }; break;
        }
        case 'emote': {
          assert(!cmd.target || room.players.some(p => p.id === cmd.target && !p.left), 'Choose someone by the fire.');
          assert(!(room.emotes || []).some(e => e.player === id && now - e.at < 600), 'Give your emote a moment.');
          room.emotes = [...(room.emotes || []).filter(e => now - e.at < 3000), { id: randomUUID(), player: id, kind: cmd.kind, ...(cmd.target ? { target: cmd.target } : {}), at: now }].slice(-30); break;
        }
        case 'settings': {
          assert(room.phase === 'lobby' || room.phase === 'result', 'Change settings between rounds.');
          if (cmd.deck) validateDeck(cmd.deck, room.players.filter(p => !p.left && !p.spectator).length);
          room.deck = cmd.deck; room.daySeconds = cmd.daySeconds; break;
        }
        case 'night':
          assert(room.phase === 'night', 'Night has ended.');
          assert(awake(room.narration, g!.original[g!.order.indexOf(id)]) && !room.narration?.paused_at, 'Keep your eyes closed until your narrator window.');
          if (!g!.actions[id]) { validateAction(room, id, cmd.action); g!.actions[id] = cmd.action; if ((cmd.action.targets?.length || cmd.action.centers?.length)) (g!.undoUntil ||= {})[id] = now + 5000; } break;
        case 'ready': assert(room.phase === 'dawn', 'Wait until dawn.'); if (!g!.ready.includes(id)) g!.ready.push(id); break;
        case 'vote':
          assert(room.phase === 'vote', 'Voting is not open.'); assert(cmd.target !== id && g!.order.includes(cmd.target), 'Vote for one OTHER player.'); if (room.preferences?.editableVoting) g!.votes[id] = cmd.target; else g!.votes[id] ??= cmd.target; break;
        case 'extend': assert(room.phase === 'day', 'The day has ended.'); room.dayEnd! += 60000; break;
        case 'callVote': assert(room.phase === 'day', 'Voting cannot be called now.'); room.phase = 'vote'; break;
        case 'skip': assert(room.phase === 'night' || room.phase === 'dawn' || room.phase === 'vote', 'Skip players during night, dawn or voting.'); assert(cmd.target !== id && g!.order.includes(cmd.target), 'Choose another player in this round.'); skipPlayer(room, cmd.target); break;
        case 'kick': {
          const target = room.players.find(p => p.id === cmd.target && !p.left);
          assert(target && target.id !== id, 'Choose another player.'); target.left = true; skipPlayer(room, target.id); break;
        }
        case 'transfer': assert(cmd.target !== id && room.players.some(p => p.id === cmd.target && !p.left), 'Choose another player.'); room.host = cmd.target; break;
        case 'leave': player.left = true; skipPlayer(room, id); room.host = room.players.filter(p => !p.left).sort((a, b) => a.joined - b.joined)[0]?.id || ''; break;
      }
      if (cmd.type !== 'sync') { room.receipts.push(receipt); room.receipts = room.receipts.slice(-500); }
    }
    progressRoom(room, now, secureRandom);
    if (cmd.type === 'sync' && businessState(room) === before) { schedule(room); return personalState(room, id); }
    room.updated = now; room.revision++;
    if (await saveRoom(room, expected)) { schedule(room); return personalState(room, id); }
    await new Promise(resolve => setTimeout(resolve, randomInt(5, 40)));
  }
  throw new GameError('The room is busy. Please retry.', 409);
}
function secureRandom() { return randomInt(0x100000000) / 0x100000000; }
function businessState(room: Room) { return JSON.stringify({ ...room, players: room.players.map(p => ({ ...p, seen: 0 })) }); }
function schedule(room: Room) { if (!serverEnv('NEXT_PUBLIC_SUPABASE_URL') && !serverEnv('VERCEL')) scheduleLocal(room.code, nextDeadline(room), () => tickRoom(room.code)); }
export async function tickRoom(code: string) {
  for (let retry = 0; retry < 10; retry++) {
    const room = await readRoom(code); if (!room) return; const before = JSON.stringify(room), revision = room.revision;
    const host = room.players.find(p => p.id === room.host);
    if (host && Date.now() - host.seen >= 45000) room.host = room.players.filter(p => !p.left && !p.bot && Date.now() - p.seen < 45000).sort((a, b) => a.joined - b.joined)[0]?.id || room.host;
    progressRoom(room, Date.now(), secureRandom);
    if (JSON.stringify(room) !== before) { room.revision++; room.updated = Date.now(); if (!await saveRoom(room, revision)) continue; }
    schedule(room); return;
  }
}

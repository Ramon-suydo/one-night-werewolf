import type { Room, Snapshot } from './engine';
export const CLOAKS = ['#ffd35a', '#4a7bd6', '#4fae6a', '#7b4fbf', '#d6455d', '#8a5a3c', '#8a8fa8', '#f4efe0'] as const;
export const HATS = ['Hood', 'Beanie', 'Pointed', 'Brim', 'Crown', 'Bare'] as const;
export const FACES = ['Bright', 'Freckles', 'Smile', 'Spectacles', 'Rosy', 'Sleepy'] as const;
export const EMOTES = ['wave', 'point', 'shrug', 'laugh', 'gasp', 'thumbs up'] as const;
export type Appearance = { cloak: number; hat: number; face: number };
export type SocialSettings = { narrator: boolean; narrationSpeed: number; textChat: 'off' | 'day' | 'always'; profanityFilter: boolean; discord: string };
export type ChatMessage = { id: string; player: string; text: string; at: number };
export type Emote = { id: string; player: string; kind: typeof EMOTES[number]; target?: string; at: number };
export const DEFAULT_SETTINGS: SocialSettings = { narrator: false, narrationSpeed: 1, textChat: 'off', profanityFilter: true, discord: '' };
export function sanitizeAppearance(value: unknown): Appearance {
  const a = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const index = (key: string, max: number) => typeof a[key] === 'number' && Number.isInteger(a[key]) && a[key] >= 0 && a[key] < max ? a[key] : 0;
  return { cloak: index('cloak', 8), hat: index('hat', 6), face: index('face', 6) };
}
export function discordURL(value: string): string | null {
  if (!value.trim()) return '';
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' && ['discord.gg', 'discord.com'].includes(url.hostname) && !url.username && !url.password && !url.port && url.pathname !== '/' ? url.href : null;
  } catch { return null; }
}
export function chatAllowed(phase: string, settings: SocialSettings) {
  return settings.textChat !== 'off' && (phase === 'day' || settings.textChat === 'always' && ['lobby', 'result'].includes(phase));
}
export function sanitizeMessage(value: string, filter: boolean) {
  const text = value.normalize('NFKC').replace(/<[^>]*>/g, '').replace(/[<>"'&\p{Cc}\p{Cf}]/gu, '').trim().slice(0, 140);
  return filter ? text.replace(/\b(fuck|shit|bitch|asshole|bastard)\w*\b/gi, m => '*'.repeat(m.length)) : text;
}
export function publicExtras(room: Room, now: number) {
  const settings = { ...DEFAULT_SETTINGS, ...room.settings };
  return {
    settings, narration: room.narration || null,
    chat: chatAllowed(room.phase, settings) ? (room.chat || []).slice(-60) : [],
    emotes: (room.emotes || []).filter(e => now - e.at < 3000),
  };
}
export type PositionPacket = { type: 'position'; player: string; round: number; x: number; z: number; at: number };
export function positionPacket(player: string, round: number, x: number, z: number, at = Date.now()): PositionPacket {
  const distance = Math.hypot(x, z); const r = Math.max(2, Math.min(13, distance));
  return { type: 'position', player, round, x: distance > 0 ? x / distance * r : 2, z: distance > 0 ? z / distance * r : 0, at };
}
export function validPosition(value: unknown): value is PositionPacket {
  if (!value || typeof value !== 'object') return false;
  const p = value as PositionPacket;
  return Object.keys(p).sort().join() === 'at,player,round,type,x,z' && p.type === 'position' && typeof p.player === 'string' && Number.isInteger(p.round) && [p.x, p.z, p.at].every(Number.isFinite) && Math.hypot(p.x, p.z) <= 13.01;
}
// Only this projection is accepted by the public 3D world. Never spread private.
export function sceneProjection(state: Snapshot) {
  return {
    code: state.code, round: state.round, phase: state.phase, me: state.me,
    players: state.players.map(p => ({ id: p.id, name: p.name, appearance: p.appearance })),
    order: state.order, emotes: state.emotes, chat: state.chat, claims: state.claims,
    reveal: state.phase === 'result' ? state.private?.result || state.reveal || null : null,
  };
}
export type SceneState = ReturnType<typeof sceneProjection>;

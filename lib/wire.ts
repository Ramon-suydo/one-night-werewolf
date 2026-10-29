import { positionPacket, validPosition, type PositionPacket } from './social';
export type WirePosition = { p: string; r: number; x: number; z: number; t: number };
export function packPosition(p: PositionPacket): WirePosition { return { p: p.player, r: p.round, x: Math.round(p.x * 100) / 100, z: Math.round(p.z * 100) / 100, t: p.at }; }
export function unpackPosition(value: unknown): PositionPacket | null {
  if (!value || typeof value !== 'object' || Object.keys(value).sort().join() !== 'p,r,t,x,z') return null;
  const p = value as WirePosition; const full = { type: 'position' as const, player: p.p, round: p.r, x: p.x, z: p.z, at: p.t };
  return validPosition(full) ? full : null;
}
export const MOVEMENT_CAP = 10000;
export function movementChanged(previous: WirePosition | null, next: WirePosition, lastAt: number, now: number) { return now - lastAt >= 100 && (!previous || next.x !== previous.x || next.z !== previous.z || next.r !== previous.r); }
export function constrainedPosition(player: string, round: number, x: number, z: number) { return packPosition(positionPacket(player, round, x, z)); }

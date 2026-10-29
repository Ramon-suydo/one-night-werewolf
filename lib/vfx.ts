import {INTRO_RAIL,sampleRail} from './cinematics';
// Cosmetic math only. No player roles, actions or network dependencies.
export const VFX_BUDGET = { highParticles: 128, lowParticles: 32, runeCount: 24, drawCalls: 5 } as const;
export const easeOut = (t: number) => 1 - (1 - Math.max(0, Math.min(1, t))) ** 3;
export function phaseColor(phase: string) { return phase === 'vote' ? '#d6455d' : phase === 'night' ? '#9d83ed' : phase === 'dawn' ? '#ffb27a' : '#ffd35a'; }
export function particleAt(index: number, age: number, celebration: boolean, output: Float32Array, offset = index * 3) {
 const a = index * 2.39996323, speed = .7 + (index % 11) / 9;
 const life = (age * speed + index * .137) % 3;
 const radius = celebration ? life * 2.8 : 2 + Math.sin(a + age * .4) * .8;
 output[offset] = Math.cos(a + (celebration ? 0 : age * .2)) * radius;
 output[offset + 1] = celebration ? 1 + life * 4 - life * life : .4 + life * 2;
 output[offset + 2] = Math.sin(a + (celebration ? 0 : age * .2)) * radius;
}
export const INTRO_SECONDS = 18;
export function introCamera(seconds: number) {
 const shot=sampleRail(INTRO_RAIL,seconds);return{x:shot.position[0],y:shot.position[1],z:shot.position[2],targetY:shot.look[1],caption:shot.caption};
}

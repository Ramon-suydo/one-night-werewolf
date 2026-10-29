import {describe,expect,it} from 'vitest';
import {easeOut,introCamera,INTRO_SECONDS,particleAt,VFX_BUDGET} from '../lib/vfx';
describe('bounded cosmetic effects',()=>{
 it('uses a small particle and draw-call budget',()=>{expect(VFX_BUDGET.lowParticles).toBeLessThanOrEqual(32);expect(VFX_BUDGET.highParticles).toBeLessThanOrEqual(128);expect(VFX_BUDGET.drawCalls).toBeLessThanOrEqual(5)});
 it('updates the provided pool deterministically without replacing it',()=>{const a=new Float32Array(384),b=new Float32Array(384);for(let i=0;i<128;i++){particleAt(i,2,false,a);particleAt(i,2,false,b)}expect(a).toEqual(b);expect([...a].every(Number.isFinite)).toBe(true)});
 it('keeps the intro camera bounded and ends overlooking the fire',()=>{expect(introCamera(-1)).toEqual(introCamera(0));expect(introCamera(100)).toEqual(introCamera(INTRO_SECONDS));expect(introCamera(18).z).toBe(21);expect(easeOut(1)).toBe(1)});
});

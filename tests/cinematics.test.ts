import {describe,it,expect} from 'vitest';
import {INTRO_RAIL,sampleRail} from '../lib/cinematics';
describe('skippable cinematic rails',()=>{
 it('visits the mountains, low trees and clearing in sequence',()=>{expect(sampleRail(INTRO_RAIL,0).position[1]).toBe(30);expect(sampleRail(INTRO_RAIL,10).position[1]).toBe(3);expect(sampleRail(INTRO_RAIL,18).position).toEqual([0,15,21])});
 it('clamps out-of-range playback and always provides captions',()=>{expect(sampleRail(INTRO_RAIL,-100)).toEqual(sampleRail(INTRO_RAIL,0));expect(sampleRail(INTRO_RAIL,100)).toEqual(sampleRail(INTRO_RAIL,18));for(let t=0;t<18;t+=.25){const shot=sampleRail(INTRO_RAIL,t);expect(shot.position.every(Number.isFinite)).toBe(true);expect(shot.caption.length).toBeGreaterThan(8)}});
});

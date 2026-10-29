import {describe,it,expect} from 'vitest';
import {SOUND_CUES,variedPitch,heartbeatInterval} from '../lib/sound-data';
import {sanitizePreferences} from '../lib/preferences';
describe('bounded procedural audio',()=>{
 it('provides the complete original cue set',()=>{for(const name of ['charge','flip','seal','swap','slam','vote','shot','win','lose','step','dawn'] as const)expect(SOUND_CUES[name][2]).toBeGreaterThan(0)});
 it('keeps pitch variation inside six percent',()=>{expect(variedPitch(100,-1)).toBe(94);expect(variedPitch(100,2)).toBe(106);expect(variedPitch(100,.5)).toBe(100)});
 it('accelerates the heartbeat toward the vote deadline',()=>{expect(heartbeatInterval(0)).toBeLessThan(heartbeatInterval(30));expect(heartbeatInterval(-100)).toBe(.3);expect(heartbeatInterval(100)).toBe(.7)});
 it('bounds persisted levels and rejects malformed settings',()=>{const p=sanitizePreferences({master:100,music:-9,narrator:NaN,effects:Infinity,quality:'broken',muted:'yes'});expect(p.master).toBe(1);expect(p.music).toBe(0);expect(Number.isFinite(p.narrator)).toBe(true);expect(p.effects).toBe(.5);expect(p.quality).toBe('Automatic');expect(p.muted).toBe(false)});
});

import {describe,it,expect} from 'vitest';
import {LANDMARKS,nearestLandmark} from '../lib/landmarks';
describe('walk-up world interactions',()=>{
 for(const place of LANDMARKS)it(`${place.id} is reachable and selects its own landmark`,()=>{expect(Math.hypot(place.x,place.z)).toBeLessThan(13);expect(nearestLandmark(place.x,place.z,'lobby',true)?.id).toBe(place.id)});
 it('keeps host lobby props inactive during play',()=>{expect(nearestLandmark(2,4,'day',true)?.id).not.toBe('start');expect(nearestLandmark(2,4,'lobby',false)?.id).not.toBe('start')});
 it('never moves or opens world props during night',()=>{for(const p of LANDMARKS)expect(nearestLandmark(p.x,p.z,'night',true)).toBeUndefined()});
});

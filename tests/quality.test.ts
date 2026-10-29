import {describe,it,expect} from 'vitest';
import {chooseTier,QUALITY,TIERS} from '../lib/quality';
describe('all-3D quality policy',()=>{
 it('keeps software renderers in the minimum 3D tier',()=>expect(chooseTier('Google SwiftShader')).toBe('Minimum'));
 it('reduces slow hardware without changing renderer',()=>expect(chooseTier('RTX',true)).toBe('Minimum'));
 it('bounds every rendering scale and frame budget',()=>{for(const t of TIERS){expect(QUALITY[t].scale).toBeGreaterThan(0);expect(QUALITY[t].fps).toBeGreaterThanOrEqual(30)}});
});

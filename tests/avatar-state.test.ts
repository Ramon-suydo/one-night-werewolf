import {describe,it,expect} from 'vitest';
import {eyesOpen,playerTargets} from '../lib/avatar-state';
describe('private night presentation',()=>{
 it('keeps all eyes closed for a sleeping viewer',()=>{for(const id of ['me','wolf','seer'])expect(eyesOpen('night',id,'me',false,['wolf'])).toBe(false)});
 it('opens only the active viewer and server-authorized teammates',()=>{expect(eyesOpen('night','me','me',true,['wolf'])).toBe(true);expect(eyesOpen('night','wolf','me',true,['wolf'])).toBe(true);expect(eyesOpen('night','seer','me',true,['wolf'])).toBe(false)});
 it('keeps absent avatars asleep without changing appearance',()=>{expect(eyesOpen('day','me','me',true,[],false)).toBe(false);expect(eyesOpen('day','other','me',false,[])).toBe(true)});
 it('allows player targeting only for legal powers and never self',()=>{for(const role of ['seer','robber','troublemaker','doppel'])expect(playerTargets(role,['me','other'],'me')).toEqual(['other']);for(const role of ['wolf','drunk','mason','villager',null])expect(playerTargets(role,['me','other'],'me')).toEqual([])});
});

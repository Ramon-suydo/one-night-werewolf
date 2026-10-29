import {describe,it,expect} from 'vitest';
import {sealForRole} from '../rules/seals';
describe('team and solo seal accessibility',()=>{
 it('distinguishes every personal goal by shape as well as color',()=>{const roles=['tanner','drunk','troublemaker','robber','doppel'] as const,seals=roles.map(r=>sealForRole(r));expect(new Set(seals.map(s=>s.shape)).size).toBe(5);expect(new Set(seals.map(s=>s.color)).size).toBe(5)});
 it('keeps Classic Robber, Drunk and Troublemaker in the village',()=>{for(const role of ['robber','drunk','troublemaker'] as const)expect(sealForRole(role,'classic')).toMatchObject({shape:'circle',label:'Village team'})});
 it('gives wolf and Minion the same jagged team marker',()=>expect(sealForRole('wolf')).toEqual(sealForRole('minion')));
});

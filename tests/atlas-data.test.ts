import {describe,it,expect} from 'vitest';
import {ROLES} from '../engine';
import {RULES} from '../lib/rules';
import {tabletIndex,ATLAS_COLS,ATLAS_ROWS} from '../lib/tablet-atlas';
describe('original twelve-role atlas data',()=>{
 for(const role of ROLES)it(`${role} has a compact original emblem and two atlas cells`,()=>{expect(RULES[role].path.length).toBeLessThan(300);expect(RULES[role].glyph).not.toBe('');expect(tabletIndex(role)).toBeGreaterThanOrEqual(0);expect(tabletIndex(role,'classic')).toBe(tabletIndex(role)+12)});
 it('fits both rulesets and back inside one atlas',()=>{expect(tabletIndex('back')).toBe(24);expect(ATLAS_COLS*ATLAS_ROWS).toBeGreaterThanOrEqual(25)});
});

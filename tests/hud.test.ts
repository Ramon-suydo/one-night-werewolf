import {describe,it,expect} from 'vitest';
import {instruction} from '../lib/scene';
import {PHASES} from '../rules/director';
import type {GameState} from '../lib/session-types';
describe('concise gameplay guidance',()=>{for(const phase of PHASES)it(`${phase} has one line of at most eight words`,()=>{for(const role of ['seer','troublemaker','doppel','robber'] as const){const text=instruction({phase} as GameState,true,role);expect(text.trim().split(/\s+/).length).toBeLessThanOrEqual(8);expect(text).not.toContain('\n')}})});

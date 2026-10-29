import {describe,it,expect} from 'vitest';
import {narratorCue} from '../lib/narrator-cues';
import {nightQueue} from '../engine/nightQueue';
import type {GameState} from '../lib/session-types';
describe('public fixed narrator cues',()=>{
 for(const step of nightQueue(1000))it(`narrates ${step.role} without knowing whether it was dealt`,()=>{const state={phase:'night',phaseStarted:1000,round:1,caption:'',settings:{speed:1}} as GameState;expect(narratorCue(state,step.opens+1).text).toBe(step.caption);expect(narratorCue(state,step.closes+1).file).toBe('gap')});
 it('does not announce a minute remaining in a thirty-second discussion',()=>{const state={phase:'day',phaseStarted:0,deadline:30000,round:1,caption:'',settings:{daySeconds:30}} as GameState;expect(narratorCue(state,1).file).toBe('day')});
 it('announces the shared one-minute warning from the server deadline',()=>{const state={phase:'day',phaseStarted:0,deadline:300000,round:1,caption:'',settings:{daySeconds:300}} as GameState;expect(narratorCue(state,245000).file).toBe('minute')});
});

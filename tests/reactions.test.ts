import {describe,it,expect} from 'vitest';
import {sessionCommand} from '../lib/session-schema';
import {REACTIONS} from '../lib/session-types';
describe('public reaction input',()=>{
 for(const kind of REACTIONS)it(`accepts original ${kind} reaction`,()=>expect(sessionCommand.safeParse({type:'emote',kind}).success).toBe(true));
 for(const value of ['neutral','suspicious','smug','shocked','sad','angry'])it(`accepts ${value} expression`,()=>expect(sessionCommand.safeParse({type:'expression',value}).success).toBe(true));
 it('rejects extra role data attached to an emote',()=>expect(sessionCommand.safeParse({type:'emote',kind:'wave',role:'wolf'}).success).toBe(false));
});

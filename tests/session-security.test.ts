import {beforeAll,describe,it,expect,vi,afterEach} from 'vitest';
import {executeSession} from '../lib/session-service';
import {publicSession,privateSession} from '../lib/session-projection';
import {readSession} from '../lib/session-store';
import {advanceSession,startSessionRound} from '../lib/session-director';
import {resolveNight,nightQueue} from '../engine';
const tokens=['a','b','c','d'].map(c=>c.repeat(64));
async function command(token:string,code:string|undefined,command:object,round?:number){const {sessionRequest}=await import('../lib/session-schema');return executeSession(sessionRequest.parse({code,command,round,requestId:crypto.randomUUID()}),token)}
beforeAll(()=>{process.env.NEXT_PUBLIC_SUPABASE_URL='';process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='';process.env.SUPABASE_SERVICE_ROLE_KEY='';process.env.LOCAL_DATA_DIR='.local-data/session-tests'});
afterEach(()=>vi.useRealTimers());
async function room(){const host=await command(tokens[0],undefined,{type:'create',name:'Mira'});for(let i=1;i<4;i++)await command(tokens[i],host.public.code,{type:'join',name:'Odo '+i});return (await readSession(host.public.code))!}
describe('modern private-state boundary',()=>{
 it('publishes no cards, actions, receipts, ballots or token hashes at night',async()=>{const r=await room();startSessionRound(r,100,44);r.phase='night';r.nightStart=100;r.revealed=[...r.roundSecrets!.order];const publicState=publicSession(r,100),text=JSON.stringify(publicState);for(const key of ['tokenHash','actions','reports','actionAt','receipts','events'])expect(text).not.toContain(key);expect(publicState.original).toBeNull();expect(publicState.ballots).toBeNull();expect(publicState.result).toBeNull();expect(publicState.readyCount).toBe(0);expect(publicState.lockedCount).toBe(0)});
 it('changes no public night field after a private action or lock',async()=>{const r=await room();startSessionRound(r,100,12);r.phase='night';r.nightStart=100;const before=publicSession(r,100);r.nightLocks[r.players[0].id]=[0];r.undo[r.players[0].id]={until:200,step:0};r.receipts.push('secret-receipt');r.revision++;expect(publicSession(r,100)).toEqual(before)});
 it('reveals only the requesting seat after dealing',async()=>{const r=await room();startSessionRound(r,100,2);const id=r.players[0].id;expect(privateSession(r,id,100).card).toBeUndefined();r.revealed=[id];const own=privateSession(r,id,100);expect(own.card).toEqual(r.roundSecrets!.original[0]);expect(Object.keys(own)).not.toContain('original');expect(Object.keys(own)).not.toContain('events')});
 it('releases full reveal only in Results',async()=>{const r=await room();startSessionRound(r,100,4);r.roundSecrets=resolveNight(r.roundSecrets!);r.phase='resolution';r.phaseStarted=100;advanceSession(r,100);expect(r.phase).toBe('result');expect(publicSession(r,100).result).not.toBeNull();expect(r.history[0].events.length).toBeGreaterThan(9);expect(Buffer.byteLength(JSON.stringify(r.history[0].events))).toBeLessThan(8192)});
 it('keeps queue duration independent of dealt roles',()=>{expect(nightQueue(0).at(-1)!.ends).toBe(155000)});
});

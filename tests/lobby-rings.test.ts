import {it,expect} from 'vitest';
import {lobbyRings} from '../lib/lobby-rings';
import {sessionRequest} from '../lib/session-schema';
import {POST} from '../app/api/session/route';

it('lays out exactly the configured 3-10 separate rings, including waiting seats',()=>{
 for(let count=3;count<=10;count++){
  const rings=lobbyRings([{id:'a',name:'Host',ready:true,left:false,spectator:false}],count);
  expect(rings).toHaveLength(count);expect(rings[0].playerId).toBe('a');expect(rings[0].ready).toBe(true);
  expect(rings.slice(1).every(r=>r.playerId===null&&!r.ready)).toBe(true);
  for(const a of rings)for(const b of rings)if(a!==b)expect(Math.hypot(a.x-b.x,a.z-b.z)).toBeGreaterThan(2.08);
 }
});
it('does not assign rings to spectators or departed players',()=>{
 const rings=lobbyRings([{id:'left',name:'Left',ready:true,left:true,spectator:false},{id:'watch',name:'Watch',ready:true,left:false,spectator:true},{id:'b',name:'B',ready:false,left:false,spectator:false}],6);
 expect(rings.filter(r=>r.playerId).map(r=>r.playerId)).toEqual(['b']);
});

it('enforces host count, exact starts, full seats, spectators and returning seats on the server',async()=>{
 const tokens=Array.from({length:8},()=>crypto.randomUUID().replaceAll('-','').repeat(2));
 const post=(i:number,command:object,code?:string)=>POST(new Request('http://localhost:3000/api/session',{method:'POST',headers:{host:'localhost:3000','content-type':'application/json','x-player-token':tokens[i]},body:JSON.stringify({requestId:crypto.randomUUID(),command,code})}));
 const initial=await(await post(0,{type:'create',name:'Host'})).json(),code=initial.public.code;
 const settings={...initial.public.settings,playerCount:6};
 expect((await post(0,{type:'settings',settings},code)).status).toBe(200);
 expect((await post(0,{type:'start'},code)).status).toBe(400);
 for(let i=1;i<6;i++)expect((await post(i,{type:'join',name:'Player '+i},code)).status).toBe(200);
 expect((await post(6,{type:'join',name:'Full'},code)).status).toBe(400);
 expect((await post(1,{type:'settings',settings:{...settings,playerCount:7}},code)).status).toBe(403);
 expect((await post(0,{type:'settings',settings:{...settings,playerCount:5}},code)).status).toBe(400);
 expect((await post(6,{type:'join',name:'Watch',spectator:true},code)).status).toBe(200);
 expect((await post(6,{type:'lobbyReady',value:true},code)).status).toBe(403);
 expect((await post(6,{type:'spectate',value:false},code)).status).toBe(400);
 await post(1,{type:'leave'},code);expect((await post(7,{type:'join',name:'Replacement'},code)).status).toBe(200);
 expect((await post(1,{type:'join',name:'Return'},code)).status).toBe(400);
 expect((await post(0,{type:'start'},code)).status).toBe(200);
 for(const playerCount of [2,11,3.5])expect(sessionRequest.safeParse({code,requestId:crypto.randomUUID(),command:{type:'settings',settings:{...settings,playerCount}}}).success).toBe(false);
});

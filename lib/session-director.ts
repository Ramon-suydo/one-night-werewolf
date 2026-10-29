import {buildDeck,deal,evaluate,nightPosition,nightQueue,resolveNight,seeded,type Role} from '@/engine';
import {DIRECTOR,DISCONNECT_MS,type Phase} from '@/rules/director';
import {connected} from './session-projection';
import type {SessionRoom} from './session-types';
export function transition(room:SessionRoom,to:Phase,now:number){if(DIRECTOR[room.phase].next!==to&&!(to==='lobby'&&room.phase==='result'))throw new Error('Illegal phase transition.');room.phase=to;room.phaseStarted=now;room.deadline=DIRECTOR[to].seconds===null?null:now+(to==='day'?room.settings.daySeconds:DIRECTOR[to].seconds!)*1000;}
export function startSessionRound(room:SessionRoom,now:number,seed:number){
 const order=room.players.filter(p=>!p.left&&!p.spectator).map(p=>p.id);if(order.length<3||order.length>10)throw new Error('Gather 3 to 10 players.');
 const deck=room.settings.deck||buildDeck(order.length,seeded(seed),{doppel:room.settings.doppel,preset:room.settings.preset,allowed:room.settings.allowed});
 room.roundSecrets=deal(order,deck,seeded(seed^0x531ce),room.settings);room.rolesInPlay=[...deck].sort();room.round++;room.phase='dealing';room.phaseStarted=now;room.deadline=now+25000;room.nightStart=null;room.revealed=[];room.dawnReady=[];room.dayReady=[];room.locked=[];room.nightLocks={};room.copyTarget={};room.undo={};room.claims=[];room.chat=[];room.emotes=[];room.players.forEach(p=>p.ready=false);
}
function recordResult(room:SessionRoom){
 const g=room.roundSecrets!;if(room.history.some(h=>h.round===room.round))return;const result=evaluate(g);
 const events=[...g.events,...g.order.map((id,i)=>({kind:'vote' as const,step:9,at:0,actor:id,targets:g.votes[id]?[g.order.indexOf(g.votes[id]!)]:[],before:[g.cards[i]]})),...result.hunted.map(id=>({kind:'shot' as const,step:10,at:0,targets:[g.order.indexOf(id)]}))];
 room.history=[...room.history,{round:room.round,order:g.order,names:Object.fromEntries(room.players.map(p=>[p.id,p.name])),events,result,original:g.original}].slice(-3);
 for(const p of result.players){const s=room.scores[p.id]||={wins:0,streak:0,banished:0,bluffs:0};s.wins+=Number(p.won);s.streak=p.won?s.streak+1:0;s.banished+=Number(result.banished.includes(p.id));const claim=[...room.claims].reverse().find(c=>c.player===p.id);s.bluffs+=Number(p.won&&!!claim&&claim.role!==g.original[g.order.indexOf(p.id)].role);}
}
export function advanceSession(room:SessionRoom,now:number,seed=1){
 const host=room.players.find(p=>p.id===room.host);if(!host||!connected(host,now))room.host=room.players.filter(p=>connected(p,now)).sort((a,b)=>a.joined-b.joined)[0]?.id||room.host;
 for(let guard=0;guard<16;guard++){
  const g=room.roundSecrets,live=room.players.filter(p=>connected(p,now)&&!p.spectator&&(!g||g.order.includes(p.id))),due=room.deadline!==null&&now>=room.deadline;
  if(room.phase==='lobby'){
   const seats=room.players.filter(p=>!p.left&&!p.spectator),ready=seats.length>=3&&seats.length<=10&&seats.every(p=>connected(p,now)&&p.ready);
   if(!ready){room.deadline=null;return}if(room.deadline===null){room.deadline=now+10000;return}if(due){startSessionRound(room,room.deadline,seed);continue}return;
  }
  if(!g)return;
  if(room.phase==='dealing'&&(due||live.length>0&&live.every(p=>room.revealed.includes(p.id)))){
   const at=due?room.deadline!:now;g.order.forEach(id=>{if(!room.revealed.includes(id))room.revealed.push(id)});transition(room,'night',at);room.nightStart=at;room.deadline=nightQueue(at,room.settings.speed).at(-1)!.ends;continue;
  }
  if(room.phase==='night'){
   const current=nightPosition(room.nightStart!,now,room.settings.speed);room.stepCursor=current?`${current.index}:${current.awake}`:'done';
   room.narration_step=current?.index;room.step_started_at=current?.opens;
   const end=nightQueue(room.nightStart!,room.settings.speed).at(-1)!.ends;if(now<end)return;room.roundSecrets=resolveNight(g);transition(room,'dawn',end);continue;
  }
  if(room.phase==='dawn'&&(due||live.length>0&&live.every(p=>room.dawnReady.includes(p.id)))){transition(room,'day',due?room.deadline!:now);continue;}
  if(room.phase==='day'&&(due||live.length>0&&live.every(p=>room.dayReady.includes(p.id)))){transition(room,'vote',due?room.deadline!:now);continue;}
  if(room.phase==='vote'){
   for(const id of g.order){const seat=room.players.find(p=>p.id===id);if(!seat||seat.left||now-seat.seen>=DISCONNECT_MS){g.votes[id]=null;if(!room.locked.includes(id))room.locked.push(id)}}
   if(due||live.length>0&&live.every(p=>room.locked.includes(p.id))){g.order.forEach(id=>{g.votes[id]??=null});transition(room,'resolution',due?room.deadline!:now);continue}return;
  }
  if(room.phase==='resolution'){recordResult(room);transition(room,'result',room.phaseStarted);continue;}
  if(room.phase==='result'&&due){
   for(const p of room.players.filter(p=>p.waiting&&!p.left).sort((a,b)=>a.joined-b.joined)){if(room.players.filter(p=>!p.left&&!p.spectator).length>=10)break;p.spectator=false;p.waiting=false;}
   const seats=room.players.filter(p=>!p.left&&!p.spectator);if(seats.length<3||!seats.some(p=>connected(p,now))){transition(room,'lobby',room.deadline!);room.deadline=null;return}
   if(room.settings.preset==='beginner'&&seats.length>9){transition(room,'lobby',room.deadline!);room.deadline=null;return}
   if(room.settings.deck&&room.settings.deck.length!==seats.length+3)room.settings.deck=null;
   if(room.settings.rotateHost){const current=seats.findIndex(p=>p.id===room.host);room.host=seats[(current+1)%seats.length].id;}
   startSessionRound(room,room.deadline!,seed+room.round);continue;
  }
  return;
 }
}
export function nextSessionDeadline(room:SessionRoom,now:number){if(room.phase==='night'&&room.nightStart!==null){const current=nightPosition(room.nightStart,now,room.settings.speed);return current?(current.awake?current.closes:current.ends):room.deadline}return room.deadline}
export function allowedRoleSet(roles:Role[]){return [...new Set(roles)]}

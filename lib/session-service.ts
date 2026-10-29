import 'server-only';
import {createHash,randomInt,randomUUID} from 'node:crypto';
import {ROLES,DEFAULT_SETTINGS,validateAction,validateDeck,validateVote,copiedRole,nightPosition,type RoleAction} from '@/engine';
import {GameError,cleanName} from './engine';
import {sanitizeAppearance,discordURL,sanitizeMessage} from './social';
import {readSession,saveSession} from './session-store';
import {advanceSession,nextSessionDeadline,startSessionRound} from './session-director';
import {privateSession,sessionSnapshot} from './session-projection';
import {scheduleLocal} from './local-events';
import {serverEnv} from './server-env';
import type {SessionRoom,PlayerSecret} from './session-types';
import type {SessionRequest} from './session-schema';
export const sessionHash=(token:string)=>createHash('sha256').update(token).digest('hex');
function assert(ok:unknown,text:string,status=400):asserts ok{if(!ok)throw new GameError(text,status)}
const comparable=(room:SessionRoom)=>JSON.stringify({...room,revision:0,updated:0,players:room.players.map(p=>({...p,seen:0}))});
function schedule(room:SessionRoom){if(!serverEnv('NEXT_PUBLIC_SUPABASE_URL')&&!serverEnv('VERCEL'))scheduleLocal('session:'+room.code,nextSessionDeadline(room,Date.now()),()=>tickSession(room.code))}
export async function tickSession(code:string){for(let retry=0;retry<8;retry++){const room=await readSession(code);if(!room)return;const before=comparable(room),expected=room.revision;advanceSession(room,Date.now(),randomInt(0x7fffffff));if(comparable(room)!==before){room.revision++;room.updated=Date.now();if(!await saveSession(room,expected))continue}schedule(room);return}}
function newPlayer(name:string,hash:string,room:SessionRoom|undefined,now:number):PlayerSecret{const occupied=room?.players.map(p=>({name:p.name}))||[];const names=new Set(occupied.map(p=>p.name.toLowerCase()));const base=cleanName(name);let chosen=base;for(let i=2;names.has(chosen.toLowerCase());i++){const suffix=' '+i;chosen=base.slice(0,12-suffix.length)+suffix}return{id:randomUUID(),name:chosen,tokenHash:hash,joined:now,seen:now,left:false,spectator:false,ready:false,revealed:false,appearance:sanitizeAppearance(null)}}
export async function executeSession(body:SessionRequest,token:string){
 const hash=sessionHash(token),now=Date.now(),cmd=body.command,receipt=hash+body.requestId;
 if(cmd.type==='create'){
  for(let attempt=0;attempt<20;attempt++){const bytes=createHash('sha256').update(receipt+attempt).digest(),alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ',code=[...bytes.subarray(0,4)].map(b=>alphabet[b%24]).join(''),old=await readSession(code);if(old?.receipts.includes(receipt))return sessionSnapshot(old,old.players.find(p=>p.tokenHash===hash)!.id);if(old)continue;
   const player=newPlayer(cmd.name,hash,undefined,now),room:SessionRoom={code,host:player.id,phase:'lobby',round:0,revision:0,updated:now,phaseStarted:now,deadline:null,nightStart:null,settings:{...DEFAULT_SETTINGS,preset:'classic',deck:null,allowed:[...ROLES],chat:'off',filter:true,discord:'',rotateHost:false},players:[player],rolesInPlay:[],revealed:[],dawnReady:[],dayReady:[],locked:[],nightLocks:{},undo:{},claims:[],chat:[],emotes:[],scores:{},history:[],receipts:[receipt]};if(await saveSession(room,-1))return sessionSnapshot(room,player.id);
  }throw new GameError('The fire could not be lit. Try again.',503);
 }
 assert(body.code,'Enter a four-letter room code.');
 for(let attempt=0;attempt<20;attempt++){
  const room=await readSession(body.code);assert(room,'No fire has that code.',404);assert(now-room.updated<86400000,'This fire expired. Create a new room.',410);const expected=room.revision,before=comparable(room);let player=room.players.find(p=>p.tokenHash===hash);
  if(cmd.type==='join'&&!player){assert(room.players.filter(p=>!p.left&&!p.spectator).length<10||cmd.spectator,'Ten players are already seated. Join as a spectator.');player=newPlayer(cmd.name,hash,room,now);player.spectator=!!cmd.spectator||room.phase!=='lobby';room.players.push(player)}
  assert(player,'Join this fire first.',403);assert(!player.left||cmd.type==='join','Your seat has left this fire.',403);if(cmd.type==='join'&&player.left){assert(room.phase==='lobby','Join the next round.',403);player.left=false;player.joined=now}
  player.seen=now;advanceSession(room,now,randomInt(0x7fffffff));const id=player.id,g=room.roundSecrets;
  if(!room.receipts.includes(receipt)){
   const inGame=!['lobby'].includes(room.phase);if(['start','settings','kick','transfer'].includes(cmd.type)){assert(room.host===id,'Only the host may change lobby settings.',403);assert(!inGame,'The director manages the game after Start.',403)}
   if(['night','undo','reveal','dawnReady','dayReady','vote','lockVote','claim'].includes(cmd.type)){assert(body.round===room.round,'A new round has begun. Refresh your view.',409);assert(g?.order.includes(id)&&!player.spectator,'You are watching this round.',403)}
   switch(cmd.type){
    case 'start':startSessionRound(room,now,randomInt(0x7fffffff));break;
    case 'lobbyReady':assert(room.phase==='lobby','Wait for the lobby.');player.ready=cmd.value;break;
    case 'settings':{const discord=discordURL(cmd.settings.discord);assert(discord!==null,'Use a Discord invite or channel link.');if(cmd.settings.deck)validateDeck(cmd.settings.deck,room.players.filter(p=>!p.left&&!p.spectator).length);assert(!cmd.settings.deck?.includes('doppel')||cmd.settings.doppel,'Enable Doppelgänger before adding it.');room.settings={...cmd.settings,discord};break;}
    case 'appearance':assert(room.phase==='lobby','Change appearance in the lobby.');player.appearance=sanitizeAppearance(cmd.appearance);break;
    case 'reveal':assert(room.phase==='dealing','Your tablet is already revealed.');if(!room.revealed.includes(id))room.revealed.push(id);break;
    case 'dawnReady':assert(room.phase==='dawn','Read your dawn report first.');if(!room.dawnReady.includes(id))room.dawnReady.push(id);break;
    case 'dayReady':assert(room.phase==='day','Discussion is not open.');room.dayReady=room.dayReady.filter(p=>p!==id);if(cmd.value)room.dayReady.push(id);break;
    case 'night':{
     const step=room.nightStart===null?null:nightPosition(room.nightStart,now,room.settings.speed),own=privateSession(room,id,now);assert(room.phase==='night'&&step?.awake&&own.awake,'Keep your eyes closed until your step.',403);assert(!room.nightLocks[id]?.includes(step.index),'Your choice is locked. Use Undo while available.');
     const previous=g!.actions[id];let action:RoleAction=cmd.action;
     if(own.role==='doppel'&&step.role!=='doppel'){assert(previous?.role==='doppel'&&!('skip'in previous),'Copy a player first.');assert(action.role===own.copiedRole,'Use your copied power.');assert(!('skip'in action),'This copied power has no Skip action.');action={...previous,later:action as NonNullable<typeof previous.later>};}
     if(step.role==='doppel'&&action.role==='doppel'&&!('skip'in action)){assert(!action.later,'Later powers wait for their own step.');const seen=room.copyTarget?.[id];assert(!seen||seen===action.target,'You have already copied that player.');(room.copyTarget||={})[id]=action.target;}validateAction(g!,id,action);g!.actions[id]=action;g!.actionAt[id]=now-room.nightStart!;
     const immediate=own.role==='doppel'&&action.role==='doppel'&&!('skip'in action)?copiedRole(g!):undefined;
     const complete=!(immediate&&['seer','robber','troublemaker','drunk'].includes(immediate)&&action.role==='doppel'&&!('skip'in action)&&!action.followup);
     if(complete)(room.nightLocks[id]||=[]).push(step.index);room.undo[id]={until:Math.min(now+5000,step.closes),step:step.index,previous};break;
    }
    case 'undo':{const undo=room.undo[id],step=room.nightStart===null?null:nightPosition(room.nightStart,now,room.settings.speed);assert(room.phase==='night'&&step?.awake&&undo?.step===step.index&&now<undo.until,'The undo window has closed.');if(undo.previous)g!.actions[id]=undo.previous;else if(room.copyTarget?.[id])g!.actions[id]={role:'doppel',target:room.copyTarget[id]};else delete g!.actions[id];room.nightLocks[id]=(room.nightLocks[id]||[]).filter(s=>s!==step.index);delete room.undo[id];break;}
    case 'vote':assert(room.phase==='vote'&&!room.locked.includes(id),'Your vote is locked.');validateVote(g!,id,cmd.target);g!.votes[id]=cmd.target;break;
    case 'lockVote':assert(room.phase==='vote','Voting is not open.');if(!Object.hasOwn(g!.votes,id)){assert(room.settings.allowSkip,'Choose a player first.');g!.votes[id]=null}if(!room.locked.includes(id))room.locked.push(id);break;
    case 'claim':assert(room.phase==='day','Make claims during discussion.');room.claims=[...room.claims,{id:randomUUID(),player:id,role:cmd.role,at:now}].slice(-60);break;
    case 'emote':assert(!['night','dealing','dawn','vote'].includes(room.phase),'Stay quiet during this phase.');assert(!room.emotes.some(e=>e.player===id&&now-e.at<1200),'Wait a moment.');if(cmd.target)assert(room.players.some(p=>p.id===cmd.target),'Choose someone by the fire.');room.emotes=[...room.emotes.filter(e=>now-e.at<3000),{id:randomUUID(),player:id,kind:cmd.kind,target:cmd.target,at:now}].slice(-30);break;
    case 'chat':{assert(room.settings.chat!=='off'&&(room.phase==='day'||room.settings.chat==='always'&&['lobby','result'].includes(room.phase)),'Chat is quiet now.');assert(!room.chat.some(m=>m.player===id&&now-m.at<1500),'Wait a moment before another message.',429);const text=sanitizeMessage(cmd.text,room.settings.filter);assert(text,'Write a message.');room.chat=[...room.chat,{id:randomUUID(),player:id,text,at:now}].slice(-60);break;}
    case 'kick':{assert(cmd.target!==id,'Choose another player.');const target=room.players.find(p=>p.id===cmd.target);assert(target,'Player not found.');target.left=true;break;}
    case 'transfer':assert(cmd.target!==id&&room.players.some(p=>p.id===cmd.target&&!p.left),'Choose another player.');room.host=cmd.target;break;
    case 'leave':player.left=true;room.host=room.players.filter(p=>!p.left).sort((a,b)=>a.joined-b.joined)[0]?.id||room.host;break;
   }
   if(!['sync','advance'].includes(cmd.type))room.receipts=[...room.receipts,receipt].slice(-256);
  }
  advanceSession(room,now,randomInt(0x7fffffff));if(comparable(room)===before){schedule(room);return sessionSnapshot(room,id,now)}room.revision++;room.updated=now;if(await saveSession(room,expected)){schedule(room);return sessionSnapshot(room,id,now)}
 }
 throw new GameError('The fire is busy. Retry your choice.',409);
}

import {normalizeAppearance} from '@/assets/appearance';
import {copiedRole,resolveNight} from '@/engine';
import {nightPosition} from '@/engine/nightQueue';
import {DISCONNECT_MS} from '@/rules/director';
import type {GameState,PlayerPrivate,SessionRoom,Snapshot} from './session-types';
export const connected=(p:SessionRoom['players'][number],now:number)=>!p.left&&now-p.seen<DISCONNECT_MS;
export function publicSession(room:SessionRoom,now=Date.now()):GameState{
 const g=room.roundSecrets,night=room.phase==='night'&&room.nightStart!==null?nightPosition(room.nightStart,now,room.settings.speed):null;
 const seats=room.players.filter(p=>!p.left||g?.order.includes(p.id));const live=seats.filter(p=>connected(p,now)&&g?.order.includes(p.id));
 const result=room.phase==='result'?room.history.find(h=>h.round===room.round)?.result||null:null;
 const captions:Record<string,string>={lobby:'Gather at the fire.',dealing:'Hold your tablet to reveal.',dawn:'Read your report. Mark ready.',day:'Discuss. Mark ready when decided.',vote:'Accuse a player. Hold to lock.',resolution:'The stones reveal their choices.',result:'Discover what changed overnight.'};
 const stepDeadline=night?(night.awake?night.closes:night.ends):null;
 return{code:room.code,host:room.host,phase:room.phase,round:room.round,phaseStarted:room.phaseStarted,deadline:room.deadline,nextWakeAt:room.phase==='night'?stepDeadline:room.deadline,step:night?.index??null,narration_step:night?.index??null,step_started_at:night?.opens??null,stepDeadline,caption:night?.awake?night.caption:room.phase==='night'?'Eyes closed. Stay silent.':captions[room.phase],
 players:seats.map(p=>({id:p.id,name:p.name,expression:p.expression||'neutral',appearance:normalizeAppearance(p.appearance),appearanceVersion:p.appearanceVersion||0,connected:connected(p,now),left:p.left,spectator:p.spectator,ready:room.phase==='lobby'&&p.ready,revealed:room.phase==='dealing'&&room.revealed.includes(p.id)})),
 rolesInPlay:room.rolesInPlay,settings:room.settings,readyCount:room.phase==='day'?live.filter(p=>room.dayReady.includes(p.id)).length:room.phase==='dawn'?live.filter(p=>room.dawnReady.includes(p.id)).length:room.phase==='lobby'?seats.filter(p=>p.ready&&!p.spectator&&connected(p,now)).length:0,connectedCount:room.phase==='lobby'?seats.filter(p=>!p.spectator&&connected(p,now)).length:live.length,lockedCount:room.phase==='vote'?live.filter(p=>room.locked.includes(p.id)).length:0,
 claims:['day','vote','result'].includes(room.phase)?room.claims:[],chat:room.settings.chat!=='off'&&(room.phase==='day'||room.settings.chat==='always'&&['lobby','result'].includes(room.phase))?room.chat:[],emotes:room.phase==='night'?[]:room.emotes.filter(e=>now-e.at<3000),scores:room.scores,result,order:g?.order||[],original:result?g!.original:null,ballots:result?g!.votes:null};
}
export function privateSession(room:SessionRoom,id:string,now=Date.now()):PlayerPrivate{
 const g=room.roundSecrets,i=g?.order.indexOf(id)??-1,revealed=room.revealed.includes(id);const step=room.phase==='night'&&room.nightStart!==null?nightPosition(room.nightStart,now,room.settings.speed):null;
 const role=i>=0&&g&&revealed?g.original[i].role:null,copy=g?copiedRole(g):undefined;
 const awake=!!role&&!!step?.awake&&(step.role===role||role==='doppel'&&copy===step.role&&['wolf','minion','mason','insomniac'].includes(copy));
 const resolved=g&&awake?resolveNight(g,step!.index+1):g;
 return{id,ready:room.dayReady.includes(id),role,...(role&&g?{card:g.original[i]}:{}),...(role==='doppel'&&copy?{copiedRole:copy}:{}),awake,step:step?.index??null,locked:room.phase==='vote'?room.locked.includes(id):!!step&&!!room.nightLocks[id]?.includes(step.index),...(g?.actions[id]?{action:g.actions[id]}:{}),report:g&&i>=0?(awake?(resolved?.reports[id]||[]).filter(r=>!(room.undo[id]?.until>now)||!r.cards):['dawn','day','vote','result'].includes(room.phase)?g.reports[id]||[]:[]):[],undoUntil:room.undo[id]&&room.undo[id].until>now&&step?.index===room.undo[id].step?room.undo[id].until:null,vote:g?.votes[id]??null,voted:!!g&&Object.hasOwn(g.votes,id),revealed};
}
export function sessionSnapshot(room:SessionRoom,id:string,now=Date.now()):Snapshot{return{public:publicSession(room,now),private:privateSession(room,id,now),serverNow:now,revision:room.revision}}

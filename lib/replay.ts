import type {Card,GameEvent} from '@/engine';
import type {Replay} from './session-types';
import {NIGHT_WINDOWS} from '@/rules/nightWindows';
import {RULES} from './rules';
export type ReplayFilter='everyone'|'me'|'winners';
export type ReplayControl={data:Replay;index:number;started:number;playing:boolean;speed:1|2|4;filter:ReplayFilter;showOriginal:boolean;calm:boolean;me:string};
export function replayEvents(data:Replay,filter:ReplayFilter,me:string){const winners=new Set(data.result.players.filter(p=>p.won).map(p=>p.id));return data.events.filter(e=>!e.actor||filter==='everyone'||filter==='me'&&e.actor===me||filter==='winners'&&winners.has(e.actor))}
export function replayCards(data:Replay,index:number,events=data.events):Card[]{
 const cards=data.original.map(c=>({...c})),cursor=data.events.indexOf(events[index]);
 // A filter changes which events are highlighted, never the physical card
 // history. Hidden-from-filter swaps must still happen before this cursor.
 for(const e of data.events.slice(0,cursor+1)){
  if(e.kind==='copy'&&e.actor&&e.after?.[0]){const seat=data.order.indexOf(e.actor);if(seat>=0)cards[seat]={...e.after[0]}}
  if(e.kind==='swap'&&e.targets&&e.after)e.targets.forEach((target,i)=>{if(e.after?.[i]&&target>=0&&target<cards.length)cards[target]={...e.after[i]}});
 }return cards;
}
export function replayFrame(control:ReplayControl){
 const events=replayEvents(control.data,control.filter,control.me),index=Math.min(Math.max(0,control.index),Math.max(0,events.length-1));
 const cards=control.showOriginal?control.data.original:replayCards(control.data,index,events);
 const before=control.showOriginal?control.data.original:replayCards(control.data,index-1,events);
 return{event:events[index],cards,before,index,total:events.length};
}
export function describeEvent(data:Replay,event:GameEvent|undefined){if(!event)return'The fire remembers the night.';const actor=event.actor?data.names[event.actor]||'A player':'',target=(event.targets||[]).map(i=>i<data.order.length?data.names[data.order[i]]:['Left','Middle','Right'][i-data.order.length]).join(' and ');if(event.kind==='deal')return'The original tablets were dealt.';if(event.kind==='step'){const role=NIGHT_WINDOWS[event.step]?.role;return role?RULES[role].name+': '+RULES[role].power:'The night is complete.';}if(event.kind==='copy')return`${actor} copied ${target}: ${event.after?.[0].copy?RULES[event.after[0].copy].name:'a role'}.`;if(event.kind==='swap')return`${actor} exchanged ${target}.`;if(event.kind==='peek')return`${actor} inspected ${target}${event.after?.length?': '+event.after.map(card=>RULES[card.role].name).join(' + '):''}.`;if(event.kind==='vote')return`${actor} voted ${target? 'for '+target:'Skip'}.`;return`The Hunter’s shot took ${target} down.`}
export function replayPoint(index:number,players:number):[number,number,number]{if(index>=players)return[(index-players-1)*1.2,2.4,-1.3];const a=index/Math.max(3,players)*Math.PI*2;return[Math.sin(a)*3.3,1.4,Math.cos(a)*3.3]}
export function replayDisplayPoint(index:number,players:number):[number,number,number]{if(index>=players)return[(index-players-1)*2,1.4,0];const a=index/Math.max(3,players)*Math.PI*2;return[Math.sin(a)*5,1.4,Math.cos(a)*5]}

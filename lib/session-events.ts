import type {SessionRoom} from './session-types';
type Send=(event:{type:string;data:unknown})=>void;
const root=globalThis as unknown as{sessionEvents?:Map<string,Set<Send>>;sessionPresence?:Map<string,{count:number;seen:number}>};
const events=root.sessionEvents||=new Map(),presence=root.sessionPresence||=new Map();
export function publishSession(code:string,type:string,data:unknown){for(const send of events.get(code)||[])send({type,data})}
export function subscribeSession(code:string,send:Send){let set=events.get(code);if(!set){set=new Set();events.set(code,set)}set.add(send);return()=>{set.delete(send);if(!set.size)events.delete(code)}}
export function presenceSession(code:string,id:string){const key=code+id,p=presence.get(key)||{count:0,seen:Date.now()};p.count++;presence.set(key,p);publishSession(code,'presence',onlineSession(code));return()=>{p.count=Math.max(0,p.count-1);p.seen=Date.now();publishSession(code,'presence',onlineSession(code))}}
export function onlineSession(code:string){return[...presence].filter(([k,v])=>k.startsWith(code)&&v.count>0).map(([k])=>k.slice(4))}
export function sessionLiveness(room:SessionRoom){for(const p of room.players){const live=presence.get(room.code+p.id);if(live)p.seen=Math.max(p.seen,live.count?Date.now():live.seen)}return room}

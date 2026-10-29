'use client';
import {useEffect,useState} from 'react';
import {CLOAKS,HATS,FACES,sanitizeAppearance,type Appearance} from '@/lib/social';
import type {Snapshot} from '@/lib/session-types';
import type {Command} from './use-session';
export function AppearanceEditor({state,send}:{state:Snapshot|null;send:(c:Command)=>void}){
 const [profile,setProfile]=useState<Appearance>({cloak:0,hat:0,face:0}),[unlocks,setUnlocks]=useState({rounds:0,wins:0});
 useEffect(()=>{try{setProfile(sanitizeAppearance(JSON.parse(localStorage.getItem('werewolf-profile')||'{}')));setUnlocks(JSON.parse(localStorage.getItem('werewolf-keepsakes')||'{"rounds":0,"wins":0}'))}catch{}},[]);
 const actual=state?.public.players.find(p=>p.id===state.private.id)?.appearance||profile;
 const choose=(next:Appearance)=>{setProfile(next);localStorage.setItem('werewolf-profile',JSON.stringify(next));window.dispatchEvent(new CustomEvent('werewolf-preview',{detail:next}));if(state)send({type:'appearance',appearance:next})};
 return <section className="appearance-editor"><h2>Your reflection</h2>{!state||state.public.phase==='lobby'?<><label>Cloak<select aria-label="Cloak color" value={actual.cloak} onChange={e=>choose({...actual,cloak:Number(e.target.value)})}>{CLOAKS.map((_,i)=><option key={i} value={i} disabled={i>=6&&!unlocks.wins&&actual.cloak!==i}>{['Gold','Blue','Green','Purple','Red','Brown','Silver','Ivory'][i]}{i>=6&&!unlocks.wins?' · win to unlock':''}</option>)}</select></label><label>Hat<select aria-label="Hat style" value={actual.hat} onChange={e=>choose({...actual,hat:Number(e.target.value)})}>{HATS.map((name,i)=><option key={name} value={i} disabled={i>=4&&!unlocks.rounds&&actual.hat!==i}>{name}{i>=4&&!unlocks.rounds?' · finish a round to unlock':''}</option>)}</select></label><label>Face<select aria-label="Face style" value={actual.face} onChange={e=>choose({...actual,face:Number(e.target.value)})}>{FACES.map((name,i)=><option key={name} value={i}>{name}</option>)}</select></label><button className="btn alt" onClick={()=>{const a=crypto.getRandomValues(new Uint8Array(3));choose({cloak:a[0]%(unlocks.wins?8:6),hat:a[1]%(unlocks.rounds?6:4),face:a[2]%6})}}>Randomize appearance</button></>:<p>Change your appearance in the lobby.</p>}<p>Session keepsakes: {unlocks.rounds} rounds · {unlocks.wins} wins.</p></section>;
}

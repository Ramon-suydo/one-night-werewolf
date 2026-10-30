'use client';
import {useEffect,useState} from 'react';
import {CLOAK_IDS,HAT_IDS,FACE_IDS,normalizeAppearance,DEFAULT_APPEARANCE,type Appearance} from '@/assets/appearance';
import type {Snapshot} from '@/lib/session-types';
import type {Command} from './use-session';
export function AppearanceEditor({state,send}:{state:Snapshot|null;send:(c:Command)=>void}){
 const[profile,setProfile]=useState<Appearance>(DEFAULT_APPEARANCE);
 useEffect(()=>{try{setProfile(normalizeAppearance(JSON.parse(localStorage.getItem('werewolf-profile')||'{}')))}catch{}},[]);
 const player=state?.public.players.find(p=>p.id===state.private.id),actual=player?.appearance||profile;
 const choose=(next:Appearance)=>{if(state){send({type:'appearance',appearance:next,version:player?.appearanceVersion||0});return}setProfile(next);localStorage.setItem('werewolf-profile',JSON.stringify(next));window.dispatchEvent(new CustomEvent('werewolf-preview',{detail:next}))};
 useEffect(()=>{if(!player)return;localStorage.setItem('werewolf-profile',JSON.stringify(player.appearance));window.dispatchEvent(new CustomEvent('werewolf-preview',{detail:player.appearance}))},[player]);
 return <section className="appearance-editor"><h2>Your reflection</h2>{!state||state.public.phase==='lobby'?<>
 <label>Cloak<select aria-label="Cloak color" value={actual.cloakId} onChange={e=>choose({...actual,cloakId:e.target.value as Appearance['cloakId']})}>{CLOAK_IDS.map(id=>{const taken=!state?.public.settings.allowDuplicateColors&&state?.public.players.some(p=>!p.left&&p.id!==player?.id&&p.appearance.cloakId===id);return<option key={id} disabled={taken} value={id}>{id}{taken?' (taken)':''}</option>})}</select></label>
 <label>Hat<select aria-label="Hat style" value={actual.hatId} onChange={e=>choose({...actual,hatId:e.target.value as Appearance['hatId']})}>{HAT_IDS.map(id=><option key={id}>{id}</option>)}</select></label>
 <label>Face<select aria-label="Face style" value={actual.faceId} onChange={e=>choose({...actual,faceId:e.target.value as Appearance['faceId']})}>{FACE_IDS.map(id=><option key={id}>{id}</option>)}</select></label>
 </>:<p>Change your appearance in the lobby.</p>}</section>;
}

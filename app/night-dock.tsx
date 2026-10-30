'use client';
import {RULES} from '@/lib/rules';
import {nightPower,optionalPower,selectionLabel,TABLE_INSTRUCTIONS} from '@/lib/tabletop';
import {playerTargets} from '@/lib/avatar-state';
import type {Snapshot} from '@/lib/session-types';
import {Tablet} from './tablet';

export function NightDock({state,selected,pass,choose,onPass,clear,now}:{state:Snapshot;selected:string[];pass:boolean;choose:(id:string)=>void;onPass:()=>void;clear:()=>void;now:number}){
 const s=state.public,p=state.private,role=nightPower(state);if(s.phase!=='night'||!p.awake||!role)return null;
 const people=playerTargets(role,s.order,p.id),centers=role==='seer'||role==='drunk'||role==='wolf'&&optionalPower(state),undo=p.undoUntil&&p.undoUntil>now;
 const peers=['wolf','mason','minion'].includes(role)?p.report.flatMap(r=>r.seats||[]):[];
 return <section className={'night-dock '+(p.locked?'night-dock-locked':'')} aria-label="Your private night action">
  <header><small>ONLY YOU CAN SEE THIS</small><strong>{RULES[role].name}</strong>{p.locked&&<span className="saved-mark">Choice saved</span>}</header>
  <p>{p.locked?(undo?'Your choice is locked. You can still undo it.':'Keep this to yourself until morning.'):TABLE_INSTRUCTIONS[role]||RULES[role].power}</p>
  {!!peers.length&&<p className="night-peers">{role==='mason'?'Your fellow Mason:':'Werewolves you know:'} <b>{peers.map(id=>s.players.find(v=>v.id===id)?.name).join(', ')}</b></p>}
  {!p.locked&&<><div className="night-targets" role="group" aria-label="Choose a night target">{people.map(id=><button key={id} aria-label={'Target '+s.players.find(v=>v.id===id)?.name} aria-pressed={selected.includes(id)} onClick={()=>choose(id)}>{s.players.find(v=>v.id===id)?.name}</button>)}{centers&&[0,1,2].map(i=><button key={i} aria-label={'Target '+['left','middle','right'][i]+' center'} aria-pressed={selected.includes('center-'+i)} onClick={()=>choose('center-'+i)}>{['Left','Middle','Right'][i]} center</button>)}</div>
   {(selected.length>0||pass)&&<div className="selection-summary"><span>{pass?'Pass without using this power':selectionLabel(state,selected)}</span><button onClick={clear} aria-label="Clear night selection">Clear</button></div>}
   {optionalPower(state)&&!selected.length&&!pass&&<button className="quiet-action" onClick={onPass}>Pass this power</button>}
  </>}
  {p.report.some(r=>r.cards?.length)&&<div className="night-discovery" aria-label="Your authorized discovery">{p.report.flatMap(r=>r.cards||[]).map((c,i)=><div key={i}><Tablet role={c.role} ruleset={s.settings.ruleset}/><span>{RULES[c.role].name}</span></div>)}</div>}
  {p.locked&&undo&&!p.report.some(r=>r.cards?.length)&&['seer','robber'].includes(role)&&<small>Your discovery opens when Undo ends.</small>}
 </section>;
}

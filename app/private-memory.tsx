'use client';
import {RULES} from '@/lib/rules';
import {SOLO_OBJECTIVES} from '@/rules/soloObjectives';
import type {Snapshot} from '@/lib/session-types';
import {Tablet} from './tablet';

export function PrivateMemory({state}:{state:Snapshot}){
 const s=state.public,p=state.private;if(!p.role||!['dealing','dawn'].includes(s.phase)||!p.revealed)return null;
 const dealt=s.phase==='dealing',role=p.role==='doppel'&&p.copiedRole?p.copiedRole:p.role,goal=s.settings.ruleset==='solo'?SOLO_OBJECTIVES[role]:undefined;
 return <section className="private-memory" aria-label={dealt?'Your dealt card':'Your night report'}>
  <small>{dealt?'REMEMBER YOUR STARTING CARD':'YOUR MEMORY OF THE NIGHT'}</small>
  <h2>{dealt?RULES[p.role].name:'What you actually learned'}</h2>
  {dealt?<div className="dealt-memory"><Tablet role={p.role} ruleset={s.settings.ruleset}/><div><p>{RULES[p.role].power}</p><p className="memory-caution">This is your dealt role. Your card can move later.</p>{goal&&<p>Solo goal: {goal}</p>}</div></div>:<>
   {p.report.length?p.report.map((report,i)=><article key={i}><p>{report.text}{report.seats?.length?' '+report.seats.map(id=>s.players.find(v=>v.id===id)?.name||'A player').join(', '):''}</p>{report.cards&&<div className="memory-cards">{report.cards.map((card,j)=><div key={j}><Tablet role={card.role} ruleset={s.settings.ruleset}/><span>{RULES[card.role].name}</span></div>)}</div>}</article>):<p>You slept through the night. Other players may have moved your card.</p>}
   <p className="memory-caution">Share what you learned. Your final card may be different.</p>
  </>}
 </section>;
}

'use client';
import {useState} from 'react';
import type {Snapshot} from '@/lib/session-types';
import type {Command} from './use-session';
export function QuietChat({state,muted,send}:{state:Snapshot;muted:string[];send:(c:Command)=>void}){
 const[text,setText]=useState(''),[cool,setCool]=useState(false);const s=state.public,allowed=s.settings.chat!=='off'&&(s.phase==='day'||s.settings.chat==='always'&&['lobby','result'].includes(s.phase));
 if(!allowed)return null;
 return <section className="quiet-chat"><h2>Quiet text chat</h2><div className="chat-messages" role="log" aria-label="Chat messages">{s.chat.filter(m=>!muted.includes(m.player)).map(m=><p key={m.id}><b>{s.players.find(p=>p.id===m.player)?.name}: </b>{m.text}</p>)}</div><form onSubmit={e=>{e.preventDefault();if(!text.trim()||cool)return;send({type:'chat',text});setText('');setCool(true);setTimeout(()=>setCool(false),1500)}}><label>Message<input aria-label="Chat message" maxLength={140} value={text} onChange={e=>setText(e.target.value)}/></label><small>{text.length}/140</small><button className="btn" type="submit" disabled={cool||!text.trim()}>Send message</button></form></section>;
}

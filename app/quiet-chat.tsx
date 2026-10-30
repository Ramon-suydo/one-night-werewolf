'use client';
import {useEffect,useRef,useState} from 'react';
import type {Snapshot} from '@/lib/session-types';
import type {Command} from './use-session';
export function QuietChat({state,muted,send}:{state:Snapshot;muted:string[];send:(c:Command)=>void|Promise<unknown>}){
 const[text,setText]=useState(''),[cool,setCool]=useState(false),log=useRef<HTMLDivElement>(null),follow=useRef(true),posting=useRef(false),mounted=useRef(true),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const s=state.public,allowed=s.settings.chat!=='off'&&(s.phase==='day'||s.settings.chat==='always'&&['lobby','result'].includes(s.phase));
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;if(timer.current)clearTimeout(timer.current)}},[]);
 useEffect(()=>{if(log.current&&follow.current)log.current.scrollTop=log.current.scrollHeight},[s.chat]);
 if(!allowed)return null;
 return <section className="quiet-chat"><h2>Quiet text chat</h2><div ref={log} className="chat-messages" role="log" aria-label="Chat messages" aria-live="polite" onScroll={()=>{if(log.current)follow.current=log.current.scrollHeight-log.current.scrollTop-log.current.clientHeight<50}}>{s.chat.filter(m=>!muted.includes(m.player)).map(m=><p key={m.id}><b>{s.players.find(p=>p.id===m.player)?.name}: </b>{m.text}</p>)}{!s.chat.length&&<p className="chat-empty">Share what you saw. A convincing story can be a lie.</p>}</div><form onSubmit={async e=>{e.preventDefault();if(!text.trim()||cool||posting.current)return;posting.current=true;setCool(true);const result=await send({type:'chat',text});posting.current=false;if(!mounted.current)return;if(result){setText('');follow.current=true;if(log.current)log.current.scrollTop=log.current.scrollHeight;timer.current=setTimeout(()=>{if(mounted.current)setCool(false)},1500)}else setCool(false)}}><label>Message<input aria-label="Chat message" maxLength={140} value={text} onChange={e=>setText(e.target.value)} placeholder="What did you learn?"/></label><small>{text.length}/140</small><button className="btn" type="submit" disabled={cool||!text.trim()}>{posting.current?'Sending...':'Send message'}</button></form></section>;
}

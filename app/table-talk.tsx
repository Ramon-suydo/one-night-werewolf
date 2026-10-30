'use client';
import {useState} from 'react';
import type {Snapshot} from '@/lib/session-types';
import type {Command} from './use-session';
import {QuietChat} from './quiet-chat';

const GESTURES=[['wave','Wave'],['point','Point'],['slam','Slap table'],['shrug','Shrug'],['gasp','Gasp'],['laugh','Laugh'],['who me','Who, me?'],['thumbs up','Agree'],['sweat','Nervous'],['accuse','Accuse'],['facepalm','Facepalm']] as const;
export function TableTalk({state,muted,send,close,initialTab='chat',target}:{state:Snapshot;muted:string[];send:(c:Command)=>void;close:()=>void;initialTab?:'chat'|'reactions';target?:string}){
 const allowed=state.public.settings.chat!=='off'&&(state.public.phase==='day'||state.public.settings.chat==='always'&&['lobby','result'].includes(state.public.phase));
 const[tab,setTab]=useState<'chat'|'reactions'>(allowed?initialTab:'reactions');
 return <aside className="table-talk" aria-label="Table talk"><header><strong>The table is talking</strong><button aria-label="Close table talk" onClick={close}>Close</button></header><div className="talk-tabs" role="tablist" aria-label="Table conversation">{allowed&&<button role="tab" aria-selected={tab==='chat'} onClick={()=>setTab('chat')}>Conversation</button>}<button role="tab" aria-selected={tab==='reactions'} onClick={()=>setTab('reactions')}>Reactions</button></div>{tab==='chat'&&allowed?<QuietChat state={state} muted={muted} send={send}/>:<div className="talk-reactions">{GESTURES.map(([kind,label])=><button key={kind} onClick={()=>{send({type:'emote',kind,target});close()}}>{label}</button>)}<span>Set your expression</span>{(['neutral','suspicious','smug','shocked','sad','angry'] as const).map(value=><button key={value} onClick={()=>{send({type:'expression',value});close()}}>{value}</button>)}</div>}</aside>;
}

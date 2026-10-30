'use client';
import {useEffect,useRef,useState} from 'react';
import type {GameState} from '@/lib/session-types';
import {narratorCue} from '@/lib/narrator-cues';
export default function Announcements({state,now}:{state:GameState;now:number}){
 const cue=narratorCue(state,now),previous=useRef(''),[visible,setVisible]=useState(true);
 useEffect(()=>{setVisible(true);const timer=setTimeout(()=>setVisible(false),5000);if(cue.key!==previous.current){previous.current=cue.key;if(state.phase!=='lobby')window.dispatchEvent(new CustomEvent('werewolf-sfx',{detail:{name:state.phase==='dawn'?'bell':'ui'}}))}return()=>clearTimeout(timer)},[cue.key,state.phase]);
 if(state.phase==='lobby'||!visible)return null;
 return <aside key={cue.key} className="phase-announcement" role="status"><span aria-hidden="true">{state.phase==='night'?'\u263e':state.phase==='vote'?'\u25c6':'\u2726'}</span><div><small>{state.phase==='night'?'THE NIGHT':state.phase.toUpperCase()}</small><p>{cue.text}</p></div></aside>;
}

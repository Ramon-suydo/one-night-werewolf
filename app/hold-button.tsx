'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
export function HoldButton({children,onComplete,disabled=false,label}:{children:React.ReactNode;onComplete:()=>void;disabled?:boolean;label?:string}){
 const [progress,setProgress]=useState(0),timer=useRef<ReturnType<typeof setInterval>|null>(null),fired=useRef(false),callback=useRef(onComplete);useEffect(()=>{callback.current=onComplete},[onComplete]);
 const stop=()=>{if(timer.current)clearInterval(timer.current);timer.current=null;setProgress(0)};
 const start=()=>{if(disabled||timer.current)return;window.dispatchEvent(new CustomEvent('werewolf-sfx',{detail:'charge'}));fired.current=false;const begin=performance.now();timer.current=setInterval(()=>{const p=Math.min(1,(performance.now()-begin)/650);setProgress(p);if(p===1&&!fired.current){fired.current=true;stop();if(navigator.vibrate)navigator.vibrate(20);callback.current()}},40)};
 useEffect(()=>()=>{if(timer.current)clearInterval(timer.current)},[]);
 useEffect(()=>{if(disabled&&timer.current){clearInterval(timer.current);timer.current=null;setProgress(0)}},[disabled]);
 return <button className="btn hold-button" aria-label={label} disabled={disabled} style={{'--hold':progress} as CSSProperties} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);start()}} onPointerUp={stop} onPointerCancel={stop} onPointerLeave={stop} onKeyDown={e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();if(!e.repeat)start()}}} onKeyUp={stop} onBlur={stop}><span>{children}</span><small>Hold to confirm</small></button>
}

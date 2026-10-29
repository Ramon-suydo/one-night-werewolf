'use client';
import { useEffect,useRef } from 'react';
import { MOODS } from '@/lib/theme.mjs';
export default function MusicLayers({phase,enabled,volume,remaining,total}:{phase:string;enabled:boolean;volume:number;remaining:number;total:number}){
 const current=useRef({phase,enabled,volume,remaining,total}),duckLevel=useRef(1);useEffect(()=>{current.current={phase,enabled,volume,remaining,total}},[phase,enabled,volume,remaining,total]);
 useEffect(()=>{const duck=(e:Event)=>{duckLevel.current=(e as CustomEvent<number>).detail};window.addEventListener('werewolf-duck',duck);return()=>window.removeEventListener('werewolf-duck',duck)},[]);
 useEffect(()=>{let context:AudioContext|null=null,timer:ReturnType<typeof setInterval>;let previous='';
 const start=()=>{if(context)return;try{context=new AudioContext()}catch{return}const c=context,master=c.createGain(),pad=c.createGain();master.gain.value=0;master.connect(c.destination);pad.gain.value=.004;pad.connect(master);
 const oscillator=c.createOscillator();oscillator.type='sine';oscillator.frequency.value=165;oscillator.connect(pad);oscillator.start();
 const note=(f:number,d:number,amplitude:number)=>{const o=c.createOscillator(),g=c.createGain(),t=c.currentTime;o.type='triangle';o.frequency.value=f;g.gain.setValueAtTime(amplitude,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(master);o.start();o.stop(t+d)};
 timer=setInterval(()=>{const p=current.current;const calm=document.documentElement.dataset.calm==='true';master.gain.setTargetAtTime(p.enabled?p.volume*duckLevel.current:0,c.currentTime,.8);const tension=p.phase==='day'?1-Math.max(0,p.remaining)/p.total:(MOODS[p.phase as keyof typeof MOODS]?.tension||.1);pad.gain.setTargetAtTime(.003+tension*.006,c.currentTime,1.2);oscillator.frequency.setTargetAtTime(p.phase==='night'?165:196,c.currentTime,2);
 if(p.enabled&&!calm){if(p.phase==='vote'){note(62,.13,.018);setTimeout(()=>{if(c.state!=='closed')note(52,.12,.012)},150)}else if(p.phase==='day'&&Math.random()<tension*.6)note(120,.08,.009);if(p.phase==='result'&&previous!=='result'){[220,277,330].forEach((f,i)=>setTimeout(()=>{if(c.state!=='closed')note(f,.9,.012)},i*90))}}previous=p.phase;
 },620)};
 window.addEventListener('pointerdown',start,{once:true});if(navigator.userActivation?.hasBeenActive)start();
 return()=>{window.removeEventListener('pointerdown',start);clearInterval(timer);void context?.close()};},[]);return null;
}

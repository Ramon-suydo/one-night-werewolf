'use client';
import {useEffect,useState} from 'react';
import {INTRO_SECONDS,introCamera} from '@/lib/vfx';
import type {MotionBus} from '@/lib/motion';
export default function Cinematic({bus,close}:{bus:MotionBus;close:()=>void}){
 const [age,setAge]=useState(0),[short]=useState(()=>bus.calm||matchMedia('(prefers-reduced-motion: reduce)').matches);
 useEffect(()=>{const start=performance.now();bus.introStarted=short?null:start;const key=(e:KeyboardEvent)=>{if(e.key==='Escape')close()};window.addEventListener('keydown',key);const timer=setInterval(()=>{const next=(performance.now()-start)/1000;setAge(next);if(next>=(short?.8:INTRO_SECONDS))close()},100);return()=>{bus.introStarted=null;clearInterval(timer);window.removeEventListener('keydown',key)}},[bus,close,short]);
 return <section className={`cinematic ${short?'cinematic-calm':''}`} aria-label="The village introduction"><div className="cinematic-bars"/><div className="cinematic-title" data-visible={age>14||short}><span>ONE FIRE. MANY SECRETS.</span><h1>One Night<br/>Werewolf</h1></div><p className="cinematic-caption" aria-live="polite">{introCamera(age).caption}</p><button className="btn alt cinematic-skip" onClick={close}>Skip intro</button><div className="cinematic-progress" style={{transform:`scaleX(${Math.min(1,age/INTRO_SECONDS)})`}}/></section>
}

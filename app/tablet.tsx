'use client';
import { useEffect, useRef, useState } from 'react';
import type { Role } from '@/lib/engine';
import { RULES, teamMarker } from '@/lib/rules';
import { CELL_H,CELL_W,getTabletAtlas,tabletIndex } from '@/lib/tablet-atlas';
function Face({role}:{role:Role|'back'}) {
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{const c=ref.current;if(!c)return; const i=tabletIndex(role);c.getContext('2d')!.drawImage(getTabletAtlas(),i%4*CELL_W,Math.floor(i/4)*CELL_H,CELL_W,CELL_H,0,0,CELL_W,CELL_H)},[role]);
  return <canvas ref={ref} width={CELL_W} height={CELL_H} aria-hidden="true"/>;
}
export function Tablet({role,delay=180,dead=false,sound=false,beep}:{role:Role;delay?:number;dead?:boolean;sound?:boolean;beep?:(f:number,d:number)=>void}) {
  const [up,setUp]=useState(false),[sheet,setSheet]=useState(false);const press=useRef<ReturnType<typeof setTimeout>|null>(null);const close=useRef<HTMLButtonElement>(null);
  useEffect(()=>{const t=setTimeout(()=>{setUp(true);if(sound)beep?.(180+delay/9,.12)},matchMedia('(prefers-reduced-motion: reduce)').matches?0:delay);return()=>clearTimeout(t)},[delay,sound,beep]);
  useEffect(()=>{if(sheet)close.current?.focus()},[sheet]);
  const end=()=>{if(press.current)clearTimeout(press.current)};
  return <><button type="button" data-role={role} className={`card tablet ${up?'up':''} ${dead?'dead':''}`} aria-label={`${RULES[role].name} card${dead?', banished':''}. Tap for rules`} onClick={()=>setSheet(true)} onPointerDown={()=>{press.current=setTimeout(()=>setSheet(true),500)}} onPointerUp={end} onPointerCancel={end}><span className="in"><span className="f"><Face role={role}/></span><span className="b"><Face role="back"/></span></span></button>{sheet&&<div className="sheet-backdrop" onClick={()=>setSheet(false)}><section role="dialog" aria-modal="true" aria-label={`${RULES[role].name} rules`} className="rules-sheet" onClick={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==='Escape')setSheet(false);if(e.key==='Tab'){e.preventDefault();close.current?.focus()}}}><h2>{RULES[role].name}</h2><p>{teamMarker(role)} Team: {RULES[role].team}</p><p>{RULES[role].power}</p><p><b>Example:</b> {RULES[role].example}</p><button className="btn" ref={close} onClick={()=>setSheet(false)}>Back to the fire</button></section></div>}</>;
}

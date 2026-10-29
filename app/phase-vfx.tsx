'use client';
import {useEffect,useState} from 'react';
const lines:Record<string,[string,string]>={night:['THE FIRE KEEPS YOUR SECRET','Night falls'],dawn:['SOMETHING CHANGED IN THE DARK','First light'],day:['EVERY STORY HAS TWO SIDES','Speak carefully'],vote:['ONE STONE. ONE ACCUSATION.','Choose your suspect'],result:['THE NIGHT LEAVES ITS MARK','The truth unfolds']};
export default function PhaseVFX({phase,round}:{phase:string;round:number}){
 const [visible,setVisible]=useState(false);
 useEffect(()=>{if(phase==='lobby')return;setVisible(true);const timer=setTimeout(()=>setVisible(false),2200);return()=>clearTimeout(timer)},[phase,round]);
 if(!visible||!lines[phase])return null;
 return <div className={`phase-vfx phase-vfx-${phase}`} aria-hidden="true"><div className="phase-sweep"/><div className="phase-rune">✧</div><div className="phase-title"><small>{lines[phase][0]}</small><strong>{lines[phase][1]}</strong></div></div>
}

'use client';
import {useEffect,useRef,useState} from 'react';
import type {GameState} from '@/lib/session-types';
import type {Preferences} from '@/lib/preferences';
import {narratorCue} from '@/lib/narrator-cues';
export default function DirectorNarrator({state,now,prefs,duck,route}:{state:GameState;now:number;prefs:Preferences;duck:(v:number)=>void;route:(audio:HTMLAudioElement)=>(()=>void)|undefined}){
 const clock=useRef(now);useEffect(()=>{clock.current=now},[now]);
 const[files,setFiles]=useState<string[]|null>(null),spoken=useRef(new Set<string>());const cue=narratorCue(state,now),speed=state.settings.speed;
 useEffect(()=>{let stopped=false;void fetch('/api/narrator',{headers:{'x-player-token':localStorage.getItem('werewolf-token')||''}}).then(r=>r.json()).then(d=>{if(!stopped)setFiles(d.files)}).catch(()=>setFiles([]));return()=>{stopped=true}},[]);
 useEffect(()=>{
  if(files===null||prefs.captionsOnly||prefs.muted||prefs.narrator===0||prefs.master===0||state.phase==='lobby'||spoken.current.has(cue.key))return;
  spoken.current.add(cue.key);let cancelled=false,audio:HTMLAudioElement|null=null,detach:(()=>void)|undefined;duck(.25);
  const finish=()=>{if(!cancelled)duck(1)};
  const speak=()=>{if(cancelled||!('speechSynthesis'in window)){finish();return}const words=cue.text.split(' '),elapsed=Math.max(0,clock.current-cue.start),offset=Math.min(words.length-1,Math.floor(elapsed/(Math.max(3000,words.length*400)*speed)*words.length)),utterance=new SpeechSynthesisUtterance(words.slice(offset).join(' '));const voices=speechSynthesis.getVoices();utterance.voice=voices.find(v=>v.voiceURI===prefs.voice)||voices.find(v=>v.lang.startsWith('en')&&/daniel|david|george|alex/i.test(v.name))||null;utterance.pitch=.75;utterance.rate=Math.min(2,Math.max(.7,1/speed));utterance.volume=prefs.narrator*prefs.master;utterance.onend=finish;utterance.onerror=finish;speechSynthesis.speak(utterance)};
  const legacy:Record<string,string>={wolf:'werewolves',mason:'masons'},file=files.includes(cue.file)?cue.file:legacy[cue.file];
  if(file&&files.includes(file)){audio=new Audio('/narrator/'+file+'.mp3');detach=route(audio);audio.volume=detach?1:prefs.narrator*prefs.master;audio.playbackRate=Math.min(3,Math.max(.5,1/speed));audio.addEventListener('loadedmetadata',()=>{if(audio)audio.currentTime=Math.min(Math.max(0,(clock.current-cue.start)/1000/speed),Math.max(0,audio.duration-.1))},{once:true});audio.onended=finish;audio.onerror=speak;void audio.play().catch(speak)}else speak();
  return()=>{cancelled=true;detach?.();if(audio){audio.pause();audio.src=''}if('speechSynthesis'in window)speechSynthesis.cancel();duck(1)};
 },[cue.key,cue.file,cue.start,cue.text,files,prefs.captionsOnly,prefs.muted,prefs.narrator,prefs.master,prefs.voice,speed,state.phase,duck,route]);
 return null;
}

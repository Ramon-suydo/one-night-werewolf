'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import dynamic from 'next/dynamic';
import {useSession,type Command} from './use-session';
import {HoldButton} from './hold-button';
import {makeMotion} from '@/lib/motion';
import {worldProjection,instruction} from '@/lib/scene';
import {useMotion} from './use-motion';
import {RULES} from '@/lib/rules';
import {SOLO_OBJECTIVES} from '@/rules/soloObjectives';
import {PREFERENCES,type Preferences} from '@/lib/preferences';
import {detectGPU} from '@/lib/quality';
import {mountAudio} from '@/lib/audio';
import {bannerAt} from '@/lib/result-timeline';
import {permittedFaces} from '@/lib/card-interaction';
import type {Role,RoleAction,SimpleAction} from '@/engine';
import type {DrawerTab} from './session-drawer';
import {Tablet} from './tablet';
const Clearing=dynamic(()=>import('./clearing'),{ssr:false});
const Drawer=dynamic(()=>import('./session-drawer').then(m=>m.SessionDrawer),{ssr:false});
const Tutorial=dynamic(()=>import('./tutorial'),{ssr:false});
const Cinematic=dynamic(()=>import('./cinematic'),{ssr:false});
const PhaseVFX=dynamic(()=>import('./phase-vfx'),{ssr:false});
const MusicLayers=dynamic(()=>import('./music-layers'),{ssr:false});
const NatureSounds=dynamic(()=>import('./nature-sounds').then(m=>m.NatureSounds),{ssr:false});
export default function Home(){
 const{state,busy,error,setError,connection,now,send}=useSession(),s=state?.public,own=state?.private;
 const [bus]=useState(makeMotion),[prefs,setPrefs]=useState<Preferences>(PREFERENCES),[loaded,setLoaded]=useState(false),[audioReady,setAudioReady]=useState(false),[gpuFailed,setGpuFailed]=useState(false);
 const [drawer,setDrawer]=useState<DrawerTab|null>(null),[tutorial,setTutorial]=useState(false),[intro,setIntro]=useState(false),[nudge,setNudge]=useState(false),[roleOpen,setRoleOpen]=useState(false),[emotes,setEmotes]=useState(false),[selected,setSelected]=useState<string[]>([]);
 const[name,setName]=useState(''),[code,setCode]=useState(''),[joining,setJoining]=useState(false),[muted,setMuted]=useState<string[]>([]),[inviteCopied,setInviteCopied]=useState(false);
 const[resultReady,setResultReady]=useState(false);
 const[preload,setPreload]=useState({fonts:false,atlas:false,world:false});
 const lastQuality=useRef<Preferences['quality']|null>(null);
 const worldReady=useCallback(()=>setPreload(p=>({...p,world:true})),[]);
 const audio=useRef<ReturnType<typeof mountAudio>|null>(null);const view=state?worldProjection(state):null;useMotion(view,bus);
 const effectiveRole=own?.role==='doppel'?own.copiedRole:own?.role;
 const closeIntro=useCallback(()=>{bus.introStarted=null;setIntro(false);localStorage.setItem('werewolf-intro','seen')},[bus]);
 useEffect(()=>{let stopped=false;void Promise.all([document.fonts.load('7px Silkscreen'),document.fonts.ready]).then(async()=>{if(stopped)return;setPreload(p=>({...p,fonts:true}));const art=await import('@/lib/tablet-atlas');art.getTabletAtlas();if(!stopped)setPreload(p=>({...p,atlas:true}))});return()=>{stopped=true}},[]);
 const fallback=useCallback(()=>{setGpuFailed(true);setIntro(false)},[]);
 const open=useCallback((tab:DrawerTab)=>{setDrawer(tab);setRoleOpen(false);setEmotes(false)},[]);
 useEffect(()=>{const runtime=mountAudio();audio.current=runtime;try{const saved=JSON.parse(localStorage.getItem('werewolf-preferences')||'{}');setPrefs({...PREFERENCES,...saved,calm:!!saved.calm||matchMedia('(prefers-reduced-motion: reduce)').matches});setMuted(JSON.parse(localStorage.getItem('werewolf-muted')||'[]'))}catch{}setName(localStorage.getItem('werewolf-name')||'');const link=new URLSearchParams(location.search).get('room');if(link){setCode(link.toUpperCase());setJoining(true)}setNudge(!localStorage.getItem('werewolf-tutorial'));if(!localStorage.getItem('werewolf-intro'))setIntro(true);setLoaded(true);const start=()=>{setAudioReady(true);runtime.setMusic(true)};window.addEventListener('pointerdown',start,{once:true});return()=>{runtime.dispose();window.removeEventListener('pointerdown',start)}},[]);
 useEffect(()=>{if(!loaded)return;localStorage.setItem('werewolf-preferences',JSON.stringify(prefs));document.documentElement.dataset.calm=String(prefs.calm);document.documentElement.dataset.large=String(prefs.large);document.documentElement.dataset.contrast=String(prefs.contrast);bus.calm=prefs.calm;bus.batterySaver=prefs.battery;audio.current?.setVolume(prefs.music);audio.current?.setEffects(prefs.effects);audio.current?.setMusic(!prefs.muted);if(lastQuality.current!==prefs.quality){lastQuality.current=prefs.quality;if(prefs.quality==='Automatic'){localStorage.removeItem('werewolf-quality');window.dispatchEvent(new CustomEvent('werewolf-quality',{detail:detectGPU().tier}))}else{localStorage.setItem('werewolf-quality',prefs.quality);window.dispatchEvent(new CustomEvent('werewolf-quality',{detail:prefs.quality}))}}},[prefs,loaded,bus]);
 useEffect(()=>{localStorage.setItem('werewolf-muted',JSON.stringify(muted))},[muted]);
 useEffect(()=>{setSelected([]);setRoleOpen(false);setEmotes(false);audio.current?.setSky(['day','vote','result'].includes(s?.phase||'')?1:0);if(s?.phase==='dawn')audio.current?.beep(660,.3)},[s?.phase,s?.round,s?.step]);
 useEffect(()=>{bus.exploring=!drawer&&!intro;bus.awake=!!own?.awake;bus.selected=selected.length?selected:s?.phase==='vote'&&own?.voted?[own.vote||'skip']:[];const choose=(target:string)=>{
  if(s?.phase==='lobby'&&target==='ready'){void send({type:'lobbyReady',value:!s.players.find(p=>p.id===own?.id)?.ready});return}
  if(!s||!own||target===own.id)return;
  if(s.phase==='vote'){if(own.locked)return;if(target==='skip'&&!s.settings.allowSkip)return;setSelected([target]);return}
  if(s.phase==='day'){setSelected([target]);bus.focus=target;return}
  if(s.phase!=='night'||!own.awake||own.locked)return;
  const role=own.role==='doppel'&&own.copiedRole?own.copiedRole:own.role,center=target.startsWith('center-');
  if(role==='doppel'&&center||role==='drunk'&&!center||['robber','troublemaker'].includes(role||'')&&center||!['doppel','seer','robber','troublemaker','drunk','wolf'].includes(role||''))return;
  if(role==='wolf'&&(!center||!own.report.some(r=>r.text.includes('lone wolf'))))return;
  setSelected(old=>{if(old.includes(target))return old.filter(t=>t!==target);const max=role==='troublemaker'||role==='seer'&&center?2:1;const same=old.filter(t=>t.startsWith('center-')===center);return[...same.slice(-(max-1)||same.length),target]});
 };bus.onSelect=choose;bus.onMenu=open;bus.onReact=(kind,target)=>{void send({type:'emote',kind,target})};bus.onReactions=()=>setEmotes(true);
 bus.onPeek=target=>{if(!s||!own)return;if(s.phase==='dealing'&&target===own.id){void send({type:'reveal'});return}if(s.phase!=='night'||!own.awake||own.locked||target===own.id)return;const power=own.role==='doppel'&&own.copiedRole?own.copiedRole:own.role;let action:RoleAction|undefined;
 if(power==='doppel'&&!target.startsWith('center-'))action={role:'doppel',target};
 if(power==='seer'){if(!target.startsWith('center-'))action={role:'seer',mode:'player',target};else{const centers=[...new Set([...selected.filter(t=>t.startsWith('center-')),target])].map(t=>Number(t.slice(7)) as 0|1|2);if(centers.length===2)action={role:'seer',mode:'center',centers:centers as [0|1|2,0|1|2]}}}
 if(power==='wolf'&&target.startsWith('center-'))action={role:'wolf',center:Number(target.slice(7)) as 0|1|2};
 if(action){if(own.role==='doppel'&&own.step===0&&own.action?.role==='doppel'&&!('skip'in own.action)&&action.role!=='doppel')action={...own.action,followup:action as SimpleAction};void send({type:'night',action});setSelected([])}else choose(target)};
 bus.onSwap=(a,b)=>{if(!s||!own||!own.awake||own.locked||a===b)return;const power=own.role==='doppel'?own.copiedRole:own.role;if(power==='troublemaker'&&![a,b].some(t=>t===own.id||t.startsWith('center-')))setSelected([a,b]);if(power==='robber'&&[a,b].includes(own.id)){const target=a===own.id?b:a;if(!target.startsWith('center-'))setSelected([target])}if(power==='drunk'&&[a,b].includes(own.id)){const target=a===own.id?b:a;if(target.startsWith('center-'))setSelected([target])}window.dispatchEvent(new CustomEvent('werewolf-private-choice',{detail:{target:b}}))};
 return()=>{bus.onSelect=undefined;bus.onMenu=undefined;bus.onReact=undefined;bus.onReactions=undefined;bus.onPeek=undefined;bus.onSwap=undefined}},[s,own,bus,drawer,intro,selected,send,open]);
 const dispatch=(c:Command)=>{audio.current?.beep(420,.06);void send(c);if(['night','vote'].includes(c.type))setSelected([])};
 useEffect(()=>{setResultReady(false);if(s?.phase!=='result')return;const timer=setTimeout(()=>{setResultReady(true);audio.current?.beep(s.result?.players.find(p=>p.id===own?.id)?.won?880:110,.4)},prefs.calm?0:bannerAt(s.order.length)*1000);return()=>clearTimeout(timer)},[s?.phase,s?.round,s?.order.length,prefs.calm,own?.id,s?.result]);
 function nightAction():RoleAction|undefined{
  if(!own?.role)return;const role:Role=own.role==='doppel'&&own.copiedRole?own.copiedRole:own.role,centers=selected.filter(t=>t.startsWith('center-')).map(t=>Number(t.slice(7)) as 0|1|2),people=selected.filter(t=>!t.startsWith('center-'));
  let action:RoleAction;
  if(role==='doppel'){if(people.length!==1)return;return{role,target:people[0]}}
  if(role==='seer'){if(centers.length===2)action={role,mode:'center',centers:centers as [0|1|2,0|1|2]};else if(people.length===1)action={role,mode:'player',target:people[0]};else return}
  else if(role==='robber')action={role,target:people[0]};else if(role==='troublemaker'){if(people.length===1)return;action={role,targets:people.length===2?people as [string,string]:undefined}}
  else if(role==='drunk'){if(centers.length!==1)return;action={role,center:centers[0]}}
  else if(role==='wolf')action={role,center:centers[0]};else action={role};
  if(own.role==='doppel'&&own.action?.role==='doppel'&&!('skip'in own.action)&&own.step===0)return{...own.action,followup:action as SimpleAction};return action;
 }
 const clock=s?.nextWakeAt?Math.max(0,Math.ceil((s.nextWakeAt-now)/1000)):0,host=s?.host===own?.id,playing=!!s&&s.phase!=='lobby',title=own?.role?RULES[own.role].name:'Your seat';
 let context:React.ReactNode=null;
 if(s&&own){
  if(s.phase==='lobby')context=host?<button className="btn primary-action" disabled={busy||s.players.filter(p=>!p.spectator&&!p.left).length<3} onClick={()=>dispatch({type:'start'})}>Start the night</button>:<button className="btn primary-action" disabled={busy} onClick={()=>dispatch({type:'lobbyReady',value:!s.players.find(p=>p.id===own.id)?.ready})}>{s.players.find(p=>p.id===own.id)?.ready?'Leave ready ring':'Ready at the fire'}</button>;
  else if(s.phase==='dealing'&&!own.revealed)context=<HoldButton disabled={busy} label="Reveal my tablet" onComplete={()=>dispatch({type:'reveal'})}>Reveal my tablet</HoldButton>;
  else if(s.phase==='dawn')context=<button className="btn primary-action" disabled={busy} onClick={()=>dispatch({type:'dawnReady'})}>I’m ready</button>;
  else if(s.phase==='day'){const ready=localStorage.getItem('ready:'+s.code+':'+s.round)==='yes';context=<button className="btn primary-action" disabled={busy} onClick={()=>{localStorage.setItem('ready:'+s.code+':'+s.round,ready?'no':'yes');dispatch({type:'dayReady',value:!ready})}}>{ready?'Keep discussing':'Ready to vote'}</button>}
  else if(s.phase==='vote'&&!own.locked){const pick=selected[0]||(own.voted?(own.vote||'skip'):undefined);context=<HoldButton label="Lock my vote" disabled={busy||!pick} onComplete={async()=>{if(selected[0])await send({type:'vote',target:selected[0]==='skip'?null:selected[0]});await send({type:'lockVote'});setSelected([])}}>{pick==='skip'?'Lock Skip':pick?'Lock accusation':'Choose a suspect'}</HoldButton>}
  else if(s.phase==='night'&&own.undoUntil&&now<own.undoUntil)context=<button className="btn alt primary-action" disabled={busy} onClick={()=>dispatch({type:'undo'})}>Undo · {Math.ceil((own.undoUntil-now)/1000)}s</button>;
  else if(s.phase==='night'&&own.awake&&!own.locked){const action=nightAction();context=<HoldButton label="Lock night action" disabled={busy||!action} onComplete={()=>{if(action)dispatch({type:'night',action})}}>{selected.length?'Use my power':['robber','troublemaker','wolf'].includes(effectiveRole||'')?'Pass this power':'Close my eyes'}</HoldButton>}
  else if(s.phase==='result')context=<button className="btn primary-action" disabled={!resultReady} onClick={()=>window.dispatchEvent(new CustomEvent('werewolf-replay',{detail:s.round}))}>Watch replay</button>;
  else context=<button className="btn alt primary-action" disabled>{own.locked?'Choice saved':'Rest by the fire'}</button>;
 }
 return <main className="world-game" data-phase={s?.phase||'welcome'} data-awake={!!own?.awake}>
  {gpuFailed?<section className="gpu-error" role="alert"><h1>Enable 3D graphics</h1><p>Enable hardware acceleration in browser settings, restart the browser, then Retry. Try current Chrome, Edge, Firefox or Safari.</p><button className="btn" onClick={()=>setGpuFailed(false)}>Retry 3D</button></section>:<Clearing view={view} faces={permittedFaces(state)} bus={bus} muted={muted} onFallback={fallback} onReady={worldReady}/>}
  {Object.values(preload).filter(Boolean).length<3&&<div className="preload-pill" role="progressbar" aria-label="Preparing the village" aria-valuemin={0} aria-valuemax={3} aria-valuenow={Object.values(preload).filter(Boolean).length}><span style={{scale:`${Object.values(preload).filter(Boolean).length/3} 1`}}/><small>Gathering the village · every seat plays</small></div>}
  {!intro&&<>{!playing?<><button className="icon-button menu-toggle" aria-label="Open settings" onClick={()=>open('Settings')}>⚙</button><button className="icon-button help-toggle" aria-label="Open help" onClick={()=>open('Help')}>?</button></>:<><button className="role-chip" onClick={()=>{setRoleOpen(v=>!v);setDrawer(null);setEmotes(false)}} aria-expanded={roleOpen}>{own?.role?RULES[own.role].glyph:'◌'} <span>{title}</span></button><button className="icon-button menu-toggle" aria-label="Open menu" onClick={()=>drawer?setDrawer(null):open('Notes')}>☰</button></>}
  {s?<><header className="phase-strip"><span>{s.phase==='vote'?`${s.lockedCount}/${s.connectedCount} stones locked`:s.phase==='day'?`${s.readyCount}/${s.connectedCount} ready`:s.phase.toUpperCase()}</span><p>{instruction(s,own?.awake,own?.role)}</p>{s.nextWakeAt&&<span className="timer-ring" role="timer" aria-label="Time remaining">{Math.floor(clock/60)}:{String(clock%60).padStart(2,'0')}</span>}</header>
  {s.phase==='lobby'&&<section className="lobby-hud"><small>YOUR FIRE</small><h1 className="room-code">{s.code}</h1><p>{s.players.filter(p=>!p.spectator&&!p.left).length}/10 seats · {s.readyCount} ready</p><button className="btn alt" onClick={()=>{void navigator.clipboard.writeText(location.origin+'/?room='+s.code).then(()=>setInviteCopied(true))}}>{inviteCopied?'Link copied':'Copy invite'}</button>{host&&<button className="btn alt" onClick={()=>dispatch({type:'lobbyReady',value:!s.players.find(p=>p.id===own?.id)?.ready})}>{s.players.find(p=>p.id===own?.id)?.ready?'Leave ready ring':'Enter ready ring'}</button>}</section>}
  {playing&&<><button className="emote-toggle icon-button" aria-label="Open reactions" onClick={()=>{setEmotes(v=>!v);setDrawer(null);setRoleOpen(false)}} disabled={['night','dealing','dawn','vote'].includes(s.phase)}>✦</button><div className="context-action">{context}</div><p className="director-caption" aria-live="polite">{s.caption}</p></>}{!playing&&<div className="context-action">{context}</div>}
  {s.phase==='night'&&!own?.awake&&<div className="eyelids" aria-hidden="true"/>}
  {s.phase==='result'&&s.result&&resultReady&&<section className="result-hud" data-testid="result-banner"><h1>{s.result.banner}</h1><p>{s.result.banished.length?'Banished: '+s.result.banished.map(id=>s.players.find(p=>p.id===id)?.name).join(', '):'Nobody was banished.'}{s.result.hunted.length>0?' The Hunter’s shot took another player down.':''}</p><ol>{s.result.players.map((p,i)=><li key={p.id} style={{animationDelay:prefs.calm?'0s':i*.15+'s'}} className={p.won?'won':'lost'}><b>{s.players.find(x=>x.id===p.id)?.name} · {p.won?'Won':'Lost'}</b><span>dealt {RULES[s.original![i].role].name} · final {RULES[p.role].name} · {s.result!.counts[i]} votes</span><small>{p.reason} {p.goal}</small></li>)}</ol><p>Next deal in {clock}s · wins this session: {s.scores[own!.id]?.wins||0}</p></section>}
  </>:<section className="entry-hud"><small>ONE FIRE. MANY SECRETS.</small><h1>One Night<br/>Werewolf</h1><form onSubmit={e=>{e.preventDefault();localStorage.setItem('werewolf-name',name);void send({type:joining?'join':'create',name},joining?code:'')}}><label className="sr-only" htmlFor="player-name">Your name</label><input id="player-name" aria-label="Your name" maxLength={12} autoComplete="nickname" placeholder="Who are you?" value={name} onChange={e=>setName(e.target.value)}/>{joining&&<div className="rune-input"><div className="rune-stones" aria-hidden="true">{[0,1,2,3].map(i=><span key={i} data-lit={!!code[i]}>{code[i]||'·'}</span>)}</div><label className="sr-only" htmlFor="join-code">Room code</label><input id="join-code" aria-label="Room code" maxLength={4} autoCapitalize="characters" value={code} onChange={e=>setCode(e.target.value.toUpperCase().replace(/[^A-HJ-NP-Z]/g,''))} placeholder="FIRE"/></div>}<button className="btn" type="submit" disabled={busy||!name.trim()}>{joining?'Join this fire':'Create room'}</button><button className="btn alt" type="button" onClick={()=>setJoining(v=>!v)}>{joining?'Create a fire instead':'Join room'}</button></form>{nudge&&<button className="tutorial-nudge" onClick={()=>{setTutorial(true);setNudge(false)}}>New here? Try a 60-second practice.</button>}<p>3–10 friends · Every seat plays</p></section>}
  {roleOpen&&own?.role&&<aside className="role-flyout"><h2>{RULES[own.role].name}{own.copiedRole?' → '+RULES[own.copiedRole].name:''}</h2><p>{s?.settings.ruleset==='solo'&&SOLO_OBJECTIVES[effectiveRole||own.role]?'Solo goal: '+SOLO_OBJECTIVES[effectiveRole||own.role]:'Your final card decides your team.'}</p><p>{RULES[effectiveRole||own.role].power}</p>{own.report.map((r,i)=><div key={i}><p>{r.text}{r.seats?.map(id=>' '+s?.players.find(p=>p.id===id)?.name).join(', ')}</p>{r.cards?.map((c,j)=><Tablet key={j} role={c.role} ruleset={s?.settings.ruleset}/>)}</div>)}</aside>}
  {emotes&&s&&<div className="reaction-wheel" aria-label="Choose reaction">{(['wave','point','slam','shrug','gasp','laugh','who me','thumbs up','sweat','accuse','facepalm'] as const).map(kind=><button className="btn alt" key={kind} onClick={()=>{dispatch({type:'emote',kind,target:selected[0]});setEmotes(false)}}>{kind}</button>)}{(['neutral','suspicious','smug','shocked','sad','angry'] as const).map(value=><button className="btn alt" key={value} onClick={()=>{dispatch({type:'expression',value});setEmotes(false)}}>{value}</button>)}</div>}
  {drawer&&<Drawer key={s?.code||'welcome'} tab={drawer} setTab={setDrawer} close={()=>setDrawer(null)} state={state} send={dispatch} prefs={prefs} setPrefs={setPrefs} muted={muted} setMuted={setMuted} tutorial={()=>{setDrawer(null);setTutorial(true)}} intro={()=>{setDrawer(null);setIntro(true)}}/>}
  {connection&&<p className="connection-toast" role="status">{connection}</p>}{error&&<aside className="error-toast" role="alert"><p>{error}</p><button className="btn alt" onClick={()=>setError('')}>Dismiss</button><button className="btn alt" onClick={()=>{void fetch('/api/health').then(r=>r.json()).then(h=>{setError(h.ok?'':h.message)})}}>Retry connection</button></aside>}
  </>}
  {intro&&<Cinematic bus={bus} close={closeIntro}/>}{tutorial&&<Tutorial close={()=>{setTutorial(false);setNudge(false)}}/>}{s&&<PhaseVFX phase={s.phase} round={s.round}/>}
  {audioReady&&<><MusicLayers phase={s?.phase||'lobby'} enabled={!prefs.muted} volume={prefs.music} remaining={clock} total={s?.settings.daySeconds||300}/><NatureSounds phase={s?.phase||'lobby'} enabled={!prefs.muted&&prefs.ambience>0} volume={prefs.ambience} step={s?.step||0}/></>}
 </main>;
}

'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { mountAudio } from '@/lib/audio';
import { ROLES, type NightAction, type Report, type Role, type Snapshot } from '@/lib/engine';
import type { z } from 'zod';
import type { commandSchema } from '@/lib/service';
import { awake, SCRIPT } from '@/lib/narration';
import { sceneProjection } from '@/lib/social';
import { makeMotion } from '@/lib/motion';
import { useMotion } from './use-motion';
import { DEFAULT_VOICE, Narrator, type VoicePreferences } from './narrator';
import { EmoteWheel, ExperienceSettings, Social } from './social-controls';
import { Tablet } from './tablet';
import { Achievements,ComfortSettings,DayHelpers,Guidance,PlaySettings,Recovery,RoleSummary,Roster,SessionBoard } from './assistance';
import { VOTE_HELP } from '@/lib/rules';
import {Modal} from './dialog';
const NatureSounds=dynamic(()=>import('./nature-sounds').then(m=>m.NatureSounds),{ssr:false});
const MusicLayers=dynamic(()=>import('./music-layers'),{ssr:false});
const Tutorial=dynamic(()=>import('./tutorial'),{ssr:false});
const Cinematic=dynamic(()=>import('./cinematic'),{ssr:false});
const PhaseVFX=dynamic(()=>import('./phase-vfx'),{ssr:false});
import { useRoomEvents } from './use-room-events';
import type { publicState } from '@/lib/engine';
const Clearing = dynamic(() => import('./clearing'), { ssr: false });

type Command = z.infer<typeof commandSchema>;
type Art = ReturnType<typeof mountAudio>;
const ArtContext = createContext<Art | null>(null);
const names: Record<Role, string> = { wolf: 'Werewolf', minion: 'Minion', mason: 'Mason', seer: 'Seer', robber: 'Robber', troublemaker: 'Troublemaker', drunk: 'Drunk', insomniac: 'Insomniac', hunter: 'Hunter', tanner: 'Tanner', villager: 'Villager' };
const limits: Record<Role, number> = { wolf: 2, minion: 1, mason: 2, seer: 1, robber: 1, troublemaker: 1, drunk: 1, insomniac: 1, hunter: 1, tanner: 1, villager: 3 };
function requestId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16)); bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function Card({ role, delay = 180, dead = false, sound = false }: { role: Role; delay?: number; dead?: boolean; sound?: boolean }) {
  const art=useContext(ArtContext);return <Tablet role={role} delay={delay} dead={dead} sound={sound} beep={art?.beep}/>;
}
function Button({ children, onClick, alt = false, selected = false, disabled = false, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { alt?: boolean; selected?: boolean }) {
  const art = useContext(ArtContext);
  return <button type="button" className={`btn ${alt ? 'alt' : ''} ${selected ? 'sel' : ''}`} disabled={disabled} onClick={e => { art?.beep(520); onClick?.(e); }} {...props}>{children}</button>;
}
function Reports({ reports }: { reports: Report[] }) {
  return <>{!reports.length && <p>Nothing woke you. The night passed quietly.</p>}{reports.map((r, i) => <div key={i}><p>{r.text}</p>{r.roles && <div className="row report-cards">{r.roles.map((role, j) => <Card key={j} role={role} delay={250 + j * 200} />)}</div>}</div>)}</>;
}
function Picker({ options, count, submit, busy }: { options: { id: string; label: string }[]; count: number; submit: (ids: string[]) => void; busy: boolean }) {
  const [selected, setSelected] = useState<string[]>([]);
  return <div className="pick"><p>Pick {count}:</p><div className="row">{options.map(o => <Button key={o.id} alt selected={selected.includes(o.id)} aria-pressed={selected.includes(o.id)} disabled={busy} onClick={() => { window.dispatchEvent(new CustomEvent('werewolf-private-choice', { detail: { target: /^\d$/.test(o.id) ? 'center-' + o.id : o.id } })); setSelected(old => old.includes(o.id) ? old.filter(v => v !== o.id) : [...old.slice(-(count - 1) || old.length), o.id]); }}>{o.label}</Button>)}</div><div className="row"><Button disabled={busy || selected.length !== count} onClick={() => submit(selected)}>Confirm</Button></div></div>;
}
function Night({ state, send, busy }: { state: Snapshot; send: (c: Command) => void; busy: boolean }) {
  const art = useContext(ArtContext); const p = state.private!; const role = p.role;
  const [action, setAction] = useState<NightAction | null>(null); const [mode, setMode] = useState<'player' | 'center' | null>(null);
  const players = state.players.filter(p => state.order.includes(p.id) && p.id !== state.me).map(p => ({ id: p.id, label: p.name }));
  const centers = [0, 1, 2].map(c => ({ id: String(c), label: 'Center ' + (c + 1) }));
  const passive = !['seer', 'robber', 'troublemaker', 'drunk'].includes(role) && !(role === 'wolf' && p.loneWolf);
  return <><div className="row role-card"><Card role={role} /></div><h2>You are the {names[role]}</h2><RoleSummary role={role}/><p>{art?.R[role][1]}</p>{p.static.map((r, i) => <p className="hl" key={i}>{r.text}</p>)}
    {action === null && !passive && <>
      {role === 'seer' && mode === null && <div className="row"><Button onClick={() => setMode('player')}>A player</Button><Button onClick={() => setMode('center')}>Two center cards</Button></div>}
      {role === 'seer' && mode && <Picker key={mode} options={mode === 'player' ? players : centers} count={mode === 'player' ? 1 : 2} busy={busy} submit={ids => setAction(mode === 'player' ? { mode, targets: ids } : { mode, centers: ids.map(Number) })} />}
      {(role === 'robber' || role === 'troublemaker') && <Picker options={players} count={role === 'robber' ? 1 : 2} busy={busy} submit={targets => setAction({ targets })} />}
      {(role === 'drunk' || role === 'wolf') && <Picker options={centers} count={1} busy={busy} submit={ids => setAction({ centers: ids.map(Number) })} />}
      {role === 'wolf' && <div className="row"><Button alt onClick={() => setAction({ skip: true })}>Skip</Button></div>}
    </>}
    {(action !== null || passive) && <><p>{!passive && 'Your choice is private. Ready?'}</p><div className="row"><Button disabled={busy} onClick={() => send({ type: 'night', action: action || {} })}>Lock it in</Button>{!passive && <Button alt disabled={busy} onClick={() => setAction(null)}>Change choice</Button>}</div></>}
  </>;
}
function Settings({ state, send, busy, volume, setVolume }: { state: Snapshot | null; send: (c: Command) => void; busy: boolean; volume: number; setVolume: (v: number) => void }) {
  const [expanded,setExpanded]=useState(false);
  const [deck, setDeck] = useState<Role[]>(state?.customDeck || []); const [seconds, setSeconds] = useState(state?.daySeconds || 300); const [custom, setCustom] = useState(!!state?.customDeck);
  const host = state?.host === state?.me; const between = state?.phase === 'lobby' || state?.phase === 'result';
  const count = state?.players.filter(p => !p.left).length || 0;
  const valid = deck.length === count + 3 && deck.filter(r => r === 'mason').length !== 1;
  return <details className="settings" onToggle={e=>setExpanded(e.currentTarget.open)}><summary>Settings &amp; how to play</summary>{expanded&&<>
    <label className="volume-label">Music volume <input aria-label="Music volume" type="range" min="0" max="1" step="0.05" value={volume} onChange={e => setVolume(Number(e.target.value))} /></label>
    <p>Everyone plays on their own device. At night, choose privately. At dawn, read your report. Discuss out loud or on a call. Everyone may lie. Vote for one OTHER player.</p><p>Your final card decides your team. A single vote each banishes nobody. Ties banish everyone with the most votes. The Hunter takes their vote target down with them. The Tanner wins by being banished.</p>
    <details><summary>Meet the roles</summary>{ROLES.map(r => <p key={r}><b className="hl">{names[r]}.</b> <RoleDescription role={r} /></p>)}</details>
    {host && between && <><label>Day length (seconds)<input aria-label="Day length (seconds)" type="number" min="30" max="900" value={seconds} onChange={e => setSeconds(Number(e.target.value))} /></label><label className="checkbox"><input type="checkbox" checked={custom} onChange={e => setCustom(e.target.checked)} /> Choose the roles</label>
      {custom && <><p className="hl">{deck.length} / {count + 3} cards. Masons travel as a pair.</p><div className="deck-grid">{ROLES.map(r => { const n = deck.filter(v => v === r).length; return <div key={r}><span>{names[r]} ×{n}</span><Button alt aria-label={`Remove ${names[r]}`} disabled={busy || !n} onClick={() => setDeck(d => d.filter(v => v !== r))}>−</Button><Button alt aria-label={`Add ${names[r]}`} disabled={busy || n >= limits[r]} onClick={() => setDeck(d => [...d, ...Array<Role>(r === 'mason' ? 2 : 1).fill(r)])}>+</Button></div>; })}</div></>}
      <div className="row"><Button disabled={busy || (custom && !valid) || seconds < 30 || seconds > 900} onClick={() => send({ type: 'settings', deck: custom ? deck : null, daySeconds: seconds })}>Save settings</Button></div><p>Saved: {state?.customDeck ? 'custom deck' : 'random balanced deck'}, {state?.daySeconds}s discussion.</p></>}
  </>}</details>;
}
function RoleDescription({ role }: { role: Role }) { const art = useContext(ArtContext); return <>{art?.R[role][1]}</>; }
function Results({ state, send, busy }: { state: Snapshot; send: (c: Command) => void; busy: boolean }) {
  const art = useContext(ArtContext); const result = (state.private?.result||state.reveal)!; const [banner, setBanner] = useState(false);
  const playerName = (id: string) => state.players.find(p => p.id === id)?.name || 'Departed player';
  const won = result.winningPlayers.includes(state.me);
  useEffect(() => { const timer = setTimeout(() => { setBanner(true); art?.beep(won ? 880 : 140, .4); }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1000 + result.cards.length * 450); return () => clearTimeout(timer); }, [art, result.cards.length, won]);
  return <><h2>The village decides</h2><div className="ring result-ring">{result.cards.map((r, i) => {
    const id = state.order[i]; const n = result.votes[i];
    return <div key={i} className="slot"><Card role={r} delay={700 + i * 450} dead={result.banished.includes(id)} sound /><b>{i < state.order.length ? playerName(id) : 'Center ' + (i - state.order.length + 1)}</b>{i < state.order.length && <small>dealt {names[result.original[i]]}, {n} {n === 1 ? 'vote' : 'votes'}</small>}</div>;
  })}</div><div className={`banner ${banner ? 'on' : ''}`} aria-live="polite" data-testid="result-banner">
    <h1>{result.banner}</h1><p className="result-reason">{state.resultReason}</p><p>{result.banished.length ? 'Banished: ' + result.banished.map(playerName).join(', ') + '.' : 'Nobody was banished.'}{result.hunted.length > 0 && ' The Hunter’s shot took ' + result.hunted.map(playerName).join(', ') + ' down too.'}</p><p className="hl">{state.private?<>{won ? 'You won!' : 'You lost this round.'} Your final card: {names[result.cards[state.order.indexOf(state.me)]]}.</>:'You watched this round as a spectator.'}</p>
    {state.private&&<details><summary>Your night recap · only your own actions</summary><Reports reports={state.private.report}/></details>}<SessionBoard state={state}/>
    {state.host === state.me ? <div className="row"><Button disabled={busy} onClick={() => send({ type: 'deal' })}>Play again</Button></div> : <p>The host deals the next round.</p>}
    <details><summary>See every vote</summary>{Object.entries(result.ballots).map(([from, to]) => <p key={from}>{playerName(from)} → {playerName(to)}</p>)}</details>
  </div></>;
}

export default function Home() {
  const [art, setArt] = useState<Art | null>(null); const [state, setState] = useState<Snapshot | null>(null);
  const stateRef = useRef<Snapshot | null>(null); const tokenRef = useRef(''); const roomRef = useRef(''); const mounted = useRef(false);
  const [name, setName] = useState(''); const [code, setCode] = useState(''); const [busy, setBusy] = useState(false); const busyRef = useRef(false);
  const [error, setError] = useState(''); const [connection, setConnection] = useState('');
  const [music, setMusic] = useState(true); const [volume, updateVolume] = useState(.55); const [clock, setClock] = useState(Date.now()); const offset = useRef(0);
  const [gpuFailed,setGpuFailed]=useState(false); const [explore, setExplore] = useState(false);
  const [voice, updateVoice] = useState<VoicePreferences>(DEFAULT_VOICE); const [muted, updateMuted] = useState<string[]>([]);
  const [tutorial,setTutorial]=useState(false),[firstRun,setFirstRun]=useState(true),[audioReady,setAudioReady]=useState(false),[confirmation,setConfirmation]=useState<Command|null>(null);
  const [effects,setEffects]=useState(.5);
  const [bus] = useState(makeMotion);
  const [intro,setIntro]=useState(false);
  const closeIntro=useCallback(()=>{bus.introStarted=null;setIntro(false);localStorage.setItem('werewolf-intro','seen')},[bus]);
  const view = state ? sceneProjection(state) : null;
  useMotion(view, bus);
  const fallback = useCallback(() => { setGpuFailed(true);setIntro(false); }, []);
  const duck = useCallback((v: number) => {art?.duck(v);window.dispatchEvent(new CustomEvent('werewolf-duck',{detail:v}))}, [art]);
  const setVoice = (value: VoicePreferences) => { updateVoice(value); localStorage.setItem('werewolf-voice', JSON.stringify(value)); };
  const setMuted = (ids: string[]) => { updateMuted(ids); localStorage.setItem('werewolf-muted', JSON.stringify(ids)); };
  const accept = useCallback((next: Snapshot) => {
    if (!mounted.current || (stateRef.current?.code === next.code && stateRef.current.revision > next.revision)) return;
    offset.current = next.serverNow - Date.now(); stateRef.current = next; roomRef.current = next.code; setState(next);
    setConnection(''); localStorage.setItem('werewolf-room', next.code);
    const url = new URL(window.location.href); url.searchParams.set('room', next.code); window.history.replaceState(null, '', url);
  }, []);
  const request = useCallback(async (command: Command, room = roomRef.current, round = stateRef.current?.round): Promise<Snapshot> => {
    const body = JSON.stringify({ code: room || undefined, command, round, requestId: requestId() });
    for (let attempt = 0; ; attempt++) {
      try {
        const response = await fetch('/api/game', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-player-token': tokenRef.current }, body, signal: AbortSignal.timeout(12000) });
        const data = await response.json();
        if (!response.ok) {
          if (command.type === 'sync' && [403, 404, 410].includes(response.status)) { roomRef.current = ''; stateRef.current = null; setState(null); localStorage.removeItem('werewolf-room'); }
          if (response.status >= 500 && attempt < 3) throw new Error(data.error); throw Object.assign(new Error(data.error), { terminal: true });
        }
        return data;
      } catch (e) {
        if ((e as { terminal?: boolean }).terminal || attempt >= 3 || !mounted.current) throw e;
        setConnection('Reconnecting...'); await new Promise(resolve => setTimeout(resolve, Math.min(8000, 600 * 2 ** attempt)));
      }
    }
  }, []);
  const dispatch = useCallback(async (command: Command) => {
    if (busyRef.current) return; busyRef.current = true; setBusy(true); setError('');
    try { const next = await request(command); if (command.type === 'leave') { roomRef.current = ''; stateRef.current = null; setState(null); localStorage.removeItem('werewolf-room'); window.history.replaceState(null, '', '/'); } else accept(next); }
    catch (e) { setError((e as Error).message); }
    finally { busyRef.current = false; setBusy(false); }
  }, [accept, request]);
  const send=useCallback((command:Command)=>{if(stateRef.current?.preferences.confirmActions&&['deal','kick','replaceBot','lockVote','callVote','leave'].includes(command.type)){setConfirmation(command);return;}void dispatch(command)},[dispatch]);
  const onEffects=useCallback((v:number)=>{art?.setEffects(v);setEffects(v)},[art]);
  const resync = useCallback(async () => { if (!roomRef.current || !mounted.current) return; try { accept(await request({ type: 'sync' })); } catch (e) { setError((e as Error).message); } }, [accept, request]);
  const onPublic = useCallback((next: ReturnType<typeof publicState>) => {
    const old = stateRef.current; if (!old || old.code !== next.code || old.revision > next.revision) return;
    if (old.round !== next.round || old.phase !== next.phase || next.narration?.narration_step !== old.narration?.narration_step && old.private && awake(next.narration || undefined, old.private.role)) { void resync(); return; }
    const merged = { ...old, ...next }; stateRef.current = merged; setState(merged);
  }, [resync]);
  const online = useRoomEvents(state, onPublic, resync, setConnection);
  const leader = online.includes(state?.host || '') ? state?.host : online[0] || state?.host;
  useEffect(() => { if (!state?.nextWakeAt || leader !== state.me) return; const timer = setTimeout(() => { void resync(); }, Math.max(30, state.nextWakeAt - Date.now() - offset.current + 120)); return () => clearTimeout(timer); }, [state?.nextWakeAt, state?.me, leader, resync]);
  useEffect(() => {
    mounted.current = true; const runtime = mountAudio(); setArt(runtime);
    let token = localStorage.getItem('werewolf-token');
    if (!token || !/^[a-f0-9]{64}$/.test(token)) { token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join(''); localStorage.setItem('werewolf-token', token); }
    tokenRef.current = token; setName(localStorage.getItem('werewolf-name') || '');
    setFirstRun(!localStorage.getItem('werewolf-tutorial'));
    try { const savedVoice = JSON.parse(localStorage.getItem('werewolf-voice') || 'null'); if (savedVoice) updateVoice({ ...DEFAULT_VOICE, ...savedVoice }); updateMuted(JSON.parse(localStorage.getItem('werewolf-muted') || '[]')); } catch { /* Ignore outdated local preferences. */ }
    const link = new URLSearchParams(window.location.search).get('room')?.toUpperCase() || '';
    setCode(link); const saved = localStorage.getItem('werewolf-room');
    if (saved && (!link || link === saved)) { roomRef.current = saved; request({ type: 'sync' }, saved).then(accept).catch(e => { setError(e.message); roomRef.current = ''; localStorage.removeItem('werewolf-room'); }); }
    const savedMusic = localStorage.getItem('werewolf-music') !== 'off'; setMusic(savedMusic);
    const savedVolume = Number(localStorage.getItem('werewolf-volume') ?? .55); updateVolume(savedVolume); runtime.setVolume(savedVolume);
    const start = () => {runtime.setMusic(savedMusic);setAudioReady(true)}; window.addEventListener('pointerdown', start, { once: true });
    return () => { mounted.current = false; runtime.dispose(); window.removeEventListener('pointerdown', start); };
  }, [accept, request]);
  useEffect(() => { const clockId = setInterval(() => { const s = stateRef.current; if (s && (s.phase === 'day' || s.phase === 'vote' || s.private?.undoUntil)) setClock(Date.now()); }, 500); return () => clearInterval(clockId); }, []);
  useEffect(() => { setExplore(false); bus.focus = null; }, [state?.phase, bus]);
  useEffect(() => { const interact = () => { setExplore(false); if (bus.interaction) bus.focus = bus.interaction; }; window.addEventListener('werewolf-act', interact); return () => window.removeEventListener('werewolf-act', interact); }, [bus]);
  useEffect(() => { bus.exploring = explore; }, [bus, explore]);
  const [,refreshComfort]=useState(0);
  useEffect(()=>{const comfort=()=>refreshComfort(v=>v+1);window.addEventListener('werewolf-comfort',comfort);return()=>window.removeEventListener('werewolf-comfort',comfort)},[bus]);
  useEffect(()=>{const limit=()=>setConnection('Movement sync is resting to stay on the free plan. Cards, chat and voting still work.');window.addEventListener('werewolf-movement-limit',limit);return()=>window.removeEventListener('werewolf-movement-limit',limit)},[]);
  useEffect(() => {
    const current = stateRef.current;
    if (!current || !art) return;
    const phase = current.phase;
    art.setSky(['day', 'vote', 'result'].includes(phase) ? 1 : 0);
    if (phase === 'day') art.beep(660, .3);
    setClock(Date.now());
    document.getElementById('app')?.scrollTo({ top: 0 });
  }, [state?.phase, state?.round, art]); // Scene changes only when a new screen starts.

  async function enter(create: boolean) {
    if (busyRef.current) return;
    if (!create && !/^[A-HJ-NP-Z]{4}$/.test(code)) { setError('Room codes have 4 letters, A–Z without I or O.'); return; }
    busyRef.current = true; setBusy(true); setError(''); localStorage.setItem('werewolf-name', name);
    try { accept(await request(create ? { type: 'create', name } : { type: 'join', name }, create ? '' : code)); }
    catch (e) { setError((e as Error).message); }
    finally { busyRef.current = false; setBusy(false); }
  }
  const volumeChange = (v: number) => { updateVolume(v); art?.setVolume(v); localStorage.setItem('werewolf-volume', String(v)); };
  const host = !!state && state.host === state.me;
  const waiting = state?.phase==='vote'&&state.preferences.editableVoting?false:state?.phase === 'night' && state.narration?.active ? state.private?.locked : state?.finished.includes(state.me) || state?.skipped.includes(state.me);
  const sleeping = !!state?.narration?.active && !!state.private && (!awake(state.narration, state.private.role) || state.narration.paused_at !== null);
  const pending = state?.order.filter(id => !state.finished.includes(id)) || [];
  const playerName = (id: string) => state?.players.find(p => p.id === id)?.name || 'Departed player';
  const activePlayers = state?.players.filter(p => !p.left&&!p.spectator) || [];
  const seconds = Math.max(0, Math.ceil(((state?.dayEnd || 0) - clock - offset.current) / 1000));
  return <ArtContext.Provider value={art}>{gpuFailed?<section className="gpu-error" role="alert"><h1>Enable 3D graphics</h1><p>Enable hardware acceleration in browser settings, then restart your browser. Try current Chrome, Edge, Firefox or Safari.</p><Button onClick={()=>setGpuFailed(false)}>Retry 3D</Button></section>:<Clearing view={view} bus={bus} muted={muted} onFallback={fallback}/>}{audioReady&&<><NatureSounds phase={state?.phase || 'lobby'} enabled={effects>0} volume={effects} step={state?.narration?.narration_step || 0}/><MusicLayers phase={state?.phase||'lobby'} enabled={music} volume={volume} remaining={seconds} total={state?.daySeconds||300}/></>}<Button id="mu" alt onClick={() => { const on = !music; setMusic(on); art?.setMusic(on); localStorage.setItem('werewolf-music', on ? 'on' : 'off'); }}>Music {music ? 'on' : 'off'}</Button>
    {intro&&<Cinematic bus={bus} close={closeIntro}/>}
    {state&&<PhaseVFX phase={state.phase} round={state.round}/>}
    {tutorial&&<Tutorial close={()=>{setTutorial(false);setFirstRun(false)}}/>}
    {confirmation&&<Modal label="Confirm action" onClose={()=>setConfirmation(null)}><h2>Ready to continue?</h2><p>This {confirmation.type==='deal'?'starts a new round for everyone':'changes the room for everyone'}.</p><div className="row"><Button onClick={()=>{const c=confirmation;setConfirmation(null);void dispatch(c)}}>Yes, continue</Button><Button alt onClick={()=>setConfirmation(null)}>Keep playing</Button></div></Modal>}
    {<div className="world-toolbar"><Button alt onClick={() => setExplore(v => !v)}>{explore ? 'Return to game' : 'Explore clearing'}</Button><Button alt onClick={() => { bus.skipCamera = !bus.skipCamera; }}>Skip camera</Button></div>}
    {state && <EmoteWheel state={state} send={send} busy={busy} />}
    {explore && state?.settings.narrator && <aside className="floating-caption" aria-live="polite"><span aria-hidden="true">◉⌄◉ </span>{state.phase === 'night' && state.narration ? SCRIPT[state.narration.narration_step].text : state.phase === 'vote' ? 'Time is up. Cast your votes.' : state.phase === 'result' ? 'The village has spoken.' : 'Talk it out. Everyone may lie.'}</aside>}
    {explore && state?.phase === 'day' && <><div className="thumbstick" aria-label="Movement thumbstick" role="application" onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={e => { if (!e.currentTarget.hasPointerCapture(e.pointerId)) return; const rect = e.currentTarget.getBoundingClientRect(); bus.stick.x = Math.max(-1, Math.min(1, (e.clientX - rect.left - rect.width / 2) / 40)); bus.stick.z = Math.max(-1, Math.min(1, (e.clientY - rect.top - rect.height / 2) / 40)); }} onPointerUp={() => { bus.stick = { x: 0, z: 0 }; }} onPointerCancel={() => { bus.stick = { x: 0, z: 0 }; }}><span>✥</span></div><button className="btn act-button" onClick={() => { bus.focus = bus.interaction; window.dispatchEvent(new Event('werewolf-act')); }}>Act (E)</button></>}
    <main id="app" className={intro?'cinematic-hidden':explore ? 'exploring' : ''} inert={intro} aria-hidden={intro||undefined}><div className="panel">
      <Guidance state={state} waiting={waiting} sleeping={sleeping}/>
      {connection && <p className="connection" role="status">{connection}</p>}
      {error && <div className="error" role="alert"><p>{error}</p><Button alt onClick={() => setError('')}>Dismiss</Button><Button alt onClick={()=>{void fetch('/api/health').then(r=>r.json()).then(h=>{setError(h.ok?'':h.message);if(h.ok)void resync()}).catch(()=>setError('Still reconnecting. Check your connection and try again.'))}}>Wake it up / Retry</Button></div>}
      {!state&&firstRun&&<section className="tutorial-invite"><p>New to the village? Learn a round in 60 seconds.</p><div className="row"><Button onClick={()=>setTutorial(true)}>Start tutorial</Button><Button alt onClick={()=>{localStorage.setItem('werewolf-tutorial','skipped');setFirstRun(false)}}>Skip tutorial</Button></div></section>}
      {!state ? <><div className="ttl"><h1>One Night<br />Werewolf</h1></div><p>Everyone plays on their own device. One person creates a room, the others join with its code.</p><form onSubmit={e => { e.preventDefault(); void enter(!!code ? false : true); }}><div className="list"><input aria-label="Your name" placeholder="Your name" autoComplete="nickname" maxLength={12} value={name} onChange={e => setName(e.target.value)} /><input aria-label="Room code" placeholder="Room code (to join)" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={4} value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} /></div><div className="row"><Button disabled={busy || !art} onClick={() => void enter(true)}>Create room</Button><Button alt disabled={busy || !art} onClick={() => void enter(false)}>Join room</Button></div></form><div className="row"><Button alt onClick={()=>{setIntro(true)}}>Watch intro</Button></div><p className="entry-foot">3–10 friends · One fire · Trust no one</p></> : <>
        <div className="room-strip"><span>Room <b className="hl">{state.code}</b></span><span>{state.phase === 'lobby' ? 'Gather around' : `Round ${state.round} · ${state.phase}`}</span></div>
        {state.phase === 'lobby' && <p className="active-settings">Narrator {state.settings.narrator ? 'on' : 'off'} · {state.settings.narrationSpeed === .7 ? 'Fast' : state.settings.narrationSpeed === 1.4 ? 'Slow' : 'Normal'} · Chat {state.settings.textChat} · Filter {state.settings.profanityFilter ? 'on' : 'off'}</p>}
        {['lobby', 'day'].includes(state.phase) && state.settings.discord && <a className="btn alt discord-link" href={state.settings.discord} target="_blank" rel="noopener noreferrer">Join voice on Discord</a>}
        <Narrator state={state} preferences={voice} duck={duck} send={send} busy={busy} />
        {state.phase === 'lobby' ? <><p>Room code</p><div className="clock room-code">{state.code}</div><p>Friends open this page and join with that code. 3 to 10 players.</p><div className="row"><Button alt onClick={() => { void navigator.clipboard.writeText(window.location.href).then(() => { setConnection('Invite link copied!'); setTimeout(() => setConnection(''), 2000); }).catch(() => setError('Share the address in your browser to invite friends.')); }}>Copy invite link</Button></div><div className="ring lobby-ring">{activePlayers.map(p => <div key={p.id} className="slot"><Card role="villager" /><b>{p.name}{p.id === state.host ? ' (host)' : ''}</b><small>{p.id === state.me ? 'you' : p.connected ? 'by the fire' : 'disconnected'}</small></div>)}</div>{host ? <div className="row"><Button disabled={busy || activePlayers.length < 3 || activePlayers.length > 10} onClick={() => void send({ type: 'deal' })}>Deal the cards</Button></div> : <p className="hl">Waiting for the host to deal.</p>}<p>{activePlayers.length}/10 around the fire</p></> : !state.private ? state.phase === 'result' && state.reveal ? <Results state={state} send={send} busy={busy}/> : <><h2>Round in progress</h2><p>Round in progress, join the next game</p><p>You’ll be included when the host deals again.</p>{host && state.phase === 'result' && <div className="row"><Button disabled={busy} onClick={() => void send({ type: 'deal' })}>Play again</Button></div>}</> : <>
          {state.phase === 'night' && !waiting && !sleeping && <Night key={`${state.round}-${state.narration?.narration_step}`} state={state} send={send} busy={busy} />}
          {state.phase === 'night' && sleeping && <div className="eyes-closed" data-testid="eyes-closed"><div aria-hidden="true">— ◡ —</div><h2>Eyes closed</h2><p>Listen to the night owl. Your village sleeps.</p></div>}
          {((state.phase === 'night' || state.phase === 'dawn' || state.phase === 'vote') && waiting && !sleeping) && <><h2>{state.phase === 'night' ? 'Night falls' : state.phase === 'dawn' ? 'Dawn is near' : 'The votes are in'}</h2><p className="hl">{state.skipped.includes(state.me) ? 'The host skipped your remaining steps this round.' : 'Your choice is locked in.'}</p><p>{state.narration?.active ? 'Close your eyes. The narrator keeps the same pace for every village.' : 'Waiting for ' + (pending.map(playerName).join(', ') || 'everyone') + '.'}</p><div className="embers" aria-hidden="true">✦ · ✦</div></>}
          {state.phase === 'dawn' && !waiting && <><h2>Night report</h2><Reports reports={state.private.report} /><div className="row"><Button disabled={busy} onClick={() => void send({ type: 'ready' })}>I’m ready</Button></div></>}
          {state.phase === 'day' && <><h2>Dawn breaks</h2><p>Talk it out, out loud or on a call. Everyone may lie.</p><div className="clock" aria-label="Time remaining" role="timer">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</div><details><summary>Remind me what I learned</summary><Reports reports={state.private.report} /></details>{host ? <div className="row"><Button alt disabled={busy || seconds === 0} onClick={() => void send({ type: 'extend' })}>+1 min</Button><Button disabled={busy} onClick={() => void send({ type: 'callVote' })}>Call the vote</Button></div> : <p>The host can call the vote early.</p>}{seconds === 0 && <p>Gathering the votes…</p>}</>}
          {state.phase === 'vote' && !waiting && <><h2>Who is a werewolf?</h2><p>{VOTE_HELP}</p><p>You can’t vote for yourself.</p><p>{state.finished.length} of {state.order.length} voted · choices stay secret.</p>{state.private.vote&&<p className="hl">Your saved vote: {playerName(state.private.vote)}.</p>}{state.preferences.editableVoting&&<><p>Change your pick until the host or voting clock locks it.</p><p>{Math.max(0,Math.ceil(((state.voteEnd||0)-clock-offset.current)/1000))} seconds left.</p>{host&&<Button disabled={busy} onClick={()=>send({type:'lockVote'})}>Lock voting</Button>}</>}<Picker key={`vote-${state.round}`} options={state.players.filter(p => state.order.includes(p.id) && p.id !== state.me).map(p => ({ id: p.id, label: p.name }))} count={1} busy={busy} submit={ids => void send({ type: 'vote', target: ids[0] })} /></>}
          {state.phase === 'result' && <Results key={state.round} state={state} send={send} busy={busy} />}
        </>}
        {host && <details className="management"><summary>Manage the fire</summary>{state.players.filter(p => p.id !== state.me && !p.left).map(p => <div className="manage-row" key={p.id}><span>{p.name}{!p.connected ? ' · disconnected' : ''}</span><div className="row">{state.order.includes(p.id) && ['night', 'dawn', 'vote'].includes(state.phase) && !state.skipped.includes(p.id) && <Button alt disabled={busy} onClick={() => void send({ type: 'skip', target: p.id })}>Skip</Button>}<Button alt disabled={busy} onClick={() => void send({ type: 'transfer', target: p.id })}>Make host</Button><Button alt disabled={busy} onClick={() => void send({ type: 'kick', target: p.id })}>Kick</Button></div></div>)}<p>Skip fills remaining steps with no night action and a vote for the first other player. You can skip anyone who has left or stopped choosing.</p></details>}
      </>}
      {state?.phase==='night'&&state.private?.undoUntil&&state.private.undoUntil>clock+offset.current&&<div className="undo-window"><p>Undo your night pick for {Math.ceil((state.private.undoUntil-clock-offset.current)/1000)} more seconds.</p><Button alt disabled={busy} onClick={()=>send({type:'undoNight'})}>Undo night pick</Button></div>}
      <Roster state={state}/>
      {state&&<><Achievements state={state}/><Recovery state={state} send={send} busy={busy}/><DayHelpers key={`${state.code}-${state.round}`} state={state} send={send} busy={busy}/><PlaySettings key={`${state.code}-${state.round}-${state.phase==='result'}`} state={state} send={send} busy={busy}/><Social state={state} send={send} busy={busy} muted={muted} setMuted={setMuted} bus={bus}/></>}
      <ComfortSettings bus={bus} onEffects={onEffects} replay={()=>setTutorial(true)}/>
      <ExperienceSettings key={`${state?.code}-${state?.round}-${state?.phase === 'result'}`} state={state} send={send} busy={busy} voice={voice} setVoice={setVoice} />
      <Settings key={`${state?.code}-${state?.phase === 'result' ? state.round : 0}`} state={state} send={send} busy={busy} volume={volume} setVolume={volumeChange} />
      {state && <div className="row exit-row"><Button alt disabled={busy} onClick={() => void send({ type: 'leave' })}>Leave room</Button></div>}
    </div></main>
  </ArtContext.Provider>;
}

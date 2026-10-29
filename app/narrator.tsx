'use client';
import { useEffect, useRef, useState } from 'react';
import type { Snapshot } from '@/lib/engine';
import { SCRIPT, duration, narratorProgress } from '@/lib/narration';
import type { Send } from '@/lib/commands';
export type VoicePreferences = { voice: string; volume: number; captionsOnly: boolean };
export const DEFAULT_VOICE: VoicePreferences = { voice: '', volume: .8, captionsOnly: false };
export function Narrator({ state, preferences, duck, send, busy }: { state: Snapshot; preferences: VoicePreferences; duck: (v: number) => void; send: Send; busy: boolean }) {
  const [now, setNow] = useState(state.serverNow); const [files, setFiles] = useState<string[] | null>(null);
  const offset = useRef(state.serverNow - Date.now());
  useEffect(() => { offset.current = state.serverNow - Date.now(); }, [state.serverNow]);
  useEffect(() => { if (!state.settings.narrator) return; const t = setInterval(() => setNow(Date.now() + offset.current), 100); void fetch('/api/narrator').then(r => r.json()).then(d => setFiles(d.files)).catch(() => setFiles([])); return () => clearInterval(t); }, [state.settings.narrator]);
  const n = state.narration; const seconds = Math.ceil(((state.dayEnd || 0) - now) / 1000);
  const id = state.phase === 'night' && n ? SCRIPT[n.narration_step].id : state.phase === 'day' ? seconds <= 60 ? 'minute' : 'day' : state.phase === 'vote' ? 'vote' : state.phase === 'result' ? 'result' : state.phase === 'dawn' ? 'dawn' : '';
  const text = state.phase === 'night' && n ? SCRIPT[n.narration_step].text : id === 'day' ? state.daySeconds === 300 ? 'Five minutes on the clock. Talk it out.' : 'Discussion is open. Talk it out.' : id === 'minute' ? 'One minute left.' : id === 'vote' ? 'Time is up. Cast your votes.' : id === 'result' ? 'The village has spoken.' : id === 'dawn' ? SCRIPT[9].text : '';
  const paused = n?.active && n.paused_at !== null;
  const started = state.phase === 'night' && n ? n.step_started_at : 0;
  const speed = n?.speed || state.settings.narrationSpeed;
  const utteranceKey = `${state.round}:${id}`;
  const windowSeconds = n ? duration(n.narration_step, speed) / 1000 : 8;
  const spoken = useRef('');
  useEffect(() => {
    if (!state.settings.narrator || !text || files === null || preferences.captionsOnly || paused) return;
    if (spoken.current === utteranceKey) return;
    spoken.current = utteranceKey;
    const elapsed = started ? Math.max(0, (Date.now() + offset.current - started) / 1000) : 0;
    let audio: HTMLAudioElement | null = null; let ended = false;
    const finish = () => { if (!ended) { ended = true; duck(1); } };
    const speak = () => {
      if (!('speechSynthesis' in window)) { finish(); return; }
      const words = text.split(' ');
      const start = started ? Math.min(words.length - 1, Math.floor(elapsed / windowSeconds * words.length)) : 0;
      const utterance = new SpeechSynthesisUtterance(words.slice(start).join(' '));
      const voices = speechSynthesis.getVoices();
      utterance.voice = voices.find(v => v.voiceURI === preferences.voice) || voices.find(v => /david|daniel|george|male/i.test(v.name)) || voices.find(v => v.lang.startsWith('en')) || null;
      utterance.pitch = .65; utterance.rate = .85 / speed; utterance.volume = preferences.volume;
      utterance.onend = finish; utterance.onerror = finish; speechSynthesis.cancel(); speechSynthesis.speak(utterance);
    };
    duck(.25);
    if (files.includes(id)) {
      audio = new Audio(`/narrator/${id}.mp3`); audio.volume = preferences.volume; audio.playbackRate = 1 / speed;
      audio.onloadedmetadata = () => { if (audio && Number.isFinite(audio.duration)) audio.currentTime = Math.min(elapsed / speed, Math.max(0, audio.duration - .05)); };
      audio.onended = finish; audio.onerror = speak; void audio.play().catch(speak);
    } else speak();
    const safety = setTimeout(finish, 30000 * speed);
    return () => { clearTimeout(safety); audio?.pause(); if ('speechSynthesis' in window) speechSynthesis.cancel(); finish(); spoken.current = ''; };
  }, [utteranceKey, id, text, files, preferences, paused, speed, started, duck, state.settings.narrator, windowSeconds]);
  if (!state.settings.narrator || !text) return null;
  const progress = state.phase === 'night' && n ? narratorProgress(n, now) : 0;
  return <aside className="narrator-banner" aria-label="Automatic narrator"><div className="narrator-heading"><span aria-hidden="true">◉⌄◉</span> The night owl <span className={`sound-wave ${paused ? 'paused' : ''}`} aria-hidden="true">▁▃▆▃▁</span></div><p role="status" aria-live="polite">{text}</p>{state.phase === 'night' && n && <><div className="narrator-progress" role="progressbar" aria-label="Narration window" aria-valuenow={Math.round(progress * 100)}><span style={{ width: `${progress * 100}%` }} /></div><small>{paused ? 'Paused' : `${Math.max(0, Math.ceil(duration(n.narration_step, n.speed) * (1 - progress) / 1000))}s`}</small></>}
    {state.host === state.me && state.phase === 'night' && n?.active && <div className="row"><button className="btn alt" disabled={busy} onClick={() => send({ type: 'narratorControl', control: paused ? 'resume' : 'pause' })}>{paused ? 'Resume narrator' : 'Pause narrator'}</button><label>Speed <select aria-label="Narration speed" value={speed} disabled={busy} onChange={e => send({ type: 'narratorControl', control: 'speed', speed: Number(e.target.value) as .7 | 1 | 1.4 })}><option value="0.7">Fast</option><option value="1">Normal</option><option value="1.4">Slow</option></select></label></div>}
  </aside>;
}

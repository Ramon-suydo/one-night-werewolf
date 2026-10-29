'use client';
import { useEffect, useRef } from 'react';
export function NatureSounds({ phase, enabled, step,volume=.5 }: { phase: string; enabled: boolean; step: number;volume?:number }) {
  const audio = useRef<AudioContext | null>(null); const gain = useRef<GainNode | null>(null); const current = useRef({ phase, enabled, step,volume });
  useEffect(() => { current.current = { phase, enabled, step,volume }; if (gain.current && audio.current) gain.current.gain.setTargetAtTime(enabled ? .08*volume : 0, audio.current.currentTime, .3); }, [phase, enabled, step,volume]);
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>; let lastPhase = ''; let lastStep = -1;
    const tone = (frequency: number, end: number, seconds: number, type: OscillatorType = 'sine', delay = 0) => {
      const c = audio.current, master = gain.current; if (!c || !master) return;
      const at = c.currentTime + delay; const oscillator = c.createOscillator(), envelope = c.createGain();
      oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, at); oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, end), at + seconds);
      envelope.gain.setValueAtTime(.0001, at); envelope.gain.linearRampToValueAtTime(.25, at + .04); envelope.gain.exponentialRampToValueAtTime(.0001, at + seconds);
      oscillator.connect(envelope); envelope.connect(master); oscillator.start(at); oscillator.stop(at + seconds + .05);
    };
    const start = () => {
      if (audio.current) return;
      try { const c = new AudioContext(); audio.current = c; const g = c.createGain(); gain.current = g; g.gain.value = current.current.enabled ? .08*current.current.volume : 0; g.connect(c.destination); }
      catch { return; }
      interval = setInterval(() => {
        const value = current.current; if (!value.enabled) return;
        const day = ['day', 'dawn', 'vote', 'result'].includes(value.phase);
        if (!day && Math.random() < .35) { tone(3400, 3900, .08, 'sine'); tone(3400, 3900, .08, 'sine', .13); }
        if (!day && Math.random() < .025) { tone(220, 170, .7); tone(200, 150, .5, 'sine', .8); }
        if (day && Math.random() < .3) { tone(1400, 2300, .12); tone(2100, 1600, .15, 'sine', .2); }
        if(value.phase==='day'&&Math.random()<.35)tone(90+Math.random()*30,80,.3,'triangle');
        if(Math.random()<.5)tone(700+Math.random()*700,180,.025,'sawtooth');
        if (value.phase === 'night' && (lastPhase !== 'night' || lastStep !== value.step && value.step === 1)) { tone(160, 360, 2.5); tone(240, 180, 1.8, 'triangle', 1.8); }
        if (value.phase === 'dawn' && lastPhase !== 'dawn') { [0, .3, .6, 1].forEach((delay, i) => tone(550 + i * 80, 720 - i * 40, .35, 'triangle', delay)); }
        lastPhase = value.phase; lastStep = value.step;
      }, 1100);
    };
    window.addEventListener('pointerdown', start, { once: true });
    return () => { window.removeEventListener('pointerdown', start); clearInterval(interval); void audio.current?.close(); audio.current = null; };
  }, []);
  return null;
}

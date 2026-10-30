'use client';

import { memo, Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as T from 'three';
import {eyesOpen} from '@/lib/avatar-state';
import {AvatarDebug,AvatarOverlay} from './avatar-debug';
import {appearanceToMaterials,normalizeAppearance,HAT_IDS,FACE_IDS,DEFAULT_APPEARANCE} from '@/assets/appearance';
import type {SceneState} from '@/lib/scene';
import { seat,makeMotion,type MotionBus } from '@/lib/motion';
import type {Card} from '@/engine';
import {Card3D} from '@/components/Card3D';
import {TitleWolf} from './title-wolf';
import {WorldLandmarks} from './world-landmarks';
import {nearestLandmark} from '@/lib/landmarks';
import { NIGHT,MOODS } from '@/lib/theme.mjs';
import { RULES } from '@/lib/rules';
import { introCamera } from '@/lib/vfx';
import {WorldVFX} from './world-vfx';
import {VoteStones} from './vote-stones';
import {banishAt} from '@/lib/result-timeline';
import {detectGPU,QUALITY,TIERS,type QualityTier} from '@/lib/quality';

// Port of One Night Werewolf 3D.html: same primitive proportions, palette,
// altar, 5-sided faceted mountains/pines, 50-degree camera and low-res renderer.
const COLORS = { night: NIGHT.ink, dawn: '#e8a07a', ground: '#1f2a2e', clearing: '#3a2a22', snow: NIGHT.ice, pine: '#0e3a34', fire: NIGHT.fire, gold: NIGHT.gold };

type Props = { calm?:boolean;battery?:boolean;view: SceneState | null; bus: MotionBus; onFallback: () => void;onReady?:()=>void; muted: string[];faces?:Record<string,Card> };
const random = (i: number) => { const n = Math.sin(i * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
function Material({ color, glow = false }: { color: string; glow?: boolean }) {
  return glow ? <meshBasicMaterial color={color} /> : <meshLambertMaterial color={color} flatShading />;
}
function RenderLoop({fps,reduced}:{fps:number;reduced:boolean}){
 const invalidate=useThree(s=>s.invalidate);
 useEffect(()=>{let stopped=false,frame=0,last=0,activeUntil=0;const active=()=>{activeUntil=performance.now()+1000;invalidate()};const loop=(time:number)=>{if(stopped)return;const cap=reduced&&time>activeUntil?2:fps;if(!document.hidden&&time-last>=1000/cap){invalidate();last=time}frame=requestAnimationFrame(loop)};frame=requestAnimationFrame(loop);window.addEventListener('keydown',active);window.addEventListener('pointerdown',active);return()=>{stopped=true;cancelAnimationFrame(frame);window.removeEventListener('keydown',active);window.removeEventListener('pointerdown',active)}},[fps,reduced,invalidate]);return null;
}
function Box({ p, size, color, glow = false, rotation }: { p: [number, number, number]; size: [number, number, number]; color: string; glow?: boolean; rotation?: [number, number, number] }) {
  return <mesh position={p} rotation={rotation} castShadow={!glow} receiveShadow><boxGeometry args={size} /><Material color={color} glow={glow} /></mesh>;
}
class Boundary extends Component<{ children: ReactNode; fallback: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.fallback(); }
  render() { return this.state.failed ? null : this.props.children; }
}
function Vegetation({ low, reduced }: { low: boolean; reduced: boolean }) {
  const trees = useRef<T.InstancedMesh>(null); const trunks = useRef<T.InstancedMesh>(null); const grass = useRef<T.InstancedMesh>(null);
  const dummy = useMemo(() => new T.Object3D(), []);
  const count = low ? 100 : 280;
  useEffect(() => {
    for (let i = 0; i < 46; i++) {
      const a = random(i) * Math.PI * 2, d = 16 + random(i + 90) * 22, s = .8 + random(i + 200) * .8;
      dummy.position.set(Math.sin(a) * d, .6, Math.cos(a) * d); dummy.scale.set(s, 1, s); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); trunks.current?.setMatrixAt(i, dummy.matrix);
    }
    if (trunks.current) trunks.current.instanceMatrix.needsUpdate = true;
  }, [dummy]);
  useFrame(({ clock }) => {
    const time = reduced ? 0 : clock.elapsedTime;
    for (let i = 0; i < 46; i++) {
      const a = random(i) * Math.PI * 2, d = 16 + random(i + 90) * 22, s = .8 + random(i + 200) * .8;
      for (let k = 0; k < 3; k++) {
        dummy.position.set(Math.sin(a) * d, (2 + k * 1.3) * s, Math.cos(a) * d);
        dummy.scale.set((2.2 - k * .55) * s, 2.4 * s, (2.2 - k * .55) * s);
        dummy.rotation.set(Math.sin(time * .7 + i) * .018, i, Math.cos(time * .5 + i) * .015); dummy.updateMatrix(); trees.current?.setMatrixAt(i * 3 + k, dummy.matrix);
      }
    }
    for (let i = 0; i < count; i++) {
      const a = random(i + 600) * Math.PI * 2, d = 7.5 + random(i + 800) * 26;
      dummy.position.set(Math.sin(a) * d, .15, Math.cos(a) * d); dummy.scale.set(.12, .4 + random(i) * .4, .12);
      dummy.rotation.set(0, a, Math.sin(time * 1.8 + i) * .12); dummy.updateMatrix(); grass.current?.setMatrixAt(i, dummy.matrix);
    }
    for (const mesh of [trees.current, grass.current]) if (mesh) mesh.instanceMatrix.needsUpdate = true;
  });
  return <><instancedMesh ref={trees} args={[undefined, undefined, 138]}><coneGeometry args={[1, 1, 5]} /><meshLambertMaterial color="#0e3a34" flatShading /></instancedMesh><instancedMesh ref={trunks} args={[undefined, undefined, 46]}><cylinderGeometry args={[.25, .3, 1.2, 5]} /><meshLambertMaterial color="#3a2418" flatShading /></instancedMesh><instancedMesh ref={grass} args={[undefined, undefined, count]}><coneGeometry args={[1, 1, 3]} /><meshLambertMaterial color="#4f7953" flatShading side={T.DoubleSide} /></instancedMesh></>;
}
function Mountains() {
  const bases = useRef<T.InstancedMesh>(null), caps = useRef<T.InstancedMesh>(null);
  useEffect(() => {
    const dummy = new T.Object3D();
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * 6.283 + random(i) * .3, d = 44 + random(i + 20) * 10, h = 14 + random(i + 40) * 16, r = 7 + random(i + 60) * 5;
      dummy.position.set(Math.sin(a) * d, h / 2, Math.cos(a) * d); dummy.rotation.set(0, random(i) * 3, 0); dummy.scale.set(r, h, r); dummy.updateMatrix(); bases.current?.setMatrixAt(i, dummy.matrix); bases.current?.setColorAt(i, new T.Color(i % 2 ? '#33286a' : '#2c2058'));
      dummy.position.y = h * .88; dummy.scale.set(r * .32, h * .3, r * .32); dummy.updateMatrix(); caps.current?.setMatrixAt(i, dummy.matrix);
    }
    for (const m of [bases.current, caps.current]) if (m) m.instanceMatrix.needsUpdate = true;
    if (bases.current?.instanceColor) bases.current.instanceColor.needsUpdate = true;
  }, []);
  return <><instancedMesh ref={bases} args={[undefined, undefined, 16]}><coneGeometry args={[1, 1, 5]} /><meshLambertMaterial flatShading /></instancedMesh><instancedMesh ref={caps} args={[undefined, undefined, 16]}><coneGeometry args={[1, 1, 5]} /><Material color={COLORS.snow} /></instancedMesh></>;
}
function Particles({ low, reduced, day, winning }: { low: boolean; reduced: boolean; day: React.RefObject<number>; winning: boolean }) {
  const mesh = useRef<T.Points>(null); const smoke = useRef<T.Points>(null); const fireflies = useRef<T.Points>(null);
  const count = low ? 18 : 60;
  const embers = useMemo(() => new Float32Array(count * 3), [count]);
  const mist = useMemo(() => new Float32Array(36 * 3), []); const insects = useMemo(() => new Float32Array(30 * 3), []);
  useFrame(({ clock }) => {
    if (reduced) return; const t = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const h = (t * (winning ? 1.3 : .7) + random(i) * 5) % 5;
      embers[i * 3] = Math.sin(t + i * 2) * (winning ? 7 : .5 + h * .2); embers[i * 3 + 1] = h + .6; embers[i * 3 + 2] = Math.cos(t * .6 + i) * (winning ? 7 : .5);
    }
    for (let i = 0; i < 36; i++) { mist[i * 3] = Math.sin(t * .05 + i) * 19; mist[i * 3 + 1] = .3 + random(i) * .5; mist[i * 3 + 2] = Math.cos(i * 9 + t * .03) * 19; }
    for (let i = 0; i < 30; i++) { insects[i * 3] = Math.sin(i * 4 + t * .1) * 14; insects[i * 3 + 1] = 1 + Math.sin(t + i) * .4 + random(i) * 2; insects[i * 3 + 2] = Math.cos(i * 2 + t * .12) * 14; }
    for (const m of [mesh.current, smoke.current, fireflies.current]) if (m) m.geometry.attributes.position.needsUpdate = true;
    if (fireflies.current) (fireflies.current.material as T.PointsMaterial).opacity = 1 - day.current;
  });
  if (reduced) return null;
  return <><points ref={mesh}><bufferGeometry><bufferAttribute attach="attributes-position" args={[embers, 3]} /></bufferGeometry><pointsMaterial color={winning ? '#ffd35a' : '#ff8a3c'} size={.09} sizeAttenuation transparent opacity={.8} /></points><points ref={smoke}><bufferGeometry><bufferAttribute attach="attributes-position" args={[mist, 3]} /></bufferGeometry><pointsMaterial color="#8a8fa8" size={low ? 1 : 2.5} sizeAttenuation transparent opacity={.045} depthWrite={false} /></points><points ref={fireflies}><bufferGeometry><bufferAttribute attach="attributes-position" args={[insects, 3]} /></bufferGeometry><pointsMaterial color="#d9e68a" size={.07} transparent /></points></>;
}
function Fire({ low, reduced }: { low: boolean; reduced: boolean }) {
  const flames = useRef<T.Group>(null); const light = useRef<T.PointLight>(null); const smoke = useRef<T.Mesh>(null);
  useFrame(({ clock }) => {
    const t = reduced ? 0 : clock.elapsedTime;
    // Modern Three uses physically correct point-light units (r128 used legacy units).
    if (light.current) light.current.intensity = 5.7 + Math.sin(t * 23) * .9;
    flames.current?.children.forEach((f, i) => { f.scale.set(1 + Math.sin(t * 9 + i) * .12, .85 + (Math.sin(Math.floor(t * 12) * 7 + i) + 1) * .2, 1); f.rotation.y = t * 2; });
    if (smoke.current) smoke.current.position.y = 3 + t % 3;
  });
  return <><pointLight ref={light} position={[0, 1.6, 0]} color="#ff8a3c" intensity={5.7} distance={24} decay={1} castShadow={!low} shadow-mapSize={[512, 512]} shadow-bias={-.005} /><group ref={flames}>{[['#d6455d', .55, 1.8], [COLORS.fire, .4, 1.5], ['#ffd35a', .25, 1.1]].map(([color, radius, height], i) => <mesh key={i} position={[i * .05, Number(height) / 2 + .2, i * .16]}><coneGeometry args={[Number(radius), Number(height), 5]} /><meshBasicMaterial color={String(color)} /></mesh>)}</group>{[0, 1, 2].map(i => <Box key={i} p={[0, .2, 0]} rotation={[0, i * 1.05, 0]} size={[2, .3, .35]} color="#5a3a24" />)}{Array.from({ length: 12 }, (_, i) => <mesh key={i} position={[Math.sin(i / 12 * Math.PI * 2) * 1.2, .12, Math.cos(i / 12 * Math.PI * 2) * 1.2]} rotation={[i, i * 3, 0]}><dodecahedronGeometry args={[.23, 0]} /><Material color="#55506a" /></mesh>)}<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .04, 0]}><circleGeometry args={[3.8, 16]} /><meshBasicMaterial color="#ff8a3c" transparent opacity={.07} depthWrite={false} /></mesh>{!reduced && !low && <mesh ref={smoke} position={[0, 3, 0]}><icosahedronGeometry args={[.65, 0]} /><meshBasicMaterial color="#8a8fa8" transparent opacity={.07} depthWrite={false} /></mesh>}</>;
}
function Landmarks({ day, reduced }: { day: React.RefObject<number>; reduced: boolean }) {
  const pond = useRef<T.Mesh>(null); const owlEyes = useRef<T.Group>(null); const bat = useRef<T.Group>(null); const flowers = useRef<T.Group>(null);
  useFrame(({ clock }) => {
    const t = reduced ? 0 : clock.elapsedTime;
    if (pond.current) { pond.current.scale.setScalar(1 + Math.sin(t * 1.5) * .025); (pond.current.material as T.MeshBasicMaterial).opacity = .15 + .08 * Math.sin(t); }
    if (owlEyes.current) owlEyes.current.scale.y = t % 5 > 4.8 ? .1 : 1;
    if (bat.current) { bat.current.position.set(Math.sin(t * .15) * 28, 17 + Math.sin(t) * .6, -24); bat.current.visible = t % 30 < 6 && day.current < .5 && !reduced; bat.current.rotation.z = Math.sin(t * 10) * .2; }
    if (flowers.current) flowers.current.scale.setScalar(.3 + .7 * day.current);
  });
  return <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[8, .04, -6]}><circleGeometry args={[3.8, 12]} /><meshLambertMaterial color="#2f4a7a" flatShading /></mesh><mesh ref={pond} rotation={[-Math.PI / 2, 0, 0]} position={[8, .06, -6]}><ringGeometry args={[1.3, 1.4, 16]} /><meshBasicMaterial color="#e8e4ff" transparent opacity={.25} /></mesh><mesh rotation={[-Math.PI / 2, 0, 0]} position={[8, .07, -6]}><circleGeometry args={[.6, 8]} /><meshBasicMaterial color="#e8e4ff" transparent opacity={.5} /></mesh>
    <group position={[-8, 0, -9]}><Box p={[0, 1.5, 0]} size={[4, 3, 3]} color="#5a3a24" /><mesh position={[0, 3.6, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[3.2, 2, 4]} /><Material color="#7a2f3f" /></mesh><Box p={[.7, 1.7, 1.52]} size={[1, .9, .05]} color="#ffd35a" glow /><Box p={[-.9, 1, 1.52]} size={[.8, 2, .08]} color="#3a2418" /><pointLight position={[.7, 1.7, 2]} color="#ffd35a" intensity={.5} distance={6} /></group>
    {[-1, 1].map(i => <group key={i} position={[i * 8, 0, 2]}><Box p={[0, 1.6, 0]} size={[.15, 3.2, .15]} color="#5a3a24" /><Box p={[0, 3, 0]} size={[.45, .6, .45]} color="#ffd35a" glow /><pointLight color="#ffb96a" position={[0, 3, 0]} intensity={.35} distance={7} /><mesh position={[0, 3, 0]}><sphereGeometry args={[.65, 6, 4]} /><meshBasicMaterial color="#ffd35a" transparent opacity={.05} /></mesh></group>)}
    {[-1, 0, 1].map((i, j) => <group key={i} position={[i * 3, 0, -10 - j % 2]}><mesh position={[0, 1, 0]} scale={[.8, 1.7, .5]} rotation={[0, j, .1]}><dodecahedronGeometry args={[.7, 0]} /><Material color="#55506a" /></mesh><Box p={[0, 1, .4]} size={[.08, .5, .04]} color="#7b4fbf" glow /><Box p={[0, 1.1, .4]} rotation={[0, 0, .6]} size={[.4, .06, .04]} color="#7b4fbf" glow /></group>)}
    <group position={[8, 0, 9]} rotation={[0, .5, .15]}><Box p={[0, .3, 0]} size={[4, .6, .65]} color="#5a3a24" /></group>
    {[0, 1, 2, 3].map(i => <group key={i} position={[-8 + i * .4, 0, 7 + i % 2 * .6]}><Box p={[0, .15, 0]} size={[.1, .3, .1]} color="#f0b98d" /><mesh position={[0, .35, 0]}><sphereGeometry args={[.25, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshBasicMaterial color={i % 2 ? '#7b4fbf' : '#d6455d'} /></mesh></group>)}
    <group ref={flowers} position={[7, .05, -2]}>{[0, 1, 2, 3, 4, 5].map(i => <mesh key={i} position={[i * .4, .3, Math.sin(i)]}><icosahedronGeometry args={[.16, 0]} /><Material color={i % 2 ? '#f4efe0' : '#d6455d'} /></mesh>)}</group>
    <group position={[-9, 3.8, -7]}><Box p={[0, -.6, 0]} size={[3, .2, .2]} color="#5a3a24" /><mesh><icosahedronGeometry args={[.4, 0]} /><Material color="#8a5a3c" /></mesh><group ref={owlEyes}>{[-.15, .15].map(x => <Box key={x} p={[x, .05, .32]} size={[.12, .13, .06]} color="#ffd35a" glow />)}</group></group>
    <group ref={bat}><mesh scale={[1, .2, .3]} rotation={[0, 0, .2]}><octahedronGeometry args={[1, 0]} /><Material color="#1a1226" /></mesh></group>
  </>;
}
function Character({ player, index, count, view, bus, reduced, elapsed }: { player: NonNullable<SceneState>['players'][number]; index: number; count: number; view: SceneState; bus: MotionBus; reduced: boolean; elapsed: React.RefObject<number> }) {
  const root = useRef<T.Group>(null); const body = useRef<T.Mesh>(null); const head = useRef<T.Group>(null); const left = useRef<T.Group>(null); const right = useRef<T.Group>(null); const arms = useRef<T.Group>(null); const cape = useRef<T.Mesh>(null); const dust = useRef<T.Mesh>(null);
  const lastStepSound=useRef(0);
  const arrived=useRef(performance.now());
  const home = useMemo(() => seat(index, count), [index, count]); const materials=appearanceToMaterials(player.appearance);const color=materials.cloak;const selected=useRef<T.Mesh>(null);const scratch=useMemo(()=>new T.Vector3(),[]);const previous=useMemo(()=>new T.Vector3(),[]);
  useEffect(() => { if (root.current) root.current.position.set(...home); if (player.id === view.me) { bus.local.x = home[0]; bus.local.z = home[2]; } }, [view.phase, view.round, home, player.id, view.me, bus]);
  useFrame(({ clock, camera }, dt) => {
    const g = root.current; if (!g) return; const t = reduced ? 0 : clock.elapsedTime; previous.copy(g.position);
    if (['day','lobby','vote'].includes(view.phase)) {
      if (player.id === view.me) { g.position.x = bus.local.x; g.position.z = bus.local.z; }
      else { const pos = bus.remote.get(player.id); if (pos) g.position.lerp(scratch.set(pos.x, 0, pos.z), 1 - Math.exp(-dt * 12)); }
    } else g.position.lerp(scratch.set(...home), 1 - Math.exp(-dt * 10));
    if(view.phase==='lobby'&&!reduced&&performance.now()-arrived.current<1400){const p=Math.min(1,(performance.now()-arrived.current)/1400),distance=1+2*(1-p)*(1-p);g.position.set(home[0]*distance,0,home[2]*distance)}
    const dx = g.position.x - previous.x, dz = g.position.z - previous.z; const moving = Math.hypot(dx, dz) > .001;if(moving&&player.id===view.me&&Date.now()-lastStepSound.current>350){lastStepSound.current=Date.now();window.dispatchEvent(new CustomEvent('werewolf-sfx',{detail:{name:'step',pan:Math.max(-1,Math.min(1,g.position.x/13))}}))}
    if(selected.current){selected.current.visible=!!bus.awake&&view.phase==='night'&&!!bus.nightTargets?.includes(player.id)&&(bus.hovered===player.id||bus.selected.includes(player.id))}const sleep=!eyesOpen(view.phase,player.id,view.me,view.awake,view.teammates,player.connected);const stance=sleep?.72:view.phase==='lobby'&&!player.ready?.78:1;
    if(moving||view.phase!=='day'){const facing=moving?Math.atan2(dx,dz):Math.atan2(-g.position.x,-g.position.z);const turn=Math.atan2(Math.sin(facing-g.rotation.y),Math.cos(facing-g.rotation.y));g.rotation.y+=turn*(reduced?1:1-Math.exp(-dt*12));}
    if (body.current) body.current.position.y = T.MathUtils.damp(body.current.position.y,stance + Math.sin(t * (moving ? 12 : 2) + index) * .025,12,dt);
    if (head.current) { head.current.position.y = T.MathUtils.damp(head.current.position.y,stance+.8,12,dt); head.current.rotation.x = sleep ? .2 + Math.sin(t + index) * .04 : Math.sin(t * .7 + index) * .04; }
    if (cape.current) cape.current.rotation.x = moving ? Math.sin(t * 12) * .15 : .04;
    if (left.current && right.current) { left.current.rotation.x = moving && !reduced ? Math.sin(t * 12) * .7 : sleep ? -1.1 : 0; right.current.rotation.x = -left.current.rotation.x; }
    const emote = view.emotes.find(e => e.player === player.id);
    const role = view.reveal?.effective[index]; const victorious = view.reveal?.winningPlayers.includes(player.id);
    if (arms.current) {const age=emote?(Date.now()-emote.at)/1000:9;arms.current.rotation.z = emote?.kind === 'wave' || victorious ? Math.sin(t * 7) * .5 : emote?.kind==='who me'?.3:0; arms.current.rotation.x = emote?.kind==='slam'?-Math.max(0,1-age)*1.6:emote?.kind==='facepalm'?-1.5:emote?.kind==='thumbs up'?-.9:emote?.kind==='point'||emote?.kind==='accuse'||role==='hunter'&&victorious?-1.2:moving?Math.sin(t*12)*.4:0;arms.current.scale.x=emote?.kind==='shrug'?1.3:1;if(emote?.target&&['point','accuse'].includes(emote.kind)){const at=seat(Math.max(0,view.players.findIndex(p=>p.id===emote.target)),view.players.length);g.rotation.y=Math.atan2(at[0]-g.position.x,at[2]-g.position.z)}if(body.current&&emote?.kind==='laugh')body.current.position.y+=Math.abs(Math.sin(t*10))*.08;if(head.current&&emote?.kind==='gasp')head.current.position.y+=.12;}
    const dead = view.reveal?.banished.includes(player.id) && (reduced || elapsed.current > banishAt(view.players.length)+(view.reveal?.hunted.includes(player.id)?(view.reveal.hunted.indexOf(player.id)+1)*.8:0));
    g.rotation.z = T.MathUtils.damp(g.rotation.z, dead ? Math.PI / 2 : victorious && role === 'wolf' ? Math.sin(t * 5) * .1 : 0, 7, dt);
    if (dust.current) { dust.current.visible = moving && !reduced; dust.current.scale.setScalar(.5 + (t * 3) % 1); }
    const tag = document.getElementById('tag-' + player.id);
    if (tag) { const pos = scratch.set(g.position.x, 3.1, g.position.z).project(camera); tag.style.transform = `translate(-50%,-100%) translate(${(pos.x * .5 + .5) * innerWidth}px,${(-pos.y * .5 + .5) * innerHeight}px)`; tag.style.visibility = pos.z < 1 ? 'visible' : 'hidden'; }
  });
  const hat = HAT_IDS.indexOf(normalizeAppearance(player.appearance).hatId); const face = FACE_IDS.indexOf(normalizeAppearance(player.appearance).faceId); const sleeping=!eyesOpen(view.phase,player.id,view.me,view.awake,view.teammates,player.connected);const expression=player.expression;
  return <group ref={root} position={home} onPointerOver={e=>{e.stopPropagation();bus.hovered=player.id}} onPointerOut={()=>{if(bus.hovered===player.id)bus.hovered=null}} onClick={e=>{e.stopPropagation();bus.onSelect?.(player.id)}}>
    <mesh ref={selected} visible={false} position={[0,1,0]} scale={[1.12,1.08,1.12]}><cylinderGeometry args={[.35,.5,1,6]}/><meshBasicMaterial color="#ff354f" side={T.BackSide} toneMapped={false}/></mesh>
    {player.id===view.me&&<mesh position={[0,.025,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.54,.59,24]}/><meshBasicMaterial color="#ffe5a0" transparent opacity={.35} toneMapped={false}/></mesh>}
    <mesh ref={body} userData={{avatarId:player.id}} position={[0, 1, 0]} castShadow><cylinderGeometry args={[.35, .5, 1, 6]} /><meshBasicMaterial color={color} toneMapped={false} fog={false} /></mesh>
    <mesh ref={cape} position={[0, 1, -.28]}><coneGeometry args={[.48, 1, 5, 1, true, 0, Math.PI]} /><Material color={color} /></mesh>
    <group ref={head} position={[0, 1.8, 0]}><mesh name={'avatar-face-'+player.id} castShadow><icosahedronGeometry args={[.38, 0]} /><meshBasicMaterial color={materials.face} toneMapped={false} fog={false} /></mesh>
      {hat !== 5 && <mesh name={'avatar-hat-'+player.id} position={[0, hat === 1 ? .3 : .55, 0]} castShadow>{hat === 1 ? <sphereGeometry args={[.39, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2]} /> : hat === 3 ? <cylinderGeometry args={[.4, .5, .12, 6]} /> : hat === 4 ? <cylinderGeometry args={[.35, .35, .35, 5, 1, true]} /> : <coneGeometry args={[hat === 2 ? .35 : .45, hat === 2 ? .9 : .55, 5]} />}<meshBasicMaterial color={materials.hat} toneMapped={false} fog={false} /></mesh>}
      {[-.14, .14].map(x => <Box key={x} p={[x, .05, .33]} rotation={[0,0,expression==='angry'?(x<0?-.3:.3):0]} size={[face === 3 ? .15 : .08, sleeping ? .025 : expression==='shocked'?.15:expression==='suspicious'||expression==='sad'||expression==='smug'&&x<0?.035:face===5?.04:.08,.05]} color="#1a1226" />)}
      {[1, 2, 4].includes(face) && <Box p={[0, -.15, .34]} size={[face === 2 ? .16 : .07, .035, .025]} color={face === 1 ? '#8a5a3c' : '#d6455d'} />}
    </group>
    <group ref={left} position={[-.17, .55, 0]}><Box p={[0, -.27, 0]} size={[.2, .55, .2]} color="#1a1226" /></group><group ref={right} position={[.17, .55, 0]}><Box p={[0, -.27, 0]} size={[.2, .55, .2]} color="#1a1226" /></group>
    <group ref={arms} position={[0, 1.25, 0]}>{[-1, 1].map(x => <Box key={x} p={[x * .42, -.15, 0]} rotation={[0, 0, x * .1]} size={[.16, .6, .18]} color={color} glow />)}</group>
    <mesh ref={dust} position={[0, .08, .25]} visible={false}><icosahedronGeometry args={[.35, 0]} /><meshBasicMaterial color="#8a8fa8" transparent opacity={.15} /></mesh>
  </group>;
}
function PondPreview({reduced}:{reduced:boolean}){
 const[appearance,setAppearance]=useState(DEFAULT_APPEARANCE),[local]=useState(makeMotion),elapsed=useRef(0);
 useEffect(()=>{try{setAppearance(normalizeAppearance(JSON.parse(localStorage.getItem('werewolf-profile')||'{}')))}catch{}const change=(e:Event)=>setAppearance(normalizeAppearance((e as CustomEvent).detail));window.addEventListener('werewolf-preview',change);return()=>window.removeEventListener('werewolf-preview',change)},[]);
 const preview:SceneState={code:'',host:'preview',round:0,phase:'lobby',phaseStarted:0,ruleset:'solo',me:'preview',awake:false,teammates:[],selected:[],players:[{id:'preview',name:'You',appearance,connected:true,ready:true,expression:'neutral'}],order:['preview'],lockedCount:0,allowSkip:false,emotes:[],chat:[],claims:[],reveal:null};
 return <group position={[8,0,-.5]} rotation={[0,Math.PI,0]}><Character player={preview.players[0]} index={0} count={1} view={preview} bus={local} reduced={reduced} elapsed={elapsed}/></group>;
}
function SceneCard({index,view,dealElapsed,reduced,bus,faces}:{index:number;view:SceneState;elapsed:React.RefObject<number>;dealElapsed:React.RefObject<number>;reduced:boolean;bus:MotionBus;faces:Record<string,Card>}){
 const group=useRef<T.Group>(null),[up,setUp]=useState(false),target=useMemo(()=>new T.Vector3(),[]);const count=view.order.length,id=index<count?view.order[index]:'center-'+(index-count),face=faces[id];
 useEffect(()=>{setUp(false);if(view.phase!=='result')return;const timer=setTimeout(()=>{setUp(true);window.dispatchEvent(new CustomEvent('werewolf-sfx',{detail:{name:'flip',pitch:1+index*.06}}))},reduced?0:Math.max(0,(.7+index*.45)*1000-(Date.now()+(bus.clockOffset||0)-view.phaseStarted)));return()=>clearTimeout(timer)},[view.phase,view.phaseStarted,view.round,index,reduced,bus]);
 useFrame(({camera,clock})=>{if(!group.current)return;if(index<count){const at=seat(index,count),radius=view.phase==='result'?1:.6;target.set(at[0]*radius,view.phase==='result'?3.6:1.4,at[2]*radius)}else target.set((index-count-1)*1.2,2.4,-1.3);
 const dealt=reduced?1:T.MathUtils.clamp((dealElapsed.current-index*.08)/.8,0,1);group.current.position.copy(target).multiplyScalar(dealt);group.current.position.y+=Math.sin(Math.PI*dealt)*3+(reduced?0:Math.sin(clock.elapsedTime*2+index)*.06);group.current.lookAt(camera.position);const slam=view.emotes.find(e=>e.kind==='slam'&&Date.now()-e.at<600);if(slam&&!reduced)group.current.position.y+=Math.sin((Date.now()-slam.at)/600*Math.PI)*.35;});
 const state=up||view.phase==='dealing'&&!!face?'up':view.phase==='night'&&!!face?'peeked':'down';
 return <group ref={group}><Card3D id={id} face={face} ruleset={view.ruleset} state={state} selectable={view.phase==='night'&&view.awake||view.phase==='dealing'&&id===view.me} selected={view.selected.includes(id)} reduced={reduced} onSelect={target=>bus.onSelect?.(target)} onPeek={target=>bus.onPeek?.(target)} onSwap={(a,b)=>bus.onSwap?.(a,b)}/></group>;
}
function World({ view, bus, faces={}, low, setLow, reduced }: Props & { low: boolean; setLow: () => void; reduced: boolean }) {
  const { scene, camera, gl } = useThree(); const day = useRef(0); const ambient = useRef<T.AmbientLight>(null); const moonlight = useRef<T.DirectionalLight>(null); const orb = useRef<T.Mesh>(null); const skyBands = useRef<T.Group>(null);
  const size=useThree(s=>s.size);
  useEffect(()=>{if(camera instanceof T.PerspectiveCamera){camera.fov=Math.max(50,T.MathUtils.radToDeg(2*Math.atan(Math.tan(T.MathUtils.degToRad(view?.phase==='night'?40:25))/Math.min(1,size.width/size.height))));camera.updateProjectionMatrix()}},[camera,size.width,size.height,view?.phase]);
  const stars = useRef<T.Points>(null); const ring = useRef<T.Mesh>(null); const trail = useRef<T.Mesh>(null); const projectile = useRef<T.Mesh>(null);
  const start = useRef(0); const elapsed = useRef(0); const keys = useRef<Record<string, boolean>>({}); const privateTarget = useRef<{ id: string; until: number } | null>(null); const performanceStats = useRef({ frames: 0, time: 0 });
  const dealStarted = useRef(0); const dealElapsed = useRef(0);
  const wasReady=useRef(false);
  const frameColor=useMemo(()=>new T.Color(),[]);const moonNight=useMemo(()=>new T.Color('#e8e4ff'),[]),moonDay=useMemo(()=>new T.Color('#ffd35a'),[]);const bandColors=useMemo(()=>Array.from({length:12},(_,i)=>[new T.Color('#120a2a').lerp(new T.Color('#2a1a52'),i/11),new T.Color('#3b3f8a').lerp(new T.Color('#ffb27a'),i/11)]),[]);
  const nightColor = useMemo(() => new T.Color(COLORS.night), []); const dawnColor = useMemo(() => new T.Color(COLORS.dawn), []);
  const starPositions = useMemo(() => new Float32Array(Array.from({ length: 260 }, (_, i) => { const a = random(i) * 6.28, e = random(i + 500) * 1.2 + .15; return [Math.cos(a) * Math.cos(e) * 120, Math.sin(e) * 120, Math.sin(a) * Math.cos(e) * 120]; }).flat()), []);
  useEffect(() => { scene.fog = new T.Fog(COLORS.night, 28, 80); gl.shadowMap.type = T.BasicShadowMap; return () => { scene.fog = null; }; }, [scene, gl]);
  useEffect(() => { start.current = performance.now() / 1000; }, [view?.phase, view?.round]);
  useEffect(() => { dealStarted.current = performance.now() / 1000; }, [view?.round]);
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (typeof e.key !== 'string' || !e.key) return; if (e.target instanceof Element && e.target.closest('input,textarea,select,[contenteditable]')) return; const key = e.key.toLowerCase(); if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) e.preventDefault(); keys.current[key] = true; if(key==='e'&&bus.interaction){if(bus.interaction.startsWith('prop:'))bus.onLandmark?.(bus.interaction.slice(5));else{bus.focus=bus.interaction;bus.onSelect?.(bus.interaction)}} };
    const up = (e: KeyboardEvent) => { if (typeof e.key !== 'string' || !e.key) return; keys.current[e.key.toLowerCase()] = false; };
    const blur = () => { keys.current = {}; bus.stick = { x: 0, z: 0 }; };
    const choice = (e: Event) => { const detail = (e as CustomEvent<{ target: string }>).detail; privateTarget.current = { id: detail.target, until: performance.now() / 1000 + 2 }; bus.focus = detail.target; };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur); window.addEventListener('werewolf-private-choice', choice);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); window.removeEventListener('werewolf-private-choice', choice); };
  }, [bus]);
  useFrame(({ clock }, dt) => {
    const actualDelta = dt; dt = Math.min(dt, .05); elapsed.current = view?Math.max(0,(Date.now()+(bus.clockOffset||0)-view.phaseStarted)/1000):performance.now() / 1000 - start.current;
    dealElapsed.current = performance.now() / 1000 - dealStarted.current;
    gl.domElement.dataset.avatarX = String(bus.local.x); gl.domElement.dataset.avatarZ = String(bus.local.z);
    const stats = performanceStats.current; stats.frames++; stats.time += actualDelta;
    if (stats.time > 2) { gl.domElement.dataset.drawCalls = String(gl.info.render.calls); gl.domElement.dataset.fps = String(Math.round(stats.frames / stats.time)); if (!reduced&&stats.frames / stats.time < 30 || gl.info.render.calls > 220) setLow(); stats.frames = 0; stats.time = 0; }
    const phase=view?.phase||'lobby',introAge=bus.introStarted===null?null:(performance.now()-bus.introStarted)/1000;const d=introAge!==null?Math.max(0,1-introAge/10):['day','vote','result'].includes(phase)?1:0;
    if(scene.fog instanceof T.Fog)scene.fog.far=MOODS[phase].fog;
    day.current = reduced ? d : T.MathUtils.damp(day.current, d, 1, dt);
    const color = frameColor.lerpColors(nightColor, dawnColor, day.current); scene.background = color; (scene.fog as T.Fog)?.color.copy(color);
    if (ambient.current) ambient.current.intensity = .6 + .55 * day.current;
    if (moonlight.current) moonlight.current.intensity = .5 + .7 * day.current;
    const progress=introAge!==null?.05+Math.min(.45,introAge/40):phase==='night'?.12+Math.min(.33,elapsed.current*.003):.5;
    if (orb.current) { orb.current.position.set(-80 * Math.cos(progress * Math.PI), 12 + 62 * Math.sin(progress * Math.PI), -85); (orb.current.material as T.MeshBasicMaterial).color.lerpColors(moonNight,moonDay, day.current); moonlight.current?.position.copy(orb.current.position); }
    if (stars.current) (stars.current.material as T.PointsMaterial).opacity = 1 - day.current;
    skyBands.current?.children.forEach((mesh, i) => { const m = mesh as T.Mesh; (m.material as T.MeshBasicMaterial).color.lerpColors(bandColors[i][0],bandColors[i][1], day.current); });
    const players = view?.players || []; const my = Math.max(0, players.findIndex(p => p.id === view?.me));
    if (['day','lobby','vote'].includes(phase)&&bus.exploring) {
      let x = Number(keys.current.d || keys.current.arrowright || false) - Number(keys.current.a || keys.current.arrowleft || false) + bus.stick.x;
      let z = Number(keys.current.s || keys.current.arrowdown || false) - Number(keys.current.w || keys.current.arrowup || false) + bus.stick.z;
      const length = Math.hypot(x, z); if (length > 1) { x /= length; z /= length; }
      bus.local.x += x * dt * 5; bus.local.z += z * dt * 5;
      const r = Math.hypot(bus.local.x, bus.local.z); const radius = T.MathUtils.clamp(r, 2, 13); if (r) { bus.local.x *= radius / r; bus.local.z *= radius / r; }
    }
    const positions = players.map((p, i) => { if (['day','lobby','vote'].includes(phase)) { if (p.id === view?.me) return new T.Vector3(bus.local.x, 0, bus.local.z); const remote = bus.remote.get(p.id); if (remote) return new T.Vector3(remote.x, 0, remote.z); } return new T.Vector3(...seat(i, players.length)); });
    bus.interaction = null; let best = 2.6; positions.forEach((pos, i) => { if (i === my) return; const distance = pos.distanceTo(new T.Vector3(bus.local.x, 0, bus.local.z)); if (['day','lobby','vote'].includes(phase) && distance < best) { best = distance; bus.interaction = players[i].id; } });
    const landmark=nearestLandmark(bus.local.x,bus.local.z,phase,view?.host===view?.me);if(landmark)bus.interaction='prop:'+landmark.id;
    const hint=document.getElementById('world-interact');if(hint){hint.style.display=bus.interaction?'block':'none';hint.textContent=landmark?'E · '+landmark.label:'E · Talk to this player';}
    if(view&&phase==='lobby'){const ready=Math.hypot(bus.local.x+2,bus.local.z-4)<1;if(ready!==wasReady.current){wasReady.current=ready;bus.onReady?.(ready)}}
    if (ring.current) { ring.current.visible = !!bus.interaction; const at = positions[players.findIndex(p => p.id === bus.interaction)]; if (at) ring.current.position.set(at.x, .06, at.z); ring.current.scale.setScalar(reduced ? 1 : 1 + Math.sin(clock.elapsedTime * 6) * .08); }
    const focus = bus.focus?.startsWith('center-') ? new T.Vector3((Number(bus.focus.slice(7)) - 1) * 1.2, 1, -3.4) : positions[players.findIndex(p => p.id === bus.focus)];
    let target = focus?.clone() || new T.Vector3(0, 1.2, 0); const desired = new T.Vector3(target.x, 9.5, target.z + 17);
    if (bus.overview || !view) { target = new T.Vector3(0, 1.2, 0); desired.set(0, 15, 21); }
    if (!reduced && !bus.skipCamera) {
      if (view?.round && elapsed.current < 4 && phase === 'night') { const a = elapsed.current * .7; desired.set(Math.sin(a) * 17, 10, Math.cos(a) * 17); }
      else if (phase === 'night' && !focus) desired.x += Math.sin(clock.elapsedTime * .1) * 1.5;
      if (phase === 'result' && view?.reveal) { const index = Math.floor((elapsed.current - .7) / .45); if (index >= 0 && index < positions.length) { target = positions[index].clone().add(new T.Vector3(0, 2, 0)); desired.copy(target).add(new T.Vector3(3, 4, 7)); if (view.reveal.banished.includes(players[index].id)) desired.x += Math.sin(elapsed.current * 70) * .09; } }
    }
    if(!view&&bus.mirror){desired.set(8,3.5,1);target.set(8,-.2,-6);}
    if(bus.introStarted!==null){const shot=introCamera((performance.now()-bus.introStarted)/1000);desired.set(shot.x,shot.y,shot.z);target.set(0,shot.targetY,0);}
    const slam=view?.emotes.find(e=>e.kind==='slam'&&Date.now()-e.at<400);if(slam&&!reduced){desired.x+=Math.sin(clock.elapsedTime*80)*.09;desired.y+=Math.cos(clock.elapsedTime*70)*.05;}
    if(phase==='night'&&positions[my]){const at=positions[my];desired.set(at.x, view?.awake?2.8:1.3,at.z);target.set(0,view?.awake?1:.1,-1);}
    camera.position.lerp(desired, reduced || bus.skipCamera ? 1 : 1 - Math.exp(-dt * 3)); camera.lookAt(target);
    if(view&&view.phase!=='lobby')for(let i=0;i<3;i++){const tag=document.getElementById('center-tag-'+i);if(tag){const p=new T.Vector3((i-1)*1.2,2.4,-1.3).project(camera);tag.style.transform=`translate(-50%,-50%) translate(${(p.x*.5+.5)*innerWidth}px,${(-p.y*.5+.5)*innerHeight}px)`;tag.style.visibility=p.z<1?'visible':'hidden'}}
    const skip=document.getElementById('skip-stone');if(skip){const p=new T.Vector3(2,1,0).project(camera);skip.style.transform=`translate(-50%,-50%) translate(${(p.x*.5+.5)*innerWidth}px,${(-p.y*.5+.5)*innerHeight}px)`;}
    if (trail.current) {
      const choice = privateTarget.current; const active = choice && choice.until > performance.now() / 1000; trail.current.visible = !!active;
      if (active && choice) { const end = choice.id.startsWith('center-') ? new T.Vector3((Number(choice.id.slice(7)) - 1) * 1.2, 1, -3.4) : positions[players.findIndex(p => p.id === choice.id)]; if (end) { const from = positions[my] || new T.Vector3(); const center = from.clone().add(end).multiplyScalar(.5); trail.current.position.copy(center).add(new T.Vector3(0, 1, 0)); trail.current.scale.set(.06, from.distanceTo(end), .06); trail.current.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), end.clone().sub(from).normalize()); } }
    }
    if (projectile.current) { const hunted = view?.reveal?.hunted || []; const index = Math.floor((elapsed.current - banishAt(view?.players.length||0)) / .8); const victim = hunted[index]; projectile.current.visible = !!victim && !reduced; if (victim && view?.reveal) { const hunter = view.reveal.effective.findIndex(r => r === 'hunter'); const from = positions[hunter]; const to = positions[players.findIndex(p => p.id === victim)]; if (from && to) { const progress = ((elapsed.current - banishAt(view?.players.length||0)) % .8) / .8; projectile.current.position.copy(from).lerp(to, progress); projectile.current.position.y = 1 + Math.sin(progress * Math.PI) * 3; } } }
  });
  const players = view?.players || []; const winning = !!view?.reveal?.winningPlayers.includes(view.me);
  return <><ambientLight ref={ambient} color="#8878c8" intensity={.4} /><directionalLight ref={moonlight} color="#b8b0ff" intensity={.6} position={[-30, 50, -40]} />
    <group ref={skyBands}>{Array.from({ length: 12 }, (_, i) => <mesh key={i} position={[0, i * 9 - 8, -130]}><planeGeometry args={[340, 9]} /><meshBasicMaterial color="#140d2e" fog={false} /></mesh>)}</group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[36, 12]} /><Material color={COLORS.ground} /></mesh><mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .02, 0]} receiveShadow><circleGeometry args={[9, 12]} /><Material color={COLORS.clearing} /></mesh>
    <Mountains /><WorldLandmarks reduced={reduced}/>{!view&&<><TitleWolf reduced={reduced}/><PondPreview reduced={reduced}/></>}<VoteStones view={view} bus={bus} reduced={reduced}/><WorldVFX view={view} low={low||bus.batterySaver} reduced={reduced}/>
    <Vegetation low={low} reduced={reduced} /><Landmarks day={day} reduced={reduced} /><Fire low={low} reduced={reduced} /><Particles low={low} reduced={reduced} day={day} winning={winning} />
    <points ref={stars}><bufferGeometry><bufferAttribute attach="attributes-position" args={[starPositions, 3]} /></bufferGeometry><pointsMaterial color="#ffffff" size={2} sizeAttenuation={false} transparent fog={false} /></points><mesh ref={orb}><sphereGeometry args={[4, 8, 6]} /><meshBasicMaterial color="#e8e4ff" fog={false} /></mesh>
    <mesh position={[0, .15, -3.4]}><cylinderGeometry args={[1.8, 2, .3, 6]} /><Material color="#55506a" /></mesh>
    {view && players.map((p, i) => <Character key={p.id} player={p} index={i} count={players.length} view={view} bus={bus} reduced={reduced} elapsed={elapsed} />)}
    {view && view.phase !== 'lobby' && Array.from({ length: view.order.length + 3 }, (_, i) => <SceneCard key={`${view.round}-${i}`} index={i} view={view} elapsed={elapsed} dealElapsed={dealElapsed} reduced={reduced} bus={bus} faces={faces} />)}
    <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} visible={false}><ringGeometry args={[.8, 1.1, 10]} /><meshBasicMaterial color="#ffd35a" side={T.DoubleSide} /></mesh>
    <mesh ref={trail} visible={false}><cylinderGeometry args={[1, 1, 1, 6]} /><meshBasicMaterial color="#ffd35a" transparent opacity={.65} depthWrite={false} /></mesh><mesh ref={projectile} visible={false}><octahedronGeometry args={[.16, 0]} /><meshBasicMaterial color="#ffd35a" /></mesh>
  </>;
}
function Clearing(props: Props) {
  const [gpu]=useState(detectGPU);const [tier,setTier]=useState<QualityTier>(()=>{const saved=localStorage.getItem('werewolf-quality') as QualityTier;return TIERS.includes(saved)?saved:gpu.tier});const quality=QUALITY[tier];const low=!quality.shadows;
  const [prefersReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);const reduced=prefersReduced||!!props.calm;
  const scale=props.battery?QUALITY.Minimum.scale:Math.min(innerWidth<700?.5:1/3,quality.scale);
  const fallback = useRef(props.onFallback); fallback.current = props.onFallback;
  const onFallback=props.onFallback;
  useEffect(()=>{if(!gpu.available)onFallback();const change=(e:Event)=>setTier((e as CustomEvent<QualityTier>).detail);window.addEventListener('werewolf-quality',change);return()=>window.removeEventListener('werewolf-quality',change)},[gpu.available,onFallback]);
  const tags = props.view?.players || []; const view = props.view;
  return <div className="clearing" aria-label="3D campfire clearing" data-testid="clearing-3d"><Boundary fallback={props.onFallback}><Canvas frameloop='demand' camera={{ fov: 50, position: [0, 12, 17], near: .1, far: 300 }} dpr={scale} shadows={!low} gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }} onCreated={({ gl }) => { gl.outputColorSpace=T.SRGBColorSpace;gl.toneMapping=T.NoToneMapping;gl.domElement.addEventListener('webglcontextlost', () => fallback.current(), { once: true });props.onReady?.(); }}><AvatarDebug view={props.view} tier={tier}/><RenderLoop fps={props.battery?30:quality.fps} reduced={reduced}/><World {...props} low={low} setLow={() => { props.bus.quality = 'low'; setTier(q=>TIERS[Math.max(0,TIERS.indexOf(q)-1)]); }} reduced={reduced} /></Canvas></Boundary>
    <AvatarOverlay/><div className="world-tags">{view?.phase==='vote'&&view.allowSkip&&<button className="center-tag skip-stone" id="skip-stone" onClick={()=>props.bus.onSelect?.('skip')}>Skip stone</button>}{view&&['night','dealing','result'].includes(view.phase)&&[0,1,2].map(i=><button className="center-tag" id={'center-tag-'+i} key={i} onClick={()=>props.bus.onSelect?.('center-'+i)}>{['Left','Middle','Right'][i]}</button>)}{tags.map(p => { const emote = view?.emotes.find(e => e.player === p.id); const ping = view?.emotes.some(e => e.target === p.id); const message = view?.chat.filter(m => m.player === p.id && !props.muted.includes(p.id)).at(-1); return <div className="world-tag" id={'tag-' + p.id} key={p.id}>{ping && <span className="point-ping">▼</span>}{emote && <span className="emote-bubble">{({slam:'✹',accuse:'➜',facepalm:'…',sweat:'💧','who me':'me?', wave: '✋', point: '➜', shrug: '¯\_(ツ)_/¯', laugh: 'ha!', gasp: '!', 'thumbs up': '👍' })[emote.kind]}</span>}{message && Date.now() - message.at < 5500 && <span className="speech-bubble">{message.text}</span>}<button onPointerEnter={()=>{props.bus.hovered=p.id}} onPointerLeave={()=>{if(props.bus.hovered===p.id)props.bus.hovered=null}} disabled={(view?.phase==='night'||view?.phase==='vote')&&p.id===view?.me} onClick={() => { props.bus.focus = p.id;props.bus.onSelect?.(p.id); }}>{p.name}{p.id===view?.me?' · you':''}{view?.claims.filter(c=>c.player===p.id).slice(-1).map(c=><small className="claim-badge" key={c.at}>claims {RULES[c.role].name}</small>)}</button>{view?.selected.includes(p.id)&&view.phase==='day'&&<div className="character-actions"><button onClick={()=>props.bus.onReact?.('point',p.id)}>Point</button><button onClick={()=>props.bus.onMenu?.('Notes')}>Claim</button><button onClick={()=>props.bus.onMenu?.('Notes')}>Note</button><button onClick={()=>props.bus.onReactions?.()}>Emote</button></div>}</div>; })}</div><div className="vignette" />{view&&['day','lobby','vote'].includes(view.phase)&&<><button id="world-interact" className="world-interact" onClick={()=>{const target=props.bus.interaction;if(target?.startsWith('prop:'))props.bus.onLandmark?.(target.slice(5));else if(target)props.bus.onSelect?.(target)}}>Interact</button><div className="world-stick" role="application" aria-label="Movement thumbstick" onPointerDown={e=>e.currentTarget.setPointerCapture(e.pointerId)} onPointerMove={e=>{if(!e.currentTarget.hasPointerCapture(e.pointerId))return;const r=e.currentTarget.getBoundingClientRect();props.bus.stick.x=Math.max(-1,Math.min(1,(e.clientX-r.left-r.width/2)/40));props.bus.stick.z=Math.max(-1,Math.min(1,(e.clientY-r.top-r.height/2)/40))}} onPointerUp={()=>{props.bus.stick={x:0,z:0}}} onPointerCancel={()=>{props.bus.stick={x:0,z:0}}}><span>✥</span></div></>}
  </div>;
}

export default memo(Clearing);

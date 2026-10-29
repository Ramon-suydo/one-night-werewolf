'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as T from 'three';
import { particleAt, phaseColor, VFX_BUDGET } from '@/lib/vfx';
import type { SceneState } from '@/lib/scene';
// All effects derive from public phase/reveal only. One pool, five draw calls.
export function WorldVFX({view,low,reduced}:{view:SceneState|null;low:boolean;reduced:boolean}) {
 const count=low?VFX_BUDGET.lowParticles:VFX_BUDGET.highParticles;
 const positions=useMemo(()=>new Float32Array(count*3),[count]);
 const points=useRef<T.Points>(null),wave=useRef<T.Mesh>(null),halo=useRef<T.Mesh>(null),runes=useRef<T.InstancedMesh>(null),beacons=useRef<T.InstancedMesh>(null);
 const dummy=useMemo(()=>new T.Object3D(),[]),origin=useRef(0),color=useMemo(()=>new T.Color(),[]);
 const phase=view?.phase||'lobby';
 useEffect(()=>{origin.current=performance.now()/1000},[phase,view?.round]);
 useFrame(({clock})=>{
  const age=performance.now()/1000-origin.current,t=clock.elapsedTime;
  if(reduced)return;
  const celebration=phase==='result';
  for(let i=0;i<count;i++)particleAt(i,t,celebration,positions);
  if(points.current){points.current.geometry.attributes.position.needsUpdate=true;(points.current.material as T.PointsMaterial).color.set(phaseColor(phase));}
  if(wave.current){const p=Math.min(1,age/2.6);wave.current.scale.setScalar(.5+p*17);(wave.current.material as T.MeshBasicMaterial).opacity=(1-p)*.28;wave.current.visible=age<2.6;}
  if(halo.current){halo.current.rotation.z=t*.055;(halo.current.material as T.MeshBasicMaterial).opacity=phase==='vote'?.12+Math.sin(t*5)*.04:.08;}
  for(let i=0;i<VFX_BUDGET.runeCount;i++){
   const a=i/VFX_BUDGET.runeCount*Math.PI*2;
   dummy.position.set(Math.sin(a)*3,.06,Math.cos(a)*3);dummy.rotation.set(-Math.PI/2,0,-a);dummy.scale.set(.1,.2+(i%3)*.05,1);dummy.updateMatrix();runes.current?.setMatrixAt(i,dummy.matrix);
   color.set(phaseColor(phase)).multiplyScalar(.6+Math.sin(t*1.7-i*.5)*.3);runes.current?.setColorAt(i,color);
  }
  if(runes.current){runes.current.instanceMatrix.needsUpdate=true;if(runes.current.instanceColor)runes.current.instanceColor.needsUpdate=true;}
  const winners=view?.reveal?.winningPlayers||[];
  for(let i=0;i<10;i++){
   const id=winners[i],index=view?.order.indexOf(id)||0,a=index/Math.max(3,view?.order.length||3)*Math.PI*2;
   const visible=!!id&&age>1+index*.45;dummy.position.set(Math.sin(a)*5.5,2.8,Math.cos(a)*5.5);dummy.rotation.set(0,-a,0);dummy.scale.set(visible?1.3:0,visible?5:0,1);dummy.updateMatrix();beacons.current?.setMatrixAt(i,dummy.matrix);
  }
  if(beacons.current)beacons.current.instanceMatrix.needsUpdate=true;
 });
 if(reduced)return null;
 return <group name="cosmetic-effects">
  <points ref={points} frustumCulled={false}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions,3]}/></bufferGeometry><pointsMaterial size={low?.07:.1} transparent opacity={.65} depthWrite={false} blending={T.AdditiveBlending}/></points>
  <mesh ref={wave} rotation={[-Math.PI/2,0,0]} position={[0,.07,0]}><ringGeometry args={[.96,1,48]}/><meshBasicMaterial color={phaseColor(phase)} transparent depthWrite={false} blending={T.AdditiveBlending}/></mesh>
  <mesh ref={halo} rotation={[-Math.PI/2,0,0]} position={[0,.05,0]}><ringGeometry args={[2.7,2.73,48]}/><meshBasicMaterial color={phaseColor(phase)} transparent opacity={.1} depthWrite={false}/></mesh>
  <instancedMesh ref={runes} args={[undefined,undefined,VFX_BUDGET.runeCount]}><planeGeometry args={[1,1]}/><meshBasicMaterial transparent opacity={.6} depthWrite={false} side={T.DoubleSide} blending={T.AdditiveBlending}/></instancedMesh>
  <instancedMesh ref={beacons} args={[undefined,undefined,10]} frustumCulled={false}><planeGeometry args={[1,1]}/><meshBasicMaterial color="#ffd35a" transparent opacity={.055} depthWrite={false} side={T.DoubleSide} blending={T.AdditiveBlending}/></instancedMesh>
 </group>;
}

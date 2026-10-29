'use client';
import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as T from 'three';
import {seat,type MotionBus} from '@/lib/motion';
import type {SceneState} from '@/lib/scene';
import {votesAt} from '@/lib/result-timeline';
export function VoteStones({view,bus,reduced}:{view:SceneState|null;bus:MotionBus;reduced:boolean}){
 const stones=useRef<T.InstancedMesh>(null),pebbles=useRef<T.InstancedMesh>(null),arrow=useRef<T.Mesh>(null),started=useRef(0);
 const dummy=useMemo(()=>new T.Object3D(),[]),color=useMemo(()=>new T.Color(),[]);
 useEffect(()=>{started.current=performance.now()/1000},[view?.phase,view?.round]);
 useFrame(({clock})=>{
  const phase=view?.phase,n=view?.order.length||0,age=performance.now()/1000-started.current;
  for(let i=0;i<10;i++){
   const show=phase==='vote'&&i<n,a=(i/Math.max(n,3)-.5)*2;
   dummy.position.set(Math.sin(a)*2.2,.18,2+Math.cos(a)*.6);dummy.rotation.set(0,i,0);dummy.scale.setScalar(show?.14:0);dummy.updateMatrix();pebbles.current?.setMatrixAt(i,dummy.matrix);color.set(i<(view?.lockedCount||0)?'#ffd35a':'#55506a');pebbles.current?.setColorAt(i,color);
   let visible=false;const voter=view?.order[i],target=voter?view?.reveal?.ballots[voter]:null;
   if(phase==='result'&&view?.reveal&&i<n){const p=reduced?1:Math.max(0,Math.min(1,(age-votesAt(n)-i*.15)/.8));const from=seat(i,n),index=view.order.indexOf(target||''),to=index>=0?seat(index,n):[0,0,0];visible=p>0&&(!!target||p<1);dummy.position.set(from[0]+(to[0]-from[0])*p,.3+Math.sin(p*Math.PI)*3+(target?0:p*4),from[2]+(to[2]-from[2])*p);dummy.scale.setScalar(visible?.18:0);dummy.rotation.set(p*4,i+p*3,0);color.set(target&&view.reveal.banished.includes(target)?'#d6455d':'#ffd35a');}
   else if(phase==='vote'&&i===0&&view&&bus.selected.length){const me=view.order.indexOf(view.me),p=seat(Math.max(0,me),n);visible=true;dummy.position.set(p[0],2.4+Math.sin(clock.elapsedTime*3)*.08,p[2]);dummy.scale.setScalar(.18);color.set('#ffd35a');}
   if(!visible)dummy.scale.setScalar(0);dummy.updateMatrix();stones.current?.setMatrixAt(i,dummy.matrix);stones.current?.setColorAt(i,color);
  }
  for(const m of[stones.current,pebbles.current])if(m){m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;}
  if(arrow.current){const target=bus.selected[0],index=view?.players.findIndex(p=>p.id===target)??-1;arrow.current.visible=!!view&&index>=0&&['day','vote','night'].includes(view.phase);if(index>=0&&view){const p=seat(index,view.players.length);arrow.current.position.set(p[0],4+(!reduced?Math.sin(clock.elapsedTime*5)*.15:0),p[2]);arrow.current.rotation.z=Math.PI;}}
 });
 return <><instancedMesh ref={pebbles} args={[undefined,undefined,10]} frustumCulled={false}><dodecahedronGeometry args={[1,0]}/><meshBasicMaterial/></instancedMesh><instancedMesh ref={stones} args={[undefined,undefined,10]} frustumCulled={false}><octahedronGeometry args={[1,0]}/><meshBasicMaterial/></instancedMesh><mesh ref={arrow} visible={false}><coneGeometry args={[.18,.45,4]}/><meshBasicMaterial color="#d6455d"/></mesh></>;
}

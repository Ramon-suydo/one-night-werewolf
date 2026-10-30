'use client';
import {useLayoutEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as T from 'three';
import type {SceneState} from '@/lib/scene';
import type {MotionBus} from '@/lib/motion';

export function ReadyRings({view,bus,reduced}:{view:SceneState|null;bus:MotionBus;reduced:boolean}){
 const mesh=useRef<T.InstancedMesh>(null),dummy=useMemo(()=>new T.Object3D(),[]),color=useMemo(()=>new T.Color(),[]),projected=useMemo(()=>new T.Vector3(),[]);
 const rings=view?.readyRings??[],own=rings.find(r=>r.playerId===view?.me),x=own?.x,z=own?.z,ready=own?.ready,playerId=own?.playerId;
 useLayoutEffect(()=>{
  if(x===undefined||z===undefined)return;
  if(ready){bus.local.x=x;bus.local.z=z;}
  else if(Math.hypot(bus.local.x-x,bus.local.z-z)<1.2){bus.local.x=x*.72;bus.local.z=z*.72;}
 },[x,z,ready,playerId,bus]);
 useFrame(({camera,clock,gl})=>{
  gl.domElement.dataset.readyRings=String(rings.length);
  rings.forEach((r,i)=>{
   dummy.position.set(r.x,.075,r.z);dummy.rotation.set(-Math.PI/2,0,0);dummy.scale.setScalar(!reduced&&r.ready?1+Math.sin(clock.elapsedTime*3+i)*.025:1);dummy.updateMatrix();
   mesh.current?.setMatrixAt(i,dummy.matrix);mesh.current?.setColorAt(i,color.set(r.ready?'#ffd35a':r.playerId===view?.me?'#5edbce':r.playerId?'#aa8ae0':'#655d78'));
   const tag=document.getElementById('ready-ring-'+r.slot);if(tag){projected.set(r.x,.1,r.z).project(camera);tag.style.transform=`translate(-50%,0) translate(${Math.max(44,Math.min(innerWidth-44,(projected.x*.5+.5)*innerWidth))}px,${(-projected.y*.5+.5)*innerHeight}px)`;tag.style.visibility=projected.z<1?'visible':'hidden';}
  });
  if(mesh.current){mesh.current.instanceMatrix.needsUpdate=true;if(mesh.current.instanceColor)mesh.current.instanceColor.needsUpdate=true;}
 });
 if(!rings.length)return null;
 return <instancedMesh key={rings.length} ref={mesh} args={[undefined,undefined,rings.length]} onClick={e=>{const r=rings[e.instanceId??-1];if(r?.playerId!==view?.me)return;e.stopPropagation();bus.local.x=r.x;bus.local.z=r.z;bus.onReady?.(true);}}><ringGeometry args={[.86,1.04,24]}/><meshBasicMaterial side={T.DoubleSide} toneMapped={false}/></instancedMesh>;
}

export function ReadyRingLabels({view,bus}:{view:SceneState|null;bus:MotionBus}){
 if(view?.phase!=='lobby')return null;
 return <div className="ready-ring-labels" aria-label="Lobby ready rings">{view.readyRings.map(r=><div key={r.slot} id={'ready-ring-'+r.slot} data-testid="ready-ring" data-ready={r.ready} data-player={r.playerId??''}>{r.playerId===view.me?<button aria-label={r.ready?'Leave your ready ring':'Enter your ready ring'} onClick={()=>{bus.local.x=r.x*(r.ready?.72:1);bus.local.z=r.z*(r.ready?.72:1);bus.onReady?.(!r.ready);}}><b>Your ring</b><small>{r.ready?'Ready':'Enter ring'}</small></button>:<span title={r.name}><b>{r.name}</b><small>{r.ready?'Ready':r.playerId?'Not ready':'Open seat'}</small></span>}</div>)}</div>;
}

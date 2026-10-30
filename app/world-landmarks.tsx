'use client';
import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as T from 'three';
import {LANDMARKS} from '@/lib/landmarks';
export function WorldLandmarks({reduced}:{reduced:boolean}){
 const rings=useRef<T.InstancedMesh>(null),dummy=useMemo(()=>new T.Object3D(),[]);
 useFrame(({clock})=>{LANDMARKS.forEach((p,i)=>{dummy.position.set(p.x,.08,p.z);dummy.rotation.set(-Math.PI/2,0,0);dummy.scale.setScalar(reduced?1:1+Math.sin(clock.elapsedTime*2+i)*.06);dummy.updateMatrix();rings.current?.setMatrixAt(i,dummy.matrix)});if(rings.current)rings.current.instanceMatrix.needsUpdate=true});
 return <><instancedMesh ref={rings} args={[undefined,undefined,LANDMARKS.length]}><ringGeometry args={[.8,.86,12]}/><meshBasicMaterial color="#9d83ed" transparent opacity={.35} side={T.DoubleSide}/></instancedMesh><group position={[-7,0,1]}>{[-.7,.7].map(x=><mesh key={x} position={[x,.9,0]}><boxGeometry args={[.15,1.8,.15]}/><meshLambertMaterial color="#8a5a3c"/></mesh>)}<mesh position={[0,1.7,0]}><boxGeometry args={[1.8,1.1,.15]}/><meshLambertMaterial color="#3e4256"/></mesh></group><mesh position={[2,.5,4]}><dodecahedronGeometry args={[.55,0]}/><meshLambertMaterial color="#7b4fbf" flatShading/></mesh></>;
}
export function useDiscovery(){useEffect(()=>{const found=(event:Event)=>{const label=(event as CustomEvent<string>).detail;try{const items=JSON.parse(localStorage.getItem('werewolf-discoveries')||'[]') as string[];if(!items.includes(label)){localStorage.setItem('werewolf-discoveries',JSON.stringify([...items,label]));window.dispatchEvent(new CustomEvent('werewolf-keepsake',{detail:'Discovery: '+label}))}}catch{}};window.addEventListener('werewolf-discovery',found);return()=>window.removeEventListener('werewolf-discovery',found)},[])}

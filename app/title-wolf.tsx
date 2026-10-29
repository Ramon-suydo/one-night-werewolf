'use client';
import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as T from 'three';
// Original box sculpture: pointed ears, tapered muzzle and two amber eyes.
export function TitleWolf({reduced}:{reduced:boolean}){
 const body=useRef<T.InstancedMesh>(null),eyes=useRef<T.InstancedMesh>(null),group=useRef<T.Group>(null);const dummy=useMemo(()=>new T.Object3D(),[]);
 useEffect(()=>{const parts:[[number,number,number],[number,number,number]][]=[[[0,1.5,0],[1.8,1.6,1]],[[0,.8,.6],[1.2,.55,.8]],[[-.65,2.5,0],[.5,1.1,.65]],[[.65,2.5,0],[.5,1.1,.65]],[[0,.8,1.1],[.55,.35,.25]],[[-.4,.45,.8],[.15,.4,.15]],[[.4,.45,.8],[.15,.4,.15]]];parts.forEach(([p,s],i)=>{dummy.position.set(...p);dummy.scale.set(...s);dummy.rotation.set(0,0,i===2?-.2:i===3?.2:0);dummy.updateMatrix();body.current?.setMatrixAt(i,dummy.matrix);body.current?.setColorAt(i,new T.Color(i>4?'#f4efe0':i===4?'#1a1226':i%2?'#69718a':'#8a8fa8'))});[-.48,.48].forEach((x,i)=>{dummy.position.set(x,1.65,.53);dummy.scale.set(.28,.13,.1);dummy.rotation.set(0,0,0);dummy.updateMatrix();eyes.current?.setMatrixAt(i,dummy.matrix)});for(const m of[body.current,eyes.current])if(m)m.instanceMatrix.needsUpdate=true;if(body.current?.instanceColor)body.current.instanceColor.needsUpdate=true},[dummy]);
 useFrame(({clock})=>{if(group.current&&!reduced){group.current.position.y=1+Math.sin(Math.floor(clock.elapsedTime*2))* .08;group.current.rotation.y=Math.sin(clock.elapsedTime*.3)*.08}});
 return <group ref={group} position={[0,1,-5]} scale={1.8}><instancedMesh ref={body} args={[undefined,undefined,7]}><boxGeometry/><meshLambertMaterial flatShading/></instancedMesh><instancedMesh ref={eyes} args={[undefined,undefined,2]}><boxGeometry/><meshBasicMaterial color="#ffd35a"/></instancedMesh></group>;
}

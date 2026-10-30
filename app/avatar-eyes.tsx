'use client';
import {useLayoutEffect,useRef} from 'react';
import * as T from 'three';
import type {Expression} from '@/lib/session-types';

// Both eyes share one draw call. Geometry changes only with expression or
// authorized wake state, while the parent head handles all motion.
export function AvatarEyes({face,sleeping,expression}:{face:number;sleeping:boolean;expression:Expression|undefined}){
 const mesh=useRef<T.InstancedMesh>(null);
 useLayoutEffect(()=>{if(!mesh.current)return;const transform=new T.Object3D();for(let i=0;i<2;i++){const x=i===0?-.14:.14;const height=sleeping?.025:expression==='shocked'?.15:expression==='suspicious'||expression==='sad'||expression==='smug'&&x<0?.035:face===5?.04:.08;transform.position.set(x,.05,.33);transform.rotation.set(0,0,expression==='angry'?(x<0?-.3:.3):0);transform.scale.set(face===3?.15:.08,height,.05);transform.updateMatrix();mesh.current.setMatrixAt(i,transform.matrix)}mesh.current.instanceMatrix.needsUpdate=true},[face,sleeping,expression]);
 return <instancedMesh ref={mesh} args={[undefined,undefined,2]}><boxGeometry args={[1,1,1]}/><meshBasicMaterial color="#1a1226" toneMapped={false}/></instancedMesh>;
}

'use client';
import {useEffect,useRef} from 'react';
import * as T from 'three';
import {appearanceToMaterials} from '@/assets/appearance';
import {replayPoint} from '@/lib/replay';
import type {SceneState} from '@/lib/scene';

// Seat colors identify people, never roles. These remain unchanged after swaps.
export function TableMats({view}:{view:SceneState|null}){
 const rim=useRef<T.InstancedMesh>(null),inside=useRef<T.InstancedMesh>(null),n=view?.order.length||0;
 useEffect(()=>{if(!view||!n)return;const transform=new T.Object3D();for(let i=0;i<n+3;i++){const p=replayPoint(i,n),player=view.players.find(v=>v.id===view.order[i]);transform.position.set(p[0],.065,p[2]);transform.rotation.set(-Math.PI/2,0,i<n?-i/n*Math.PI*2:0);transform.scale.set(1,1,1);transform.updateMatrix();rim.current?.setMatrixAt(i,transform.matrix);rim.current?.setColorAt(i,new T.Color(player?appearanceToMaterials(player.appearance).cloak:'#c4aa68'));transform.scale.set(.94,.95,1);transform.position.y=.07;transform.updateMatrix();inside.current?.setMatrixAt(i,transform.matrix)}for(const mesh of [rim.current,inside.current])if(mesh){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true}},[view,n]);
 if(!view||!n||view.phase==='lobby')return null;
 return <><instancedMesh ref={rim} args={[undefined,undefined,n+3]}><planeGeometry args={[1.16,1.62]}/><meshBasicMaterial transparent opacity={.55} toneMapped={false} side={T.DoubleSide}/></instancedMesh><instancedMesh ref={inside} args={[undefined,undefined,n+3]}><planeGeometry args={[1.16,1.62]}/><meshBasicMaterial color="#191321" side={T.DoubleSide}/></instancedMesh></>;
}

'use client';
import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as T from 'three';
import type {Card} from '@/engine';
import {getTabletAtlas,tabletIndex,ATLAS_COLS,ATLAS_ROWS} from '@/lib/tablet-atlas';
import {cardProgress} from '@/lib/card-interaction';
export type Card3DProps={id:string;face?:Card;state:'down'|'peeked'|'up';selectable:boolean;selected?:boolean;reduced?:boolean;onPeek?:(id:string)=>void;onSelect?:(id:string)=>void;onSwap?:(id:string,target:string)=>void};
let atlas:T.CanvasTexture|undefined;
export function Card3D({id,face,state,selectable,selected=false,reduced=false,onPeek,onSelect,onSwap}:Card3DProps){
 const group=useRef<T.Group>(null),mesh=useRef<T.InstancedMesh>(null),material=useRef<T.MeshBasicMaterial>(null),press=useRef<number|null>(null),fired=useRef(false),freeze=useRef(0),hover=useRef(false),angleValue=useRef(Math.PI);
 const texture=useMemo(()=>{atlas||=new T.CanvasTexture(getTabletAtlas());const t=atlas.clone();t.repeat.set(1/ATLAS_COLS,1/ATLAS_ROWS);t.magFilter=T.NearestFilter;t.minFilter=T.NearestFilter;t.colorSpace=T.SRGBColorSpace;return t},[]);
 useEffect(()=>()=>texture.dispose(),[texture]);
 useEffect(()=>{mesh.current?.setMatrixAt(0,new T.Matrix4());if(mesh.current)mesh.current.instanceMatrix.needsUpdate=true;freeze.current=performance.now()+(!reduced&&state==='up'?80:0)},[state,reduced]);
 useFrame((_,delta)=>{
  const now=performance.now();if(now<freeze.current)return;
  if(press.current!==null&&cardProgress(press.current,now)===1&&!fired.current){fired.current=true;onPeek?.(id)}
  const angle=state==='up'?0:state==='peeked'?-.55:Math.PI;
  if(group.current){const target=angle+(press.current!==null&&!fired.current?-.12:0);angleValue.current=reduced?target:T.MathUtils.damp(angleValue.current,target,13,delta);group.current.rotation.y=state==='up'?Math.round(angleValue.current/(Math.PI/6))*(Math.PI/6):angleValue.current;group.current.position.y=reduced?0:T.MathUtils.damp(group.current.position.y,hover.current?.12:0,10,delta)}
  const show=!!face&&state!=='down'&&Math.abs(angleValue.current)<Math.PI/2,index=tabletIndex(show?face!.role:'back');texture.offset.set(index%ATLAS_COLS/ATLAS_COLS,1-(Math.floor(index/ATLAS_COLS)+1)/ATLAS_ROWS);
  if(material.current)material.current.color.set(selected?'#ffe08a':selectable&&hover.current?'#d9ceff':'#ffffff');
 });
 return <group ref={group}><instancedMesh ref={mesh} args={[undefined,undefined,1]} userData={{cardId:id}} onPointerOver={e=>{if(selectable){e.stopPropagation();hover.current=true}}} onPointerOut={()=>{hover.current=false;press.current=null}} onPointerDown={e=>{if(!selectable)return;e.stopPropagation();press.current=performance.now();fired.current=false;(e.target as Element|null)?.setPointerCapture(e.pointerId)}} onPointerUp={e=>{if(!selectable)return;e.stopPropagation();const target=e.intersections.find(hit=>hit.object.userData.cardId&&hit.object.userData.cardId!==id)?.object.userData.cardId as string|undefined;if(target)onSwap?.(id,target);else if(!fired.current)onSelect?.(id);press.current=null;(e.target as Element|null)?.releasePointerCapture(e.pointerId)}} onPointerCancel={()=>{press.current=null}}><planeGeometry args={[.8,4/3]}/><meshBasicMaterial ref={material} map={texture} alphaTest={.5} side={T.DoubleSide}/></instancedMesh></group>;
}

'use client';
import {useEffect,useState} from 'react';
import {useThree} from '@react-three/fiber';
import * as T from 'three';
import {appearanceToMaterials,type Appearance} from '@/assets/appearance';
import type {SceneState} from '@/lib/scene';
type AvatarRecord={id:string;appearance:Appearance;hash:string;expected:string;torso:{x:number;y:number};tier:string};
declare global{interface Window{__werewolfAvatars?:()=>AvatarRecord[]}}
export function AvatarDebug({view,tier}:{view:SceneState|null;tier:string}){
 const {scene,camera,gl}=useThree();
 useEffect(()=>{
  if(process.env.NODE_ENV!=='development'&&process.env.NEXT_PUBLIC_AVATAR_DEBUG!=='1')return;
  const vector=new T.Vector3();const warned=new Set<string>();
  const read=()=>{const rows:AvatarRecord[]=[];scene.traverse(o=>{if(!(o instanceof T.Mesh)||!o.userData.avatarId)return;const player=view?.players.find(p=>p.id===o.userData.avatarId);if(!player)return;const material=o.material as T.MeshBasicMaterial;const expected=appearanceToMaterials(player.appearance);const color='#'+material.color.getHexString(T.SRGBColorSpace);const part=(name:string,fallback:string)=>{const mesh=scene.getObjectByName(name+player.id) as T.Mesh|undefined;return mesh?'#'+(mesh.material as T.MeshBasicMaterial).color.getHexString(T.SRGBColorSpace):fallback};const hash=[color,part('avatar-hat-',expected.hat),part('avatar-face-',expected.face)].map(c=>c.slice(1)).join(':');o.getWorldPosition(vector).project(camera);const rect=gl.domElement.getBoundingClientRect();rows.push({id:player.id,appearance:player.appearance,hash,expected:expected.hash,torso:{x:(vector.x*.5+.5)*rect.width+rect.left,y:(-vector.y*.5+.5)*rect.height+rect.top},tier});if(hash!==expected.hash&&!warned.has(player.id)){warned.add(player.id);console.warn('Avatar base color mismatch:',player.id)}});return rows};
  window.__werewolfAvatars=read;
  const timer=setInterval(()=>window.dispatchEvent(new CustomEvent('werewolf-avatar-debug',{detail:read()})),1000);
  return()=>{delete window.__werewolfAvatars;clearInterval(timer)};
 },[view,tier,scene,camera,gl]);return null;
}
export function AvatarOverlay(){
 const[open,setOpen]=useState(false),[rows,setRows]=useState<AvatarRecord[]>([]);
 useEffect(()=>{if(process.env.NODE_ENV!=='development'&&process.env.NEXT_PUBLIC_AVATAR_DEBUG!=='1')return;const key=(e:KeyboardEvent)=>{if(e.code==='F3'){e.preventDefault();setOpen(v=>!v)}};const update=(e:Event)=>setRows((e as CustomEvent<AvatarRecord[]>).detail);window.addEventListener('keydown',key);window.addEventListener('werewolf-avatar-debug',update);return()=>{window.removeEventListener('keydown',key);window.removeEventListener('werewolf-avatar-debug',update)}},[]);
 return open?<pre className="avatar-debug" aria-label="Avatar diagnostics">{rows.map(r=>`${r.id.slice(0,8)} ${r.appearance.cloakId}/${r.appearance.hatId}/${r.appearance.faceId} ${r.hash} ${r.hash===r.expected?'OK':'MISMATCH'} ${r.tier}`).join('\n')}</pre>:null;
}

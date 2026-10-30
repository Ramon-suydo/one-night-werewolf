'use client';
import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as T from 'three';
import {Card3D} from '@/components/Card3D';
import {replayFrame,replayDisplayPoint,type ReplayControl} from '@/lib/replay';

function GhostCard({index,control}:{index:number;control:ReplayControl}){
 const group=useRef<T.Group>(null),frame=replayFrame(control),n=control.data.order.length,event=frame.event;
 const point=useMemo(()=>new T.Vector3(...replayDisplayPoint(index,n)),[index,n]);
 const projected=useMemo(()=>new T.Vector3(),[]);
 const moving=event?.kind==='swap'&&event.targets?.includes(index)&&!control.showOriginal;
 const source=moving?event.targets!.find(i=>i!==index):undefined;
 const origin=useMemo(()=>new T.Vector3(...replayDisplayPoint(source??index,n)),[source,index,n]);
 useFrame(({camera})=>{if(!group.current)return;const age=Math.max(0,(performance.now()-control.started)/1000)*control.speed,p=control.calm||!moving?1:T.MathUtils.smoothstep(Math.min(1,age/.75),0,1);group.current.position.copy(origin).lerp(point,p);group.current.position.y+=(moving&&!control.calm?Math.sin(p*Math.PI)*1.4:0);const tag=document.getElementById('replay-seat-'+index);if(tag){const v=projected.copy(point);v.z-=1.6;v.project(camera);tag.style.transform=`translate(-50%,-50%) translate(${(v.x*.5+.5)*innerWidth}px,${(-v.y*.5+.5)*innerHeight}px)`}});
 return <group ref={group} position={point} rotation={[-Math.PI/2,0,0]} scale={1.6}><Card3D id={'replay-'+index} face={frame.cards[index]} state="up" selectable={true} onSelect={()=>window.dispatchEvent(new CustomEvent('werewolf-replay-inspect',{detail:index}))} selected={!!event?.targets?.includes(index)} reduced={true}/></group>;
}

export default function ReplayScene({control}:{control:ReplayControl}){
 const hand=useRef<T.Group>(null),other=useRef<T.Group>(null),frame=replayFrame(control),n=control.data.order.length;
 const curve=useMemo(()=>{const event=frame.event;if(!event?.actor||!event.targets?.length)return null;const actor=control.data.order.indexOf(event.actor),a=new T.Vector3(...replayDisplayPoint(actor,n)),b=new T.Vector3(...replayDisplayPoint(event.targets[0],n));const mid=a.clone().lerp(b,.5);mid.y+=2;const points=new T.QuadraticBezierCurve3(a,mid,b).getPoints(24);return new T.BufferGeometry().setFromPoints(points)},[frame.event,control.data.order,n]);
 useEffect(()=>()=>{curve?.dispose()},[curve]);
 // Buffer geometry is replaced only when seeking, never during a frame.
 useFrame(()=>{const e=frame.event,age=(performance.now()-control.started)/1000*control.speed;for(const [i,ref]of [hand,other].entries()){if(!ref.current)continue;const seat=e?.targets?.[i];ref.current.visible=!control.calm&&seat!==undefined&&['peek','swap','copy'].includes(e?.kind||'')&&age<1;if(seat!==undefined){const p=replayDisplayPoint(seat,n);ref.current.position.set(p[0],p[1]+.7+Math.sin(Math.min(1,age)*Math.PI)*.25,p[2]);}}});
 return <group><mesh position={[0,.15,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[7.5,12]}/><meshBasicMaterial color="#18182b"/></mesh><mesh position={[0,.17,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[7.2,7.26,48]}/><meshBasicMaterial color="#987d4f"/></mesh>{frame.cards.map((_,i)=><GhostCard key={i} index={i} control={control}/>)}{curve&&<lineSegments geometry={curve}><lineBasicMaterial color={frame.event?.kind==='swap'?'#5edbce':'#ffe1a0'} transparent opacity={.6}/></lineSegments>}{[hand,other].map((ref,i)=><group ref={ref} key={i} visible={false}><mesh><boxGeometry args={[.35,.12,.4]}/><meshBasicMaterial color="#c5ddff" transparent opacity={.6}/></mesh>{[-.12,0,.12].map(x=><mesh key={x} position={[x,0,-.3]}><boxGeometry args={[.08,.1,.3]}/><meshBasicMaterial color="#c5ddff" transparent opacity={.6}/></mesh>)}</group>)}</group>;
}

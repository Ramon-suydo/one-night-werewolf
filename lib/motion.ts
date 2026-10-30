import type { PositionPacket } from './social';
export type MotionBus = {
 clockOffset?:number;replay?:import('./replay').ReplayControl|null;hovered?:string|null;teammates?:string[];nightTargets?:string[];
  local: { x: number; z: number }; stick: { x: number; z: number };
  remote: Map<string, PositionPacket>; focus: string | null; interaction: string | null;
  overview: boolean; skipCamera: boolean; quality: 'high' | 'low';
  exploring: boolean; batterySaver: boolean; calm: boolean;
  introStarted: number | null;
  awake:boolean;selected:string[];onSelect?:((id:string)=>void);onMenu?:((tab:'Notes'|'Roles & rules'|'Players'|'Settings'|'Help')=>void);
  onReact?:((kind:'point'|'wave',target?:string)=>void);onReactions?:()=>void;
  onPeek?:((id:string)=>void);onSwap?:((a:string,b:string)=>void);
  onLandmark?:((id:string)=>void);onReady?:((ready:boolean)=>void);mirror:boolean;previewAppearance:import('@/assets/appearance').Appearance;
};
export function seat(index: number, count: number): [number, number, number] {
  const a = index / Math.max(3, count) * Math.PI * 2;
  return [Math.sin(a) * 5.5, 0, Math.cos(a) * 5.5];
}
export function makeMotion(): MotionBus {
  return { local: { x: 0, z: 5.5 }, stick: { x: 0, z: 0 }, remote: new Map(), focus: null, interaction: null, overview: false, skipCamera: false, quality: 'high', exploring: false, batterySaver: false, calm: false, introStarted: null,awake:false,selected:[],mirror:false,previewAppearance:{cloakId:'gold',hatId:'pointed',faceId:'plain'} };
}

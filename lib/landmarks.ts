export const LANDMARKS=[
 {id:'roles',label:'Read the notice board',x:-7,z:1},
 {id:'gallery',label:'Visit the standing stones',x:-3,z:-10},
 {id:'tutorial',label:'Ask the guide owl',x:-9,z:-7},
 {id:'settings',label:'Open the cabin',x:-8,z:-7.3,lobby:true,host:true},
 {id:'start',label:'Light the start stone',x:2,z:4,lobby:true,host:true},
 {id:'appearance',label:'Look into the pond',x:8,z:-6},
 {id:'ready',label:'Stand in the ready ring',x:-2,z:4,lobby:true},
] as const;
export type LandmarkId=typeof LANDMARKS[number]['id'];
export function nearestLandmark(x:number,z:number,phase:string,host:boolean){if(!['day','lobby'].includes(phase))return;let found:typeof LANDMARKS[number]|undefined,distance=2.2;for(const place of LANDMARKS){if('lobby'in place&&place.lobby&&phase!=='lobby'||'host'in place&&place.host&&!host)continue;const d=Math.hypot(x-place.x,z-place.z);if(d<distance){distance=d;found=place}}return found}

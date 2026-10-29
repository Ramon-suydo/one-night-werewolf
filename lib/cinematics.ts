export type RailKey={at:number;position:[number,number,number];look:[number,number,number];caption:string};
export const INTRO_RAIL:readonly RailKey[]=[
 {at:0,position:[-42,30,38],look:[0,4,0],caption:'Beyond the pines, a fire is waiting.'},
 {at:5,position:[-20,8,-25],look:[0,2,0],caption:'Every face holds a secret.'},
 {at:10,position:[-7,3,-14],look:[0,1.5,0],caption:'One night can change everything.'},
 {at:14,position:[5,5,10],look:[0,1.2,0],caption:'Gather close. Trust carefully.'},
 {at:18,position:[0,15,21],look:[0,1.2,0],caption:'Gather close. Trust carefully.'},
];
export function sampleRail(keys:readonly RailKey[],seconds:number){const t=Math.max(keys[0].at,Math.min(keys.at(-1)!.at,seconds)),i=keys.findIndex((k,j)=>j<keys.length-1&&t<keys[j+1].at),a=keys[i<0?keys.length-1:i],b=keys[Math.min(keys.length-1,i<0?keys.length-1:i+1)],p=a===b?1:(t-a.at)/(b.at-a.at),e=p*p*(3-2*p);return{position:a.position.map((v,j)=>v+(b.position[j]-v)*e) as [number,number,number],look:a.look.map((v,j)=>v+(b.look[j]-v)*e) as [number,number,number],caption:a.caption}}

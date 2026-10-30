import type {Role,RoleAction,SimpleAction} from '@/engine';
import type {Snapshot} from './session-types';

export function nightPower(s:Snapshot){return s.private.role==='doppel'&&s.private.copiedRole?s.private.copiedRole:s.private.role}
export function optionalPower(s:Snapshot){const role=nightPower(s);return role==='robber'||role==='troublemaker'||role==='wolf'&&s.private.report.some(r=>r.text.includes('lone wolf'))}
export function nightChoice(s:Snapshot|null,selected:string[],pass=false):RoleAction|undefined{
 if(!s||s.public.phase!=='night'||!s.private.awake||s.private.locked)return;
 const p=s.private,role=nightPower(s);if(!role)return;
 const people=selected.filter(id=>s.public.order.includes(id)&&id!==p.id),centers=selected.filter(id=>/^center-[012]$/.test(id)).map(id=>Number(id.slice(7)) as 0|1|2);
 let action:RoleAction;
 if(role==='doppel'){if(people.length!==1||centers.length)return;return{role,target:people[0]}}
 if(role==='seer'){if(centers.length===2&&new Set(centers).size===2&&!people.length)action={role,mode:'center',centers:centers as [0|1|2,0|1|2]};else if(people.length===1&&!centers.length)action={role,mode:'player',target:people[0]};else return}
 else if(role==='drunk'){if(centers.length!==1||people.length)return;action={role,center:centers[0]}}
 else if(role==='robber'){if(people.length===1&&!centers.length)action={role,target:people[0]};else if(pass&&!selected.length)action={role};else return}
 else if(role==='troublemaker'){if(people.length===2&&new Set(people).size===2&&!centers.length)action={role,targets:people as [string,string]};else if(pass&&!selected.length)action={role};else return}
 else if(role==='wolf'){if(centers.length===1&&!people.length&&optionalPower(s))action={role,center:centers[0]};else if(!selected.length&&(pass||!optionalPower(s)))action={role};else return}
 else action={role};
 if(p.role==='doppel'&&p.step===0&&p.action?.role==='doppel'&&!('skip'in p.action))return{...p.action,followup:action as SimpleAction};
 return action;
}
export function selectionLabel(s:Snapshot,selected:string[]){return selected.map(id=>id.startsWith('center-')?['Left center','Middle center','Right center'][Number(id.slice(7))]:s.public.players.find(p=>p.id===id)?.name||'Unknown seat').join(' + ')}
export const TABLE_INSTRUCTIONS:Partial<Record<Role,string>>={seer:'Inspect one player OR two center cards.',robber:'Exchange your card with another player. Look at your new card.',troublemaker:'Exchange two other players. Keep both cards face down.',drunk:'Exchange with one center card. Do not look at it.',doppel:'Copy one player. Their original role becomes your power.',wolf:'Find your pack. A lone wolf may inspect one center.'};
export function privateCardMove(action:RoleAction|undefined,me:string){
 if(!action||'skip'in action)return;
 const a=action.role==='doppel'?action.followup||action.later:action;
 if(a?.role==='robber'&&a.target)return{from:me,to:a.target};
 if(a?.role==='troublemaker'&&a.targets)return{from:a.targets[0],to:a.targets[1]};
 if(a?.role==='drunk')return{from:me,to:'center-'+a.center};
}

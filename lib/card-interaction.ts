import type {Card,RoleAction} from '@/engine';
import type {Snapshot} from './session-types';
export function permittedFaces(snapshot:Snapshot|null):Record<string,Card>{
 const faces:Record<string,Card>={};if(!snapshot)return faces;const s=snapshot.public,p=snapshot.private;
 if(s.phase==='result'&&s.result){s.result.cards.forEach((card,i)=>{faces[i<s.order.length?s.order[i]:'center-'+(i-s.order.length)]={...card}});return faces}
 if(s.phase==='dealing'&&p.revealed&&p.card){faces[p.id]={...p.card};return faces}
 if(s.phase!=='night'||!p.awake)return faces;
 const raw=p.action,action:RoleAction|undefined=raw?.role==='doppel'&&!('skip'in raw)?p.step===0?raw.followup:raw.later:raw;
 const role=p.role==='doppel'?p.copiedRole:p.role;
 if(p.card)faces[p.id]={...p.card};
 if(raw?.role==='doppel'&&!('skip'in raw)&&p.copiedRole)faces[raw.target]={role:p.copiedRole};
 if(action&&'skip'in action)return faces;
 if(role==='robber'&&action?.role==='robber'&&action.target||role==='drunk'&&action?.role==='drunk')delete faces[p.id];
 const last=p.report.filter(r=>r.cards?.length).at(-1);
 if(!last?.cards)return faces;
 if(action?.role==='seer'){if(action.mode==='player')faces[action.target]={...last.cards[0]};else action.centers.forEach((center,i)=>{if(last.cards?.[i])faces['center-'+center]={...last.cards[i]}})}
 if(action?.role==='wolf'&&action.center!==undefined&&last.text.includes('peeked'))faces['center-'+action.center]={...last.cards[0]};
 if(role==='robber'&&last.text.includes('robbed')||role==='insomniac'&&last.text.includes('end of the night'))faces[p.id]={...last.cards[0]};
 return faces;
}
export function cardProgress(start:number,now:number){return Math.max(0,Math.min(1,(now-start)/550))}

export function interactiveCards(snapshot:Snapshot|null):string[]{
 if(!snapshot)return[];const s=snapshot.public,p=snapshot.private;
 if(!s.order.includes(p.id))return[];
 if(s.phase==='dealing')return p.revealed?[]:[p.id];
 if(s.phase!=='night'||!p.awake||p.locked)return[];
 const role=p.role==='doppel'?p.copiedRole||'doppel':p.role,others=s.order.filter(id=>id!==p.id),centers=['center-0','center-1','center-2'];
 if(role==='seer')return[...others,...centers];
 if(role==='doppel'||role==='troublemaker')return others;
 if(role==='robber')return[p.id,...others];
 if(role==='drunk')return[p.id,...centers];
 if(role==='wolf'&&p.report.some(r=>r.text.includes('lone wolf')))return centers;
 return[];
}

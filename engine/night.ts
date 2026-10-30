import {CENTER_NAMES,DECISIONS} from '../rules/decisions';
import {nightQueue} from './nightQueue';
import {NIGHT_WINDOWS} from '../rules/nightWindows';
import {effective,requireRule,type Card,type GameEvent,type Role,type RoleAction,type Round,type SimpleAction} from './types';
const clone=(card:Card):Card=>({...card});
export function copiedRole(g:Round):Role|undefined{const i=g.original.slice(0,g.order.length).findIndex(c=>c.role==='doppel');if(i<0)return;const a=g.actions[g.order[i]];if(a?.role!=='doppel'||'skip'in a)return;return g.original[g.order.indexOf(a.target)]?.role}
export function originalRole(g:Round,id:string):Role{const r=g.original[g.order.indexOf(id)]?.role;return r==='doppel'?(copiedRole(g)||'villager'):r}
export function validateAction(g:Round,id:string,a:RoleAction){
 const index=g.order.indexOf(id);requireRule(index>=0,'This seat is not playing.');const role=g.original[index].role;requireRule(a.role===role,'Use your original role.');
 const other=(target:string)=>requireRule(g.order.includes(target)&&target!==id,'Choose another player.');
 const center=(i:number)=>requireRule(Number.isInteger(i)&&i>=0&&i<3,'Choose Left, Middle or Right.');
 const simple=(role:Role,action:SimpleAction|{role:Role;skip:true})=>{
  requireRule(action.role===role,'Use the copied role.');if('skip'in action){requireRule(['wolf','robber','troublemaker','minion','mason','insomniac','hunter','tanner','villager'].includes(role),'This role must choose a target.');return;}
  if(action.role==='wolf'&&action.center!==undefined){center(action.center);requireRule(g.order.filter(p=>originalRole(g,p)==='wolf').length===1,'Only a lone wolf may peek.');}
  if(action.role==='seer'){if(action.mode==='player')other(action.target);else{requireRule(action.centers.length===2&&action.centers[0]!==action.centers[1],'Choose two different center tablets.');action.centers.forEach(center)}}
  if(action.role==='robber'&&action.target)other(action.target);
  if(action.role==='troublemaker'&&action.targets){requireRule(action.targets.length===2&&action.targets[0]!==action.targets[1],'Choose two different players.');action.targets.forEach(other)}
  if(action.role==='drunk')center(action.center);
 };
 if(a.role==='doppel'){
  requireRule(!('skip'in a),'Choose another player to copy.');other(a.target);const copy=g.original[g.order.indexOf(a.target)].role;requireRule(copy!=='doppel','Copy a different tablet.');if(a.followup){requireRule(['seer','robber','troublemaker','drunk'].includes(copy),'This power wakes later or needs no action.');simple(copy,a.followup)}if(a.later){requireRule(['wolf','minion','mason','insomniac'].includes(copy),'This copied role does not wake later.');simple(copy,a.later)}
 }else simple(role,a);
}
export function resolveNight(g:Round,through=NIGHT_WINDOWS.length):Round{
 const out:Round={...g,cards:g.original.map(clone),reports:Object.fromEntries(g.order.map(id=>[id,[]])),events:[{kind:'deal',step:-1,at:0,after:g.original.map(clone)}]};const n=g.order.length;
 const report=(id:string,text:string,cards?:Card[],seats?:string[])=>out.reports[id].push({text,...(cards?{cards:cards.map(clone)}:{}),...(seats?{seats}:{})});
 const queue=nightQueue(0,g.settings.speed);
 const event=(e:Omit<GameEvent,'at'>)=>{const opening=queue[e.step]?.opens||0,closing=queue[e.step]?.closes||opening;const key=e.actor?e.actor+':'+e.step+(e.step===0&&e.kind!=='copy'?':power':''):'';const raw=e.actor?(g.actionAt[key]??g.actionAt[e.actor+':'+e.step]??g.actionAt[e.actor]??opening):opening;out.events.push({...e,at:Math.min(closing,Math.max(opening,raw))})};
 const swap=(actor:string,i:number,j:number,step:number)=>{const before=[clone(out.cards[i]),clone(out.cards[j])];[out.cards[i],out.cards[j]]=[out.cards[j],out.cards[i]];event({kind:'swap',step,actor,targets:[i,j],before,after:[clone(out.cards[i]),clone(out.cards[j])]})};
 const inspect=(id:string,indices:number[],step:number,text:string)=>{report(id,text,indices.map(i=>out.cards[i]));event({kind:'peek',step,actor:id,targets:indices,after:indices.map(i=>clone(out.cards[i]))})};
 const apply=(id:string,role:Role,action:SimpleAction|undefined,step:number)=>{
  if(!action)return;const i=g.order.indexOf(id);
  if(role==='seer'&&action.role==='seer'){const indices=action.mode==='player'?[g.order.indexOf(action.target)]:action.centers.map(c=>n+c);inspect(id,indices,step,'You inspected these tablets:')}
  if(role==='robber'&&action.role==='robber'&&action.target){swap(id,i,g.order.indexOf(action.target),step);report(id,'You robbed a player. Your new tablet:',[out.cards[i]],[action.target])}
  if(role==='troublemaker'&&action.role==='troublemaker'&&action.targets){swap(id,g.order.indexOf(action.targets[0]),g.order.indexOf(action.targets[1]),step);report(id,'You exchanged these players without looking.',undefined,action.targets)}
  if(role==='drunk'&&action.role==='drunk'){swap(id,i,n+action.center,step);report(id,`You exchanged with ${CENTER_NAMES[action.center]}. Your new role remains unknown.`)}
  if(role==='wolf'&&action.role==='wolf'&&action.center!==undefined)inspect(id,[n+action.center],step,`You peeked at ${CENTER_NAMES[action.center]}:`);
 };
 const dg=g.original.slice(0,n).findIndex(c=>c.role==='doppel'),dgId=g.order[dg],dgAction=g.actions[dgId];let copy:Role|undefined;
 for(let step=0;step<Math.min(through,NIGHT_WINDOWS.length);step++){
  const role=NIGHT_WINDOWS[step].role;event({kind:'step',step});
  if(role==='doppel'&&dg>=0&&dgAction?.role==='doppel'&&!('skip'in dgAction)){
   copy=g.original[g.order.indexOf(dgAction.target)].role;out.cards[dg]={role:'doppel',copy};report(dgId,'You copied this player. Your copied role:',[{role:copy}],[dgAction.target]);event({kind:'copy',step,actor:dgId,targets:[g.order.indexOf(dgAction.target)],after:[clone(out.cards[dg])]});apply(dgId,copy,dgAction.followup,step);
  }
  if(role==='doppel')continue;
  for(let i=0;i<n;i++){
   const id=g.order[i],original=g.original[i].role,current=original==='doppel'?copy:original;if(current!==role)continue;
   const a=g.actions[id],action=original==='doppel'&&a?.role==='doppel'&&!('skip'in a)?a.later:a&&!('skip'in a)&&a.role!=='doppel'?a:undefined;
   if(role==='wolf'||role==='minion'||role==='mason'){
    const seeking=role==='mason'?'mason':'wolf';const peers=g.order.filter((other,j)=>other!==id&&(g.original[j].role==='doppel'?copy:g.original[j].role)===seeking);
    report(id,role==='minion'?(peers.length?'These players began as werewolves.':'No werewolves began among the players.'):role==='mason'?(peers.length?'Your fellow Mason:':'The other Mason is in the center.'):(peers.length?'Your pack:':'You are a lone wolf.'),undefined,peers);
   }
   apply(id,role,action,step);
   if(role==='insomniac'){
    const card=clone(out.cards[i]);if(card.role==='doppel'&&DECISIONS.unmovedDoppelInsomniacDisplaysDoppel)delete card.copy;inspect(id,[i],step,'Your tablet at the end of the night:');out.reports[id].at(-1)!.cards=[card];
   }
  }
 }
 if(!DECISIONS.copiedMarkerTravelsWithCard&&copy&&dg>=0){out.cards.forEach(c=>{if(c.role==='doppel')delete c.copy});out.cards[dg]={role:copy};}
 return out;
}
export function effectiveCards(g:Round){return g.cards.map(effective)}

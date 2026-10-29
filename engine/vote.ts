import {SOLO_OBJECTIVES} from '../rules/soloObjectives';
import {DECISIONS} from '../rules/decisions';
import {effective,requireRule,type Result,type Role,type Round} from './types';
import {originalRole} from './night';
export function validateVote(g:Round,id:string,target:string|null){requireRule(g.order.includes(id),'This seat is not playing.');requireRule(target!==id,'You cannot vote for yourself.');requireRule(target===null?g.settings.allowSkip:g.order.includes(target),'Choose another player or enable Skip.');}
export function evaluate(g:Round):Result{
 const n=g.order.length,cards=g.cards.map(c=>({...c})),roles=cards.map(effective),counts=g.order.map(id=>Object.values(g.votes).filter(t=>t===id).length),max=Math.max(0,...counts);
 const banished=max>=DECISIONS.minimumVotesToBanish&&!counts.every(c=>c===1)?g.order.filter((_,i)=>counts[i]===max):[],hunted:string[]=[];
 for(let cursor=0;cursor<banished.length;cursor++){const id=banished[cursor],target=g.votes[id];if(roles[g.order.indexOf(id)]==='hunter'&&target&&g.order.includes(target)&&!banished.includes(target)){banished.push(target);hunted.push(target)}}
 const has=(role:Role)=>roles.slice(0,n).includes(role),dead=(role:Role)=>banished.some(id=>roles[g.order.indexOf(id)]===role),tanner=dead('tanner'),wolf=dead('wolf');
 const village=has('wolf')?wolf:has('minion')?dead('minion')||!banished.length:!banished.length;
 const wolfTeam=!village&&!tanner&&(has('wolf')||has('minion'));
 const labels=new Set<string>();const players=g.order.map((id,i)=>{
  const original=originalRole(g,id),solo=g.settings.ruleset==='solo'&&!!SOLO_OBJECTIVES[original];let won=false,reason='',goal='';
  if(solo){goal=SOLO_OBJECTIVES[original]!;const raw=g.actions[id],a=raw?.role==='doppel'&&!('skip'in raw)?raw.followup:raw;
   if(original==='tanner')won=banished.includes(id);
   if(original==='drunk')won=counts[i]===0;
   const swapped=g.events.some(e=>e.kind==='swap'&&e.actor===id);
   if(swapped&&original==='troublemaker'&&a?.role==='troublemaker'&&!('skip'in a)&&a.targets)won=a.targets.some(t=>banished.includes(t))&&!banished.includes(id);
   if(swapped&&original==='robber'&&a?.role==='robber'&&!('skip'in a)&&a.target)won=banished.includes(a.target)&&!banished.includes(id);
   reason=won?'Your personal goal was met.':'Your personal goal was not met.';if(won)labels.add('the '+({tanner:'Tanner',drunk:'Drunk',troublemaker:'Troublemaker',robber:'Robber'} as Record<string,string>)[original]);
  }else{
   const r=roles[i],team=r==='wolf'||r==='minion'?'werewolf':'village';
   won=g.settings.ruleset==='classic'&&r==='tanner'?tanner:team==='werewolf'?wolfTeam:village;goal=g.settings.ruleset==='classic'&&r==='tanner'?'Be banished.':team==='werewolf'?'Keep the wolf team alive.':'Banish a wolf; with none, avoid an innocent loss.';
   reason=g.settings.ruleset==='classic'&&r==='tanner'?(won?'Your final Tanner tablet was banished.':'Your final Tanner tablet survived.'):has('wolf')?(wolf?'A final Werewolf was banished.':'Every final Werewolf survived.') :has('minion')?(village?'No wolves: the Minion or nobody was banished.':'No wolves: someone else fell while the Minion survived.'):(village?'No wolves or Minion: nobody was banished.':'No wolves or Minion: an innocent was banished.');
   if(won)labels.add(g.settings.ruleset==='classic'&&r==='tanner'?'the Tanner':team==='werewolf'?'the werewolves':'the village');
  }
  return{id,won,role:roles[i],goal,reason};
 });
 const order=['the village','the werewolves','the Tanner','the Drunk','the Troublemaker','the Robber'],winners=order.filter(s=>labels.has(s));const joined=winners.length>2?winners.slice(0,-1).join(', ')+' and '+winners.at(-1):winners.join(' and ');
 return{cards,effective:roles,counts,banished,hunted,winners,players,banner:winners.length?'Victory for '+joined+'!':'Nobody wins!'};
}

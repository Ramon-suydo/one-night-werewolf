import {describe,it,expect} from 'vitest';
import {ROLES,buildDeck,validateDeck,seeded,deal,resolveNight,validateAction,evaluate,validateVote,nightQueue,effective,type Role,type Round,type RoleAction,type Ruleset} from '../engine';
function fixture(roles:Role[],ruleset:Ruleset='classic'):Round{const original=[...roles,'villager','wolf','minion'].map(role=>({role:role as Role}));return{order:roles.map((_,i)=>String(i)),original,cards:structuredClone(original),actions:{},actionAt:{},reports:{},events:[],votes:{},settings:{ruleset,allowSkip:true,doppel:true,daySeconds:300,speed:1}}}
describe('canonical decks and queue',()=>{
 for(let n=3;n<=10;n++)for(const doppel of [false,true])for(const ruleset of ['classic','solo'] as const)it(`${n} seats, copy ${doppel}, ${ruleset}`,()=>{const deck=buildDeck(n,seeded(n),{doppel});validateDeck(deck,n);const a=deal(Array.from({length:n},(_,i)=>String(i)),deck,seeded(42),{ruleset,doppel,allowSkip:true,daySeconds:300,speed:1});expect(a).toEqual(deal(a.order,deck,seeded(42),a.settings));expect(a.cards).toHaveLength(n+3);expect([0,2]).toContain(deck.filter(r=>r==='mason').length)});
 for(const speed of [.7,1,1.4])it(`fixed windows at ${speed}`,()=>{const q=nightQueue(100,speed);expect(q.map(s=>s.role)).toEqual(ROLES.filter(r=>!['hunter','tanner','villager'].includes(r)));expect(q.at(-1)!.ends-100).toBe(155000*speed);q.forEach((s,i)=>{if(i)expect(s.opens).toBe(q[i-1].ends)})});
 it('explains the impossible ten-player beginner deck',()=>expect(()=>buildDeck(10,seeded(1),{preset:'beginner'})).toThrow('9 players'));
});
describe('Doppelgänger',()=>{
 for(const role of ROLES.filter(r=>r!=='doppel'))for(const ruleset of ['classic','solo'] as const)it(`copies ${role}, ${ruleset}`,()=>{const g=fixture(['doppel',role,'villager'],ruleset);g.actions['0']={role:'doppel',target:'1'};const out=resolveNight(g);expect(out.cards[0]).toEqual({role:'doppel',copy:role});expect(out.reports['0'][0].cards).toEqual([{role}]);expect(out.original[0]).toEqual({role:'doppel'});expect(effective(out.cards[0])).toBe(role)});
 it('robs before the ordinary Robber; the marker travels',()=>{const g=fixture(['doppel','robber','wolf']);g.actions={'0':{role:'doppel',target:'1',followup:{role:'robber',target:'2'}},'1':{role:'robber',target:'0'}};const out=resolveNight(g);expect(out.cards.slice(0,3)).toEqual([{role:'robber'},{role:'wolf'},{role:'doppel',copy:'robber'}]);expect(out.reports['0'][1].cards).toEqual([{role:'wolf'}])});
 it('joins the pack and prevents a lone-wolf peek',()=>{const g=fixture(['doppel','wolf','villager']);g.actions['0']={role:'doppel',target:'1'};expect(()=>validateAction(g,'1',{role:'wolf',center:0})).toThrow('lone');expect(resolveNight(g).reports['1'][0].seats).toEqual(['0'])});
 it('shows an unmoved Doppel-Insomniac as Doppelgänger',()=>{const g=fixture(['doppel','insomniac','wolf']);g.actions['0']={role:'doppel',target:'1'};expect(resolveNight(g).reports['0'].at(-1)!.cards).toEqual([{role:'doppel'}])});
 it('rejects self copying and mismatched copied powers',()=>{const g=fixture(['doppel','seer','wolf']);expect(()=>validateAction(g,'0',{role:'doppel',target:'0'})).toThrow();expect(()=>validateAction(g,'0',{role:'doppel',target:'1',followup:{role:'drunk',center:0}})).toThrow()});
});
describe('actions',()=>{
 const legal:Record<Exclude<Role,'doppel'>,RoleAction>={wolf:{role:'wolf'},minion:{role:'minion'},mason:{role:'mason'},seer:{role:'seer',mode:'center',centers:[0,2]},robber:{role:'robber',target:'1'},troublemaker:{role:'troublemaker',targets:['1','2']},drunk:{role:'drunk',center:1},insomniac:{role:'insomniac'},hunter:{role:'hunter'},tanner:{role:'tanner'},villager:{role:'villager'}};
 for(const [role,action]of Object.entries(legal))it(`resolves ${role}`,()=>{const g=fixture([role as Role,'villager','villager']);expect(()=>validateAction(g,'0',action)).not.toThrow();g.actions['0']=action;expect(resolveNight(g).events.filter(e=>e.kind==='step')).toHaveLength(9)});
 it('orders Robber, Troublemaker, Drunk, Insomniac',()=>{const g=fixture(['robber','troublemaker','drunk','insomniac','wolf']);g.actions={'0':{role:'robber',target:'4'},'1':{role:'troublemaker',targets:['0','2']},'2':{role:'drunk',center:0},'3':{role:'insomniac'}};const out=resolveNight(g);expect(out.cards.slice(0,5).map(c=>c.role)).toEqual(['drunk','troublemaker','villager','insomniac','robber']);expect(out.reports['3'][0].cards).toEqual([{role:'insomniac'}])});
 for(const role of ['wolf','robber','troublemaker'] as const)it(`${role} may decline`,()=>expect(()=>validateAction(fixture([role,'villager','villager']),'0',{role,skip:true})).not.toThrow());
 it('rejects self-targeting and duplicate centers',()=>{expect(()=>validateAction(fixture(['robber','wolf','villager']),'0',{role:'robber',target:'0'})).toThrow();expect(()=>validateAction(fixture(['seer','wolf','villager']),'0',{role:'seer',mode:'center',centers:[1,1]})).toThrow()});
});
describe('votes and personal goals',()=>{
 const cases:[Role[],(string|null)[],string[],string[]][]=[
 [['wolf','villager','villager'],['1','0','0'],['the village'],['0']],
 [['wolf','minion','villager'],['1','2','1'],['the werewolves'],['1']],
 [['wolf','tanner','villager'],['1','2','1'],['the Tanner'],['1']],
 [['wolf','tanner','villager','villager'],['1','0','1','0'],['the village','the Tanner'],['0','1']],
 [['minion','villager','villager'],['1','0','0'],['the village'],['0']],
 [['minion','villager','villager'],['1','2','1'],['the werewolves'],['1']],
 [['minion','villager','villager'],[null,null,null],['the village'],[]],
 [['villager','seer','hunter'],[null,null,null],['the village'],[]],
 [['villager','seer','hunter'],['1','0','0'],[],['0']],
 [['wolf','villager','seer'],['1','2','0'],['the werewolves'],[]],
 [['villager','seer','robber'],['1',null,null],[],['1']],
 ];
 cases.forEach(([roles,votes,winners,dead],i)=>it(`Classic branch ${i+1}`,()=>{const g=fixture(roles);votes.forEach((v,i)=>g.votes[String(i)]=v);const r=evaluate(g);expect(r.winners).toEqual(winners);expect(r.banished).toEqual(dead)}));
 it('chains Hunters once and never shoots on Skip',()=>{const g=fixture(['hunter','hunter','wolf','villager']);g.votes={'0':'1','1':'2','2':'0','3':'0'};expect(evaluate(g).hunted).toEqual(['1','2']);g.votes['0']=null;expect(evaluate(g).hunted).toEqual([])});
 for(const role of ['tanner','drunk','troublemaker','robber'] as const)for(const met of [false,true])it(`Solo ${role}: ${met}`,()=>{const g=fixture([role,'wolf','villager','villager'],'solo');g.actions['0']=role==='robber'?{role,target:'1'}:role==='troublemaker'?{role,targets:['1','2']}:{role} as RoleAction;g.votes=role==='tanner'?{'0':'1','1':met?'0':'2','2':met?'0':'1','3':'1'}:role==='drunk'?{'0':'1','1':met?'2':'0','2':'1','3':'1'}:met?{'0':'1','1':'2','2':'1','3':'1'}:{'0':'3','1':'3','2':'3','3':'1'};expect(evaluate(resolveNight(g)).players[0].won).toBe(met)});
 it('validates Skip and rejects self voting',()=>{const g=fixture(['wolf','villager','seer']);expect(()=>validateVote(g,'0','0')).toThrow();expect(()=>validateVote(g,'0',null)).not.toThrow();g.settings.allowSkip=false;expect(()=>validateVote(g,'0',null)).toThrow()});
});

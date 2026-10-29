import type {Role,Ruleset} from '../engine/types';
export type SealShape='circle'|'jagged'|'diamond'|'hexagon'|'triangle'|'keyhole'|'split-circle';
export function sealForRole(role:Role,ruleset:Ruleset='solo'):{shape:SealShape;color:string;label:string;glyph:string}{
 if(role==='doppel')return{shape:'split-circle',color:'#8a8fa8',label:'Copied role',glyph:'◐'};
 if(role==='wolf'||role==='minion')return{shape:'jagged',color:'#d6455d',label:'Werewolf team',glyph:'✹'};
 if(role==='tanner')return{shape:'diamond',color:'#7b4fbf',label:'Tanner goal',glyph:'◆'};
 if(ruleset==='solo'&&role==='drunk')return{shape:'hexagon',color:'#ffd35a',label:'Drunk goal',glyph:'⬡'};
 if(ruleset==='solo'&&role==='troublemaker')return{shape:'triangle',color:'#43b5a5',label:'Troublemaker goal',glyph:'▲'};
 if(ruleset==='solo'&&role==='robber')return{shape:'keyhole',color:'#ff8a3c',label:'Robber goal',glyph:'⚿'};
 return{shape:'circle',color:'#4fae6a',label:'Village team',glyph:'●'};
}

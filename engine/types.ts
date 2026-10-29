export const ROLES=['doppel','wolf','minion','mason','seer','robber','troublemaker','drunk','insomniac','hunter','tanner','villager'] as const;
export type Role=typeof ROLES[number];
export type Ruleset='classic'|'solo';
export type Center=0|1|2;
export type Card={role:Role;copy?:Role};
export type Seat={id:string;name:string};
export type Settings={ruleset:Ruleset;allowSkip:boolean;doppel:boolean;daySeconds:number;speed:number};
export type SimpleAction=
 |{role:'wolf';center?:Center}|{role:'seer';mode:'player';target:string}|{role:'seer';mode:'center';centers:[Center,Center]}
 |{role:'robber';target?:string}|{role:'troublemaker';targets?:[string,string]}|{role:'drunk';center:Center}
 |{role:'minion'|'mason'|'insomniac'|'hunter'|'tanner'|'villager'};
export type RoleAction=SimpleAction|{role:'doppel';target:string;followup?:SimpleAction;later?:SimpleAction}|{role:Role;skip:true};
export type Report={text:string;cards?:Card[];seats?:string[]};
export type GameEvent={kind:'deal'|'copy'|'peek'|'swap'|'step'|'vote'|'shot';step:number;at:number;actor?:string;targets?:number[];before?:Card[];after?:Card[]};
export type Round={order:string[];original:Card[];cards:Card[];actions:Record<string,RoleAction>;actionAt:Record<string,number>;votes:Record<string,string|null>;reports:Record<string,Report[]>;events:GameEvent[];settings:Settings};
export type PlayerResult={id:string;won:boolean;role:Role;goal:string;reason:string};
export type Result={cards:Card[];effective:Role[];counts:number[];banished:string[];hunted:string[];winners:string[];players:PlayerResult[];banner:string};
export const effective=(card:Card):Role=>card.role==='doppel'?(card.copy||'villager'):card.role;
export function requireRule(condition:unknown,message:string):asserts condition{if(!condition)throw new Error(message)}

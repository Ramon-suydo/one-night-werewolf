import type {Role} from '../engine/types';
export const NIGHT_WINDOWS:readonly {role:Role;seconds:number;caption:string}[]=[
 {role:'doppel',seconds:25,caption:'Doppelgänger, copy a player. Use their immediate power.'},
 {role:'wolf',seconds:14,caption:'Werewolves, find your pack. A lone wolf may peek.'},
 {role:'minion',seconds:8,caption:'Minion, discover the werewolves. They cannot see you.'},
 {role:'mason',seconds:8,caption:'Masons, find your partner.'},
 {role:'seer',seconds:20,caption:'Seer, inspect one player or two center tablets.'},
 {role:'robber',seconds:15,caption:'Robber, you may trade with another player.'},
 {role:'troublemaker',seconds:18,caption:'Troublemaker, you may exchange two other tablets.'},
 {role:'drunk',seconds:12,caption:'Drunk, trade with a center tablet without looking.'},
 {role:'insomniac',seconds:8,caption:'Insomniac, discover your final tablet.'},
];
export const NIGHT_GAP_SECONDS=3;

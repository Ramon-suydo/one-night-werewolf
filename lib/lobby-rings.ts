import type {PlayerPublic} from './session-types';

export function lobbyRings(players:Pick<PlayerPublic,'id'|'name'|'ready'|'left'|'spectator'>[],configured?:number|null){
 const seated=players.filter(p=>!p.left&&!p.spectator);
 const count=configured??Math.max(3,seated.length);
 return Array.from({length:count},(_,index)=>{
  const angle=index/count*Math.PI*2,player=seated[index];
  return {slot:index+1,x:Math.sin(angle)*7.4,z:Math.cos(angle)*7.4,playerId:player?.id??null,name:player?.name??'Waiting',ready:player?.ready??false};
 });
}

import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {startRound,validateAction,type Room} from '../lib/engine';
import {beginNarration,SCRIPT,duration} from '../lib/narration';
import {botAction} from '../lib/experience';
import {progressRoom} from '../lib/pacing';
import {packPosition,movementChanged,MOVEMENT_CAP} from '../lib/wire';
import {positionPacket} from '../lib/social';
let seed=7;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
const players=Array.from({length:10},(_,i)=>({id:randomUUID(),tokenHash:'local-load-'+i,name:'Load '+i,joined:0,seen:0,left:false}));
const room:Room={code:'LOAD',host:players[0].id,phase:'lobby',round:0,players,dayEnd:null,daySeconds:300,deck:null,updated:0,revision:0,receipts:[]};
let functions=30,writes=40,messages=0,time=0,previousPhase='lobby';
const command=(publicChange=true)=>{functions++;writes++;if(publicChange){writes++;messages+=players.length}};
for(let round=0;round<4;round++){
 startRound(room,random);room.narration=beginNarration(time,1);command();
 for(let step=0;step<SCRIPT.length;step++){
  room.game!.order.forEach((id,i)=>{if(room.game!.original[i]===SCRIPT[step].role){const action=botAction(room,id,random);validateAction(room,id,action);room.game!.actions[id]=action;command(false);functions++;}});
  time+=duration(step);progressRoom(room,time,random);command();
 }
 assert.equal(room.phase,'dawn');functions+=10;
 room.game!.ready=[...room.game!.order];for(let i=0;i<10;i++)command();progressRoom(room,time,random);assert.equal(room.phase,'day');functions+=9;
 time+=300000;progressRoom(room,time,random);command();functions+=9;
 room.game!.order.forEach(id=>{room.game!.votes[id]=room.game!.order.find(p=>p!==id)!;command()});progressRoom(room,time,random);assert.equal(room.phase,'result');functions+=9;previousPhase=room.phase;
}
assert.equal(previousPhase,'result');
// 10Hz maximum while walking, 25% of day frames changed; stationary ticks send nothing.
for(let player=0;player<10;player++){
 let previous:ReturnType<typeof packPosition>|null=null,last=0,sent=0;
 for(let ms=0;ms<1800000;ms+=100){const moving=ms%40000<10000;const angle=moving?ms/5000:Math.floor(ms/40000)*8+2;const packet=packPosition(positionPacket(players[player].id,1,Math.sin(angle)*5,Math.cos(angle)*5,ms));if(movementChanged(previous,packet,last,ms)&&sent<MOVEMENT_CAP){sent++;previous=packet;last=ms;messages+=10}}
}
writes+=10*60; // 30-minute sparse per-player heartbeat plus bounded room touches.
functions+=10*3;writes+=6; // three reconnects/player and liveness room updates.
const report={players:10,simulatedMinutes:30,functionCalls:functions,databaseWrites:writes,realtimeDeliveries:messages,callsPerMinute:+(functions/30).toFixed(2),writesPerMinute:+(writes/30).toFixed(2),messagesPerMinute:+(messages/30).toFixed(2),monthlyMovementMaximum:10*MOVEMENT_CAP*10};
assert.ok(functions<=500,'Function budget exceeded');assert.ok(writes<=1500,'Database write budget exceeded');assert.ok(messages<=500000,'Realtime envelope exceeded');assert.ok(report.monthlyMovementMaximum<2000000);
console.log(JSON.stringify(report,null,2));console.log('PASS: actual engine rounds and changed-only movement fit docs/BUDGET.md. Counts are simulation, not cloud telemetry.');

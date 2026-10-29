import {NIGHT_WINDOWS,NIGHT_GAP_SECONDS} from '../rules/nightWindows';
export function nightQueue(start:number,speed=1){let cursor=start;return NIGHT_WINDOWS.map((step,index)=>{const opens=cursor,closes=opens+step.seconds*1000*speed;cursor=closes+NIGHT_GAP_SECONDS*1000*speed;return{index,role:step.role,opens,closes,ends:cursor,caption:step.caption}})}
export function nightPosition(start:number,now:number,speed=1){const queue=nightQueue(start,speed),current=queue.find(s=>now<s.ends);return current?{...current,awake:now>=current.opens&&now<current.closes}:null}

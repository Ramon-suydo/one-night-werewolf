import {nightPosition} from '@/engine/nightQueue';
import type {GameState} from './session-types';
export function narratorCue(state:GameState,now:number){
 const base={key:state.round+':'+state.phase,file:state.phase,start:state.phaseStarted,text:state.caption};
 if(state.phase==='night'){const step=nightPosition(state.phaseStarted,now,state.settings.speed);if(step)return{key:state.round+':night:'+step.index+':'+step.awake,file:step.awake?step.role:'gap',start:step.awake?step.opens:step.closes,text:step.awake?step.caption:'Everyone, eyes closed. Stay silent.'}}
 if(state.phase==='day'){const left=(state.deadline||0)-now;if(state.settings.daySeconds>=60&&left<=60000&&left>50000)return{key:state.round+':minute',file:'minute',start:(state.deadline||0)-60000,text:'One minute remains. Choose your questions carefully.'};return{...base,text:'The fire is yours. Share what you learned. Someone may be lying.'}}
 if(state.phase==='dealing')return{...base,text:'Your tablet is waiting. Hold it close and discover your role.'};
 if(state.phase==='dawn')return{...base,text:'Morning reaches the clearing. Open your eyes and read your private report.'};
 if(state.phase==='vote')return{...base,text:'The discussion ends. Place your accusation, or choose the Skip stone. Hold to lock.'};
 if(state.phase==='result')return{...base,text:'The stones have fallen. Watch the tablets reveal what changed.'};
 return base;
}

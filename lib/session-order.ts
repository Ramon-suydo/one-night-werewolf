import type {GameState} from './session-types';
const PHASE_ORDER=['lobby','dealing','night','dawn','day','vote','resolution','result'];
// HTTP replies and Realtime notifications travel independently. A late reply
// may have a larger private revision than the last public notification while
// still describing a phase that has already ended.
export function olderPhase(next:GameState,current:GameState){
 if(next.code!==current.code)return false;
 if(next.round!==current.round)return next.round<current.round;
 if(next.phaseStarted!==current.phaseStarted)return next.phaseStarted<current.phaseStarted;
 if(next.phase!==current.phase)return PHASE_ORDER.indexOf(next.phase)<PHASE_ORDER.indexOf(current.phase);
 return next.phase==='night'&&(next.stepDeadline||0)<(current.stepDeadline||0);
}

export function keepAppearanceVersions(next:GameState,current:GameState):GameState{
 if(next.code!==current.code)return next;
 return{...next,players:next.players.map(p=>{const prior=current.players.find(v=>v.id===p.id);return prior&&(prior.appearanceVersion||0)>(p.appearanceVersion||0)?{...p,appearance:prior.appearance,appearanceVersion:prior.appearanceVersion}:p})};
}

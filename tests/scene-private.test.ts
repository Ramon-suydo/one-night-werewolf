import {it,expect} from 'vitest';
import {worldProjection} from '../lib/scene';
import type {Snapshot} from '../lib/session-types';
const snapshot=()=>({public:{code:'FIRE',phase:'night',phaseStarted:100,settings:{ruleset:'solo'},players:[],order:['me','peer'],emotes:[],chat:[],claims:[]},private:{id:'me',awake:true,report:[{text:'Your pack:',seats:['peer']}]}} as unknown as Snapshot);
it('renders active eyes from the current private snapshot without waiting for a mutable bus effect',()=>{const s=snapshot(),view=worldProjection(s);expect(view.awake).toBe(true);expect(view.teammates).toEqual(['peer']);s.private.awake=false;expect(worldProjection(s).teammates).toEqual([])});
it('passes selection updates and server phase time directly into the memoized scene',()=>{const s=snapshot();expect(worldProjection(s,['peer']).selected).toEqual(['peer']);expect(worldProjection(s).phaseStarted).toBe(100);s.public.phase='vote';s.private.voted=true;s.private.vote='peer';expect(worldProjection(s).selected).toEqual(['peer'])});

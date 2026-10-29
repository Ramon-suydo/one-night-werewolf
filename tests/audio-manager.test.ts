import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {AudioManager,type AudioConfig} from '../lib/audio-manager';
function param(){return{value:0,setTargetAtTime:vi.fn(),setValueAtTime:vi.fn(),linearRampToValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn()}}
function node(){return{connect:vi.fn(),disconnect:vi.fn(),start:vi.fn(),stop:vi.fn(),frequency:param(),gain:param(),pan:param(),threshold:param(),ratio:param(),attack:param(),release:param(),delayTime:param(),playbackRate:param(),buffer:null,type:'',onended:null}}
function mockContext(){const gains:ReturnType<typeof node>[]=[];return{currentTime:0,sampleRate:100,state:'running',destination:node(),createGain:()=>{const g=node();gains.push(g);return g},createDynamicsCompressor:node,createConvolver:node,createBiquadFilter:node,createDelay:node,createOscillator:vi.fn(node),createStereoPanner:node,createBufferSource:node,createBuffer:(_channels:number,size:number)=>({getChannelData:()=>new Float32Array(size)}),close:vi.fn(async()=>{}),gains}}
const settings:AudioConfig={master:.8,music:.4,narrator:.8,effects:.5,ambience:.3,muted:false,calm:false};
beforeEach(()=>{vi.useFakeTimers();vi.stubGlobal('localStorage',{getItem:()=>''});vi.stubGlobal('fetch',vi.fn(async()=>({json:async()=>({files:[]})})))});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals()});
describe('shared audio graph behavior',()=>{
 it('ducks and restores music while leaving effects audible',()=>{const c=mockContext(),a=new AudioManager(c as unknown as AudioContext);a.configure(settings);a.duck(.25);expect(vi.mocked(a.buses.Music.gain.setTargetAtTime).mock.calls.at(-1)![0]).toBeCloseTo(.045);expect(a.buses.SFX.gain.setTargetAtTime).toHaveBeenLastCalledWith(.06,0,.15);a.duck(1);expect(vi.mocked(a.buses.Music.gain.setTargetAtTime).mock.calls.at(-1)![0]).toBeCloseTo(.18);a.dispose()});
 it('mutes at the master without creating muted effect voices',()=>{const c=mockContext(),a=new AudioManager(c as unknown as AudioContext);a.configure({...settings,muted:true});const count=c.createOscillator.mock.calls.length;a.play('slam');expect(c.createOscillator).toHaveBeenCalledTimes(count);expect(c.gains[0].gain.setTargetAtTime).toHaveBeenLastCalledWith(0,0,.15);a.dispose()});
 it('cleans up its context and timers exactly once',()=>{const c=mockContext(),a=new AudioManager(c as unknown as AudioContext);a.dispose();a.dispose();expect(c.close).toHaveBeenCalledTimes(1);expect(vi.getTimerCount()).toBe(0)});
});

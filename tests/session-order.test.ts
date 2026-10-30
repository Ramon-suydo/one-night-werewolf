import {it,expect} from 'vitest';
import {olderPhase,olderPrivate,keepAppearanceVersions} from '../lib/session-order';
import type {GameState} from '../lib/session-types';
const state=(phase:GameState['phase'],round=1,phaseStarted=100,stepDeadline:number|null=null)=>({code:'FIRE',phase,round,phaseStarted,stepDeadline} as GameState);
it('rejects a delayed vote response after a result broadcast',()=>{expect(olderPhase(state('vote',1,100),state('result',1,101))).toBe(true)});
it('orders transitions sharing the same millisecond',()=>{expect(olderPhase(state('vote'),state('result'))).toBe(true);expect(olderPhase(state('result'),state('vote'))).toBe(false)});
it('accepts a new round and its new lobby while rejecting the old result',()=>{expect(olderPhase(state('lobby',2,200),state('result'))).toBe(false);expect(olderPhase(state('result'),state('dealing',2,200))).toBe(true);expect(olderPhase(state('lobby',1,200),state('result',1,100))).toBe(false)});
it('rejects an earlier night window from a delayed reply',()=>{expect(olderPhase(state('night',1,100,200),state('night',1,100,300))).toBe(true)});

it('keeps newer appearance versions when an older roster arrives over HTTP',()=>{const old={...state('lobby'),players:[{id:'a',appearance:{cloakId:'gold',hatId:'cap',faceId:'plain'},appearanceVersion:1}]} as GameState;const current={...old,players:[{...old.players[0],appearance:{...old.players[0].appearance,cloakId:'blue'},appearanceVersion:2}]} as GameState;const merged=keepAppearanceVersions(old,current);expect(merged.players[0].appearance.cloakId).toBe('blue');expect(merged.players[0].appearanceVersion).toBe(2);expect(old.players[0].appearance.cloakId).toBe('gold')});

it('does not replace a fresh private report with an earlier same-revision response',()=>{expect(olderPrivate({revision:4,serverNow:100},{revision:4,serverNow:200})).toBe(true);expect(olderPrivate({revision:5,serverNow:90},{revision:4,serverNow:200})).toBe(false);expect(olderPrivate({revision:3,serverNow:300},{revision:4,serverNow:200})).toBe(true)});

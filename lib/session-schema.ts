import {z} from 'zod';
import {ROLES} from '@/engine';
import {REACTIONS} from './session-types';
const id=z.string().uuid(),center=z.union([z.literal(0),z.literal(1),z.literal(2)]);
const simple=z.union([
 z.strictObject({role:z.literal('wolf'),center:center.optional()}),
 z.strictObject({role:z.literal('seer'),mode:z.literal('player'),target:id}),
 z.strictObject({role:z.literal('seer'),mode:z.literal('center'),centers:z.tuple([center,center])}),
 z.strictObject({role:z.literal('robber'),target:id.optional()}),
 z.strictObject({role:z.literal('troublemaker'),targets:z.tuple([id,id]).optional()}),
 z.strictObject({role:z.literal('drunk'),center}),
 z.strictObject({role:z.enum(['minion','mason','insomniac','hunter','tanner','villager'])}),
]);
export const roleActionSchema=z.union([simple,z.strictObject({role:z.literal('doppel'),target:id,followup:simple.optional(),later:simple.optional()}),z.strictObject({role:z.enum(ROLES),skip:z.literal(true)})]);
export const roomSettingsSchema=z.strictObject({ruleset:z.enum(['classic','solo']),allowSkip:z.boolean(),doppel:z.boolean(),daySeconds:z.number().int().min(30).max(900),speed:z.number().min(.1).max(2),preset:z.enum(['beginner','classic','chaos']),deck:z.array(z.enum(ROLES)).max(13).nullable(),allowed:z.array(z.enum(ROLES)).max(12),chat:z.enum(['off','day','always']),filter:z.boolean(),discord:z.string().max(250),rotateHost:z.boolean()});
export const sessionCommand=z.discriminatedUnion('type',[
 z.strictObject({type:z.literal('create'),name:z.string().max(100),appearance:z.unknown().optional()}),z.strictObject({type:z.literal('join'),name:z.string().max(100),appearance:z.unknown().optional(),spectator:z.boolean().optional()}),
 z.strictObject({type:z.literal('sync')}),z.strictObject({type:z.literal('advance')}),z.strictObject({type:z.literal('start')}),z.strictObject({type:z.literal('reveal')}),
 z.strictObject({type:z.literal('expression'),value:z.enum(['neutral','suspicious','smug','shocked','sad','angry'])}),
 z.strictObject({type:z.literal('spectate'),value:z.boolean()}),
 z.strictObject({type:z.literal('lobbyReady'),value:z.boolean()}),z.strictObject({type:z.literal('dayReady'),value:z.boolean()}),z.strictObject({type:z.literal('dawnReady')}),
 z.strictObject({type:z.literal('night'),action:roleActionSchema}),z.strictObject({type:z.literal('undo')}),z.strictObject({type:z.literal('vote'),target:id.nullable()}),z.strictObject({type:z.literal('lockVote')}),
 z.strictObject({type:z.literal('settings'),settings:roomSettingsSchema}),z.strictObject({type:z.literal('appearance'),appearance:z.strictObject({cloak:z.number().int().min(0).max(7),hat:z.number().int().min(0).max(5),face:z.number().int().min(0).max(5)})}),
 z.strictObject({type:z.literal('kick'),target:id}),z.strictObject({type:z.literal('transfer'),target:id}),z.strictObject({type:z.literal('leave')}),
 z.strictObject({type:z.literal('claim'),role:z.enum(ROLES)}),z.strictObject({type:z.literal('emote'),kind:z.enum(REACTIONS),target:id.optional()}),z.strictObject({type:z.literal('chat'),text:z.string().min(1).max(140)}),
]);
export const sessionRequest=z.strictObject({code:z.string().regex(/^[A-HJ-NP-Z]{4}$/).optional(),round:z.number().int().min(0).optional(),requestId:z.string().uuid(),command:sessionCommand});
export type SessionRequest=z.infer<typeof sessionRequest>;

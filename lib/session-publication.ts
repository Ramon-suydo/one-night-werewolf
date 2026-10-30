import 'server-only';
import {createHash} from 'node:crypto';
import {publicSession} from './session-projection';
import type {SessionRoom} from './session-types';

function digest(room:SessionRoom){
 return createHash('sha256').update(JSON.stringify({...publicSession(room),publicSequence:0})).digest('hex');
}
// This clock advances only when public information changes, never for a
// private action, receipt or secret revision. It is safe to broadcast.
export function hydratePublication(room:SessionRoom){
 room.publicSequence??=0;room.publicDigest??=digest(room);return room;
}
export function preparePublication(room:SessionRoom){
 const next=digest(room);
 if(next!==room.publicDigest){room.publicSequence=(room.publicSequence||0)+1;room.publicDigest=next;}
}

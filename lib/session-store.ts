import 'server-only';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {databaseError,getDatabase} from './store';
import {GameError} from './engine';
import {serverEnv} from './server-env';
import {publicSession} from './session-projection';
import {publishSession,sessionLiveness} from './session-events';
import type {SessionRoom} from './session-types';
const root=globalThis as unknown as{sessionCache?:Map<string,SessionRoom>;sessionQueue?:Promise<unknown>};const cache=root.sessionCache||=new Map();
const directory=path.resolve(serverEnv('LOCAL_DATA_DIR')||'.local-data','sessions');
function localOnly(){if(serverEnv('VERCEL')||process.env.NODE_ENV==='production'&&!serverEnv('LOCAL_DATA_DIR'))throw new GameError('Configure Supabase before hosting.',503)}
export async function readSession(code:string):Promise<SessionRoom|null>{
 const db=getDatabase();if(db){const{data,error}=await db.from('round_secrets').select('state,game_players(player_id,last_seen)').eq('code',code).maybeSingle();if(error)throw databaseError(error);if(!data)return null;const room=data.state as SessionRoom;for(const row of data.game_players||[]){const p=room.players.find(p=>p.id===row.player_id);if(p)p.seen=Math.max(p.seen,row.last_seen)}return room}
 localOnly();const file=path.join(directory,code+'.json');if(cache.has(file))return sessionLiveness(structuredClone(cache.get(file)!));try{const room=JSON.parse(await readFile(file,'utf8')) as SessionRoom;cache.set(file,room);return sessionLiveness(structuredClone(room))}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return null;throw e}
}
export async function saveSession(room:SessionRoom,expected:number):Promise<boolean>{
 const db=getDatabase();if(db){const{data,error}=await db.rpc('commit_session',{p_code:room.code,p_expected:expected,p_private:room,p_public:publicSession(room)});if(error)throw databaseError(error);return data===true}
 localOnly();const work=async()=>{const previous=await readSession(room.code);if((previous?.revision??-1)!==expected)return false;await mkdir(directory,{recursive:true});const file=path.join(directory,room.code+'.json'),temp=file+'.'+crypto.randomUUID()+'.tmp';await writeFile(temp,JSON.stringify(room),'utf8');for(let attempt=0;;attempt++){try{await rename(temp,file);break}catch(e){if(!['EPERM','EBUSY','EACCES'].includes((e as NodeJS.ErrnoException).code||'')||attempt===10)throw e;await new Promise(r=>setTimeout(r,30*(attempt+1)))}}cache.set(file,structuredClone(room));const before=previous?publicSession(previous):null,after=publicSession(room);if(JSON.stringify(before)!==JSON.stringify(after))publishSession(room.code,'state',after);return true};
 const result=(root.sessionQueue||Promise.resolve()).catch(()=>{}).then(work);root.sessionQueue=result;return result;
}

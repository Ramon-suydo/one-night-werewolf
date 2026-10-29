import {authorizedSession,apiError} from '@/lib/session-http';
import {packPosition} from '@/lib/wire';
import {publishSession} from '@/lib/session-events';
import {GameError} from '@/lib/engine';
import {serverEnv} from '@/lib/server-env';
export const runtime='nodejs';export const dynamic='force-dynamic';
const buckets=new Map<string,number>();
export async function POST(request:Request){try{if(serverEnv('NEXT_PUBLIC_SUPABASE_URL')||serverEnv('VERCEL'))return Response.json({error:'Use Realtime.'},{status:404});const body=await request.json(),{room,player}=await authorizedSession(new Request(request.url+'?code='+encodeURIComponent(body.code||''),{headers:request.headers}));if(!['day','lobby'].includes(room.phase)||body.round!==room.round)throw new GameError('Movement rests now.');if(!Number.isFinite(body.x)||!Number.isFinite(body.z)||Math.hypot(body.x,body.z)>13.01)throw new GameError('Invalid movement.');const now=Date.now(),key=room.code+player.id,last=buckets.get(key)||0;if(now-last>=100){buckets.set(key,now);if(buckets.size>1000)for(const[k,t]of buckets)if(now-t>60000)buckets.delete(k);publishSession(room.code,'position',packPosition({type:'position',player:player.id,round:room.round,x:body.x,z:body.z,at:now}))}return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}})}catch(e){return apiError(e)}}

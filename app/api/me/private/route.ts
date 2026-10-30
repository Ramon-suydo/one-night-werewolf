import {authorizedSession,apiError} from '@/lib/session-http';
import {executeSession} from '@/lib/session-service';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:Request){try{const{room,token}=await authorizedSession(request);const state=await executeSession({code:room.code,requestId:crypto.randomUUID(),command:{type:'sync'}},token);return Response.json({private:state.private,serverNow:state.serverNow,revision:state.revision,context:{code:state.public.code,round:state.public.round,phase:state.public.phase,stepDeadline:state.public.stepDeadline}},{headers:{'Cache-Control':'no-store, private'}})}catch(e){return apiError(e)}}

import {authorizedSession,apiError} from '@/lib/session-http';
import {GameError} from '@/lib/engine';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:Request){try{const{room}=await authorizedSession(request),round=Number(new URL(request.url).searchParams.get('round')||room.round),replay=room.history.find(h=>h.round===round);if(!Number.isInteger(round)||round<1)throw new GameError('Choose a valid round.');if(round>room.round||round===room.round&&room.phase!=='result')throw new GameError('The night is still secret.',403);if(!replay)throw new GameError('This replay is no longer available. The last three rounds are kept.',404);return Response.json(replay,{headers:{'Cache-Control':'no-store, private'}})}catch(e){return apiError(e)}}

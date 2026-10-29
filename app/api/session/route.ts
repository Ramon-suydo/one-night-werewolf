import {sessionPOST} from '@/lib/session-http';
export const runtime='nodejs';export const dynamic='force-dynamic';export const POST=(request:Request)=>sessionPOST(request);

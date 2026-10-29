import QRCode from 'qrcode';
import {authorizedSession,apiError} from '@/lib/session-http';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:Request){try{const{room}=await authorizedSession(request),url=new URL(request.url),invite=url.origin+'/?room='+room.code,svg=await QRCode.toString(invite,{type:'svg',margin:2,errorCorrectionLevel:'M',color:{dark:'#140d2e',light:'#f4efe0'}});return new Response(svg,{headers:{'Content-Type':'image/svg+xml','Cache-Control':'no-store, private'}})}catch(e){return apiError(e)}}

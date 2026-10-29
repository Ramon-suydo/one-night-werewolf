import 'server-only';
import {serverEnv} from './server-env';
export function publicConfig(){const url=serverEnv('NEXT_PUBLIC_SUPABASE_URL'),key=serverEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');let secret=key.startsWith('sb_secret_');try{secret ||= JSON.parse(Buffer.from(key.split('.')[1]||'','base64url').toString()).role==='service_role'}catch{}if(secret)throw new Error('A server-only key was placed in NEXT_PUBLIC_SUPABASE_ANON_KEY. Move it to SUPABASE_SERVICE_ROLE_KEY and restart.');return{url,key}}

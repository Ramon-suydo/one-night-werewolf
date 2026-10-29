import { publicConfig } from '@/lib/public-config';
export const dynamic = 'force-dynamic';
export function GET() { try{return Response.json(publicConfig(),{headers:{'Cache-Control':'public, max-age=60'}})}catch{return Response.json({error:'Check your Supabase public-key setting and restart.'},{status:503,headers:{'Cache-Control':'no-store'}})} }

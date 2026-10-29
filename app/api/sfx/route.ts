import {existsSync} from 'node:fs';
import path from 'node:path';
import {SOUND_CUES} from '@/lib/sound-data';
export const dynamic='force-dynamic';
export function GET(){return Response.json({files:Object.keys(SOUND_CUES).filter(name=>existsSync(path.join(process.cwd(),'public','sfx',name+'.mp3')))},{headers:{'Cache-Control':'public, max-age=300'}})}

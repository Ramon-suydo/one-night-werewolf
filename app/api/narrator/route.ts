import { existsSync } from 'node:fs';
import path from 'node:path';
import { SCRIPT } from '@/lib/narration';
import {NIGHT_WINDOWS} from '@/rules/nightWindows';
export const dynamic = 'force-dynamic';
export function GET() {
  const names = [...new Set([...SCRIPT.map(s => s.id),...NIGHT_WINDOWS.map(s=>s.role),'dealing','gap','day','minute','vote','result'])];
  return Response.json({ files: names.filter(name => existsSync(path.join(process.cwd(), 'public', 'narrator', name + '.mp3'))) },{headers:{'Cache-Control':'public, max-age=300'}});
}

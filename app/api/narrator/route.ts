import { existsSync } from 'node:fs';
import path from 'node:path';
import { SCRIPT } from '@/lib/narration';
export const dynamic = 'force-dynamic';
export function GET() {
  const names = [...SCRIPT.map(s => s.id), 'day', 'minute', 'vote', 'result'];
  return Response.json({ files: names.filter(name => existsSync(path.join(process.cwd(), 'public', 'narrator', name + '.mp3'))) });
}

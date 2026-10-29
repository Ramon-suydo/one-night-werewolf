import {describe,it,expect,vi} from 'vitest';
import {POST} from '../app/api/game/route';
describe('interrupted/invalid API requests',()=>{
 const headers={'x-player-token':'a'.repeat(64),'Content-Type':'application/json',host:'localhost:3000'};
 it('returns a friendly 400 for incomplete JSON without logging a server error',async()=>{const log=vi.spyOn(console,'error').mockImplementation(()=>{});try{const r=await POST(new Request('http://localhost:3000/api/game',{method:'POST',headers,body:'{"command":'}));expect(r.status).toBe(400);expect((await r.json()).error).toContain('interrupted');expect(log).not.toHaveBeenCalled()}finally{log.mockRestore()}});
 it('handles a body stream that was aborted',async()=>{const request={headers:new Headers(headers),url:'http://localhost:3000/api/game',text:async()=>{throw new DOMException('Aborted','AbortError')}} as unknown as Request;const r=await POST(request);expect(r.status).toBe(400);expect((await r.json()).error).not.toContain('AbortError')});
 it('rejects oversized bodies even without a content-length header',async()=>{const r=await POST(new Request('http://localhost:3000/api/game',{method:'POST',headers,body:'x'.repeat(9000)}));expect(r.status).toBe(413)});
});

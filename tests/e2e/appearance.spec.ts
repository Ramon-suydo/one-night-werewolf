import {test,expect} from '@playwright/test';
import {create,hold} from './fixtures';
import {createRequire} from 'node:module';
const {PNG}=createRequire(import.meta.url)('pngjs') as {PNG:{sync:{read:(b:Buffer)=>{width:number;height:number;data:Buffer}}}};
test('four clients agree on IDs and rendered colors across every phase and tier',async({browser},info)=>{
 const{contexts,pages,code,tokens}=await create(browser,4);const errors:string[]=[];pages.forEach(p=>p.on('pageerror',e=>errors.push(e.message)));
 const cmd=async(i:number,command:object,round=0)=>{const r=await pages[i].request.post('/api/session',{headers:{'x-player-token':tokens[i]},data:{code,round,requestId:crypto.randomUUID(),command}});expect(r.ok(),await r.text()).toBe(true);return r.json()};
 const records=async()=>Promise.all(pages.map(p=>p.evaluate(()=>window.__werewolfAvatars?.().map(a=>({id:a.id,appearance:a.appearance,hash:a.hash,expected:a.expected})).sort((a,b)=>a.id.localeCompare(b.id)))));
 const agree=async(phase:string)=>{await Promise.all(pages.map(p=>expect(p.locator('.world-game')).toHaveAttribute('data-phase',phase)));for(const tier of ['Minimum','Low','Medium','High','Ultra']){await Promise.all(pages.map(p=>p.evaluate(t=>window.dispatchEvent(new CustomEvent('werewolf-quality',{detail:t})),tier)));await Promise.all(pages.map(p=>expect.poll(()=>p.evaluate(()=>window.__werewolfAvatars?.()[0]?.tier)).toBe(tier)));await expect.poll(async()=>{const rows=await records();return rows.every(r=>r?.length===4&&JSON.stringify(r)===JSON.stringify(rows[0])&&r.every(a=>a.hash===a.expected))}).toBe(true);await info.attach('appearance-'+phase+'-'+tier,{body:JSON.stringify(await records(),null,2),contentType:'application/json'})}};
 try{
  await Promise.all(pages.map(p=>p.setViewportSize({width:1280,height:800})));
  await pages[0].evaluate(()=>window.dispatchEvent(new CustomEvent('werewolf-quality',{detail:'Ultra'})));
  await agree('lobby');
  // Every tier shares the exact renderer material colors.

  const s=await cmd(0,{type:'sync'}),id=s.public.players[0].id;
  await cmd(0,{type:'appearance',version:0,appearance:{cloakId:'coral',hatId:'cap',faceId:'smile'}});
  await expect.poll(async()=>{const rows=await records();return rows.every(r=>r?.find(a=>a.id===id)?.appearance.cloakId==='coral')},{timeout:1000}).toBe(true);
  await pages[1].reload();await agree('lobby');
  // Sample actual screenshot torso pixels at Ultra versus Minimum.
  await pages[1].evaluate(()=>window.dispatchEvent(new CustomEvent('werewolf-quality',{detail:'Minimum'})));await expect.poll(()=>pages[1].evaluate(()=>window.__werewolfAvatars?.()[0]?.tier)).toBe('Minimum');
  const colors:number[][]=[];
  for(const p of pages.slice(0,2)){const style=await p.addStyleTag({content:'.world-game>:not(.clearing){visibility:hidden!important}.world-tags,.vignette{visibility:hidden!important}'});const torso=await p.evaluate(id=>window.__werewolfAvatars!().find(a=>a.id===id)!.torso,id);const image=PNG.sync.read(await p.screenshot());const at=(Math.round(torso.y)*image.width+Math.round(torso.x))*4;colors.push([...image.data.subarray(at,at+3)]);await info.attach('torso-'+colors.length,{body:await p.screenshot(),contentType:'image/png'});await style.evaluate(el=>el.parentNode?.removeChild(el))}
  const hue=(c:number[])=>{const [r,g,b]=c.map(v=>v/255),hi=Math.max(r,g,b),lo=Math.min(r,g,b),d=hi-lo;expect(d).toBeGreaterThan(.1);return((hi===r?(g-b)/d:hi===g?(b-r)/d+2:(r-g)/d+4)*60+360)%360};
  expect(Math.min(Math.abs(hue(colors[0])-hue(colors[1])),360-Math.abs(hue(colors[0])-hue(colors[1])))).toBeLessThan(8);
  await cmd(0,{type:'settings',settings:{...s.public.settings,speed:.1,daySeconds:30}});
  await pages[0].getByRole('button',{name:'Start the night',exact:true}).click();
  await Promise.all(pages.map(async p=>{await expect(p.locator('.world-game')).toHaveAttribute('data-phase','dealing');await hold(p,'Reveal my tablet')}));
  await agree('night');
  expect((await Promise.all(pages.map(p=>p.locator('.closed-eyes').count()))).some(n=>n===1)).toBe(true);
  await agree('day');
  await Promise.all(pages.map(p=>p.getByRole('button',{name:'Ready to vote',exact:true}).click()));
  await Promise.all(pages.map(async p=>{await expect(p.locator('.world-game')).toHaveAttribute('data-phase','vote');await p.getByRole('button',{name:'Skip stone',exact:true}).click();await hold(p,'Lock my vote')}));
  await agree('result');expect(errors).toEqual([]);
 }finally{await Promise.all(contexts.map(c=>c.close()))}
});

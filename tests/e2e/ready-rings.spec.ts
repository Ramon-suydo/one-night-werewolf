import {test,expect} from '@playwright/test';
import {create} from './fixtures';

test('the animated lobby panel stays on screen after its entrance on desktop and phones',async({browser})=>{
 const {contexts,pages}=await create(browser,1,{animatedHost:true}),page=pages[0];
 try{
  const panel=page.locator('.lobby-hud');
  await expect.poll(()=>panel.evaluate(el=>el.getAnimations().every(a=>a.playState==='finished'))).toBe(true);
  for(const viewport of [{width:1920,height:1080},{width:360,height:800},{width:360,height:480}]){
   await page.setViewportSize(viewport);
   await expect.poll(()=>panel.evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=12&&r.top>=0&&r.right<=innerWidth-12&&r.bottom<=innerHeight-12})).toBe(true);
   await page.getByLabel('Number of players',{exact:true}).selectOption('6');
   await expect(page.getByTestId('ready-ring')).toHaveCount(6);
   await page.screenshot({path:`test-results/lobby-panel-${viewport.width}-${viewport.height}.png`});
  }
  await page.getByRole('button',{name:'Enter ready ring',exact:true}).click();
  await expect(page.getByRole('button',{name:'Leave ready ring',exact:true})).toBeVisible();
 }finally{await contexts[0].close()}
});

test('host sets six seats, all clients see six separate rings, and everyone readies their own seat',async({browser})=>{
 test.setTimeout(90000);
 const {contexts,pages,code,tokens}=await create(browser,6),host=pages[0],errors:string[]=[];
 pages.forEach(p=>p.on('pageerror',e=>errors.push(e.message)));
 try{
  await host.getByLabel('Number of players',{exact:true}).selectOption('8');
  await expect(host.getByTestId('ready-ring')).toHaveCount(8);
  await host.getByLabel('Number of players',{exact:true}).selectOption('6');
  for(const p of pages){await expect(p.getByTestId('ready-ring')).toHaveCount(6);await expect(p.locator('.clearing canvas')).toHaveAttribute('data-ready-rings','6');}
  const rejected=await pages[1].request.post('/api/session',{headers:{'x-player-token':tokens[1]},data:{code,requestId:crypto.randomUUID(),command:{type:'sync'}}});expect(rejected.ok()).toBe(true);
  await host.getByRole('button',{name:'Enter ready ring',exact:true}).click();
  await expect(host.getByRole('button',{name:'Leave your ready ring',exact:true})).toBeVisible();
  await expect(pages[1].getByTestId('ready-ring').filter({hasText:'Camper 0'})).toHaveAttribute('data-ready','true');
  await host.screenshot({path:'test-results/lobby-six-rings.png'});
  await host.getByRole('button',{name:'Leave your ready ring',exact:true}).click();
  await expect(host.getByRole('button',{name:'Enter your ready ring',exact:true})).toBeVisible();
  await host.getByRole('button',{name:'Enter your ready ring',exact:true}).click();
  await expect(host.getByRole('button',{name:'Leave your ready ring',exact:true})).toBeVisible();await host.locator('.room-code').click();
  await host.keyboard.down('w');try{await expect(host.getByRole('button',{name:'Enter your ready ring',exact:true})).toBeVisible()}finally{await host.keyboard.up('w')}
  await host.keyboard.down('s');try{await expect(host.getByRole('button',{name:'Leave your ready ring',exact:true})).toBeVisible()}finally{await host.keyboard.up('s')}
  for(const p of pages.slice(1))await p.getByRole('button',{name:'Ready at the fire',exact:true}).click();
  await Promise.all(pages.map(async p=>{await expect(p.locator('.world-game')).toHaveAttribute('data-phase','dealing',{timeout:20000});await expect(p.getByTestId('ready-ring')).toHaveCount(0)}));
  expect(errors).toEqual([]);
 }finally{await Promise.all(contexts.map(c=>c.close()))}
});

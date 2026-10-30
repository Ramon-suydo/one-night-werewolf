import {test,expect,type Page} from '@playwright/test';
import {create,hold} from './fixtures';

test('players use real night controls, retain private memories, and reconstruct the finished table',async({browser})=>{
 test.setTimeout(180000);
 const{contexts,pages,code,tokens}=await create(browser,4,{animatedHost:true}),host=pages[0],errors:string[]=[];
 pages.forEach(p=>p.on('pageerror',e=>errors.push(e.message)));
 const cmd=async(i:number,command:object,round=0)=>{const r=await pages[i].request.post('/api/session',{headers:{'x-player-token':tokens[i]},data:{code,round,requestId:crypto.randomUUID(),command}});expect(r.ok(),await r.text()).toBe(true);return r.json()};
 const choose=async(p:Page,role:string,other:string[])=>{if(role==='seer'){await p.getByRole('button',{name:'Target left center',exact:true}).click();await expect(p.getByRole('button',{name:'Lock night action',exact:true})).toBeDisabled();await p.getByRole('button',{name:'Target right center',exact:true}).click()}else if(role==='drunk')await p.getByRole('button',{name:'Target middle center',exact:true}).click();else{await p.getByRole('button',{name:'Target '+other[0],exact:true}).click();if(role==='troublemaker'){await expect(p.getByRole('button',{name:'Lock night action',exact:true})).toBeDisabled();await p.getByRole('button',{name:'Target '+other[1],exact:true}).click()}}};
 try{
  const s=await cmd(0,{type:'sync'});await cmd(0,{type:'settings',settings:{...s.public.settings,speed:.5,daySeconds:90,deck:['wolf','wolf','seer','robber','troublemaker','drunk','insomniac']}});
  await host.getByRole('button',{name:'Start the night',exact:true}).click();
  for(const p of pages){await expect(p.locator('.world-game')).toHaveAttribute('data-phase','dealing');await hold(p,'Reveal my tablet');await expect(p.getByRole('region',{name:'Your dealt card'})).toBeVisible();}
  await expect(host.locator('.world-game')).toHaveAttribute('data-phase','night');
  const snapshots=await Promise.all(tokens.map((_,i)=>cmd(i,{type:'sync'},1))),actor=snapshots.findIndex(s=>['seer','robber','troublemaker','drunk'].includes(s.private.role));expect(actor).toBeGreaterThanOrEqual(0);
  const p=pages[actor];let interrupted=0;await p.route('**/api/me/private?**',route=>{if(interrupted++===0)return route.fulfill({status:200,contentType:'application/json',body:'{}'});return route.continue()});const role=snapshots[actor].private.role,other=snapshots[actor].public.players.filter((v:{id:string})=>v.id!==snapshots[actor].private.id).map((v:{name:string})=>v.name);
  await expect(p.locator('.world-game')).toHaveAttribute('data-awake','true',{timeout:70000});
  const action=p.getByRole('button',{name:'Lock night action',exact:true});await expect(action).toBeDisabled();
  expect(interrupted).toBeGreaterThanOrEqual(2);await choose(p,role,other);await expect(action).toBeEnabled();await hold(p,'Lock night action');
  await expect(p.getByRole('button',{name:/^Undo/})).toBeVisible();await p.getByRole('button',{name:/^Undo/}).click();await expect(action).toBeDisabled();
  await choose(p,role,other);await hold(p,'Lock night action');
  await Promise.all(pages.map(async page=>{await expect(page.locator('.world-game')).toHaveAttribute('data-phase','dawn',{timeout:70000});await expect(page.getByRole('region',{name:'Your night report'})).toBeVisible();await page.getByRole('button',{name:/^I.*ready$/}).click()}));
  await expect(p.locator('.world-game')).toHaveAttribute('data-phase','day');await expect(p.locator('.role-chip')).toContainText('Dealt:');
  const forbidden=await host.request.get('/api/replay?code='+code+'&round=1',{headers:{'x-player-token':tokens[0]}});expect(forbidden.status()).toBe(403);
  await Promise.all(pages.map(page=>page.getByRole('button',{name:'Ready to vote',exact:true}).click()));
  await Promise.all(pages.map(async page=>{await expect(page.locator('.world-game')).toHaveAttribute('data-phase','vote');await page.getByRole('button',{name:'Skip stone',exact:true}).click();await hold(page,'Lock my vote')}));
  await expect(host.getByTestId('result-banner')).toBeVisible();let brokenReplay=false;await host.route('**/api/replay?**',route=>{if(!brokenReplay){brokenReplay=true;return route.fulfill({status:200,contentType:'application/json',body:'{}'})}return route.continue()});await host.getByRole('button',{name:'Watch replay',exact:true}).click();await host.getByRole('button',{name:'Retry replay',exact:true}).click();
  const replay=host.getByRole('dialog',{name:'Night replay'});await expect(replay).toBeVisible();await expect(replay.getByLabel('Replay step',{exact:true})).toBeVisible();await replay.getByRole('button',{name:'Inspect Camper 0',exact:true}).click();await expect(replay.getByLabel('Inspected replay seat')).toContainText('Camper 0');await replay.getByRole('button',{name:'Close card inspection',exact:true}).click();
  await replay.getByRole('button',{name:'Next replay event',exact:true}).click();await replay.getByLabel('Replay speed').selectOption('4');await replay.getByRole('button',{name:'Play replay',exact:true}).click();
  await expect.poll(async()=>Number(await replay.getByLabel('Replay step',{exact:true}).inputValue())).toBeGreaterThan(2);
  await replay.getByRole('button',{name:'Pause replay',exact:true}).click();await replay.getByLabel('Replay filter').selectOption('me');await replay.getByLabel('Original cards',{exact:true}).check();await host.screenshot({path:'test-results/tabletop-replay.png'});
  await expect(replay.getByText(/Round 2 has started/)).toBeVisible({timeout:30000});await replay.getByRole('button',{name:'Return to my seat',exact:true}).click();
  await expect(replay).toHaveCount(0);await expect(host.locator('.world-game')).toHaveAttribute('data-phase','dealing');await expect(host.getByRole('button',{name:'Reveal my tablet',exact:true})).toBeEnabled();expect(errors).toEqual([]);
 }finally{await Promise.all(contexts.map(c=>c.close()))}
});

test('delayed ready replies cannot roll back the newer shared lobby',async({browser})=>{
 const{contexts,pages,code,tokens}=await create(browser,2);let release=()=>{},blocked=()=>{};const gate=new Promise<void>(r=>release=r),held=new Promise<void>(r=>blocked=r);
 try{await pages[0].route('**/api/session',async route=>{const body=route.request().postDataJSON();if(body.command.type==='lobbyReady'){const response=await route.fetch();blocked();await gate;await route.fulfill({response})}else await route.continue()});
  const delivered=pages[0].waitForResponse(r=>r.url().endsWith('/api/session')&&r.request().postDataJSON()?.command.type==='lobbyReady');
  await pages[0].getByRole('button',{name:'Enter ready ring',exact:true}).click();await held;
  const r=await pages[1].request.post('/api/session',{headers:{'x-player-token':tokens[1]},data:{code,requestId:crypto.randomUUID(),command:{type:'lobbyReady',value:true}}});expect(r.ok()).toBe(true);
  await expect(pages[0].locator('.lobby-hud p').first()).toContainText('2 ready');release();await delivered;await expect(pages[0].locator('.lobby-hud p').first()).toContainText('2 ready');
 }finally{release();await Promise.all(contexts.map(c=>c.close()))}
});

test('invites provide a selectable link when clipboard access is unavailable',async({browser})=>{
 const{contexts,pages,code}=await create(browser,1),p=pages[0],errors:string[]=[];p.on('pageerror',e=>errors.push(e.message));
 try{await p.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:undefined}));await p.getByRole('button',{name:'Invite friends',exact:true}).click();const dialog=p.getByRole('dialog',{name:'Invite friends'});await expect(dialog).toBeVisible();await expect(dialog.getByRole('img')).toBeVisible();await expect(dialog.getByLabel('Invite link',{exact:true})).toHaveValue(new RegExp('room='+code));await dialog.getByRole('button',{name:'Copy link',exact:true}).click();await expect(dialog.getByRole('status')).toContainText('Select and copy');await dialog.getByRole('button',{name:'Back to the fire',exact:true}).click();await expect(dialog).toHaveCount(0);expect(errors).toEqual([])}finally{await contexts[0].close()}
});

test('the welcome form is immediately usable and the cinematic remains optional',async({page})=>{await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await expect(page.getByRole('button',{name:'Create room',exact:true})).toBeVisible();await expect(page.getByRole('region',{name:'The village introduction'})).toHaveCount(0);await page.getByRole('button',{name:'Open help',exact:true}).click();await page.getByRole('button',{name:'Watch intro',exact:true}).click();await expect(page.getByRole('region',{name:'The village introduction'})).toBeVisible();await page.getByRole('button',{name:'Skip intro',exact:true}).click();await expect(page.getByRole('button',{name:'Create room',exact:true})).toBeVisible()});

test('a removed seat cannot be resurrected by its delayed appearance reply',async({browser})=>{
 const{contexts,pages}=await create(browser,2),[host,guest]=pages;let release=()=>{},blocked=()=>{};const gate=new Promise<void>(r=>release=r),held=new Promise<void>(r=>blocked=r);
 try{await guest.route('**/api/session',async route=>{if(route.request().postDataJSON().command.type==='appearance'){const response=await route.fetch();blocked();await gate;await route.fulfill({response})}else await route.continue()});
  await guest.getByRole('button',{name:'Open settings',exact:true}).click();await guest.getByRole('button',{name:'Players',exact:true}).click();const delivered=guest.waitForResponse(r=>r.url().endsWith('/api/session')&&r.request().postDataJSON()?.command.type==='appearance');await guest.getByLabel('Cloak color',{exact:true}).selectOption('coral');await held;
  await host.getByRole('button',{name:'Open settings',exact:true}).click();await host.getByRole('button',{name:'Players',exact:true}).click();await host.getByRole('button',{name:'Kick',exact:true}).click();await host.getByRole('button',{name:'Yes, continue',exact:true}).click();
  await expect(guest.getByRole('button',{name:'Join this fire',exact:true})).toBeVisible();release();await delivered;await expect(guest.getByRole('button',{name:'Join this fire',exact:true})).toBeEnabled();expect(await guest.evaluate(()=>localStorage.getItem('werewolf-session'))).toBeNull();await expect(guest.locator('.room-code')).toHaveCount(0);
 }finally{release();await Promise.all(contexts.map(c=>c.close()))}
});

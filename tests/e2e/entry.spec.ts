import {test,expect} from '@playwright/test';
import {create} from './fixtures';

test('the home URL opens the welcome menu while saved seats resume explicitly or on room refresh',async({browser})=>{
 const {contexts,pages,code,tokens}=await create(browser,1,{animatedHost:true}),page=pages[0],errors:string[]=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  const identity=async()=>{const r=await page.request.post('/api/session',{maxRetries:2,headers:{'x-player-token':tokens[0]},data:{code,requestId:crypto.randomUUID(),command:{type:'sync'}}});expect(r.ok()).toBe(true);return(await r.json()).private.id};
  const id=await identity();
  await page.goto('/');
  await expect(page.getByRole('button',{name:'Create room',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Join room',exact:true})).toBeVisible();
  await expect(page.getByLabel('Preparing the village')).toHaveCount(0);
  await expect(page.locator('.world-game')).toHaveAttribute('data-phase','welcome');
  await expect(page.locator('.room-code')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Resume room '+code,exact:true})).toBeVisible();
  expect(await page.evaluate(()=>localStorage.getItem('werewolf-token'))).toBe(tokens[0]);
  await page.getByRole('button',{name:'Play introduction',exact:true}).click();
  await expect(page.getByRole('region',{name:'The village introduction'})).toBeVisible();
  await page.getByRole('button',{name:'Skip intro',exact:true}).click();
  await page.getByRole('button',{name:'Resume room '+code,exact:true}).click();
  await expect(page.locator('.room-code')).toHaveText(code);expect(await identity()).toBe(id);
  await page.reload();await expect(page.locator('.room-code')).toHaveText(code);expect(await identity()).toBe(id);
  await page.goto('/');await page.getByRole('button',{name:'Create room',exact:true}).click();
  await expect(page.locator('.room-code')).toBeVisible();await expect(page.locator('.room-code')).not.toHaveText(code);
  expect(await page.evaluate(()=>localStorage.getItem('werewolf-token'))).toBe(tokens[0]);expect(errors).toEqual([]);
 }finally{await contexts[0].close()}
});

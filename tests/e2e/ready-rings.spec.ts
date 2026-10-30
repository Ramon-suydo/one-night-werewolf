import {test,expect} from '@playwright/test';
import {create} from './fixtures';

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

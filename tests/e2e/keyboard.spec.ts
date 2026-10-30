import {test,expect} from '@playwright/test';
import {create} from './fixtures';

test('world keyboard handlers ignore missing keys and non-element targets without breaking movement',async({browser})=>{
 const{contexts,pages}=await create(browser,1);const page=pages[0],errors:string[]=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  const canvas=page.locator('.clearing canvas');
  await expect.poll(()=>canvas.getAttribute('data-avatar-x')).not.toBeNull();
  await page.evaluate(()=>{
   for(const type of ['keydown','keyup']){
    for(const target of [window,document]){
     target.dispatchEvent(new Event(type,{bubbles:true}));
     for(const key of [undefined,null,42,'']){
      const event=new Event(type);Object.defineProperty(event,'key',{value:key});target.dispatchEvent(event);
     }
     target.dispatchEvent(new KeyboardEvent(type,{key:'W',bubbles:true}));
    }
   }
   window.dispatchEvent(new Event('blur'));
  });
  // Normal keyboard movement must still work after malformed events.
  await page.locator('.room-code').click();
  const before=Number(await canvas.getAttribute('data-avatar-x'));
  await page.keyboard.down('d');
  await expect.poll(async()=>Number(await canvas.getAttribute('data-avatar-x'))).toBeGreaterThan(before+.1);
  await page.keyboard.up('d');
  expect(errors).toEqual([]);
 }finally{await contexts[0].close()}
});

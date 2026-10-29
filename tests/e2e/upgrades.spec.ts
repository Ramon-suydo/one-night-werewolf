import { test, expect, type Browser, type Page } from '@playwright/test';
async function lobby(browser: Browser, count: number) {
  const contexts = await Promise.all(Array.from({ length: count }, () => browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })));
  for (const context of contexts) await context.addInitScript(() => localStorage.setItem('werewolf-voice', JSON.stringify({ voice: '', volume: .8, captionsOnly: true })));
  const pages = await Promise.all(contexts.map(c => c.newPage()));
  await pages[0].goto('/'); await pages[0].getByRole('textbox', { name: 'Your name', exact: true }).fill('Owl 1'); await pages[0].getByRole('button', { name: 'Create room', exact: true }).click();
  const code = await pages[0].locator('.room-code').innerText();
  for (let i = 1; i < count; i++) { await pages[i].goto('/?room=' + code); await pages[i].getByRole('textbox', { name: 'Your name', exact: true }).fill(`Owl ${i + 1}`); await pages[i].getByRole('button', { name: 'Join room', exact: true }).click(); }
  await expect(pages[0].locator('.lobby-ring .slot')).toHaveCount(count);
  return { contexts, pages };
}
async function chooseNight(page: Page) {
  const heading = page.getByRole('heading', { name: /^You are the / }); await expect(heading).toBeVisible();
  if (await page.getByRole('button', { name: 'Lock it in', exact: true }).isVisible()) { await page.getByRole('button', { name: 'Lock it in', exact: true }).click(); return; }
  const role = await heading.innerText(); if (role.includes('Seer')) await page.getByRole('button', { name: 'Two center cards', exact: true }).click();
  const picks = page.locator('.pick .row').first().getByRole('button'); await picks.first().click(); if (role.includes('Seer') || role.includes('Troublemaker')) await picks.nth(1).click();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click(); await page.getByRole('button', { name: 'Lock it in', exact: true }).click();
}
async function finish(pages: Page[]) {
  await Promise.all(pages.map(async p => { await expect(p.getByRole('heading', { name: 'Night report', exact: true })).toBeVisible(); await p.getByRole('button', { name: 'I’m ready', exact: true }).click(); }));
  await expect(pages[0].getByRole('heading', { name: 'Dawn breaks', exact: true })).toBeVisible(); await pages[0].getByRole('button', { name: 'Call the vote', exact: true }).click();
  await Promise.all(pages.map(async p => { await expect(p.getByRole('heading', { name: 'Who is a werewolf?', exact: true })).toBeVisible(); await p.locator('.pick .row').first().getByRole('button').first().click(); await p.getByRole('button', { name: 'Confirm', exact: true }).click(); }));
  await Promise.all(pages.map(async p => { await expect(p.getByTestId('result-banner')).toBeVisible(); }));
}
test('4-player narrated game has synchronized fixed windows and no chat UI', async ({ browser }) => {
  test.setTimeout(210000); const { contexts, pages } = await lobby(browser, 4);
  try {
    const host = pages[0]; await host.getByText('Clearing, narrator & room settings', { exact: true }).click(); await host.getByRole('checkbox', { name: 'Automatic narrator', exact: true }).check(); await host.getByLabel('Night pace', { exact: true }).selectOption('0.7'); await host.getByRole('button', { name: 'Save room settings', exact: true }).click();
    await expect(host.locator('.active-settings')).toContainText('Narrator on'); await expect(host.locator('.chat-log')).toHaveCount(0);
    await host.getByRole('button', { name: 'Deal the cards', exact: true }).click(); await expect(host.getByTestId('eyes-closed')).toBeVisible();
    await host.getByRole('button', { name: 'Pause narrator', exact: true }).click(); await expect(host.getByRole('button', { name: 'Resume narrator', exact: true })).toBeVisible();
    await pages[1].reload(); await expect(pages[1].getByRole('status').filter({ hasText: 'Night falls over the village' })).toBeVisible(); await host.getByRole('button', { name: 'Resume narrator', exact: true }).click();
    let acted = 0;
    await Promise.all(pages.map(async p => {
      const end = Date.now() + 120000; let locked = false;
      while (Date.now() < end) {
        if (await p.getByRole('heading', { name: 'Night report', exact: true }).isVisible()) return;
        if (!locked && await p.getByRole('heading', { name: /^You are the / }).isVisible()) { await chooseNight(p); locked = true; acted++; }
        await expect(p.locator('.chat-log')).toHaveCount(0); await p.waitForTimeout(150);
      }
      throw new Error('Narrated night did not reach dawn');
    }));
    expect(acted).toBeGreaterThan(0); await finish(pages);
  } finally { await Promise.all(contexts.map(c => c.close())); }
});
test('3-player chat game sanitizes messages, hides chat at night, and reaches result', async ({ browser }) => {
  const { contexts, pages } = await lobby(browser, 3);
  try {
    const host = pages[0]; await host.getByText('Clearing, narrator & room settings', { exact: true }).click(); await host.getByLabel('Text chat', { exact: true }).selectOption('always'); await host.getByLabel('Discord link', { exact: true }).fill('https://discord.gg/clearing'); await host.getByRole('button', { name: 'Save room settings', exact: true }).click();
    await expect(host.getByRole('link', { name: 'Join voice on Discord' })).toHaveAttribute('href', 'https://discord.gg/clearing');
    await host.locator('.chat-log summary').first().click(); await host.getByRole('textbox', { name: 'Chat message', exact: true }).fill('<b>Hello</b> friends'); await host.getByRole('button', { name: 'Send message', exact: true }).click();
    await pages[1].locator('.chat-log summary').first().click(); await expect(pages[1].getByRole('log', { name: 'Chat messages' })).toContainText('Hello friends');
    await host.getByRole('button', { name: 'Deal the cards', exact: true }).click(); await Promise.all(pages.map(chooseNight));
    await Promise.all(pages.map(async p => await expect(p.locator('.chat-log')).toHaveCount(0))); await finish(pages); await expect(host.locator('.chat-log')).toHaveCount(1);
  } finally { await Promise.all(contexts.map(c => c.close())); }
});
test('reduced motion keeps the 3D world; missing WebGL shows recovery', async ({ page }) => {
 await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/'); await expect(page.getByTestId('clearing-3d')).toBeVisible();
 await page.addInitScript(() => { const original = HTMLCanvasElement.prototype.getContext; Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { value: function(this: HTMLCanvasElement, type: string, ...args: unknown[]) { return type.startsWith('webgl') ? null : Reflect.apply(original, this, [type, ...args]); } }); });
 await page.reload(); await expect(page.getByRole('heading', {name:'Enable 3D graphics'})).toBeVisible();await expect(page.getByRole('button',{name:'Retry 3D'})).toBeVisible();
});
test('3D clearing renders ten public avatars at pixelated resolution', async ({ page }) => {
  test.setTimeout(90000); await page.setViewportSize({ width: 1280, height: 800 }); await page.emulateMedia({ reducedMotion: 'no-preference' });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); await page.getByRole('textbox', { name: 'Your name', exact: true }).fill('Moon'); await page.getByRole('button', { name: 'Create room', exact: true }).click();
  const code = await page.locator('.room-code').innerText();
  for (let i = 1; i < 10; i++) { const r = await page.request.post('/api/game', { headers: { 'x-player-token': String(i).padStart(64, 'a') }, data: { code, requestId: crypto.randomUUID(), command: { type: 'join', name: 'Camper ' + i } } }); expect(r.ok()).toBe(true); }
  await expect(page.locator('.lobby-ring .slot')).toHaveCount(10); await page.getByText('Clearing, narrator & room settings', { exact: true }).click();
  await expect(page.getByTestId('clearing-3d')).toBeVisible(); await expect(page.locator('.world-tag')).toHaveCount(10);
  const width = await page.locator('.clearing canvas').evaluate((c: HTMLCanvasElement) => c.width); expect(width).toBeGreaterThan(50); expect(width).toBeLessThanOrEqual(1280 / 3 + 1);
  await expect.poll(() => page.locator('.clearing canvas').evaluate((c: HTMLCanvasElement) => Number(c.dataset.drawCalls || 1000))).toBeLessThanOrEqual(220);
  await page.getByRole('button', { name: 'Explore clearing', exact: true }).click(); await page.screenshot({ path: 'test-results/clearing-3d.png' }); expect(errors).toEqual([]);
  await page.getByRole('button', { name: 'Return to game', exact: true }).click(); await page.getByRole('button', { name: 'Deal the cards', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^You are the / })).toBeVisible();
  const token = await page.evaluate(() => localStorage.getItem('werewolf-token')!);
  const command = async (command: object) => { const response = await page.request.post('/api/game', { headers: { 'x-player-token': token }, data: { code, round: 1, requestId: crypto.randomUUID(), command } }); expect(response.ok()).toBe(true); return response.json(); };
  const snapshot = await command({ type: 'sync' });
  for (const id of snapshot.order) if (id !== snapshot.me) await command({ type: 'skip', target: id });
  await chooseNight(page); await expect(page.getByRole('heading', { name: 'Night report', exact: true })).toBeVisible(); await page.getByRole('button', { name: 'I’m ready', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Dawn breaks', exact: true })).toBeVisible(); await page.getByRole('button', { name: 'Explore clearing', exact: true }).click();
  const initialZ = await page.locator('.clearing canvas').evaluate((c: HTMLCanvasElement) => Number(c.dataset.avatarZ));
  await page.keyboard.down('w'); await expect.poll(() => page.locator('.clearing canvas').evaluate((c: HTMLCanvasElement) => Number(c.dataset.avatarZ))).toBeLessThan(initialZ - .5); await page.keyboard.up('w');
  await page.keyboard.press('e'); await expect(page.getByRole('button', { name: 'Call the vote', exact: true })).toBeVisible(); await page.getByRole('button', { name: 'Call the vote', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Who is a werewolf?', exact: true })).toBeVisible(); await page.locator('.pick .row').first().getByRole('button').first().click(); await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByTestId('result-banner')).toBeVisible(); await expect(page.locator('.result-ring .card')).toHaveCount(13);
  await page.getByRole('button', { name: 'Explore clearing', exact: true }).click(); await page.screenshot({ path: 'test-results/clearing-3d-result.png' }); expect(errors).toEqual([]);
});

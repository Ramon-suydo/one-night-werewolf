import { expect, test, type Page } from '@playwright/test';

async function actAtNight(page: Page) {
  await expect(page.getByRole('heading', { name: /^You are the / })).toBeVisible();
  if (await page.getByRole('button', { name: 'Lock it in', exact: true }).isVisible()) {
    await page.getByRole('button', { name: 'Lock it in', exact: true }).click(); return;
  }
  const heading = await page.getByRole('heading', { name: /^You are the / }).innerText();
  if (heading.includes('Seer')) await page.getByRole('button', { name: 'Two center cards', exact: true }).click();
  const picks = page.locator('.pick .row').first().getByRole('button');
  await picks.nth(0).click();
  if (heading.includes('Seer') || heading.includes('Troublemaker')) await picks.nth(1).click();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await page.getByRole('button', { name: 'Lock it in', exact: true }).click();
}
for (const count of [3, 10]) test(`full ${count}-player game, private actions, refresh and play again`, async ({ browser }) => {
  const contexts = await Promise.all(Array.from({ length: count }, () => browser.newContext({ viewport: { width: 360, height: 800 }, reducedMotion: 'reduce' })));
  const pages = await Promise.all(contexts.map(c => c.newPage()));
  const errors: string[] = [];
  pages.forEach(p => { p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); }); });
  try {
    await pages[0].goto('/'); await pages[0].getByRole('textbox', { name: 'Your name', exact: true }).fill('Camper');
    await pages[0].getByRole('button', { name: 'Create room', exact: true }).click();
    const code = await pages[0].locator('.room-code').innerText();
    for (let i = 1; i < count; i++) {
      await pages[i].goto('/?room=' + code); await pages[i].getByRole('textbox', { name: 'Your name', exact: true }).fill(i === 1 ? 'Camper' : `Camper ${i + 1}`);
      await pages[i].getByRole('button', { name: 'Join room', exact: true }).click();
      await expect(pages[i].locator('.lobby-ring .slot')).toHaveCount(i + 1);
    }
    await expect(pages[0].locator('.lobby-ring .slot')).toHaveCount(count);
    await expect(pages[0].locator('.lobby-ring')).toContainText('Camper 2');
    await pages[0].screenshot({ path: `test-results/lobby-${count}.png` });
    await pages[0].getByRole('button', { name: 'Deal the cards', exact: true }).click();
    await Promise.all(pages.map(actAtNight));
    await Promise.all(pages.map(async p => { await expect(p.getByRole('heading', { name: 'Night report', exact: true })).toBeVisible(); await p.getByRole('button', { name: 'I’m ready', exact: true }).click(); }));
    await expect(pages[0].getByRole('heading', { name: 'Dawn breaks', exact: true })).toBeVisible();
    await pages[1].reload(); await expect(pages[1].getByRole('heading', { name: 'Dawn breaks', exact: true })).toBeVisible();
    await pages[0].getByRole('button', { name: '+1 min', exact: true }).click();
    await expect(pages[0].getByRole('timer')).toContainText('5:');
    await pages[0].getByRole('button', { name: 'Call the vote', exact: true }).click();
    await Promise.all(pages.map(async p => { await expect(p.getByRole('heading', { name: 'Who is a werewolf?', exact: true })).toBeVisible(); await p.locator('.pick .row').first().getByRole('button').first().click(); await p.getByRole('button', { name: 'Confirm', exact: true }).click(); }));
    await Promise.all(pages.map(async p => { await expect(p.getByRole('heading', { name: 'The village decides', exact: true })).toBeVisible(); await expect(p.getByTestId('result-banner')).toBeVisible(); await expect(p.locator('.result-ring .card')).toHaveCount(count + 3); }));
    await pages[0].screenshot({ path: `test-results/result-${count}.png`, fullPage: true });
    await pages[0].getByRole('button', { name: 'Play again', exact: true }).click();
    await expect(pages[0].getByRole('heading', { name: /^You are the / })).toBeVisible(); await expect(pages[0].locator('.room-strip')).toContainText('Round 2');
    expect(errors).toEqual([]);
  } finally { await Promise.all(contexts.map(c => c.close())); }
});

test('entry validates typos and keeps a 360px layout', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 }); await page.goto('/');
  await page.getByRole('textbox', { name: 'Room code', exact: true }).fill('IO12');
  await page.getByRole('button', { name: 'Join room', exact: true }).click(); await expect(page.locator('.error[role=alert]')).toContainText('Room codes have 4 letters');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

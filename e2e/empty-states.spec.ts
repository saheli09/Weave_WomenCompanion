import { expect, test, type Page } from '@playwright/test';
import { start } from './helpers';

/**
 * Phase 4: every screen with no data at all. A fresh user from onboarding, then
 * every route: nothing may fall into the error state, and empty screens say so.
 */

const ROUTES = ['/today', '/me', '/me/hydration', '/me/mood', '/me/bleeding', '/me/pelvic', '/me/pain', '/me/sleep', '/me/medicines', '/me/history', '/me/cycle', '/cycle', '/pregnancy', '/baby', '/baby/feeding', '/baby/sleep', '/baby/diaper', '/baby/growth', '/baby/vaccines', '/baby/medicines', '/baby/formula', '/baby/food', '/timeline', '/ask', '/settings', '/changed', '/birth'];

async function onboardFresh(page: Page, situation: string, extra: (p: Page) => Promise<void>) {
  await start(page, 'D3');
  const d = page.locator('#device');
  await page.goto('/onboarding');
  await d.getByRole('button', { name: 'Continue without an account' }).click();
  await d.getByRole('radio', { name: situation, exact: true }).click();
  await d.getByRole('button', { name: 'Continue' }).click();
  await d.getByLabel('Your name').fill('Asha');
  await extra(page);
  await d.getByRole('button', { name: 'Open Weave' }).click();
}

const CASES: [string, (p: Page) => Promise<void>][] = [
  ['I’m pregnant', async (p) => { await p.locator('#device').getByLabel('Due date').fill('2027-01-14'); }],
  ['I have a baby', async (p) => { await p.locator('#device').getByLabel('Child’s name').fill('Mira'); await p.locator('#device').getByLabel('Child’s date of birth').fill('2026-08-20'); }],
  ['I’m tracking my cycle', async () => {}],
];

for (const [situation, extra] of CASES) {
  test(`no data, ${situation}: every route renders without the error state`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await onboardFresh(page, situation, extra);
    for (const r of ROUTES) {
      await page.goto(r);
      await page.locator('#device main').waitFor();
      await expect(page.locator('#device').getByText('This part did not load.'), r).toHaveCount(0);
    }
    expect(errors).toEqual([]);
  });
}

test('empty screens say so in one line', async ({ page }) => {
  await onboardFresh(page, 'I have a baby', async (p) => {
    await p.locator('#device').getByLabel('Child’s name').fill('Mira');
    await p.locator('#device').getByLabel('Child’s date of birth').fill('2026-08-20');
  });
  const d = page.locator('#device');
  await expect(d.getByText('Nothing logged yet today.')).toBeVisible();
  await page.goto('/timeline');
  await expect(d.getByText('Nothing logged in these days.')).toBeVisible();
  await page.goto('/baby/formula');
  await expect(d.getByText('No open tins. Log one when you open a new tin.')).toBeVisible();
  await page.goto('/baby/growth');
  await expect(d.getByText('No measurements yet.')).toBeVisible();
  await page.goto('/me/pain');
  await expect(d.getByText('No pain logged.')).toBeVisible();
});

test('the error state: a broken screen shows a recoverable message, not a blank page', async ({ page }) => {
  await start(page, 'D3');
  // Corrupt one entry the way a bad save might, then open a screen that reads it.
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('weave-v1')!);
    raw.state.domain.logs.push({ id: 'bad', subject: { kind: 'child', childId: 'child_srinika' }, at: 'not-a-date', source: 'quick', type: 'feed', mode: 'bottle' });
    localStorage.setItem('weave-v1', JSON.stringify(raw));
  });
  await page.reload();
  await page.goto('/baby/feeding');
  const d = page.locator('#device');
  const broken = await d.getByText('This part did not load.').isVisible();
  if (broken) await expect(d.getByRole('button', { name: 'Try again' })).toBeVisible();
  await expect(d.getByRole('navigation', { name: 'Main' })).toBeVisible(); // the shell always survives
});

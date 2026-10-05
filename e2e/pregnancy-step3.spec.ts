import { expect, test } from '@playwright/test';
import { closePanel, expectTapTargets, openPanel, start } from './helpers';

/** Pregnancy, step 3: week 36+ (S09), Labour mode (S10, S11), R12, R13, provider contact (B37). */

test.beforeEach(async ({ page }) => start(page, 'D2'));

async function demo(page: import('@playwright/test').Page, name: string | RegExp) {
  await openPanel(page);
  await page.locator('[data-testid="demo-panel"]').getByRole('button', { name }).first().click();
  await closePanel(page);
}

test('week 40 Today shows R12 and the Labour mode card', async ({ page }) => {
  const device = page.locator('#device');
  await expect(device.getByRole('heading', { name: 'Week 40, day 2' })).toBeVisible();
  await expect(device.getByText('Your practice contractions moved from eleven minutes apart to seven over the last two days.')).toBeVisible();
  await expect(device.getByRole('button', { name: 'Start Labour Mode', exact: true })).toBeVisible();
  await expectTapTargets(page);
});

test('R12 action starts Labour mode; Weave strips back to the timer', async ({ page }) => {
  const device = page.locator('#device');
  await device.getByRole('button', { name: 'Start Labour mode', exact: true }).click();
  await expect(device.locator('[data-labour-view="summary"]')).toBeVisible();
  await expect(device.getByText('Labour mode · 0m')).toBeVisible();
  await expect(device.getByRole('navigation', { name: 'Main' })).toHaveCount(0);
  await expect(device.getByText('Tap Contraction the moment one starts.')).toBeVisible();
  await expectTapTargets(page);
});

test('timing a contraction: dial while running, summary after, survives a reload', async ({ page }) => {
  const device = page.locator('#device');
  await device.getByRole('button', { name: 'Start Labour Mode', exact: true }).click();
  await device.getByRole('button', { name: /^Contraction/ }).click();
  await expect(device.locator('[data-labour-view="dial"]')).toBeVisible();
  await page.clock.runFor(42_000);
  await expect(device.getByRole('timer')).toHaveText('0:42');
  await page.reload();
  await expect(device.locator('[data-labour-view="dial"]')).toBeVisible();
  await device.getByRole('button', { name: /It’s easing/ }).click();
  await expect(device.locator('[data-labour-view="summary"]')).toBeVisible();
  await expect(device.getByText('logged')).toBeVisible();
  await expect(device.getByText('1', { exact: true })).toBeVisible();
});

test('summary matches the S10 frame with one of three signs met', async ({ page }) => {
  const device = page.locator('#device');
  await demo(page, 'Fill last hour: 1 of 3 signs');
  await expect(device.getByText('1 of 3 signs')).toBeVisible();
  await expect(device.getByRole('listitem').filter({ hasText: 'Five minutes apart or less' })).toContainText('4m 16s');
  await expect(device.getByRole('listitem').filter({ hasText: 'Lasting about a minute' })).toContainText('39s');
  await expect(device).toHaveScreenshot('labour-summary-one-sign.png', { maxDiffPixelRatio: 0.01 });
});

test('all three signs: escalation on top, provider one tap away, acknowledge collapses it', async ({ page }) => {
  const device = page.locator('#device');
  await demo(page, 'Fill last hour: all 3 signs');
  const card = device.getByRole('alert').filter({ hasText: 'All three signs have held for an hour.' });
  await expect(card).toBeVisible();
  await expect(device.getByText('3 of 3 signs')).toBeVisible();
  await expect(card.getByRole('button', { name: 'Not now' })).toHaveCount(0); // escalations cannot be snoozed (11.3)
  await card.getByRole('button', { name: 'Call your provider' }).click();
  await expect(device.getByRole('link', { name: 'Call Dr. Mahua' })).toHaveAttribute('href', 'tel:+910000000000');
  await expect(device.getByRole('link', { name: /Emergency services · Call 112/ })).toHaveAttribute('href', 'tel:112');
  await page.keyboard.press('Escape');
  await card.getByRole('button', { name: 'I’ve seen this' }).click();
  await expect(device.getByRole('button', { name: 'Contact your provider about labour' })).toBeVisible();
});

test('the persistent provider row works without any signs met', async ({ page }) => {
  const device = page.locator('#device');
  await device.getByRole('button', { name: 'Start Labour Mode', exact: true }).click();
  await device.getByRole('button', { name: /Call your provider/ }).click();
  await expect(device.getByRole('link', { name: 'Call Dr. Mahua' })).toBeVisible();
});

test('Exit asks once, keeps the timings, and returns to week 40 Today', async ({ page }) => {
  const device = page.locator('#device');
  await demo(page, 'Fill last hour: 1 of 3 signs');
  await device.getByRole('button', { name: 'Exit' }).click();
  await expect(device.getByText('Leave Labour mode? Your timings are kept.')).toBeVisible();
  await device.getByRole('button', { name: 'Leave' }).click();
  await expect(device.locator('[data-today-state="pregnancy_late"]')).toBeVisible();
  await expect(device.getByRole('navigation', { name: 'Main' })).toBeVisible();
  const kept = await page.evaluate(() => JSON.parse(localStorage.getItem('weave-v1')!).state.domain.her.pregnancy.labour.contractions.length);
  expect(kept).toBe(11);
});

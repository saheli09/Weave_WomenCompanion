import { expect, test } from '@playwright/test';
import { expectTapTargets, start, timings } from './helpers';

/** Postpartum, step 2: feeds. Chooser (S05), breastfeed timers (S07), bottle (B04), combo (B05), running pill. */

test.beforeEach(async ({ page }) => start(page, 'D3'));

test('chooser: last feed in the subtitle, last-used type highlighted', async ({ page }) => {
  const device = page.locator('#device');
  await device.getByRole('button', { name: 'Log a feed for Srinika' }).click();
  await expect(device.getByText('Last was left, 1h ago.')).toBeVisible();
  await expect(device.getByRole('button', { name: 'Breastfeed' })).toHaveAttribute('aria-current', 'true');
  await expectTapTargets(page, '#sheet-root');
});

test('breastfeed: timer runs behind a pill, survives a reload, then saves', async ({ page }) => {
  const device = page.locator('#device');
  await device.getByRole('button', { name: 'Log a feed for Srinika' }).click();
  await device.getByRole('button', { name: 'Breastfeed' }).click();
  await expect(device.getByText('last side')).toBeVisible();
  await device.getByRole('button', { name: 'Start Right' }).click();
  expect((await timings(page)).at(-1)).toMatchObject({ action: 'feed_breast', taps: 3, outcome: 'saved' });
  await expectTapTargets(page, '#sheet-root');
  await page.clock.runFor(5 * 60_000);
  await page.keyboard.press('Escape');
  const pill = device.getByRole('button', { name: /Feed in progress, 5:0\d/ });
  await expect(device.getByText(/Feeding · right · 5:0\d/)).toBeVisible();
  await expect(pill).toBeVisible();
  await page.reload();
  await expect(pill).toBeVisible();
  await pill.click();
  await device.getByRole('button', { name: 'Save' }).click();
  await expect(device.getByText('Feed logged for Srinika: right 5 m.')).toBeVisible();
  await expect(device.getByRole('button', { name: /Feed in progress/ })).toHaveCount(0);
  await expect(device.getByText('since last feed · right')).toBeVisible();
});

test('switching sides banks the first side', async ({ page }) => {
  const device = page.locator('#device');
  await device.getByRole('button', { name: 'Log a feed for Srinika' }).click();
  await device.getByRole('button', { name: 'Breastfeed' }).click();
  await device.getByRole('button', { name: 'Start Left' }).click();
  await page.clock.runFor(4 * 60_000);
  await device.getByRole('button', { name: 'Start Right' }).click();
  await page.clock.runFor(2 * 60_000);
  await device.getByRole('button', { name: 'Save' }).click();
  await expect(device.getByText('Feed logged for Srinika: left 4 m, right 2 m.')).toBeVisible();
});

test('the pencil sets minutes by hand', async ({ page }) => {
  const device = page.locator('#device');
  await device.getByRole('button', { name: 'Log a feed for Srinika' }).click();
  await device.getByRole('button', { name: 'Breastfeed' }).click();
  await device.getByRole('button', { name: 'Save' }).click();
  await expect(device.getByText('Start a side, or set minutes with the pencil.')).toBeVisible();
  await device.getByRole('button', { name: 'Edit right minutes' }).click();
  await device.getByRole('textbox', { name: 'Edit right minutes' }).fill('12');
  await device.getByRole('textbox', { name: 'Edit right minutes' }).press('Enter');
  await device.getByRole('button', { name: 'Save' }).click();
  await expect(device.getByText('Feed logged for Srinika: right 12 m.')).toBeVisible();
});

test('a paused, unsaved feed asks once before it is discarded', async ({ page }) => {
  const device = page.locator('#device');
  await device.getByRole('button', { name: 'Log a feed for Srinika' }).click();
  await device.getByRole('button', { name: 'Breastfeed' }).click();
  await device.getByRole('button', { name: 'Start Left' }).click();
  await page.clock.runFor(60_000);
  await device.getByRole('button', { name: 'Stop' }).click();
  await page.keyboard.press('Escape');
  await expect(device.getByText('Discard what you entered?')).toBeVisible();
  await device.getByRole('button', { name: 'Discard', exact: true }).click();
  await expect(device.getByRole('button', { name: /Feed in progress/ })).toHaveCount(0);
});

test('bottle from the FAB: prefilled from the last bottle, under ten seconds', async ({ page }) => {
  const device = page.locator('#device');
  await device.getByTestId('fab').click();
  await device.getByRole('button', { name: /^Feed/ }).click();
  await device.getByRole('button', { name: 'Bottle Feed' }).click();
  await expect(device.getByRole('group', { name: 'Amount' })).toContainText('60 ml');
  await expect(device.getByRole('radio', { name: 'Formula' })).toHaveAttribute('aria-checked', 'true');
  await device.getByRole('button', { name: 'More' }).click();
  await device.getByRole('button', { name: 'Save' }).click();
  await expect(device.getByText('Feed logged for Srinika: formula, 70 ml.')).toBeVisible();
  const t = (await timings(page)).at(-1)!;
  expect(t).toMatchObject({ action: 'feed_bottle', taps: 5, outcome: 'saved' });
  expect(t.ms).toBeLessThan(10_000);
});

test('combo saves a breast and bottle pair', async ({ page }) => {
  const device = page.locator('#device');
  await device.getByRole('button', { name: 'Log a feed for Srinika' }).click();
  await device.getByRole('button', { name: 'Combo Feed' }).click();
  await expect(device.getByRole('radio', { name: 'Right' })).toHaveAttribute('aria-checked', 'true'); // opposite of last side
  await device.getByRole('button', { name: 'Save' }).click();
  await expect(device.getByText(/Feed logged for Srinika: right 10 m and 60 ml/)).toBeVisible();
  await expect(device.getByText('Feed · right · 10 m')).toBeVisible();
  await expect(device.getByText('Feed · formula · 60 ml').first()).toBeVisible();
});

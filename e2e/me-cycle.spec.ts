import { expect, test, type Page } from '@playwright/test';
import { closePanel, expectTapTargets, openPanel, start, timings } from './helpers';

/** Me tab (S03, B18 to B23) and cycle (B24 to B26). */

async function setClock(page: Page, value: string) {
  await openPanel(page);
  await page.locator('[data-testid="demo-panel"] input[type="datetime-local"]').first().fill(value);
  await closePanel(page);
}

test('postpartum Me (D3): week card, tiles, body list, her insights only', async ({ page }) => {
  await start(page, 'D3');
  const device = page.locator('#device');
  await device.getByRole('link', { name: 'Me' }).click();
  await expect(device.getByRole('heading', { name: 'Recovering, steadily' })).toBeVisible();
  await expect(device.getByText('Week 3', { exact: true })).toBeVisible();
  await expect(device.getByRole('heading', { name: 'Week 3 Postpartum' })).toBeVisible();
  await expect(device.getByText('Spotting has eased for three days.')).toBeVisible();
  await expect(device.getByText(/Feeds are closer together/)).toHaveCount(0); // child insight stays on Today
  await expect(device.getByRole('button', { name: /Bleeding.*Spotting, 3 days/ })).toBeVisible();
  await expect(device.getByRole('button', { name: /Pelvic floor.*2 of 5 this week/ })).toBeVisible();
  await expect(device.getByText('Has your period come back?')).toHaveCount(0); // week 3: too early
  await expectTapTargets(page);
  await device.getByRole('button', { name: 'Ok', exact: true }).click();
  expect((await timings(page)).at(-1)).toMatchObject({ action: 'mood', taps: 1 });
});

test('detail screens: hydration, pelvic floor, pain with off-ramp, bleeding history', async ({ page }) => {
  await start(page, 'D3');
  const device = page.locator('#device');
  await page.goto('/me/hydration');
  await device.getByRole('button', { name: 'Add a glass' }).click();
  await expect(device.getByRole('heading', { name: '1 of 8 glasses today' })).toBeVisible();
  await expect(device.getByText('About 250 ml')).toBeVisible();
  await page.goto('/me/pelvic');
  await device.getByRole('button', { name: 'Log a set' }).click();
  await expect(device.getByRole('heading', { name: '3 of 5 this week' })).toBeVisible();
  await page.goto('/me/pain');
  await expect(device.getByText(/worth a call to your provider/)).toBeVisible();
  await device.getByRole('radio', { name: 'Back' }).click();
  await device.getByRole('radio', { name: '3' }).click();
  await device.getByRole('button', { name: 'Log pain' }).click();
  await expect(device.getByText('Back, 3 of 5').first()).toBeVisible();
  await page.goto('/me/bleeding');
  await expect(device.getByRole('heading', { name: 'Spotting, 3 days' })).toBeVisible();
  await expectTapTargets(page);
});

test('PRD Phase 3 acceptance (D4): cycle return end to end', async ({ page }) => {
  await start(page, 'D3');
  const device = page.locator('#device');
  await setClock(page, '2026-09-24T10:00'); // D3 child is now 6 weeks: the card appears
  await device.getByRole('link', { name: 'Me' }).click();
  await expect(device.getByText('Has your period come back?')).toBeVisible();
  await device.getByRole('button', { name: 'Not yet' }).click();
  await expect(device.getByText('Has your period come back?')).toHaveCount(0);
  await setClock(page, '2026-10-09T10:00'); // fifteen days later: asks again
  await expect(device.getByText('Has your period come back?')).toBeVisible();
  await device.getByRole('button', { name: 'Yes, it has' }).click();
  await device.getByRole('button', { name: 'Start cycle tracking' }).click();
  await expect(device.getByRole('heading', { name: 'Period, day 1' })).toBeVisible();
  await expect(device.getByText('Too early to estimate. Postpartum cycles are often irregular.')).toBeVisible();
  await device.getByRole('link', { name: 'Today' }).click();
  await expect(device.getByRole('button', { name: /Log period flow. Period: Day 1/ })).toBeVisible();
});

test('cycle screen (D4): calendar marks period days, day sheet logs flow and symptoms, end period', async ({ page }) => {
  await start(page, 'D4');
  const device = page.locator('#device');
  await page.goto('/me/cycle');
  await expect(device.getByRole('heading', { name: 'Period, day 3' })).toBeVisible();
  await expect(device.getByRole('gridcell', { name: /Tuesday 25 August, period day/ })).toBeVisible();
  await device.getByRole('button', { name: 'Log today' }).click();
  await device.getByRole('radio', { name: 'Light' }).click();
  await device.getByRole('button', { name: 'Cramps' }).click();
  await device.getByRole('button', { name: 'Save' }).click();
  await expect(device.getByRole('gridcell', { name: /Thursday 27 August, period day, light, today/ })).toBeVisible();
  await device.getByRole('button', { name: 'End period' }).click();
  await expect(device.getByRole('heading', { name: 'No period right now' })).toBeVisible();
  await expectTapTargets(page);
});

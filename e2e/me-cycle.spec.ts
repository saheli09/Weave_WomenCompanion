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

test('cycle estimates (D5): fertile window, ovulation and next period, framed as estimates', async ({ page }) => {
  await start(page, 'D5');
  await page.goto('/me/cycle');
  const summary = page.locator('#device [data-testid="cycle-summary"]');
  await expect(summary.getByText('Next period estimate: around 23 September')).toBeVisible();
  await expect(summary.getByText('Estimated fertile window: 4 to 9 September')).toBeVisible();
  await expect(summary.getByText('Estimated ovulation: around 9 September')).toBeVisible();
  await expect(summary.getByText('Your last six cycles ran 27 to 30 days.')).toBeVisible();
  await expect(summary.getByText(/Not a method of contraception\./)).toBeVisible();
  await expect(page.locator('#device [data-testid="cycle-legend"]')).toContainText('Ovulation, estimate');
  await expectTapTargets(page);
});

test('cycle calendar (D5): past months with estimates, three predicted months ahead, then it stops', async ({ page }) => {
  await start(page, 'D5');
  await page.goto('/me/cycle');
  const device = page.locator('#device');
  const prev = device.getByRole('button', { name: 'Previous month' });
  const next = device.getByRole('button', { name: 'Next month' });
  await prev.click(); // July: a logged period and that cycle's estimates
  await expect(device.getByRole('button', { name: /^Wednesday 1 July, period day/ })).toBeVisible();
  await expect(device.getByRole('button', { name: 'Tuesday 14 July, ovulation, estimate' })).toBeVisible();
  await expect(device.getByRole('button', { name: 'Thursday 9 July, fertile window, estimate' })).toBeVisible();
  await next.click();
  await next.click(); // September
  await expect(device.getByRole('button', { name: 'Wednesday 9 September, ovulation, estimate' })).toBeVisible();
  await expect(device.getByRole('button', { name: 'Wednesday 23 September, predicted period' })).toBeVisible();
  await next.click();
  await next.click(); // November, the last predicted month
  await expect(device.getByRole('heading', { name: 'November 2026' })).toBeVisible();
  await expect(device.getByRole('button', { name: 'Friday 20 November, predicted period' })).toBeVisible();
  await expect(next).toBeDisabled();
  for (let i = 0; i < 8; i++) if (await prev.isEnabled()) await prev.click();
  await expect(device.getByRole('heading', { name: 'March 2026' })).toBeVisible(); // first logged period
  await expect(prev).toBeDisabled();
});

test('coming up (D5): the next three periods with their estimated fertile windows; history shows past ovulation', async ({ page }) => {
  await start(page, 'D5');
  await page.goto('/me/cycle');
  const device = page.locator('#device');
  for (const [period, fertile] of [
    ['Period around 23 September', 'Fertile window 3 to 8 October · ovulation around 8 October'],
    ['Period around 22 October', 'Fertile window 1 to 6 November · ovulation around 6 November'],
    ['Period around 20 November', 'Fertile window 30 November to 5 December · ovulation around 5 December'],
  ]) {
    await expect(device.getByText(period!, { exact: true })).toBeVisible();
    await expect(device.getByText(fertile!, { exact: true })).toBeVisible();
  }
  await expect(device.getByText('Estimated ovulation 11 August', { exact: true })).toBeVisible();
});

test('cycle (D4): one period so far, so no estimates and no future months', async ({ page }) => {
  await start(page, 'D4');
  await page.goto('/me/cycle');
  const device = page.locator('#device');
  await expect(device.getByText('Too early to estimate. Postpartum cycles are often irregular.')).toBeVisible();
  await expect(device.getByText(/fertile window/i)).toHaveCount(0);
  await expect(device.getByTestId('cycle-legend')).toHaveCount(0);
  await expect(device.getByRole('button', { name: 'Next month' })).toBeDisabled();
});

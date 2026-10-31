import { expect, test } from '@playwright/test';
import { expectTapTargets, start } from './helpers';

/** Self care (decision 2026-10-30): suggestions from her data, then a library picked for her stage. */

const nav = (page: import('@playwright/test').Page) => page.locator('#device').getByRole('navigation', { name: 'Main' });

test('tabs: Today, the journey tab, Self care, Ask AI; Me is gone', async ({ page }) => {
  await start(page, 'D7');
  const links = await nav(page).getByRole('link').allInnerTexts();
  expect(links.map((x) => x.trim())).toEqual(['Today', 'Cycle', 'Self care', 'Ask AI']);
});

test('period day 3 (D5): cramps first, and Try it opens the routine', async ({ page }) => {
  await start(page, 'D5');
  const d = page.locator('#device');
  await nav(page).getByRole('link', { name: 'Self care' }).click();
  const first = d.getByTestId('self-care-suggestions').getByRole('listitem').first();
  await expect(first).toContainText('Warmth for cramps');
  await expect(first).toContainText('Why: day 3 of your period');
  await first.getByRole('button', { name: 'Try it' }).click();
  await expect(d.getByRole('heading', { name: 'Yoga for period cramps' })).toBeVisible();
  await expect(d.getByText('Video placeholder in this prototype. The routine is written out below.')).toBeVisible();
  await expect(d.getByRole('button', { name: 'Play Yoga for period cramps' })).toBeDisabled();
});

test('library rows follow her stage: pregnancy shows hip openers, not cramp yoga', async ({ page }) => {
  await start(page, 'D1');
  const d = page.locator('#device');
  await page.goto('/me');
  const library = d.getByTestId('care-library');
  await expect(library.getByRole('list', { name: 'Watch' })).toContainText('Hip openers for pregnancy');
  await expect(library).not.toContainText('Yoga for period cramps');
  await expectTapTargets(page);
});

test('a plan remembers the days she marks done', async ({ page }) => {
  await start(page, 'D3');
  const d = page.locator('#device');
  await page.goto('/me');
  await d.getByTestId('care-library').getByRole('button', { name: /Pelvic floor, a week at a time/ }).click();
  await expect(d.getByTestId('plan-progress')).toHaveText('0 of 7 done');
  await d.getByRole('listitem', { name: /^Find the muscles/ }).getByRole('button', { name: 'Mark done' }).click();
  await expect(d.getByTestId('plan-progress')).toHaveText('1 of 7 done');
  await page.reload();
  await expect(d.getByRole('listitem', { name: 'Find the muscles, Done' })).toBeVisible();
  await page.goBack();
  await expect(d.getByTestId('care-library').getByRole('button', { name: /Pelvic floor, a week at a time/ })).toContainText('1 of 7 done');
});

test('comfort food: why it helps, what you need, how to make it', async ({ page }) => {
  await start(page, 'D7');
  const d = page.locator('#device');
  await page.goto('/me/care/food/palak-dal');
  await expect(d.getByRole('heading', { name: 'Palak dal' })).toBeVisible();
  await expect(d.getByText(/Lentils and spinach both bring iron/)).toBeVisible();
  await expect(d.getByText('2 cups spinach, chopped')).toBeVisible();
  await expect(d.getByText(/Stir into the dal/)).toBeVisible();
});

test('a minute of breathing: in, hold, out, hold, then done', async ({ page }) => {
  await start(page, 'D7');
  const d = page.locator('#device');
  await page.goto('/me/care/breathe');
  await d.getByRole('button', { name: 'Start' }).click();
  await expect(d.getByRole('status')).toContainText('Breathe in');
  await page.clock.runFor(4200);
  await expect(d.getByRole('status')).toContainText('Hold');
  await page.clock.runFor(4000);
  await expect(d.getByRole('status')).toContainText('Breathe out');
  await page.clock.runFor(60_000);
  await expect(d.getByRole('status')).toHaveText('That was a minute for you.');
  await expect(d.getByRole('button', { name: 'Again' })).toBeVisible();
});

test('water from a suggestion logs a glass with Undo', async ({ page }) => {
  await start(page, 'D3');
  const d = page.locator('#device');
  await page.goto('/me');
  await d.locator('[data-suggestion="water"]').getByRole('button', { name: 'Add a glass' }).click();
  await expect(d.getByText('Glass of water logged. 1 of 8 today.')).toBeVisible();
});

test('cycle tracker: water is not on Today; Self care’s Hydration row shows when water is overdue', async ({ page }) => {
  await start(page, 'D7'); // glasses at 8:00 and 9:45; now 10:30
  const d = page.locator('#device');
  await expect(d.getByRole('region', { name: 'Hydration' })).toHaveCount(0);
  await expect(d.getByText(/glasses so far today/)).toHaveCount(0); // the old R02 card is gone
  await page.goto('/me');
  const row = d.getByRole('button', { name: /^Hydration/ });
  await expect(row).toContainText('2 of 8 glasses');
  await expect(row).not.toContainText('Last glass');
  await page.clock.fastForward('02:15:00'); // 12:45, three hours since the last glass
  await expect(row).toContainText('Last glass 3h ago');
  await row.click();
  await expect(page).toHaveURL(/\/me\/hydration$/);
});

test('postpartum Today: no water yet rings the Me card', async ({ page }) => {
  await start(page, 'D3');
  await expect(page.locator('#device').getByTestId('water-nudge')).toHaveText('No water yet today');
});

import { expect, test } from '@playwright/test';
import { expectTapTargets, start } from './helpers';

/** Baby tab (B08) and modules: B09 to B11 history, B15 growth, B16 vaccinations, B17 medicine courses, R06. */

test('newborn Baby tab: stage order, module summaries, trends with a chart and table view', async ({ page }) => {
  await start(page, 'D3');
  const device = page.locator('#device');
  await expect(device.getByText('Feeds are closer together today than Srinika’s recent average.')).toHaveCount(1); // R06 in the carousel
  await device.getByRole('link', { name: 'Baby' }).click();
  await expect(device.locator('[data-screen="baby"][data-stage="newborn"]')).toBeVisible();
  const modules = device.locator('[data-screen="baby"] section h2');
  await expect(modules).toHaveText(['Feeding', 'Sleep', 'Diapers', 'Growth', 'Vaccinations', 'Medicines']);
  await expect(device.getByText('3 feeds today')).toBeVisible();
  await expect(device.getByRole('button', { name: /Formula stock/ })).toBeVisible();
  await expectTapTargets(page);
  await device.getByRole('region', { name: 'Feeding' }).getByRole('button', { name: 'See trends' }).click();
  await expect(device.getByRole('img', { name: 'Feeds per day, last seven days' })).toBeVisible();
  await device.getByRole('button', { name: 'Show as table' }).click();
  await expect(device.getByRole('row', { name: /Thursday 27 August 3/ })).toBeVisible();
  await expectTapTargets(page);
});

test('toddler Baby tab leads with food and folds milk, diapers and sleep under Show more', async ({ page }) => {
  await start(page, 'D5');
  const device = page.locator('#device');
  await device.getByRole('link', { name: 'Baby' }).click();
  await expect(device.locator('[data-screen="baby"] section h2')).toHaveText(['Food journey', 'Medicines', 'Growth', 'Vaccinations']);
  await device.getByRole('button', { name: 'Show more' }).click();
  await expect(device.locator('[data-screen="baby"] section h2')).toHaveText(['Food journey', 'Medicines', 'Growth', 'Vaccinations', 'Feeding', 'Diapers', 'Sleep']);
});

test('growth: own trajectory, add a measurement', async ({ page }) => {
  await start(page, 'D5');
  const device = page.locator('#device');
  await page.goto('/baby/growth');
  await expect(device.getByRole('img', { name: 'Srinika’s weight over time' })).toBeVisible();
  await device.getByRole('button', { name: 'Add a measurement' }).click();
  await device.getByRole('button', { name: 'Save' }).click();
  await expect(device.getByText('Add at least one measurement in a usual range.')).toBeVisible();
  await device.getByLabel('Weight (kg)').fill('9.6');
  await device.getByRole('button', { name: 'Save' }).click();
  await expect(device.getByText('9.60 kg').first()).toBeVisible();
});

test('vaccinations: mark done with a date and back to not yet', async ({ page }) => {
  await start(page, 'D3');
  const device = page.locator('#device');
  await page.goto('/baby/vaccines');
  await expect(device.getByRole('checkbox', { name: /BCG, Done 12 August/ })).toHaveAttribute('aria-checked', 'true');
  await device.getByRole('checkbox', { name: /Pentavalent 1, Not yet/ }).click();
  await device.getByRole('button', { name: 'Mark done' }).click();
  await expect(device.getByRole('checkbox', { name: /Pentavalent 1, Done 27 August/ })).toBeVisible();
  await device.getByRole('checkbox', { name: /Pentavalent 1, Done/ }).click();
  await device.getByRole('button', { name: 'Mark not yet' }).click();
  await expect(device.getByRole('checkbox', { name: /Pentavalent 1, Not yet/ })).toBeVisible();
});

test('medicine course: run, tick a dose, start one, end one', async ({ page }) => {
  await start(page, 'D5');
  const device = page.locator('#device');
  await page.goto('/baby/medicines');
  await expect(device.getByText('2.5 ml · day 5 of 10')).toBeVisible();
  await device.getByRole('button', { name: 'Start a medicine course' }).click();
  await device.getByLabel('Name').fill('Iron drops');
  await device.getByRole('button', { name: 'Dinner' }).click();
  await device.getByLabel('For how many days').fill('5');
  await device.getByRole('button', { name: 'Save' }).click();
  await expect(device.getByRole('region', { name: 'Iron drops' })).toBeVisible();
  await device.getByRole('region', { name: 'Zinc syrup' }).getByRole('button', { name: 'End course' }).click();
  await expect(device.getByRole('region', { name: 'Zinc syrup' })).toHaveCount(0);
  await expect(device.getByText(/Ended 27 August/)).toBeVisible();
});

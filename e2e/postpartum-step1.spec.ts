import { expect, test } from '@playwright/test';
import { expectTapTargets, start, timings } from './helpers';

/** Postpartum, step 1: newborn Today (S01) quick logs, R01, R02, R14. */

test.beforeEach(async ({ page }) => start(page, 'D3'));

test('newborn Today renders from D3 with R01 first', async ({ page }) => {
  const device = page.locator('#device');
  await expect(device.locator('[data-today-state="postpartum_baby"]')).toBeVisible();
  await expect(device.getByText('Srinika’s Age: 15d')).toBeVisible();
  await expect(device.getByText('Three feeds logged since 5am, and no water yet today.')).toBeInViewport();
  await expect(device.getByText('0 of 8', { exact: true })).toBeVisible();
  await expectTapTargets(page);
  await expect(device).toHaveScreenshot('newborn-today-top.png', { maxDiffPixelRatio: 0.01 });
});

test('R01 "Log a glass" logs water and the card clears', async ({ page }) => {
  const device = page.locator('#device');
  await device.getByRole('button', { name: 'Log a glass' }).click();
  await expect(device.getByText('1 of 8', { exact: true })).toBeVisible();
  await expect(device.getByText('Three feeds logged since 5am, and no water yet today.')).toHaveCount(0);
});

test('water: one tap, inline Undo', async ({ page }) => {
  const device = page.locator('#device');
  await device.getByRole('button', { name: 'Add a glass of water' }).click();
  await expect(device.getByText('1 of 8', { exact: true })).toBeVisible();
  await device.getByRole('button', { name: 'Undo' }).click();
  await expect(device.getByText('0 of 8', { exact: true })).toBeVisible();
  expect((await timings(page)).at(-1)).toMatchObject({ action: 'water', taps: 1, outcome: 'saved' });
});

test('diaper: inline chooser, two taps', async ({ page }) => {
  const device = page.locator('#device');
  await device.getByRole('button', { name: /^Log a diaper for Srinika/ }).click();
  const chooser = device.getByRole('group', { name: 'Diaper for Srinika' });
  await expect(chooser).toBeVisible();
  await expectTapTargets(page);
  await chooser.getByRole('button', { name: 'Wet' }).click();
  await expect(chooser).toHaveCount(0);
  await expect(device.getByRole('button', { name: /^Log a diaper for Srinika. Diapers: 5/ })).toBeVisible();
  expect((await timings(page)).at(-1)).toMatchObject({ action: 'diaper', taps: 2, outcome: 'saved' });
});

test('mood: two taps from the Me card', async ({ page }) => {
  const device = page.locator('#device');
  await device.getByRole('button', { name: /^Log your mood/ }).click();
  await device.getByRole('radio', { name: 'Flat' }).click();
  await expect(device.getByRole('button', { name: /^Log your mood. Mood: Flat/ })).toBeVisible();
  expect((await timings(page)).at(-1)).toMatchObject({ action: 'mood', taps: 2 });
});

test('bleeding: last level preselected; Heavy raises the provider-first escalation; Undo clears it', async ({ page }) => {
  const device = page.locator('#device');
  await device.getByRole('button', { name: /^Log bleeding/ }).click();
  await expect(device.getByText('Last logged: Spotting')).toBeVisible();
  await expect(device.getByRole('radio', { name: 'Spotting' })).toHaveAttribute('aria-checked', 'true');
  await device.getByRole('radio', { name: 'Heavy' }).click();
  const card = device.getByRole('alert').filter({ hasText: 'Heavy bleeding logged.' });
  await expect(card).toBeInViewport();
  await expect(card.getByRole('button', { name: 'Not now' })).toHaveCount(0);
  expect((await timings(page)).at(-1)).toMatchObject({ action: 'bleeding', taps: 2 });
  await device.getByRole('button', { name: 'Undo' }).click();
  await expect(card).toHaveCount(0);
});

test('Heavy bleeding escalation routes to the provider sheet', async ({ page }) => {
  const device = page.locator('#device');
  await device.getByRole('button', { name: /^Log bleeding/ }).click();
  await device.getByRole('radio', { name: 'Heavy' }).click();
  await device.getByRole('alert').getByRole('button', { name: 'Contact your provider' }).click();
  await expect(device.getByRole('link', { name: 'Call Dr. Mahua' })).toBeVisible();
  await expect(device.getByRole('link', { name: /Emergency services/ })).toBeVisible();
});

test('FAB: diaper and bleeding tiles open their sheets', async ({ page }) => {
  const device = page.locator('#device');
  await device.getByTestId('fab').click();
  await device.getByRole('button', { name: /^Diaper/ }).click();
  await device.getByRole('button', { name: 'Both' }).click();
  await expect(device.getByText('Diaper logged for Srinika: wet and dirty.')).toBeVisible();
  expect((await timings(page)).at(-1)).toMatchObject({ action: 'diaper', taps: 3, entry: 'fab' });
});

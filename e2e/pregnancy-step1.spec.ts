import { expect, test } from '@playwright/test';
import { expectTapTargets, openPanel, closePanel, start, timings } from './helpers';

/** Pregnancy, step 1: Today at week 22 (S08), medicines (B29), quick logs, R05 and R09. */

test.beforeEach(async ({ page }) => start(page, 'D1'));

test('week 22 Today renders from the D1 timeline', async ({ page }) => {
  const device = page.locator('#device');
  await expect(device.locator('[data-today-state="pregnancy"]')).toBeVisible();
  await expect(device.getByRole('heading', { name: 'Week 22', exact: true })).toBeVisible();
  await expect(device.getByText('Due 31 December. Eighteen weeks to go.')).toBeVisible();
  await expect(device.getByText('You’ve slept under six hours four nights running.')).toBeVisible(); // R05
  await expect(device.getByText('2 of 4')).toBeVisible();
  await expectTapTargets(page);
  await expect(device).toHaveScreenshot('pregnancy-w22-top.png', { maxDiffPixelRatio: 0.01 });
});

test('ticking a dose records the time and can be undone', async ({ page }) => {
  const device = page.locator('#device');
  const dinner = device.getByRole('checkbox', { name: /Cipcal XT, 1 tab after Dinner/ });
  await dinner.click();
  await expect(device.getByText('3 of 4')).toBeVisible();
  await expect(dinner).toHaveAttribute('aria-checked', 'true');
  await device.getByRole('button', { name: 'Undo' }).click();
  await expect(device.getByText('2 of 4')).toBeVisible();
  const t = await timings(page);
  expect(t.at(-1)).toMatchObject({ action: 'dose', taps: 1, outcome: 'saved' });
});

test('add something you take: validates, saves, and appears on Today', async ({ page }) => {
  const device = page.locator('#device');
  await device.getByRole('button', { name: 'Add something you take' }).click();
  await device.getByRole('button', { name: 'Save' }).click();
  await expect(device.getByText('Add a name.')).toBeVisible();
  await expect(device.getByText('Choose at least one time.')).toBeVisible();
  await device.getByLabel('Name').fill('Folic acid');
  await device.getByLabel('Dose').fill('1 tab');
  await device.getByRole('button', { name: 'Lunch', exact: true }).click();
  await device.getByRole('button', { name: 'Save' }).click();
  await expect(device.getByRole('checkbox', { name: /Folic acid, 1 tab after Lunch/ })).toBeVisible();
  await expect(device.getByText('2 of 5')).toBeVisible();
});

test('editing a medicine and stopping it', async ({ page }) => {
  const device = page.locator('#device');
  await device.getByRole('button', { name: 'Edit Ferrogen XT' }).first().click();
  await expect(device.getByLabel('Name')).toHaveValue('Ferrogen XT');
  await device.getByRole('button', { name: 'Stop taking this' }).click();
  await expect(device.getByText('1 of 2')).toBeVisible();
});

test('water from the FAB takes two taps', async ({ page }) => {
  const device = page.locator('#device');
  await device.getByTestId('fab').click();
  await device.getByRole('button', { name: /^Water/ }).click();
  await expect(device.getByText('Glass of water logged. 2 of 8 today.')).toBeVisible();
  expect((await timings(page)).at(-1)).toMatchObject({ action: 'water', taps: 2, outcome: 'saved' });
});

test('mood from the FAB takes three taps', async ({ page }) => {
  const device = page.locator('#device');
  await device.getByTestId('fab').click();
  await device.getByRole('button', { name: /^Mood/ }).click();
  await device.getByRole('radio', { name: 'Good' }).click();
  await expect(device.getByText('Mood logged: Good.')).toBeVisible();
  expect((await timings(page)).at(-1)).toMatchObject({ action: 'mood', taps: 3 });
});

test('R09 appears after the evening dose time and clears when the dose is logged', async ({ page }) => {
  const device = page.locator('#device');
  await openPanel(page);
  await page.locator('[data-testid="demo-panel"] input[type="datetime-local"]').first().fill('2026-08-27T22:05');
  await closePanel(page);
  const card = device.getByText('Evening dose of Cipcal XT not logged yet.');
  await expect(card).toBeInViewport(); // escalations and higher-priority cards come first, and are the card in view
  await device.getByRole('button', { name: 'Log dose' }).click();
  await expect(device.getByText('Evening dose of Cipcal XT not logged yet.')).toHaveCount(0);
  await expect(device.getByText('Evening dose of Ferrogen XT not logged yet.')).toBeVisible();
});

test('water and mood on Today, one tap each (decision 2026-10-30)', async ({ page }) => {
  const device = page.locator('#device');
  const mood = device.getByRole('region', { name: 'Mood' });
  await mood.getByRole('button', { name: 'Low', exact: true }).click();
  await expect(mood.getByRole('button', { name: 'Low', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect((await timings(page)).at(-1)).toMatchObject({ action: 'mood', taps: 1, outcome: 'saved' });
  await device.getByRole('region', { name: 'Hydration' }).getByRole('button', { name: 'Add a glass' }).click();
  expect((await timings(page)).at(-1)).toMatchObject({ action: 'water', taps: 1, outcome: 'saved' });
});

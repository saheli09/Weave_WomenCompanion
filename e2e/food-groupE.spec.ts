import { expect, test } from '@playwright/test';
import { expectTapTargets, start, timings } from './helpers';

/** PRD Phase 3 acceptance for D5: meal suggestion with the safe-ingredient rule, first-food prompt, reaction flow with the emergency branch. */

test.beforeEach(async ({ page }) => start(page, 'D5'));

test('Today shows the meal card (S02) and the curd prompt', async ({ page }) => {
  const device = page.locator('#device');
  await expect(device.getByText('Today’s lunch')).toBeVisible();
  await expect(device.getByRole('heading', { name: 'Rice + chicken stew' })).toBeVisible();
  await expect(device.getByText('Ingredients already introduced safely')).toBeVisible();
  await expect(device.getByRole('heading', { name: 'Curd introduced today.' })).toBeVisible();
  await expectTapTargets(page);
});

test('recipe: ingredients, steps, Mark as fed logs the meal', async ({ page }) => {
  const device = page.locator('#device');
  await device.getByRole('button', { name: 'View recipe' }).click();
  await expect(device.getByRole('heading', { name: 'Rice + chicken stew' })).toBeVisible();
  await expect(device.getByText('Shred the chicken finely.')).toBeVisible();
  await device.getByRole('button', { name: 'Mark as fed' }).click();
  await expect(device.getByText('Rice + chicken stew logged as lunch.')).toBeVisible();
  await expect(device.getByRole('heading', { name: 'Rice + chicken stew' })).toHaveCount(0); // not repeated within three days
});

test('solids sheet: new food detection raises the prompt', async ({ page }) => {
  const device = page.locator('#device');
  await device.getByRole('button', { name: /^Log a feed for Srinika/ }).click();
  await device.getByRole('button', { name: 'Solids' }).click();
  await expect(device.getByRole('radio', { name: 'Lunch' })).toHaveAttribute('aria-checked', 'true');
  await device.getByLabel('Search or add a food').fill('papa');
  await device.getByRole('button', { name: 'Papaya' }).click();
  await device.getByRole('button', { name: 'Save' }).click();
  await expect(device.getByText('Papaya is new for Srinika. Watching for 72 hours.')).toBeVisible();
  await expect(device.getByRole('heading', { name: 'Papaya introduced today.' })).toBeVisible();
  expect((await timings(page)).at(-1)).toMatchObject({ action: 'feed_solids', outcome: 'saved' });
});

test('reaction: emergency symptom shows the emergency card before anything is saved', async ({ page }) => {
  const device = page.locator('#device');
  await device.getByRole('button', { name: 'Log a reaction' }).click();
  await expect(device.getByLabel('Which food')).toHaveValue('curd');
  await device.getByRole('button', { name: 'Difficulty breathing' }).click();
  const card = device.getByRole('alert').filter({ hasText: 'Seek urgent medical care now.' });
  await expect(card).toBeVisible();
  await expect(card.getByRole('link', { name: 'Call emergency services · 112' })).toHaveAttribute('href', 'tel:112');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('weave-v1')!).state.domain.logs.filter((l: { type: string }) => l.type === 'reaction').length);
  expect(saved).toBe(0);
  await expectTapTargets(page);
});

test('reaction: ordinary symptoms save, update the food and retire the prompt', async ({ page }) => {
  const device = page.locator('#device');
  await device.getByRole('button', { name: 'Log a reaction' }).click();
  await device.getByRole('button', { name: 'Next' }).click();
  await expect(device.getByText('Choose at least one thing you noticed.')).toBeVisible();
  await device.getByRole('button', { name: 'Rash or hives' }).click();
  await device.getByRole('button', { name: 'Next' }).click();
  await device.getByRole('radio', { name: 'Mild' }).click();
  await device.getByRole('button', { name: 'Save' }).click();
  await expect(device.getByText('Saved. Curd now shows this in the food journey.')).toBeVisible();
  await expect(device.getByRole('heading', { name: 'Curd', exact: true })).toBeVisible();
  await expect(device.getByText(/Rash or hives/)).toBeVisible();
  await page.goto('/baby/food');
  await expect(device.getByRole('button', { name: /Curd, first on 27 August, reaction: Mild, allergen group dairy/ })).toBeVisible();
  await page.goto('/today');
  await expect(device.getByRole('heading', { name: 'Curd introduced today.' })).toHaveCount(0);
});

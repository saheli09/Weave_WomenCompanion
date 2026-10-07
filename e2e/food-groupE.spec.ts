import { expect, test } from '@playwright/test';
import { closePanel, expectTapTargets, openPanel, start, timings } from './helpers';

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

test('toddler Today order (9.1): insights, compact meal card, child and Me cards, then active-only cards', async ({ page }) => {
  const device = page.locator('#device');
  const y = async (l: import('@playwright/test').Locator) => (await l.boundingBox())!.y;
  const carousel = await y(device.getByRole('region', { name: 'Noticing' }));
  const meal = await y(device.getByTestId('meal-card'));
  const cards = await y(device.getByRole('region', { name: 'Srinika' }));
  const prompt = await y(device.getByRole('heading', { name: 'Curd introduced today.' }));
  const course = await y(device.getByText('Medicine course', { exact: true }));
  expect(carousel).toBeLessThan(meal);
  expect(meal).toBeLessThan(cards);
  expect(cards).toBeLessThan(prompt);
  expect(prompt).toBeLessThan(course);
});

test('the formula reminder is the first card she sees, in the shorter wording', async ({ page }) => {
  const first = page.locator('#device [aria-roledescription="slide"]').first();
  await expect(first.getByText('The open formula tin is due to be discarded by 1 September.')).toBeInViewport();
  await expect(first.getByText('Opened 18 July. Five days left.')).toBeVisible();
});

test('acceptance at 390 x 844: greeting, top insight, meal card and the top of both daily cards on the first screen', async ({ page }, info) => {
  test.skip(info.project.name !== 'w390', 'the acceptance size is 390 x 844');
  const device = page.locator('#device');
  await expect(device.getByRole('heading', { name: /^Good morning, Saheli/ })).toBeInViewport();
  await expect(device.locator('[aria-roledescription="slide"]').first()).toBeInViewport({ ratio: 1 });
  await expect(device.getByTestId('meal-card')).toBeInViewport({ ratio: 1 });
  const nav = (await device.getByRole('navigation').boundingBox())!;
  for (const name of ['Srinika', 'Me']) {
    const top = (await device.getByRole('region', { name, exact: true }).boundingBox())!;
    expect(top.y + 60, `${name} card starts on the first screen`).toBeLessThan(nav.y);
  }
  const meal = (await device.getByTestId('meal-card').boundingBox())!;
  expect(meal.height / 844).toBeLessThanOrEqual(0.27); // about a quarter of the screen
});

test('advancing the demo clock re-ranks the carousel; closing the tin removes the card', async ({ page }) => {
  const device = page.locator('#device');
  const first = device.locator('[aria-roledescription="slide"]').first();
  await expect(first).toContainText('Five days left.');
  await openPanel(page);
  await page.getByTestId('advance-day').first().click();
  await closePanel(page);
  await expect(first).toContainText('Four days left.');
  await openPanel(page);
  for (let i = 0; i < 6; i++) await page.getByTestId('advance-day').first().click(); // 2 September, a day past
  await closePanel(page);
  await expect(first).toContainText('The open formula tin has passed its discard date.');
  await first.getByRole('button', { name: 'Mark discarded' }).click();
  await expect(device.getByText(/formula tin/)).toHaveCount(0);
});

test('a persona loaded two days after the anchor is seeded around that time, not 47 hours stale', async ({ page }) => {
  const device = page.locator('#device');
  await openPanel(page);
  await page.locator('[data-testid="demo-panel"] input[type="datetime-local"]').first().fill('2026-08-29T16:40');
  await page.locator('[data-persona="D5"]').first().click();
  await closePanel(page);
  await expect(device.getByText('Saturday 29 August', { exact: false })).toBeVisible();
  await expect(device.getByRole('region', { name: 'Srinika' }).getByText('Last meal, 15m ago')).toBeVisible();
  await expect(device.getByText('Opened 20 July. Five days left.')).toBeVisible();
});

test('child card: "Last meal, 15m ago"; diapers and sleep sit behind More and still log', async ({ page }) => {
  const card = page.locator('#device').getByRole('region', { name: 'Srinika' });
  await expect(card.getByText('Last meal, 15m ago')).toBeVisible();
  await expect(card.getByText('Diapers')).toHaveCount(0);
  const more = card.getByRole('button', { name: 'More' });
  await expect(more).toHaveAttribute('aria-expanded', 'false');
  await more.click();
  await expect(card.getByRole('button', { name: 'Less' })).toHaveAttribute('aria-expanded', 'true');
  await card.getByRole('button', { name: /^Log a diaper for Srinika/ }).click();
  await page.locator('#device').getByRole('button', { name: 'Wet', exact: true }).click();
  await expect(card.getByRole('button', { name: /Diapers: 5/ })).toBeVisible();
  await expectTapTargets(page);
});

test('an insight with three actions keeps its text actions together on one row', async ({ page }) => {
  const card = page.locator('#device article').filter({ hasText: 'formula tin' });
  const discarded = await card.getByRole('button', { name: 'Mark discarded' }).boundingBox();
  const notNow = await card.getByRole('button', { name: 'Not now' }).boundingBox();
  expect(Math.abs(discarded!.y - notNow!.y)).toBeLessThan(2);
});

test('the meal card shows the next meal; the whole day opens on demand', async ({ page }) => {
  const card = page.locator('#device [data-testid="meal-card"]');
  const toggle = card.getByRole('button', { name: 'All meals today' });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(card.getByText('Breakfast', { exact: true })).toHaveCount(0);
  await toggle.click();
  await expect(card.getByRole('button', { name: 'Hide other meals' })).toHaveAttribute('aria-expanded', 'true');
  await expect(card.getByText('Breakfast', { exact: true })).toBeVisible();
  await expect(card.getByText('Ragi, banana')).toBeVisible();
  await expect(card.getByText('Snack', { exact: true })).toBeVisible();
  await expect(card.getByText('Curd', { exact: true })).toBeVisible();
  const dinner = card.getByRole('button', { name: /^Dinner: .+\. View recipe$/ });
  await expect(dinner).toBeVisible();
  await dinner.click();
  await expect(page).toHaveURL(/slot=dinner/);
  await page.locator('#device').getByRole('button', { name: 'Mark as fed' }).click();
  await expect(page.locator('#device').getByText(/logged as dinner\./)).toBeVisible();
  await expect(card.getByText('Today’s lunch')).toBeVisible(); // lunch still leads until it is logged
  await expectTapTargets(page);
});

test('recipe: ingredients, steps, Mark as fed logs the meal', async ({ page }) => {
  const device = page.locator('#device');
  await device.getByRole('button', { name: 'View recipe', exact: true }).click();
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

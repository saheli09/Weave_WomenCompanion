import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ANCHOR } from '../src/state/personas';
import { expectTapTargets } from './helpers';

/** First-run Today for a cycle tracker (decision 2026-10-31): greeting, one setup question, mood, symptoms. */

async function freshCycleTracker(page: Page) {
  await page.clock.install({ time: ANCHOR });
  await page.goto('/today');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const d = page.locator('#device');
  await d.getByRole('button', { name: 'Continue without an account' }).click();
  await d.getByRole('radio', { name: 'I’m tracking my cycle', exact: true }).click();
  await d.getByRole('button', { name: 'Continue' }).click();
  await d.getByLabel('Your name').fill('Asha');
  await d.getByRole('button', { name: 'Open Weave' }).click();
  await expect(d.locator('[data-today-state="cycle_only"]')).toBeVisible();
}

/** Filled buttons in the screen content (the + in the nav is not one). */
const filled = (page: Page) => page.locator('#device main button.bg-ink, #device main button.bg-sage-600');

test.beforeEach(async ({ page }) => freshCycleTracker(page));

test('first run: greeting, the setup question, mood and symptoms, and nothing else', async ({ page }) => {
  const d = page.locator('#device');
  const today = d.locator('[data-today-state="cycle_only"]');
  await expect(d.getByRole('heading', { name: 'Good morning, Asha' })).toBeVisible();
  const setup = d.getByTestId('cycle-setup');
  await expect(setup.getByRole('heading', { name: 'When did your last period start?' })).toBeVisible();
  await expect(setup.getByText('Weave uses this to work out where you are in your cycle.')).toBeVisible();
  for (const chip of ['Today', 'Yesterday', 'Pick a date', 'I don’t remember']) await expect(setup.getByRole('button', { name: chip, exact: true })).toBeVisible();
  await expect(d.getByTestId('mood-card').getByRole('heading', { name: 'How are you feeling?' })).toBeVisible();
  await expect(d.getByRole('button', { name: 'Symptoms: Add. Open to add or change.' })).toBeVisible();

  // Nothing else: no cycle numbers, no welcome, no water, no Today so far, no insights, no "--".
  await expect(today.getByText(/Cycle day|Day \d/)).toHaveCount(0);
  await expect(today.getByText(/Welcome,/)).toHaveCount(0);
  await expect(d.getByTestId('welcome-card')).toHaveCount(0);
  await expect(d.getByRole('region', { name: 'Hydration' })).toHaveCount(0);
  await expect(d.getByText('Today so far', { exact: true })).toHaveCount(0);
  await expect(d.getByRole('article', { name: /^Noticing/ })).toHaveCount(0);
  await expect(today.getByText('--')).toHaveCount(0);
  await expect(filled(page)).toHaveCount(0);
  await expectTapTargets(page);
});

test('Today saves the start: the card turns into the cycle card, with a rough estimate; Undo brings the question back', async ({ page }) => {
  const d = page.locator('#device');
  await d.getByTestId('cycle-setup').getByRole('button', { name: 'Today', exact: true }).click();
  const card = d.getByTestId('cycle-summary');
  await expect(card.getByRole('heading', { name: 'Period, Day 1' })).toBeVisible();
  await expect(card.getByText('Next period in about 28 days, around 24 September.')).toBeVisible();
  await expect(card.getByTestId('estimate-basis')).toContainText('Rough estimate, based on a 28-day cycle.');
  await expect(card.getByRole('button', { name: 'Log today' })).toBeVisible();
  await expect(card.getByRole('button', { name: 'End period' })).toBeVisible();
  await expect(d.getByTestId('cycle-setup')).toHaveCount(0);
  await expect(filled(page)).toHaveCount(1); // Log today, the one filled button
  await expect(d.getByText('Today so far', { exact: true })).toBeVisible(); // today's period log

  await d.getByRole('status').getByRole('button', { name: 'Undo' }).click();
  await expect(d.getByTestId('cycle-setup').getByRole('heading', { name: 'When did your last period start?' })).toBeVisible();
  await expect(d.getByTestId('cycle-summary')).toHaveCount(0);
  await expect(d.getByText('Today so far', { exact: true })).toHaveCount(0);
});

test('Pick a date: twelve days ago reads Cycle day 12 and the days until a rough next period', async ({ page }) => {
  const d = page.locator('#device');
  await d.getByRole('button', { name: 'Pick a date' }).click();
  const sheet = d.getByRole('dialog');
  await expect(sheet.getByRole('button', { name: 'Save' })).toBeDisabled();
  await sheet.getByLabel('First day of your last period').fill('2026-08-16');
  await sheet.getByRole('button', { name: 'Save' }).click();
  const card = d.getByTestId('cycle-summary');
  await expect(card.getByRole('heading', { name: 'Cycle day 12', exact: true })).toBeVisible();
  await expect(card.getByText('Your cycle')).toHaveCount(0); // no eyebrow
  await expect(card.getByText('Next period in about 17 days, around 13 September.')).toBeVisible();
  await expect(card.getByTestId('estimate-basis')).toContainText('Rough estimate, based on a 28-day cycle.');
  await expect(card.getByTestId('rough-estimate')).toHaveCount(0); // no nested box
  // Nothing logged today, so no Today so far (and no second filled button from its empty state).
  await expect(d.getByText('Today so far', { exact: true })).toHaveCount(0);
  await expect(filled(page)).toHaveCount(1);
  await expect(card.getByRole('button', { name: 'My period started' })).toBeVisible();
});

test('Change: a 32-day usual cycle moves the estimate, and it survives a reload', async ({ page }) => {
  const d = page.locator('#device');
  await d.getByRole('button', { name: 'Pick a date' }).click();
  await d.getByRole('dialog').getByLabel('First day of your last period').fill('2026-08-16');
  await d.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  const card = d.getByTestId('cycle-summary');
  await card.getByRole('button', { name: 'Change your usual cycle length, now 28 days' }).click();
  const sheet = d.getByRole('dialog', { name: 'Your usual cycle' });
  await expect(sheet.getByTestId('cycle-length')).toHaveText('28 days');
  for (let i = 0; i < 4; i++) await sheet.getByRole('button', { name: 'One day longer' }).click();
  await expect(sheet.getByTestId('cycle-length')).toHaveText('32 days');
  await sheet.getByRole('button', { name: 'Save' }).click();
  await expect(card.getByText('Next period in about 21 days, around 17 September.')).toBeVisible();
  await expect(card.getByTestId('estimate-basis')).toContainText('Rough estimate, based on a 32-day cycle.');
  await page.reload();
  await expect(card.getByText('Next period in about 21 days, around 17 September.')).toBeVisible();
});

test('the length stays between 21 and 45 days', async ({ page }) => {
  const d = page.locator('#device');
  await d.getByTestId('cycle-setup').getByRole('button', { name: 'Today', exact: true }).click();
  await d.getByRole('button', { name: /^Change your usual cycle length/ }).click();
  const sheet = d.getByRole('dialog', { name: 'Your usual cycle' });
  const shorter = sheet.getByRole('button', { name: 'One day shorter' });
  for (let i = 0; i < 7; i++) await shorter.click();
  await expect(sheet.getByTestId('cycle-length')).toHaveText('21 days');
  await expect(shorter).toBeDisabled();
  const longer = sheet.getByRole('button', { name: 'One day longer' });
  for (let i = 0; i < 24; i++) await longer.click();
  await expect(sheet.getByTestId('cycle-length')).toHaveText('45 days');
  await expect(longer).toBeDisabled();
});

test('My period started: one tap logs today, with Undo', async ({ page }) => {
  const d = page.locator('#device');
  await d.getByRole('button', { name: 'Pick a date' }).click();
  await d.getByRole('dialog').getByLabel('First day of your last period').fill('2026-07-31');
  await d.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  const card = d.getByTestId('cycle-summary');
  await expect(card.getByRole('heading', { name: 'Cycle day 28', exact: true })).toBeVisible();
  await expect(card.getByText('Next period likely tomorrow, 28 August.')).toBeVisible();
  await card.getByRole('button', { name: 'My period started' }).click();
  await expect(card.getByRole('heading', { name: 'Period, Day 1' })).toBeVisible();
  // Two starts now: one cycle of 27 days, still a rough estimate.
  await expect(card.getByText('Next period in about 28 days, around 24 September.')).toBeVisible();
  await expect(card.getByRole('button', { name: 'Log today' })).toBeVisible();
  await d.getByRole('status').getByRole('button', { name: 'Undo' }).click();
  await expect(card.getByRole('heading', { name: 'Cycle day 28', exact: true })).toBeVisible();
  await expect(card.getByRole('button', { name: 'My period started' })).toBeVisible();
});

test('I don’t remember: no day count, and the cycle starts when she logs a period', async ({ page }) => {
  const d = page.locator('#device');
  await d.getByRole('button', { name: 'I don’t remember' }).click();
  const setup = d.getByTestId('cycle-setup');
  await expect(setup.getByRole('heading', { name: 'Your cycle starts when you log your first period.' })).toBeVisible();
  await expect(setup.getByRole('button', { name: 'I don’t remember' })).toHaveCount(0);
  await expect(d.locator('[data-today-state="cycle_only"]').getByText(/Cycle day|Day \d/)).toHaveCount(0);
  await page.reload();
  await expect(setup.getByRole('heading', { name: 'Your cycle starts when you log your first period.' })).toBeVisible();
  await setup.getByRole('button', { name: 'Yesterday' }).click();
  await expect(d.getByTestId('cycle-summary').getByRole('heading', { name: 'Period, Day 2' })).toBeVisible();
});

test('mood: one tap logs it, and Today so far appears', async ({ page }) => {
  const d = page.locator('#device');
  const mood = d.getByTestId('mood-card');
  await mood.getByRole('button', { name: 'Ok' }).click();
  await expect(mood.getByRole('button', { name: 'Ok' })).toHaveAttribute('aria-pressed', 'true');
  await expect(d.getByText('Today so far', { exact: true })).toBeVisible();
});

test('symptoms: the row opens the day’s symptoms, saves without marking a period day, and shows what she chose', async ({ page }) => {
  const d = page.locator('#device');
  await d.getByRole('button', { name: /^Symptoms: Add/ }).click();
  const sheet = d.getByRole('dialog', { name: 'Symptoms' });
  await expect(sheet.getByText('Flow')).toHaveCount(0);
  await sheet.getByRole('button', { name: 'Cramps' }).click();
  await sheet.getByRole('button', { name: 'Headache' }).click();
  await sheet.getByRole('button', { name: 'Save' }).click();
  await expect(d.getByRole('button', { name: /^Symptoms: Cramps, Headache/ })).toBeVisible();
  await expect(d.getByTestId('cycle-setup')).toBeVisible(); // still no period
  await expect(d.getByText('Today so far', { exact: true })).toBeVisible();
  // Reopening keeps them chosen; clearing one removes it.
  await d.getByRole('button', { name: /^Symptoms: Cramps, Headache/ }).click();
  await expect(sheet.getByRole('button', { name: 'Cramps' })).toHaveAttribute('aria-pressed', 'true');
  await sheet.getByRole('button', { name: 'Headache' }).click();
  await sheet.getByRole('button', { name: 'Save' }).click();
  await expect(d.getByRole('button', { name: /^Symptoms: Cramps\./ })).toBeVisible();
});

for (const theme of ['light', 'dark'] as const) {
  test(`no accessibility violations before and after saving a date, ${theme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    const d = page.locator('#device');
    const scan = async () => expect((await new AxeBuilder({ page }).include('#device').analyze()).violations).toEqual([]);
    await scan();
    await d.getByRole('button', { name: 'Yesterday' }).click();
    await expect(d.getByTestId('cycle-summary')).toBeVisible();
    await scan();
    await expectTapTargets(page);
  });
}

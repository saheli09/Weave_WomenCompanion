import { expect, test, type Page } from '@playwright/test';
import { ANCHOR, expectTapTargets, start } from './helpers';

/** The fourth tab follows her journey (decision 2026-10-28): Pregnancy, Cycle or Baby. Me is how she is today. */

const nav = (page: Page) => page.locator('#device').getByRole('navigation', { name: 'Main' });

test('pregnant: the Pregnancy tab holds progress, the baby this week, appointments and so far; Me loses the week ring', async ({ page }) => {
  await start(page, 'D1');
  const d = page.locator('#device');
  await expect(nav(page).getByRole('link', { name: 'Baby' })).toHaveCount(0);
  await nav(page).getByRole('link', { name: 'Pregnancy' }).click();
  await expect(page).toHaveURL(/\/pregnancy$/);
  await expect(d.getByRole('heading', { name: 'Week 22', exact: true })).toBeVisible();
  await expect(d.getByText('Second trimester')).toBeVisible();
  await expect(d.getByTestId('fetal-card')).toContainText('About 28 cm');
  await expect(d.getByTestId('fetal-card')).toContainText('About 430 g');
  await expect(d.getByText('Coming up', { exact: true })).toBeVisible();
  await expect(d.getByText('So far', { exact: true })).toBeVisible();
  await expectTapTargets(page);
  await nav(page).getByRole('link', { name: 'Me' }).click();
  await expect(d.getByRole('heading', { name: 'Me', exact: true })).toBeVisible();
  await expect(d.getByText('22/40')).toHaveCount(0);
});

test('pregnant with a 14-month-old: the tab stays Baby, and the child strip opens it', async ({ page }) => {
  await start(page, 'D6');
  await expect(nav(page).getByRole('link', { name: 'Baby' })).toBeVisible();
  await expect(nav(page).getByRole('link', { name: 'Pregnancy' })).toHaveCount(0);
  await page.locator('#device').getByRole('button', { name: /open the Baby screen/ }).click();
  await expect(page).toHaveURL(/\/baby$/);
});

test('at birth the Pregnancy tab becomes Baby, with no setup', async ({ page }) => {
  await start(page, 'D2');
  const d = page.locator('#device');
  await expect(nav(page).getByRole('link', { name: 'Pregnancy' })).toBeVisible();
  await d.getByRole('button', { name: 'Start Labour Mode', exact: true }).click();
  await d.getByRole('button', { name: 'Baby is here' }).click();
  await d.getByRole('button', { name: 'Save birth' }).click();
  await d.getByRole('button', { name: 'Continue' }).click();
  await expect(nav(page).getByRole('link', { name: 'Baby' })).toBeVisible();
  await expect(nav(page).getByRole('link', { name: 'Pregnancy' })).toHaveCount(0);
});

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
  await d.getByLabel('First day of your last period (optional)').fill('2026-08-16');
  await d.getByRole('button', { name: 'Open Weave' }).click();
}

test('cycle tracker: Cycle is its own tab, Me has no cycle section, and + offers Period', async ({ page }) => {
  await freshCycleTracker(page);
  const d = page.locator('#device');
  await nav(page).getByRole('link', { name: 'Cycle' }).click();
  await expect(page).toHaveURL(/\/cycle$/);
  await expect(d.getByTestId('cycle-summary')).toBeVisible();
  await expect(d.getByRole('button', { name: /Back/ })).toHaveCount(0); // a tab, not a sub-screen
  await nav(page).getByRole('link', { name: 'Me' }).click();
  await expect(d.locator('main').getByText('Cycle', { exact: true })).toHaveCount(0);
  await page.getByTestId('fab').click();
  await d.getByRole('button', { name: /^Period/ }).click();
  await expect(page).toHaveURL(/\/cycle$/);
  await expect(d.getByRole('dialog')).toBeVisible(); // today's period sheet is open
});

test('cycle tracker Settings: no baby-only settings, and adding a child waits near the end', async ({ page }) => {
  await freshCycleTracker(page);
  const d = page.locator('#device');
  await page.goto('/settings');
  await expect(d.getByText('Formula tin reminders')).toHaveCount(0);
  await expect(d.getByRole('radiogroup', { name: 'Volume' })).toHaveCount(0);
  await expect(d.getByText('Medicine reminders')).toBeVisible();
  const sections = (await d.locator('main h2').allInnerTexts()).map((x) => x.toLowerCase());
  expect(sections.indexOf('children')).toBeGreaterThan(sections.indexOf('units'));
  await d.getByRole('button', { name: 'Sharing' }).click();
  const sheet = d.getByRole('dialog');
  await expect(sheet.getByRole('switch')).toHaveCount(1);
  await expect(sheet.getByRole('switch', { name: 'Your cycle' })).toBeVisible();
  await expect(sheet.getByText(/Feeds|Appointments|recovery/)).toHaveCount(0);
});

test('cycle tracker adds a child in Settings: Baby replaces Cycle and opens on the child', async ({ page }) => {
  await freshCycleTracker(page);
  const d = page.locator('#device');
  await page.goto('/settings');
  await d.getByRole('button', { name: 'Add a child' }).click();
  await d.getByLabel('Child’s name').fill('Kabir');
  await d.getByLabel('Child’s date of birth').fill('2025-02-10');
  await expect(d.getByText('Kabir is 18 months old.')).toBeVisible();
  await expect(d.getByRole('button', { name: 'Solids' })).toHaveAttribute('aria-pressed', 'true'); // preset from age
  await d.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page).toHaveURL(/\/baby$/);
  await expect(d.getByRole('heading', { name: 'Kabir' })).toBeVisible();
  await expect(nav(page).getByRole('link', { name: 'Baby' })).toBeVisible();
  await expect(nav(page).getByRole('link', { name: 'Cycle' })).toHaveCount(0);
});

test('cycle tracker with no baby: nothing about postpartum or breastfeeding; the Today card opens the Cycle tab', async ({ page }) => {
  await freshCycleTracker(page);
  const d = page.locator('#device');
  const tooEarly = d.getByText('Too early to estimate. Weave estimates your next period once two cycles are logged.');
  await expect(tooEarly).toHaveCount(0); // the welcome card above already says it
  await d.getByTestId('welcome-card').getByRole('button', { name: 'Open cycle' }).click();
  await page.goto('/today');
  await expect(d.getByTestId('welcome-card')).toHaveCount(0);
  await expect(tooEarly).toBeVisible();
  await expect(d.getByText(/postpartum/i)).toHaveCount(0);
  await d.getByRole('button', { name: /^Cycle/ }).click();
  await expect(page).toHaveURL(/\/cycle$/);
  await d.getByText('Why can it shift?').click();
  await expect(d.getByText(/^Stress, illness, travel/)).toBeVisible();
  await expect(d.locator('main').getByText(/postpartum|breastfeed/i)).toHaveCount(0);
});

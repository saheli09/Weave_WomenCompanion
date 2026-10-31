import { expect, test, type Page } from '@playwright/test';
import { ANCHOR, expectTapTargets, start } from './helpers';

/** The fourth tab follows her journey (decision 2026-10-28): Pregnancy, Cycle or Baby. Me is how she is today. */

const nav = (page: Page) => page.locator('#device').getByRole('navigation', { name: 'Main' });

test('pregnant: the Pregnancy tab holds progress, the baby this week, appointments and so far; Self care has no week ring', async ({ page }) => {
  await start(page, 'D1');
  const d = page.locator('#device');
  await expect(nav(page).getByRole('link', { name: 'Baby' })).toHaveCount(0);
  await nav(page).getByRole('link', { name: 'Pregnancy' }).click();
  await expect(page).toHaveURL(/\/pregnancy$/);
  await expect(d.getByRole('heading', { name: 'Week 22', exact: true })).toBeVisible();
  await expect(d.getByText('Second trimester')).toBeVisible();
  await expect(d.getByTestId('fetal-card')).toContainText('About 28 cm');
  await expect(d.getByTestId('fetal-card')).toContainText('About 430 g');
  await expect(d.getByTestId('fetal-size')).toHaveText('About the size of a large mango');
  await expect(d.getByText('Coming up', { exact: true })).toBeVisible();
  await expect(d.getByText('So far', { exact: true })).toBeVisible();
  await expectTapTargets(page);
  await nav(page).getByRole('link', { name: 'Self care' }).click();
  await expect(d.getByRole('heading', { name: 'Self care', exact: true })).toBeVisible();
  await expect(d.getByText('22/40')).toHaveCount(0);
});

test('pregnant with a 14-month-old: Baby keeps its tab; Self care opens on Pregnancy, the switch’s first view', async ({ page }) => {
  await start(page, 'D6');
  const d = page.locator('#device');
  await expect(nav(page).getByRole('link', { name: 'Pregnancy' })).toHaveCount(0);
  await nav(page).getByRole('link', { name: 'Baby' }).click();
  await expect(page).toHaveURL(/\/baby$/);
  await expect(d.getByRole('heading', { name: 'Srinika', exact: true })).toBeVisible();
  await expect(d.getByTestId('selfcare-switch')).toHaveCount(0);

  await nav(page).getByRole('link', { name: 'Self care' }).click();
  const sw = d.getByTestId('selfcare-switch');
  // Pregnancy is the first view, and where the tab opens.
  await expect(sw.getByRole('button').first()).toHaveText('Pregnancy');
  await expect(page).toHaveURL(/\/pregnancy$/);
  await expect(sw.getByRole('button', { name: 'Pregnancy' })).toHaveAttribute('aria-current', 'page');
  await expect(d.getByRole('heading', { name: 'Week 16', exact: true })).toBeVisible();
  await expect(d.getByTestId('fetal-size')).toHaveText('About the size of an avocado'); // the baby this week
  await expect(nav(page).getByRole('link', { name: 'Self care' })).toHaveAttribute('aria-current', 'page');
  await expectTapTargets(page);

  await sw.getByRole('button', { name: 'Self care' }).click();
  await expect(page).toHaveURL(/\/me$/);
  await expect(d.getByRole('heading', { name: 'Self care', exact: true })).toBeVisible();
  await expect(nav(page).getByRole('link', { name: 'Self care' })).toHaveAttribute('aria-current', 'page');
  await expectTapTargets(page);
});

test('pregnant with no child: no switch in Self care; Pregnancy is its own tab', async ({ page }) => {
  await start(page, 'D1');
  await nav(page).getByRole('link', { name: 'Self care' }).click();
  await expect(page.locator('#device').getByTestId('selfcare-switch')).toHaveCount(0);
  await expect(nav(page).getByRole('link', { name: 'Pregnancy' })).toBeVisible();
});

test('pregnant with a child: Today has everything from pregnancy and everything about the child', async ({ page }) => {
  await start(page, 'D6');
  const d = page.locator('#device');
  await expect(d.locator('[data-today-state="pregnancy_with_child"]')).toBeVisible();
  // Pregnancy
  await expect(d.getByRole('heading', { name: 'Week 16', exact: true })).toBeVisible();
  await expect(d.getByText('Your medicines today', { exact: true })).toBeVisible();
  await expect(d.getByText('Coming up', { exact: true })).toBeVisible();
  await expect(d.getByText('This week', { exact: true })).toBeVisible();
  await expect(d.getByRole('button', { name: /^Hospital bag/ })).toBeVisible();
  // The child
  await expect(d.getByText('Srinika', { exact: true }).first()).toBeVisible();
  await expect(d.getByText(/Last meal/).first()).toBeVisible();
  await expect(d.getByText('Today’s meals', { exact: true })).toBeVisible();
  await expect(d.getByText('Medicine course', { exact: true })).toBeVisible();
  await expect(d.getByText('Today so far', { exact: true })).toBeVisible();
  const soFar = d.getByTestId('today-so-far');
  await expect(soFar.locator('[data-total="meal"]')).toContainText('Meals');
  await expect(soFar.locator('[data-total="diaper"]')).toBeVisible();
});

test('pregnant with a child: + offers the child’s logs and every pregnancy log', async ({ page }) => {
  await start(page, 'D6');
  const d = page.locator('#device');
  await d.getByTestId('fab').click();
  const sheet = d.getByRole('dialog', { name: 'What just happened?' });
  for (const name of ['Feed', 'Diaper', 'Sleep', 'Water', 'Mood', 'Symptom', 'Medicine', 'Weight', 'Note']) {
    await expect(sheet.getByRole('button', { name: new RegExp(`^${name}`) })).toBeVisible();
  }
  await expect(sheet.getByRole('button', { name: /^Pump/ })).toHaveCount(0); // she is not breastfeeding Srinika
  await sheet.getByRole('button', { name: /^Diaper/ }).click();
  await expect(d.getByRole('dialog')).toBeVisible();
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

test('cycle tracker: Cycle is its own tab, Self care has no cycle section, and + offers Period', async ({ page }) => {
  await freshCycleTracker(page);
  const d = page.locator('#device');
  await nav(page).getByRole('link', { name: 'Cycle' }).click();
  await expect(page).toHaveURL(/\/cycle$/);
  await expect(d.getByTestId('cycle-summary')).toBeVisible();
  await expect(d.getByRole('button', { name: /Back/ })).toHaveCount(0); // a tab, not a sub-screen
  await nav(page).getByRole('link', { name: 'Self care' }).click();
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

test('cycle tracker with no baby: nothing about postpartum or breastfeeding; the period card leads Today', async ({ page }) => {
  await freshCycleTracker(page);
  const d = page.locator('#device');
  // One cycle logged: a rough estimate, framed as one; no welcome card above it.
  await expect(d.getByTestId('welcome-card')).toHaveCount(0);
  await expect(d.getByTestId('cycle-summary').getByTestId('estimate-basis')).toContainText('Rough estimate, based on a 28-day cycle.');
  await expect(d.getByText(/postpartum/i)).toHaveCount(0);
  await nav(page).getByRole('link', { name: 'Cycle' }).click();
  await expect(page).toHaveURL(/\/cycle$/);
  await d.getByText('About ovulation').click();
  await d.getByText('Why can it shift?').click();
  await expect(d.getByText(/^Stress, illness, travel/)).toBeVisible();
  await expect(d.locator('main').getByText(/postpartum|breastfeed/i)).toHaveCount(0);
});

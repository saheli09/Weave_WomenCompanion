import { expect, test, type Page } from '@playwright/test';
import { ANCHOR, expectTapTargets } from './helpers';

/** B01 (9.13): a fresh install opens on onboarding; three screens on every path; the first Today greets her once. */

async function freshInstall(page: Page) {
  await page.clock.install({ time: ANCHOR });
  await page.goto('/today');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

const step = (page: Page) => page.locator('#device [role="progressbar"]');

test('a fresh install opens on the welcome screen, not on sample data', async ({ page }) => {
  await freshInstall(page);
  const d = page.locator('#device');
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(d.getByRole('heading', { name: 'Weave follows you both.' })).toBeVisible();
  await expect(d.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  await expect(d.getByRole('button', { name: 'Continue with Apple' })).toBeVisible();
  await expect(d.getByRole('navigation')).toHaveCount(0);
  await expectTapTargets(page);
  await page.goto('/baby'); // every route leads back here until she finishes
  await expect(page).toHaveURL(/\/onboarding$/);
});

test('"Look around with sample data" opens the demo Today', async ({ page }) => {
  await freshInstall(page);
  const d = page.locator('#device');
  await d.getByRole('button', { name: 'Look around with sample data' }).click();
  await expect(page).toHaveURL(/\/today$/);
  await expect(d.getByText('Sample data loaded. Use Demo to switch stages.')).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/\/today$/); // stays out of onboarding once chosen
});

test('"Continue with Google" says accounts are coming and carries on to the situation step', async ({ page }) => {
  await freshInstall(page);
  const d = page.locator('#device');
  await d.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(d.getByText('Accounts are coming soon. For now, everything stays on this phone.')).toBeVisible();
  await expect(step(page)).toHaveAttribute('aria-valuenow', '2');
  await expect(d.getByRole('heading', { name: 'Where are you right now?' })).toBeVisible();
});

test('pregnant, from her last period: three steps, the week shown, then a pregnancy Today with a one-time welcome', async ({ page }) => {
  await freshInstall(page);
  const d = page.locator('#device');
  await d.getByRole('button', { name: 'Continue without an account' }).click();
  await expect(step(page)).toHaveAttribute('aria-valuenow', '2');
  await expect(d.getByRole('button', { name: 'Continue' })).toBeDisabled();
  await d.getByRole('radio', { name: 'I’m pregnant', exact: true }).click();
  await d.getByRole('button', { name: 'Continue' }).click();
  await expect(step(page)).toHaveAttribute('aria-valuenow', '3');
  await expect(d.getByRole('heading', { name: 'About you' })).toBeVisible();
  await expect(d.getByText('Everything you log stays on this phone.', { exact: false })).toBeVisible();
  await d.getByLabel('Your name').fill('Asha');
  await d.getByRole('button', { name: 'Open Weave' }).click();
  await expect(d.getByText('Add a date.')).toBeVisible();
  await d.getByRole('button', { name: 'Not sure? Use your last period' }).click();
  await d.getByLabel('First day of your last period').fill('2026-04-01');
  await expect(d.getByText('Week 21. Due 6 January.')).toBeVisible();
  await expectTapTargets(page);
  await d.getByRole('button', { name: 'Open Weave' }).click();

  await expect(page).toHaveURL(/\/today$/);
  await expect(d.locator('[data-today-state="pregnancy"]')).toBeVisible();
  const welcome = d.getByTestId('welcome-card');
  await expect(welcome.getByText('Welcome, Asha.')).toBeVisible();
  await expect(welcome.getByRole('button', { name: 'Got it' })).toHaveCount(0); // one action only
  await welcome.getByRole('button', { name: 'Add a medicine' }).click(); // taking the first step retires it
  await expect(page).toHaveURL(/\/me\/medicines$/);
  await page.goto('/today');
  await expect(d.getByTestId('welcome-card')).toHaveCount(0);
});

test('have a baby: age shown as she types, straight to a baby Today', async ({ page }) => {
  await freshInstall(page);
  const d = page.locator('#device');
  await d.getByRole('button', { name: 'Continue without an account' }).click();
  await d.getByRole('radio', { name: 'I have a baby', exact: true }).click();
  await d.getByRole('button', { name: 'Continue' }).click();
  await expect(d.getByRole('heading', { name: 'About you and your baby' })).toBeVisible();
  await d.getByLabel('Your name').fill('Asha');
  await d.getByLabel('Child’s name').fill('Mira');
  await d.getByLabel('Child’s date of birth').fill('2026-12-01');
  await expect(d.getByText('That date is in the future.')).toBeVisible();
  await d.getByLabel('Child’s date of birth').fill('2026-08-01');
  await expect(d.getByText('Mira is 3 weeks old.')).toBeVisible();
  await d.getByRole('button', { name: 'Open Weave' }).click();
  await expect(d.locator('[data-today-state="postpartum_baby"]')).toBeVisible();
  await expect(d.getByTestId('welcome-card').getByRole('button', { name: 'Log something' })).toBeVisible();
});

test('tracking my cycle: optional last period, cycle Today', async ({ page }) => {
  await freshInstall(page);
  const d = page.locator('#device');
  await d.getByRole('button', { name: 'Continue without an account' }).click();
  await d.getByRole('radio', { name: 'I’m tracking my cycle', exact: true }).click();
  await d.getByRole('button', { name: 'Continue' }).click();
  await d.getByLabel('Your name').fill('Asha');
  await d.getByLabel('First day of your last period (optional)').fill('2026-08-16');
  await expect(d.getByText('Day 12 of your cycle.')).toBeVisible();
  await expect(d.getByText('Is your period still going?')).toHaveCount(0); // twelve days ago: counted as finished
  await d.getByRole('button', { name: 'Open Weave' }).click();
  await expect(d.locator('[data-today-state="cycle_only"]')).toBeVisible();
  // A start twelve days ago: the cycle card, not the first-run question.
  await expect(d.getByTestId('cycle-summary').getByRole('heading', { name: 'Cycle day 12', exact: true })).toBeVisible();
  await expect(d.getByTestId('cycle-setup')).toHaveCount(0);
  await expect(d.getByText(/Period, day/)).toHaveCount(0);
});

test('tracking my cycle with no period given: Today asks when it started, with no cycle numbers', async ({ page }) => {
  await freshInstall(page);
  const d = page.locator('#device');
  await d.getByRole('button', { name: 'Continue without an account' }).click();
  await d.getByRole('radio', { name: 'I’m tracking my cycle', exact: true }).click();
  await d.getByRole('button', { name: 'Continue' }).click();
  await d.getByLabel('Your name').fill('Asha');
  await d.getByRole('button', { name: 'Open Weave' }).click();
  await expect(d.locator('[data-today-state="cycle_only"]')).toBeVisible();
  await expect(d.getByTestId('cycle-setup').getByRole('heading', { name: 'When did your last period start?' })).toBeVisible();
  await expect(d.getByTestId('welcome-card')).toHaveCount(0);
  await expect(d.getByText('No period right now')).toHaveCount(0);
});

test('tracking my cycle: a period that began this week asks if it is still going; a finished one is not shown as ongoing', async ({ page }) => {
  await freshInstall(page);
  const d = page.locator('#device');
  await d.getByRole('button', { name: 'Continue without an account' }).click();
  await d.getByRole('radio', { name: 'I’m tracking my cycle', exact: true }).click();
  await d.getByRole('button', { name: 'Continue' }).click();
  await d.getByLabel('Your name').fill('Asha');
  await d.getByLabel('First day of your last period (optional)').fill('2026-08-25');
  await d.getByRole('radio', { name: 'No, it has finished' }).click();
  await d.getByRole('button', { name: 'Open Weave' }).click();
  await expect(d.locator('[data-today-state="cycle_only"]')).toBeVisible();
  await expect(d.getByText(/Period, day/)).toHaveCount(0);
});

test.describe('splash, with motion on', () => {
  test.use({ reducedMotion: 'no-preference' });
  test('shows the mark and name on launch, then gives way to Welcome', async ({ page }) => {
    await freshInstall(page);
    const splash = page.getByTestId('splash');
    await expect(splash).toBeVisible();
    await expect(splash.getByText('Weave', { exact: true })).toBeVisible();
    await expect(splash).toHaveCount(0, { timeout: 4000 });
    await expect(page.locator('#device').getByRole('button', { name: 'Continue without an account' })).toBeVisible();
  });
});

test('reduced motion: no splash, so nothing stands between her and the app', async ({ page }) => {
  await freshInstall(page);
  await expect(page.getByTestId('splash')).toHaveCount(0);
});

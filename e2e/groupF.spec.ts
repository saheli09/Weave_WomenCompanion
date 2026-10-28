import { expect, test } from '@playwright/test';
import { expectTapTargets, start } from './helpers';

/** Group F: explainer (B32), Ask AI (B33), settings (B35), sharing (B34), history (B36), onboarding (B01). */

test('explainer: tap an observation for the rule and data; show fewer like this', async ({ page }) => {
  await start(page, 'D3');
  const device = page.locator('#device');
  await device.getByRole('button', { name: 'Three feeds logged since 5am, and no water yet today.' }).click();
  await expect(device.getByRole('heading', { name: 'Why am I seeing this?' })).toBeVisible();
  await expect(device.getByText('Shown when three or more feeds are logged since 5am and no water is logged today.')).toBeVisible();
  await expect(device.getByText('Water today')).toBeVisible();
  await device.getByRole('button', { name: 'Show fewer like this' }).click();
  await expect(device.getByText('Three feeds logged since 5am, and no water yet today.')).toHaveCount(0);
});

test('Ask: state-aware chips, grounded answers, health deflection with a note, red flag to people', async ({ page }) => {
  await start(page, 'D3');
  const device = page.locator('#device');
  await device.getByRole('link', { name: 'Ask AI' }).click();
  await device.getByRole('button', { name: 'When was Srinika’s last feed?' }).click();
  await expect(device.getByText('Srinika’s last feed was at 9:10 AM, left. That was 1h ago.')).toBeVisible();
  await device.getByLabel('Ask about feeds, water, sleep, foods, medicines').fill('is this rash normal');
  await device.getByRole('button', { name: 'Send' }).click();
  await expect(device.getByText(/Worth raising with your provider/)).toBeVisible();
  await device.getByRole('button', { name: 'Add to my note for the doctor' }).click();
  await expect(device.getByText('Added to your notes.')).toBeVisible();
  await device.getByLabel('Ask about feeds, water, sleep, foods, medicines').fill('I feel like I might hurt myself');
  await device.getByRole('button', { name: 'Send' }).click();
  await expect(device.getByRole('link', { name: /Mental health support line · Call 14416/ })).toBeVisible();
  await expect(device.getByRole('link', { name: 'Call Dr. Mahua' })).toBeVisible();
});

test('settings: units change everywhere; Fewer observations; sharing is UI only', async ({ page }) => {
  await start(page, 'D3');
  const device = page.locator('#device');
  await device.getByRole('link', { name: 'Me' }).click();
  await device.getByRole('button', { name: 'Settings' }).click();
  await expect(device.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await device.getByRole('radio', { name: 'oz' }).click();
  await device.getByRole('radio', { name: 'Fewer' }).click();
  await device.getByRole('button', { name: 'Sharing' }).click();
  await expect(device.getByRole('button', { name: 'Send invite' })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expectTapTargets(page);
  await device.getByRole('link', { name: 'Today' }).click();
  await expect(device.getByText('Feed · formula · 2oz')).toBeVisible();
  await expect(device.locator('[aria-roledescription="slide"]')).toHaveCount(2);
});

test('history after a birth lists the archived pregnancy', async ({ page }) => {
  await start(page, 'D3');
  const device = page.locator('#device');
  await page.goto('/me/history');
  await expect(device.getByRole('heading', { name: /Pregnancy, due/ })).toBeVisible();
  await expect(device.getByText(/Srinika born Wednesday 12 August/)).toBeVisible();
  await expect(device.getByText('Medicines: Cipcal XT, Ferrogen XT')).toBeVisible();
});

test('onboarding: three screens to the right Today', async ({ page }) => {
  await start(page, 'D3');
  const device = page.locator('#device');
  await page.goto('/onboarding');
  await device.getByRole('button', { name: 'Continue without an account' }).click();
  await device.getByRole('radio', { name: 'I have a baby' }).click();
  await device.getByRole('button', { name: 'Continue' }).click();
  await device.getByRole('button', { name: 'Open Weave' }).click();
  await expect(device.getByText('Add your name.')).toBeVisible();
  await device.getByLabel('Your name').fill('Asha');
  await device.getByLabel('Child’s name').fill('Mira');
  await device.getByLabel('Child’s date of birth').fill('2026-08-01');
  await device.getByRole('button', { name: 'Open Weave' }).click();
  await expect(device.getByRole('heading', { name: 'Good morning, Asha' })).toBeVisible();
  await expect(device.getByText('Mira’s Age: 26d')).toBeVisible();
  await expect(device.getByText('Nothing logged yet today.')).toBeVisible(); // empty state
});

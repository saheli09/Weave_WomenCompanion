import { expect, test, type Page } from '@playwright/test';
import { ANCHOR, expectTapTargets, start } from './helpers';

/** Connected apps (UI only, decision 2026-10-29): her sleep and vitals from a tracker, kept on the phone. */

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
}

test('from her sleep screen to a connected Fitbit: nights, vitals and the timeline fill in', async ({ page }) => {
  await freshCycleTracker(page);
  const d = page.locator('#device');
  await page.goto('/me');
  await expect(d.getByRole('button', { name: /Vitals/ })).toHaveCount(0);
  await d.getByRole('button', { name: /Your sleep/ }).click();
  await d.getByRole('button', { name: /Connect a sleep tracker/ }).click();
  await expect(page).toHaveURL(/\/settings$/);

  await d.getByRole('button', { name: /Fitbit/ }).click();
  const sheet = d.getByRole('dialog');
  await expect(sheet.getByText('Weave reads only. It writes nothing back to Fitbit.')).toBeVisible();
  await expect(sheet.getByText(/Nothing leaves this phone/)).toBeVisible();
  await sheet.getByRole('button', { name: 'Connect' }).click();
  await expect(d.getByText('Fitbit connected. Two weeks of readings brought in.')).toBeVisible();
  await expect(d.getByRole('button', { name: /Fitbit/ })).toContainText('Connected');

  await page.goto('/me');
  await expect(d.getByRole('button', { name: /Your sleep/ })).toContainText(/last night/);
  await expect(d.getByRole('button', { name: /Your sleep/ })).toContainText('from Fitbit');
  await d.getByRole('button', { name: /Vitals/ }).click();
  await expect(d.getByRole('heading', { name: 'Your vitals' })).toBeVisible();
  await expect(d.getByText(/^Last night: [+−]?\d\.\d°[CF] from your usual\.$/)).toBeVisible(); // units follow the phone's region
  await expectTapTargets(page);

  await page.goto('/today');
  await expect(d.getByText(/^Woke · .* slept · Fitbit$/)).toBeVisible();
});

test('disconnecting keeps the readings already brought in', async ({ page }) => {
  await start(page, 'D7');
  const d = page.locator('#device');
  await page.goto('/settings');
  await d.getByRole('button', { name: /Fitbit/ }).click();
  await d.getByRole('dialog').getByRole('button', { name: 'Disconnect' }).click();
  await expect(d.getByText('Fitbit disconnected. Readings already brought in stay.')).toBeVisible();
  await page.goto('/me/sleep');
  await expect(d.getByRole('button', { name: /Connect a sleep tracker/ })).toBeVisible();
  await page.goto('/me');
  await expect(d.getByRole('button', { name: /Your sleep/ })).toContainText('from Fitbit');
});

test('temperature follows the units: °F with pounds', async ({ page }) => {
  await start(page, 'D7');
  const d = page.locator('#device');
  await page.goto('/settings');
  await d.getByRole('radio', { name: 'lb' }).click();
  await page.goto('/me/vitals');
  await expect(d.getByText(/^Last night: [+−]?\d\.\d°F from your usual\.$/)).toBeVisible();
});

test('one app at a time: switching to Oura says so, and her sleep and vitals then come from Oura', async ({ page }) => {
  await start(page, 'D7');
  const d = page.locator('#device');
  await page.goto('/settings');
  await d.getByRole('button', { name: /Oura/ }).click();
  const sheet = d.getByRole('dialog');
  await expect(sheet.getByText('One app at a time. Connecting Oura replaces Fitbit, including its last two weeks of readings.')).toBeVisible();
  await sheet.getByRole('button', { name: 'Connect' }).click();
  await expect(d.getByRole('button', { name: /Oura/ })).toContainText('Connected');
  await expect(d.getByRole('button', { name: /Fitbit/ })).not.toContainText('Connected');
  await page.goto('/me');
  await expect(d.getByRole('button', { name: /Your sleep/ })).toContainText('from Oura');
  await expect(d.getByRole('button', { name: /Vitals/ })).toContainText('from Oura');
  await page.goto('/today');
  await expect(d.getByText(/· Fitbit$/)).toHaveCount(0);
});

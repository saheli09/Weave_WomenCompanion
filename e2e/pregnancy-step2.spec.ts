import { expect, test } from '@playwright/test';
import { expectTapTargets, start, timings } from './helpers';

/** Pregnancy, step 2: Coming up and appointments (B30), This week checklist, Symptom, Weight, Note (B28). */

test.beforeEach(async ({ page }) => start(page, 'D1'));

test('Coming up lists the booked appointment and the suggested glucose test', async ({ page }) => {
  const device = page.locator('#device');
  await expect(device.getByRole('button', { name: /Appointment with Dr. Mahua, Monday 14 September/ })).toBeVisible();
  await expect(device.getByRole('button', { name: /Glucose test, Week 26, not booked/ })).toBeVisible();
  await expectTapTargets(page);
});

test('booking a suggested check moves it into the booked list', async ({ page }) => {
  const device = page.locator('#device');
  await device.getByRole('button', { name: /Glucose test, Week 26, not booked/ }).click();
  await expect(device.getByLabel('What', { exact: true })).toHaveValue('Glucose test');
  await expect(device.getByLabel('Date', { exact: true })).toHaveValue('2026-09-24'); // week 26 from a 31 December due date
  await device.getByRole('button', { name: 'Save' }).click();
  await expect(device.getByRole('button', { name: /Glucose test, Thursday 24 September/ })).toBeVisible();
  await expect(device.getByRole('button', { name: /not booked/ })).toHaveCount(0);
});

test('adding, validating, editing and removing an appointment', async ({ page }) => {
  const device = page.locator('#device');
  await device.getByRole('button', { name: 'Add an appointment' }).click();
  await device.getByRole('button', { name: 'Save' }).click();
  await expect(device.getByText('Add what the appointment is for.')).toBeVisible();
  await device.getByLabel('What', { exact: true }).fill('Growth scan');
  await device.getByLabel('Date', { exact: true }).fill('2026-10-02');
  await device.getByRole('button', { name: 'Save' }).click();
  await device.getByRole('button', { name: /Growth scan, Friday 2 October/ }).click();
  await device.getByLabel('What', { exact: true }).fill('Growth scan, second');
  await device.getByRole('button', { name: 'Save' }).click();
  await device.getByRole('button', { name: /Growth scan, second/ }).click();
  await device.getByRole('button', { name: 'Remove appointment' }).click();
  await expect(device.getByRole('button', { name: /Growth scan/ })).toHaveCount(0);
});

test('checklist rows toggle in one tap and undo', async ({ page }) => {
  const device = page.locator('#device');
  await device.getByRole('button', { name: 'Hospital bag: Not started. Tap to change.' }).click();
  await expect(device.getByRole('button', { name: 'Hospital bag: Packed. Tap to change.' })).toBeVisible();
  await device.getByRole('button', { name: 'Undo' }).click();
  await expect(device.getByRole('button', { name: 'Hospital bag: Not started. Tap to change.' })).toBeVisible();
  await device.getByRole('button', { name: /Birth plan: Shared with Rick/ }).click();
  await expect(device.getByRole('button', { name: /Birth plan: Not shared/ })).toBeVisible();
});

test('symptom: one tap on a chip logs it, and the provider off-ramp is always shown', async ({ page }) => {
  const device = page.locator('#device');
  await device.getByTestId('fab').click();
  await device.getByRole('button', { name: /^Symptom/ }).click();
  await expect(device.getByText(/contact your provider/)).toBeVisible();
  await device.getByRole('button', { name: 'Heartburn' }).click();
  await expect(device.getByText('Heartburn logged.')).toBeVisible();
  expect((await timings(page)).at(-1)).toMatchObject({ action: 'symptom', taps: 3, outcome: 'saved' });
});

test('weight: validates range and saves', async ({ page }) => {
  const device = page.locator('#device');
  await device.getByTestId('fab').click();
  await device.getByRole('button', { name: /^Weight/ }).click();
  await device.getByLabel('Weight in kg').fill('12');
  await device.getByRole('button', { name: 'Save' }).click();
  await expect(device.getByText('Enter a weight between 30 and 200 kg.')).toBeVisible();
  await device.getByLabel('Weight in kg').fill('61.4');
  await device.getByRole('button', { name: 'Save' }).click();
  await expect(device.getByText('Weight logged: 61.4 kg.')).toBeVisible();
});

test('note: needs text, then saves', async ({ page }) => {
  const device = page.locator('#device');
  await device.getByTestId('fab').click();
  await device.getByRole('button', { name: /^Note/ }).click();
  await device.getByRole('button', { name: 'Save' }).click();
  await expect(device.getByText('Write something first.')).toBeVisible();
  await device.getByRole('textbox', { name: 'Note' }).fill('Ask about the glucose test fasting window');
  await device.getByRole('button', { name: 'Save' }).click();
  await expect(device.getByText('Note saved.')).toBeVisible();
});

test('pregnancy quick-log tiles have no placeholder icons left except Medicine, Symptom, Weight, Note', async ({ page }) => {
  const device = page.locator('#device');
  await device.getByTestId('fab').click();
  await expect(device.locator('[data-icon="missing"]')).toHaveCount(4);
});

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

test('hospital bag: the row shows progress and opens a packing list', async ({ page }) => {
  const device = page.locator('#device');
  const row = device.getByRole('button', { name: /^Hospital bag: 5 of 16 packed/ });
  await row.click();
  const sheet = device.getByRole('dialog');
  await expect(sheet.getByTestId('bag-progress')).toHaveText('5 of 16 packed');
  await sheet.getByRole('checkbox', { name: 'Slippers and warm socks' }).check();
  await expect(sheet.getByTestId('bag-progress')).toHaveText('6 of 16 packed');
  await page.keyboard.press('Escape');
  await expect(device.getByRole('button', { name: /^Hospital bag: 6 of 16 packed/ })).toBeVisible();
});

test('hospital bag: she adds her own items, takes off what she does not need, and can bring them back', async ({ page }) => {
  const device = page.locator('#device');
  await device.getByRole('button', { name: /^Hospital bag: 5 of 16 packed/ }).click();
  const sheet = device.getByRole('dialog');
  await sheet.getByRole('button', { name: 'Add an item to For you', exact: true }).click();
  await sheet.getByLabel('New item for For you', { exact: true }).fill('Glasses');
  await sheet.getByLabel('New item for For you', { exact: true }).press('Enter');
  await expect(sheet.getByTestId('bag-progress')).toHaveText('5 of 17 packed');
  await sheet.getByRole('checkbox', { name: 'Glasses', exact: true }).check();
  await expect(sheet.getByTestId('bag-progress')).toHaveText('6 of 17 packed');

  await sheet.getByRole('button', { name: 'Edit list' }).click();
  await sheet.getByRole('button', { name: 'Remove Car seat for the ride home' }).click();
  await expect(sheet.getByTestId('bag-progress')).toHaveText('6 of 16 packed');
  await expect(sheet.getByText('Car seat for the ride home')).toHaveCount(0);
  await sheet.getByRole('button', { name: 'Bring back suggested items' }).click();
  await expect(sheet.getByText('Car seat for the ride home')).toBeVisible();
  await expect(sheet.getByTestId('bag-progress')).toHaveText('6 of 17 packed');
  await sheet.getByRole('button', { name: 'Done' }).click();

  await page.keyboard.press('Escape');
  await expect(device.getByRole('button', { name: /^Hospital bag: 6 of 17 packed/ })).toBeVisible();
});

test('birth plan: fill in the rest, and it reads Ready; sharing with Rick shows on the row', async ({ page }) => {
  const device = page.locator('#device');
  await device.getByRole('button', { name: /^Birth plan: Shared with Rick/ }).click();
  const sheet = device.getByRole('dialog');
  await expect(sheet.getByLabel('Where you plan to give birth')).toHaveValue('Fortis Hospital, Kolkata');
  await expect(sheet.getByLabel('Who will be with you')).toHaveValue('Rick');
  await sheet.getByRole('radio', { name: 'Breastfeed' }).click();
  await sheet.getByRole('switch', { name: 'Share with Rick' }).uncheck();
  await sheet.getByRole('button', { name: 'Save' }).click();
  await expect(device.getByText('Birth plan saved.')).toBeVisible();
  await expect(device.getByRole('button', { name: /^Birth plan: Ready/ })).toBeVisible();
});

test('without a partner, the birth plan points to Settings to share it', async ({ page }) => {
  const device = page.locator('#device');
  await page.goto('/settings');
  await device.getByLabel('Partner').fill('');
  await device.getByRole('button', { name: 'Save' }).first().click();
  await page.goto('/today');
  await device.getByRole('button', { name: /^Birth plan: Started/ }).click();
  await device.getByRole('dialog').getByRole('button', { name: 'Add your partner in Settings to share it' }).click();
  await expect(page).toHaveURL(/\/settings$/);
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

import { expect, test, type Page } from '@playwright/test';
import { closePanel, expectTapTargets, openPanel, start } from './helpers';

/** Pregnancy, step 4: Birth details (S12), handoff (B02), Something has changed (B31). */

const stored = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('weave-v1')!).state.domain);
async function demo(page: Page, name: string) {
  await openPanel(page);
  await page.locator('[data-testid="demo-panel"]').getByRole('button', { name }).first().click();
  await closePanel(page);
}
async function setClock(page: Page, value: string) {
  await openPanel(page);
  await page.locator('[data-testid="demo-panel"] input[type="datetime-local"]').first().fill(value);
  await closePanel(page);
}

test('PRD Phase 2 acceptance: week 22 -> Labour mode -> Birth details -> handoff -> postpartum Today', async ({ page }) => {
  await start(page, 'D1');
  const device = page.locator('#device');
  await expect(device.getByRole('heading', { name: 'Week 22', exact: true })).toBeVisible();
  await setClock(page, '2026-12-03T10:00'); // week 36
  await device.getByRole('button', { name: 'Start Labour Mode', exact: true }).click();
  await demo(page, 'Fill last hour: 1 of 3 signs');
  await device.getByRole('button', { name: 'Baby is here' }).click();

  await expect(device.getByRole('heading', { name: 'Everything’s filled in' })).toBeVisible();
  await expect(device.getByText('Time came from the last thing you logged in labour mode.', { exact: false })).toBeVisible();
  await expect(device.getByRole('button', { name: 'Edit Name: B/O Saheli' })).toBeVisible();
  await expect(device.getByRole('button', { name: /Edit Date: 3 December 2026/ })).toBeVisible();
  await expectTapTargets(page);

  await device.getByRole('button', { name: 'Edit Name: B/O Saheli' }).click();
  await device.getByRole('textbox', { name: 'Name' }).fill('Srinika');
  await device.getByRole('button', { name: 'Done' }).click();
  await device.getByRole('button', { name: /Edit Weight/ }).click();
  await device.getByRole('textbox', { name: 'Weight in kg' }).fill('3.1');
  await device.getByRole('button', { name: 'Done' }).click();
  await device.getByRole('button', { name: 'Save birth' }).click();

  await expect(device.getByRole('heading', { name: 'Welcome, little one.' })).toBeVisible();
  await expect(device.getByRole('navigation', { name: 'Main' })).toHaveCount(0);
  await device.getByRole('button', { name: 'Continue' }).click();

  await expect(device.locator('[data-today-state="postpartum_baby"]')).toBeVisible();
  await expect(device.getByText('Srinika’s Age: 0d')).toBeVisible();
  await expect(device.getByRole('navigation', { name: 'Main' })).toBeVisible();

  const s = await stored(page);
  expect(s.her.phase).toBe('postpartum');
  expect(s.her.pregnancy).toBeUndefined();
  expect(s.children).toHaveLength(1);
  expect(s.children[0].name).toBe('Srinika');
  expect(s.births[0].weightG).toBe(3100);
  expect(s.logs.find((l: { type: string; source: string }) => l.type === 'growth' && l.source === 'derived').weightG).toBe(3100);
  expect(s.history[0]).toMatchObject({ outcome: 'birth' });
  expect(s.history[0].medicineIds).toHaveLength(2);
  expect(s.history[0].appointments.length).toBeGreaterThan(0);
  expect(s.history[0].labour.contractions).toHaveLength(11);
  expect(s.medicines.every((m: { archived?: boolean }) => m.archived)).toBe(true);
});

test('Skip for now: minimum data, then "Finish your birth details" edits the same birth', async ({ page }) => {
  await start(page, 'D2');
  const device = page.locator('#device');
  await device.getByRole('button', { name: 'Start Labour Mode', exact: true }).click();
  await device.getByRole('button', { name: 'Baby is here' }).click();
  await device.getByRole('button', { name: 'Skip for now' }).click();
  await device.getByRole('button', { name: 'Continue' }).click();
  await expect(device.getByText('Finish your birth details')).toBeVisible();
  await device.getByRole('button', { name: 'Finish your birth details' }).click();
  await expect(device.getByRole('heading', { name: 'Birth details' })).toBeVisible();
  await device.getByRole('button', { name: /Edit Where/ }).click();
  await device.getByRole('textbox', { name: 'Where' }).fill('Fortis Hospital, Kolkata');
  await device.getByRole('button', { name: 'Done' }).click();
  await device.getByRole('button', { name: /Edit Weight/ }).click();
  await device.getByRole('textbox', { name: 'Weight in kg' }).fill('9');
  await expect(device.getByText('Enter a weight between 0.4 and 7 kg.')).toBeVisible();
  await device.getByRole('textbox', { name: 'Weight in kg' }).fill('2.95');
  await device.getByRole('button', { name: 'Done' }).click();
  await device.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(device.locator('[data-today-state="postpartum_baby"]')).toBeVisible();
  await expect(device.getByText('Finish your birth details')).toHaveCount(0);
  expect((await stored(page)).births[0]).toMatchObject({ place: 'Fortis Hospital, Kolkata', weightG: 2950 });
});

test('Something has changed: the four routes', async ({ page }) => {
  await start(page, 'D1');
  const device = page.locator('#device');
  await device.getByRole('button', { name: 'Something has changed with my pregnancy' }).click();
  await expect(device.getByRole('heading', { name: /Something has changed/ })).toBeVisible();
  await expectTapTargets(page);

  await device.getByRole('button', { name: 'I have a concern about my pregnancy' }).click();
  await expect(device.getByRole('link', { name: 'Call Dr. Mahua' })).toBeVisible();
  await page.keyboard.press('Escape');

  await device.getByRole('button', { name: 'Something else' }).click();
  await expect(device.getByRole('textbox', { name: 'Note' })).toBeVisible();
  await page.keyboard.press('Escape');

  await device.getByRole('button', { name: 'My baby has arrived' }).click();
  await expect(device.getByText('Time is set to now.', { exact: false })).toBeVisible();
});

test('pregnancy ended: nothing changes until she chooses; then Weave stays quiet', async ({ page }) => {
  await start(page, 'D1');
  const device = page.locator('#device');
  await expect(device.getByText('You’ve slept under six hours four nights running.')).toBeVisible();
  await device.getByRole('button', { name: 'Something has changed with my pregnancy' }).click();
  await device.getByRole('button', { name: 'My pregnancy has ended' }).click();
  await expect(device.getByRole('heading', { name: /This is a hard moment/ })).toBeVisible();
  expect((await stored(page)).her.phase).toBe('pregnancy'); // no automatic change
  await expect(device.getByRole('button', { name: 'Continue' })).toBeDisabled();
  await device.getByRole('radio', { name: 'Remove them' }).click();
  await device.getByRole('button', { name: 'Continue' }).click();
  await expect(device.getByText('Remove your pregnancy notes from this phone? This can’t be undone.')).toBeVisible();
  await device.getByRole('radio', { name: 'Keep them in my history' }).click();
  await device.getByRole('button', { name: 'Continue' }).click();
  await expect(device.locator('[data-today-state="cycle_only"]')).toBeVisible();
  await expect(device.getByText('Noticing')).toHaveCount(0); // quiet period: no insights
  const s = await stored(page);
  expect(s.her.phase).toBe('cycle_tracking');
  expect(s.history.at(-1).outcome).toBe('ended');
});

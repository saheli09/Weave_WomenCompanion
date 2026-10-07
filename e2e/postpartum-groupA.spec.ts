import { expect, test, type Page } from '@playwright/test';
import { closePanel, expectTapTargets, openPanel, start, timings } from './helpers';

/** Postpartum group A: sleep (B06), pump (B07), full timeline with edit/delete, formula tins (B38, B39, R16, R17). */

async function setClock(page: Page, value: string) {
  await openPanel(page);
  await page.locator('[data-testid="demo-panel"] input[type="datetime-local"]').first().fill(value);
  await closePanel(page);
}

test.describe('D3', () => {
  test.beforeEach(async ({ page }) => start(page, 'D3'));

  test('sleep: start, pill on every screen, survives reload, end logs it', async ({ page }) => {
    const device = page.locator('#device');
    await device.getByRole('button', { name: /^Log sleep for Srinika/ }).click();
    await device.getByRole('button', { name: 'Start now' }).click();
    expect((await timings(page)).at(-1)).toMatchObject({ action: 'sleep', taps: 2 });
    await page.clock.fastForward('42:00');
    const pill = device.getByRole('button', { name: /Srinika sleeping, 0:42/ });
    await expect(pill).toBeVisible();
    await device.getByRole('link', { name: 'Me' }).click();
    await expect(pill).toBeVisible();
    await page.reload();
    await expect(pill).toBeVisible();
    await pill.click();
    await device.getByRole('button', { name: 'End sleep' }).click();
    await expect(device.getByText('Srinika slept 42m.')).toBeVisible();
    await expect(pill).toHaveCount(0);
  });

  test('sleep: a past sleep, validated', async ({ page }) => {
    const device = page.locator('#device');
    await device.getByTestId('fab').click();
    await device.getByRole('button', { name: /^Sleep/ }).click();
    await device.getByLabel('From', { exact: true }).fill('09:00');
    await device.getByLabel('To', { exact: true }).fill('09:50');
    await device.getByRole('button', { name: 'Save past sleep' }).click();
    await expect(device.getByText('Srinika slept 50m.')).toBeVisible();
  });

  test('pump: prefilled, saves', async ({ page }) => {
    const device = page.locator('#device');
    await device.getByTestId('fab').click();
    await device.getByRole('button', { name: /^Pump/ }).click();
    await expect(device.getByRole('radio', { name: 'Both' })).toHaveAttribute('aria-checked', 'true');
    await device.getByRole('button', { name: 'More amount' }).click();
    await device.getByRole('button', { name: 'Save' }).click();
    await expect(device.getByText('Pump logged: 100 ml, 15 m.')).toBeVisible();
  });

  test('timeline: All opens seven days with filters; a row edits and deletes', async ({ page }) => {
    const device = page.locator('#device');
    await device.getByRole('button', { name: 'All', exact: true }).click();
    await expect(device.getByRole('heading', { name: 'Timeline' })).toBeVisible();
    await expect(device.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();
    await expect(device.getByRole('heading', { name: 'Yesterday' })).toBeVisible();
    await device.getByRole('group', { name: 'Show entries for' }).getByRole('button', { name: 'Me' }).click();
    await expect(device.getByText('Diaper · wet')).toHaveCount(0);
    await device.getByRole('group', { name: 'Show entries for' }).getByRole('button', { name: 'Srinika' }).click();
    await device.getByRole('button', { name: /^Edit Diaper · wet, 9:40 AM/ }).click();
    await device.getByRole('radio', { name: 'Dirty' }).click();
    await device.getByRole('button', { name: 'Save' }).click();
    await expect(device.getByRole('button', { name: /^Edit Diaper · dirty, 9:40 AM/ })).toBeVisible();
    await device.getByRole('button', { name: /^Edit Diaper · dirty, 9:40 AM/ }).click();
    await device.getByRole('button', { name: 'Delete entry' }).click();
    await expect(device.getByText('Delete this entry? This can’t be undone.')).toBeVisible();
    await device.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(device.getByRole('button', { name: /Diaper · \w+, 9:40 AM/ })).toHaveCount(0);
    await expectTapTargets(page);
  });

  test('formula: opened in two taps from Today, earlier tin question, stock screen', async ({ page }) => {
    const device = page.locator('#device');
    await device.getByTestId('fab').click();
    await device.getByRole('button', { name: /^Formula opened, Opened 10 days ago/ }).click();
    expect((await timings(page)).at(-1)).toMatchObject({ action: 'formula_opened', taps: 2, outcome: 'saved' });
    await expect(device.getByText('Tin opened today. Use or discard by 11 October.')).toBeVisible();
    await expect(device.getByRole('heading', { name: 'Mark the earlier tin as finished or discarded?' })).toBeVisible();
    await device.getByRole('button', { name: 'Finished' }).click();
    await page.goto('/baby/formula');
    await expect(device.getByRole('heading', { name: 'Formula stock' })).toBeVisible();
    await expect(device.getByRole('listitem', { name: /Formula tin, 45 days left/ })).toBeVisible();
    await expect(device.getByText(/Finished 27 August/)).toBeVisible();
    await expectTapTargets(page);
  });
});

test('Phase 1 acceptance: tin reminders at 7 days, on, and after the discard date; acting clears them', async ({ page }) => {
  await start(page, 'D5'); // tin opened 18 July, discard by 1 September
  const device = page.locator('#device');
  await setClock(page, '2026-08-25T09:00');
  await expect(device.getByText('The open formula tin is due to be discarded by 1 September.')).toBeVisible();
  await expect(device.getByText('Opened 18 July. Seven days left.')).toBeVisible();
  await setClock(page, '2026-09-01T09:00');
  await expect(device.getByText('The open formula tin is due to be discarded today.')).toBeVisible();
  await setClock(page, '2026-09-03T09:00');
  const late = device.getByText('The open formula tin has passed its discard date.');
  await expect(late).toBeVisible();
  await device.getByRole('button', { name: 'Not now' }).first().click();
  await expect(late).toHaveCount(0);
  await setClock(page, '2026-09-04T10:00');
  await expect(late).toBeVisible();
  await device.getByRole('button', { name: 'Discarded', exact: true }).click();
  await expect(late).toHaveCount(0);
  await setClock(page, '2026-09-10T10:00');
  await expect(device.getByText(/discard/i)).toHaveCount(0);
});

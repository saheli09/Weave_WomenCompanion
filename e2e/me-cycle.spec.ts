import { expect, test, type Page } from '@playwright/test';
import { closePanel, expectTapTargets, openPanel, start } from './helpers';

/** Me tab (S03, B18 to B23) and cycle (B24 to B26). */

async function setClock(page: Page, value: string) {
  await openPanel(page);
  await page.locator('[data-testid="demo-panel"] input[type="datetime-local"]').first().fill(value);
  await closePanel(page);
}

test('postpartum Self care (D3): week card, suggestions for today, body list; logging and insights stay on Today', async ({ page }) => {
  await start(page, 'D3');
  const device = page.locator('#device');
  await device.getByRole('link', { name: 'Self care' }).click();
  await expect(device.getByRole('heading', { name: 'Recovering, steadily' })).toBeVisible();
  await expect(device.getByText('Week 3', { exact: true })).toBeVisible();
  await expect(device.getByRole('heading', { name: 'Week 3 Postpartum' })).toBeVisible();
  const suggestions = device.getByTestId('self-care-suggestions');
  await expect(suggestions.locator('[data-suggestion="rest"]')).toContainText('Why: you slept');
  await suggestions.locator('[data-suggestion="pelvic"]').getByRole('button', { name: 'Log a set' }).click();
  await expect(page).toHaveURL(/\/me\/pelvic$/);
  await page.goBack();
  await expect(device.getByRole('button', { name: /Bleeding.*Spotting, 3 days/ })).toBeVisible();
  await expect(device.getByRole('button', { name: /Pelvic floor.*2 of 5 this week/ })).toBeVisible();
  await expect(device.getByText('Has your period come back?')).toHaveCount(0); // week 3: too early
  await expect(device.getByRole('region', { name: 'Hydration' })).toHaveCount(0); // water and mood are on Today
  await expect(device.getByText('Spotting has eased for three days.')).toHaveCount(0); // insights are on Today
  await expectTapTargets(page);
});

test('detail screens: hydration, pelvic floor, pain with off-ramp, bleeding history', async ({ page }) => {
  await start(page, 'D3');
  const device = page.locator('#device');
  await page.goto('/me/hydration');
  await device.getByRole('button', { name: 'Add a glass' }).click();
  await expect(device.getByRole('heading', { name: '1 of 8 glasses today' })).toBeVisible();
  await expect(device.getByText('About 250 ml')).toBeVisible();
  await page.goto('/me/pelvic');
  await device.getByRole('button', { name: 'Log a set' }).click();
  await expect(device.getByRole('heading', { name: '3 of 5 this week' })).toBeVisible();
  await page.goto('/me/pain');
  await expect(device.getByText(/worth a call to your provider/)).toBeVisible();
  await device.getByRole('radio', { name: 'Back' }).click();
  await device.getByRole('radio', { name: '3' }).click();
  await device.getByRole('button', { name: 'Log pain' }).click();
  await expect(device.getByText('Back, 3 of 5').first()).toBeVisible();
  await page.goto('/me/bleeding');
  await expect(device.getByRole('heading', { name: 'Spotting, 3 days' })).toBeVisible();
  await expectTapTargets(page);
});

test('PRD Phase 3 acceptance (D4): cycle return end to end', async ({ page }) => {
  await start(page, 'D3');
  const device = page.locator('#device');
  await setClock(page, '2026-09-24T10:00'); // D3 child is now 6 weeks: the card appears
  await device.getByRole('link', { name: 'Self care' }).click();
  await expect(device.getByText('Has your period come back?')).toBeVisible();
  await device.getByRole('button', { name: 'Not yet' }).click();
  await expect(device.getByText('Has your period come back?')).toHaveCount(0);
  await setClock(page, '2026-10-09T10:00'); // fifteen days later: asks again
  await expect(device.getByText('Has your period come back?')).toBeVisible();
  await device.getByRole('button', { name: 'Yes, it has' }).click();
  await device.getByRole('button', { name: 'Start cycle tracking' }).click();
  await expect(device.getByRole('heading', { name: 'Period, day 1' })).toBeVisible();
  await expect(device.getByText('Too early to estimate. Postpartum cycles are often irregular.')).toBeVisible();
  await device.getByRole('link', { name: 'Today' }).click();
  await expect(device.getByRole('button', { name: /Log period flow. Period: Day 1/ })).toBeVisible();
});

test('cycle screen (D4): calendar marks period days, day sheet logs flow and symptoms, end period', async ({ page }) => {
  await start(page, 'D4');
  const device = page.locator('#device');
  await page.goto('/me/cycle');
  await expect(device.getByRole('heading', { name: 'Period, day 3' })).toBeVisible();
  await expect(device.getByRole('gridcell', { name: /Tuesday 25 August, period day/ })).toBeVisible();
  await device.getByRole('button', { name: 'Log today' }).click();
  await device.getByRole('radio', { name: 'Light' }).click();
  await device.getByRole('button', { name: 'Cramps' }).click();
  await device.getByRole('button', { name: 'Save' }).click();
  await expect(device.getByRole('gridcell', { name: /Thursday 27 August, period day, light, today/ })).toBeVisible();
  await device.getByRole('button', { name: 'End period' }).click();
  await expect(device.getByRole('heading', { name: 'No period right now' })).toBeVisible();
  await expectTapTargets(page);
});

test('cycle estimates (D5): calendar first, then the period, key dates framed as estimates', async ({ page }) => {
  await start(page, 'D5');
  await page.goto('/me/cycle');
  const d = page.locator('#device');
  // The calendar comes before everything else.
  const order = await d.locator('main [role="grid"], main [data-testid="cycle-summary"]').evaluateAll((els) => els.map((e) => e.getAttribute('role') ?? e.getAttribute('data-testid')));
  expect(order).toEqual(['grid', 'cycle-summary']);
  await expect(d.getByTestId('cycle-summary').getByRole('heading', { name: 'Period, day 3' })).toBeVisible();
  const dates = d.getByTestId('cycle-key-dates');
  await expect(dates.getByRole('listitem')).toHaveCount(4);
  await expect(dates).toContainText('Cycle day3of about 29');
  await expect(dates).toContainText('Fertile window4 to 9 Septemberestimate');
  await expect(dates).toContainText('Ovulation9 Septemberestimate');
  await expect(dates).toContainText('Next period23 Septemberestimate');
  await expect(d.getByText(/Not a method of contraception\./)).toBeVisible();
  await expect(d.getByTestId('cycle-legend')).toContainText('Ovulation, estimate');
  await expectTapTargets(page);
});

test('a cycle tracker’s Today (D7) opens on the same countdown; between periods the button is My period started', async ({ page }) => {
  await start(page, 'D7');
  const d = page.locator('#device');
  const first = d.locator('main header + *');
  await expect(first).toHaveAttribute('data-testid', 'cycle-summary');
  await expect(first.getByRole('heading', { name: 'In 17 days' })).toBeVisible();
  await expect(first.getByTestId('estimate-basis')).toHaveText('Based on your last 3 cycles.');
  await expect(first.getByRole('button', { name: 'Log today' })).toHaveCount(0);
  await first.getByRole('button', { name: 'My period started' }).click();
  await expect(first.getByRole('heading', { name: 'Period, Day 1' })).toBeVisible();
  await first.getByRole('button', { name: 'Log today' }).click();
  await expect(d.getByRole('dialog')).toBeVisible();
});

test('between periods (D7): the next period counts down', async ({ page }) => {
  await start(page, 'D7');
  await page.goto('/cycle');
  const summary = page.locator('#device [data-testid="cycle-summary"]');
  await expect(summary.getByText('Next period', { exact: true })).toBeVisible();
  await expect(summary.getByRole('heading', { name: 'Next period, In 17 days' })).toBeVisible();
  await expect(summary.getByText('Around 13 September')).toBeVisible();
});

test('cycle calendar (D5): past months with estimates, three predicted months ahead, then it stops', async ({ page }) => {
  await start(page, 'D5');
  await page.goto('/me/cycle');
  const device = page.locator('#device');
  const prev = device.getByRole('button', { name: 'Previous month' });
  const next = device.getByRole('button', { name: 'Next month' });
  await prev.click(); // July: a logged period and that cycle's estimates
  await expect(device.getByRole('button', { name: /^Wednesday 1 July, period day/ })).toBeVisible();
  await expect(device.getByRole('button', { name: 'Tuesday 14 July, ovulation, estimate' })).toBeVisible();
  await expect(device.getByRole('button', { name: 'Thursday 9 July, fertile window, estimate' })).toBeVisible();
  await next.click();
  await next.click(); // September
  await expect(device.getByRole('button', { name: 'Wednesday 9 September, ovulation, estimate' })).toBeVisible();
  await expect(device.getByRole('button', { name: 'Wednesday 23 September, predicted period' })).toBeVisible();
  await next.click();
  await next.click(); // November, the last predicted month
  await expect(device.getByRole('heading', { name: 'November 2026' })).toBeVisible();
  await expect(device.getByRole('button', { name: 'Friday 20 November, predicted period' })).toBeVisible();
  await expect(next).toBeDisabled();
  for (let i = 0; i < 8; i++) if (await prev.isEnabled()) await prev.click();
  await expect(device.getByRole('heading', { name: 'March 2026' })).toBeVisible(); // first logged period
  await expect(prev).toBeDisabled();
});

test('cycle analysis (D5): averages, then past cycles as bars, newest first, three until she asks for all', async ({ page }) => {
  await start(page, 'D5');
  await page.goto('/me/cycle');
  const analysis = page.locator('#device [data-testid="cycle-analysis"]');
  await expect(analysis.getByText('Average period')).toBeVisible();
  await expect(analysis.getByText('Average cycle')).toBeVisible();
  await expect(analysis.getByText('Based on your last six cycles, which ran 27 to 30 days.')).toBeVisible();
  const rows = analysis.getByRole('listitem');
  await expect(rows).toHaveCount(3);
  await expect(rows.first()).toHaveAccessibleName(/estimated ovulation 11 August\.$/);
  await analysis.getByRole('button', { name: 'Show all 6 cycles' }).click();
  await expect(rows).toHaveCount(6);
  await analysis.getByRole('button', { name: 'Show fewer' }).click();
  await expect(rows).toHaveCount(3);
  await expect(page.locator('#device').getByText('Coming up', { exact: true })).toHaveCount(0); // the calendar shows what is ahead
});

test('cycle (D4): one period so far, so no estimates and no future months', async ({ page }) => {
  await start(page, 'D4');
  await page.goto('/me/cycle');
  const device = page.locator('#device');
  await expect(device.getByText('Too early to estimate. Postpartum cycles are often irregular.')).toBeVisible();
  await expect(device.getByTestId('cycle-summary').getByText(/fertile window/i)).toHaveCount(0);
  await expect(device.getByRole('gridcell', { name: /fertile window/i })).toHaveCount(0);
  await expect(device.getByTestId('cycle-phases')).toHaveCount(0); // phases need estimates
  await expect(device.getByTestId('about-ovulation')).toBeVisible(); // the reading does not
  await expect(device.getByTestId('cycle-legend')).toHaveCount(0);
  await expect(device.getByRole('button', { name: 'Next month' })).toBeDisabled();
});

test('cycle phases and the ovulation explainer (D5): today marked, estimates labelled, not contraception', async ({ page }) => {
  await start(page, 'D5');
  await page.goto('/me/cycle');
  const phases = page.locator('#device [data-testid="cycle-phases"]');
  await expect(phases.getByRole('heading', { name: 'Today: Period' })).toBeVisible();
  await expect(page.locator('#device [data-testid="cycle-summary"]').getByRole('img', { name: 'Cycle day 3 of about 29. Period.' })).toBeVisible();
  const about = page.locator('#device [data-testid="about-ovulation"]');
  await expect(about.getByText('Can I use this to avoid pregnancy?')).toBeHidden(); // one row until she opens it
  await about.getByText('About ovulation').click();
  await expect(about.getByText(/not a method of contraception/)).toBeHidden(); // answers open on tap
  await about.getByText('Can I use this to avoid pregnancy?').click();
  await expect(about.getByText(/not a method of contraception/)).toBeVisible();
  await expectTapTargets(page);
});

test('first pregnancy (D7): "I’m pregnant", due date from her last period, a celebration, then pregnancy mode', async ({ page }) => {
  await start(page, 'D7');
  const d = page.locator('#device');
  await page.goto('/cycle');
  const cta = d.getByTestId('pregnant-cta');
  await expect(cta).toContainText('I’m pregnant');
  await expect(cta).not.toContainText('again');
  await cta.click();
  await expect(d.getByRole('dialog').getByLabel('Due date')).toHaveValue('2027-05-23'); // last period 16 August + 280 days
  await expect(d.getByText('Worked out from your last period, which started 16 August.', { exact: false })).toBeVisible();
  await d.getByRole('button', { name: 'Start pregnancy' }).click();
  const party = d.getByTestId('pregnancy-celebration');
  await expect(party).toContainText('A new chapter, Saheli');
  await expect(party).toContainText('Due around 23 May.');
  await page.clock.runFor(3000);
  await expect(page).toHaveURL(/\/today$/);
  await expect(d.locator('[data-today-state="pregnancy"]')).toBeVisible();
  await expect(d.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Pregnancy' })).toBeVisible();
});

test('with a child already (D5): "I’m pregnant again"', async ({ page }) => {
  await start(page, 'D5');
  await page.goto('/me/cycle');
  await expect(page.locator('#device').getByTestId('pregnant-cta')).toContainText('I’m pregnant again');
});

test('a cycle tracker’s Today (D7) carries a note for today: from her own cycles, no buttons, and a why', async ({ page }) => {
  await start(page, 'D7');
  const d = page.locator('#device');
  const note = d.getByRole('button', { name: 'Fertile window runs to 30 August.' });
  await expect(note).toBeVisible();
  const card = d.getByRole('article', { name: 'Noticing: Fertile window runs to 30 August.' });
  await expect(card).toContainText('An estimate, not contraception.');
  await expect(card.getByRole('button')).toHaveCount(1); // the headline (why); no action buttons
  await note.click();
  await expect(d.getByText('Shown once a day while you track your cycle', { exact: false })).toBeVisible();
  await expect(d.getByText('Cycle lengths')).toBeVisible();
});

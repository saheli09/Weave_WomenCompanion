import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { start } from './helpers';

/**
 * Phase 4 accessibility pass: WCAG 2.1 A and AA rules (axe) on every screen,
 * in the persona where that screen has real content. Scoped to the device.
 */

const SCREENS: [persona: string, path: string][] = [
  ['D1', '/today'],
  ['D1', '/me'],
  ['D1', '/changed'],
  ['D2', '/today'],
  ['D3', '/today'],
  ['D3', '/me'],
  ['D3', '/me/hydration'],
  ['D3', '/me/mood'],
  ['D3', '/me/bleeding'],
  ['D3', '/me/pelvic'],
  ['D3', '/me/pain'],
  ['D3', '/me/sleep'],
  ['D3', '/me/medicines'],
  ['D3', '/me/history'],
  ['D3', '/baby'],
  ['D3', '/baby/feeding'],
  ['D3', '/baby/sleep'],
  ['D3', '/baby/diaper'],
  ['D3', '/baby/growth'],
  ['D3', '/baby/vaccines'],
  ['D3', '/baby/formula'],
  ['D3', '/timeline'],
  ['D3', '/ask'],
  ['D3', '/settings'],
  ['D3', '/onboarding'],
  ['D4', '/me/cycle'],
  ['D5', '/today'],
  ['D5', '/baby'],
  ['D5', '/baby/food'],
  ['D5', '/baby/meals'],
  ['D5', '/baby/food/curd'],
  ['D5', '/baby/medicines'],
  ['D5', '/food/recipe/chicken-stew'],
  ['D5', '/food/reaction/curd'],
  ['D6', '/today'],
];

for (const [persona, path] of SCREENS) {
  test(`axe: ${persona} ${path}`, async ({ page }) => {
    await start(page, persona);
    await page.goto(path);
    await page.locator('#device main').waitFor();
    await page.waitForTimeout(150);
    const results = await new AxeBuilder({ page }).include('#device').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes.slice(0, 4).map((n) => n.target.join(' ')).join('\n  ')}`);
    expect(summary, summary.join('\n')).toEqual([]);
  });
}

/** States reached by interaction: open sheets, Labour mode, birth flow, escalations. */
const audit = async (page: import('@playwright/test').Page, scope = '#device') => {
  await page.waitForTimeout(400);
  const results = await new AxeBuilder({ page }).include(scope).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  return results.violations.map((v) => `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes.slice(0, 4).map((n) => n.target.join(' ')).join('\n  ')}`);
};

const FLOWS: [string, string, (page: import('@playwright/test').Page) => Promise<void>][] = [
  ['quick-log sheet', 'D3', async (p) => void (await p.locator('#device').getByTestId('fab').click())],
  ['feed chooser', 'D3', async (p) => void (await p.locator('#device').getByRole('button', { name: 'Log a feed for Srinika' }).click())],
  ['breastfeed timer', 'D3', async (p) => { await p.locator('#device').getByRole('button', { name: 'Log a feed for Srinika' }).click(); await p.locator('#device').getByRole('button', { name: 'Breastfeed' }).click(); }],
  ['bleeding Heavy escalation', 'D3', async (p) => { await p.locator('#device').getByRole('button', { name: /^Log bleeding/ }).click(); await p.locator('#device').getByRole('radio', { name: 'Heavy' }).click(); }],
  ['medicine sheet', 'D1', async (p) => void (await p.locator('#device').getByRole('button', { name: 'Add something you take' }).click())],
  ['labour summary', 'D2', async (p) => void (await p.locator('#device').getByRole('button', { name: 'Start Labour Mode', exact: true }).click())],
  ['labour dial', 'D2', async (p) => { await p.locator('#device').getByRole('button', { name: 'Start Labour Mode', exact: true }).click(); await p.locator('#device').getByRole('button', { name: /^Contraction/ }).click(); }],
  ['birth details', 'D2', async (p) => { await p.locator('#device').getByRole('button', { name: 'Start Labour Mode', exact: true }).click(); await p.locator('#device').getByRole('button', { name: 'Baby is here' }).click(); }],
  ['handoff', 'D2', async (p) => { await p.locator('#device').getByRole('button', { name: 'Start Labour Mode', exact: true }).click(); await p.locator('#device').getByRole('button', { name: 'Baby is here' }).click(); await p.locator('#device').getByRole('button', { name: 'Save birth' }).click(); }],
  ['reaction emergency card', 'D5', async (p) => { await p.goto('/food/reaction/curd'); await p.locator('#device').getByRole('button', { name: 'Difficulty breathing' }).click(); }],
  ['meal card, all meals open', 'D5', async (p) => void (await p.locator('#device').getByRole('button', { name: 'All meals today' }).click())],
  ['explainer sheet', 'D3', async (p) => void (await p.locator('#device').getByRole('button', { name: 'Three feeds logged since 5am, and no water yet today.' }).click())],
  ['provider sheet', 'D2', async (p) => { await p.locator('#device').getByRole('button', { name: 'Start Labour Mode', exact: true }).click(); await p.locator('#device').getByRole('button', { name: /Call your provider/ }).click(); }],
];

for (const [name, persona, act] of FLOWS) {
  test(`axe: ${name}`, async ({ page }) => {
    await start(page, persona);
    await act(page);
    const summary = await audit(page);
    expect(summary, summary.join('\n')).toEqual([]);
  });
}

/** Seven-day charts: each day's tap area is at least 44px wide and none overlap (PRD 15). */
const CHARTS: [persona: string, path: string][] = [
  ['D3', '/baby/feeding'],
  ['D3', '/baby/sleep'],
  ['D3', '/baby/diaper'],
  ['D3', '/me/hydration'],
  ['D3', '/me/pelvic'],
  ['D3', '/me/sleep'],
  ['D5', '/baby/meals'],
];

for (const [persona, path] of CHARTS) {
  test(`day bars: ${persona} ${path} are 44px wide with no overlap`, async ({ page }) => {
    await start(page, persona);
    await page.goto(path);
    const bars = page.locator('#device figure button[aria-label*=": "]');
    await expect(bars).toHaveCount(7);
    const measure = () => bars.evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => ({ left: r.left, right: r.right, width: r.width, height: r.height })));
    // Measure once the layout has settled (fonts and the screen transition can still be landing).
    await expect.poll(async () => Math.min(...(await measure()).map((b) => b.width))).toBeGreaterThanOrEqual(44);
    const boxes = await measure();
    for (const b of boxes) {
      expect(b.width).toBeGreaterThanOrEqual(44);
      expect(b.height).toBeGreaterThanOrEqual(44);
    }
    for (let i = 1; i < boxes.length; i++) expect(boxes[i]!.left).toBeGreaterThanOrEqual(boxes[i - 1]!.right - 0.5);
  });
}

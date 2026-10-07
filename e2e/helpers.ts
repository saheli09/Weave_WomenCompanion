import { expect, type Page } from '@playwright/test';

export const ANCHOR = new Date(2026, 7, 27, 10, 30, 0);

/** Fresh app at the demo anchor with a persona loaded. Works with the desktop panel or the mobile Demo sheet. */
export async function start(page: Page, persona: string) {
  await page.clock.install({ time: ANCHOR });
  await page.goto('/today');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await openPanel(page);
  await page.locator(`[data-persona="${persona}"]`).first().click();
  await closePanel(page);
}

export async function openPanel(page: Page) {
  if (!(await page.locator('aside [data-testid="demo-panel"]').isVisible())) await page.getByRole('button', { name: 'Demo controls' }).click();
}
export async function closePanel(page: Page) {
  const close = page.locator('#device').getByRole('button', { name: 'Close', exact: true });
  if (await close.isVisible()) await close.click();
}

/** Every interactive control in the device is at least 44 x 44, counting hit-area extensions (PRD 15). */
export async function expectTapTargets(page: Page, scope = '#device main') {
  const small = await page.evaluate((sel) => {
    const out: string[] = [];
    document.querySelectorAll(`${sel} button, ${sel} a, ${sel} input, ${sel} [role="checkbox"]`).forEach((el) => {
      // A checkbox or radio inside a <label> is tapped through the whole label.
      const hit = el.tagName === 'INPUT' && el.closest('label') ? el.closest('label')! : el;
      const r = hit.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const after = getComputedStyle(el, '::after');
      const aw = after.content !== 'none' ? parseFloat(after.width) || 0 : 0;
      const ah = after.content !== 'none' ? parseFloat(after.height) || 0 : 0;
      const w = Math.max(r.width, aw);
      const h = Math.max(r.height, ah);
      if (w < 43.5 || h < 43.5) out.push(`${(el.textContent || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 40)} ${Math.round(w)}x${Math.round(h)}`);
    });
    return out;
  }, scope);
  expect(small, `Controls under 44px:\n${small.join('\n')}`).toEqual([]);
}

export async function timings(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('weave-metrics-v1') || '{"state":{"timings":[]}}').state.timings as { action: string; taps: number; ms: number; outcome: string }[]);
}

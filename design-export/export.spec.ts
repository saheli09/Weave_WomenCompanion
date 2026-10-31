import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from '@playwright/test';
import { ANCHOR, start } from '../e2e/helpers';
import { SCREENS } from './screens';

/**
 * Captures each screen's markup from the running app (decision 2026-10-30) into
 * design-export/out/raw/<id>.json: the device frame as static HTML, its height,
 * and the local files it points at. assemble.mjs turns these into artboards.
 */

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'out', 'raw');
mkdirSync(OUT, { recursive: true });

for (const screen of SCREENS) {
  test(screen.id, async ({ page }) => {
    if (screen.persona === 'fresh') {
      await page.clock.install({ time: ANCHOR });
      await page.goto('/today');
      await page.evaluate(() => localStorage.clear());
      await page.reload();
    } else {
      await start(page, screen.persona);
    }
    if (screen.route) await page.goto(screen.route);
    await page.locator('#device main').waitFor();
    if (screen.act) await screen.act(page);
    await page.waitForTimeout(500);

    const capture = await page.evaluate((full) => {
      const dev = document.getElementById('device')!;
      // Typed values live on properties; carry them into attributes so the static copy shows them.
      dev.querySelectorAll('input, textarea').forEach((el) => {
        const i = el as HTMLInputElement;
        if (i.type === 'checkbox' || i.type === 'radio') i.toggleAttribute('checked', i.checked);
        else i.setAttribute('value', i.value);
      });
      const main = dev.querySelector('main');
      const height = full && main ? Math.max(dev.clientHeight, main.scrollHeight) : dev.clientHeight;
      const clone = dev.cloneNode(true) as HTMLElement;
      clone.querySelector('[aria-label="Demo controls"]')?.remove();
      clone.style.cssText += `;width:402px;height:${height}px;position:relative;margin:0;overflow:hidden`;
      const assets = new Set<string>();
      clone.querySelectorAll('[src]').forEach((el) => {
        const src = el.getAttribute('src')!;
        if (src.startsWith('/')) assets.add(src);
      });
      clone.querySelectorAll('[style]').forEach((el) => {
        for (const m of el.getAttribute('style')!.matchAll(/url\(["']?(\/[^"')]+)["']?\)/g)) assets.add(m[1]!);
      });
      return { html: clone.outerHTML, height, assets: [...assets] };
    }, screen.full ?? false);

    writeFileSync(join(OUT, `${screen.id}.json`), JSON.stringify({ id: screen.id, section: screen.section, title: screen.title, persona: screen.persona, ...capture }));
  });
}

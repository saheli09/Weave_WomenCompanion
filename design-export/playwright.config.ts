import { defineConfig } from '@playwright/test';

// Design export (decision 2026-10-30): captures every screen at the Figma frame width for the
// Claude Design canvas. Kept apart from e2e so the normal test run never picks it up.
export default defineConfig({
  testDir: '.',
  testMatch: 'export.spec.ts',
  timeout: 30 * 60_000,
  use: { baseURL: 'http://localhost:5173', reducedMotion: 'reduce', viewport: { width: 402, height: 874 }, isMobile: true, hasTouch: true, browserName: 'chromium' },
  webServer: { command: 'npm run dev -- --port 5173 --strictPort', url: 'http://localhost:5173', reuseExistingServer: true },
});

import { defineConfig, devices } from '@playwright/test';

// Reference viewport is the Figma frame (402x874). 390 and 360 prove the layout holds (PRD 15).
export default defineConfig({
  testDir: './e2e',
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{arg}{ext}',
  use: { baseURL: 'http://localhost:5173', reducedMotion: 'reduce' },
  webServer: { command: 'npm run dev -- --port 5173 --strictPort', url: 'http://localhost:5173', reuseExistingServer: true },
  projects: [
    { name: 'w402', use: { ...devices['iPhone 15 Pro'], viewport: { width: 402, height: 874 }, browserName: 'chromium' } },
    { name: 'w390', use: { ...devices['iPhone 14'], viewport: { width: 390, height: 844 }, browserName: 'chromium' } },
    { name: 'w360', use: { viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, browserName: 'chromium' } },
  ],
});

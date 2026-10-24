import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4173';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'en-US',
    timezoneId: 'Africa/Lagos',
    serviceWorkers: 'allow',
  },
  expect: {
    toHaveScreenshot: { animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.005 },
  },
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{arg}{ext}',
  projects: [
    { name: 'journeys', testMatch: /journeys\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    { name: 'a11y-light', testMatch: /accessibility\.spec\.ts/, use: { ...devices['Desktop Chrome'], colorScheme: 'light', reducedMotion: 'no-preference' } },
    { name: 'a11y-reduced', testMatch: /accessibility\.spec\.ts/, use: { ...devices['Desktop Chrome'], colorScheme: 'light', reducedMotion: 'reduce' } },
    { name: 'visual-desktop', testMatch: /visual\.spec\.ts/, use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' } },
    { name: 'visual-mobile', testMatch: /visual\.spec\.ts/, use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 1, reducedMotion: 'reduce' } },
  ],
  webServer: {
    command: 'VITE_USE_HASH_ROUTER=true npm run dev:mock -- --host 127.0.0.1 --port 4173 --strictPort',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});

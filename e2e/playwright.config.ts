import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Multi-Browser Configuration
 * Supports both local Next.js standalone and production Hostinger instances
 */
export default defineConfig({
  testDir: './',
  testMatch: /.*\.spec\.ts/,
  timeout: 90000,
  fullyParallel: false, // Run flows sequentially to preserve WebSocket message ordering
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://chat.vusigma.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    launchOptions: {
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--allow-file-access',
      ],
    },
  },
  projects: [
    {
      name: 'Desktop Chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        isMobile: true,
      },
    },
  ],
});

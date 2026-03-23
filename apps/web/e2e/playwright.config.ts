import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  outputDir: '../test-results/e2e',
  timeout: 30_000,
  retries: 0,
  workers: 1,

  use: {
    baseURL: 'http://localhost:4173',
    video: 'on',
    screenshot: 'on',
    viewport: { width: 1280, height: 720 },
    actionTimeout: 10_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'pnpm preview --port 4173',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    cwd: '..',
  },
});

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testMatch: 'capture.spec.ts',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:5179',
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  },
  webServer: [
    {
      command: 'pnpm dev --port 5179',
      url: 'http://127.0.0.1:5179',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'pnpm --filter @cloudblocks/web preview --host 127.0.0.1 --port 4179',
      url: 'http://127.0.0.1:4179',
      cwd: '../..',
      reuseExistingServer: !process.env.CI,
    },
  ],
});

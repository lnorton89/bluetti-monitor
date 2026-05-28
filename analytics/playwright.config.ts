import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.ANALYTICS_PERF_URL ?? 'http://127.0.0.1:5120/?mock=1';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.ANALYTICS_PERF_URL
    ? undefined
    : {
        command: 'npm run dev -- --host 127.0.0.1',
        reuseExistingServer: true,
        timeout: 20_000,
        url: 'http://127.0.0.1:5120/?mock=1',
      },
});

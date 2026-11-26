import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

// Gherkin features live in e2e/features; `bddgen` turns them into Playwright specs in .features-gen.
const testDir = defineBddConfig({
  features: 'e2e/features/**/*.feature',
  steps: 'e2e/steps/**/*.ts',
});

const WEB_URL = process.env.WEB_URL ?? 'http://localhost:3000';
const API_HEALTH_URL = process.env.API_HEALTH_URL ?? 'http://localhost:3001/api/health';

export default defineConfig({
  testDir,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: WEB_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Starts the API and the web app unless they are already running (e.g. via `pnpm dev`).
  webServer: [
    {
      command: 'pnpm --filter @album-pokemon/api dev',
      url: API_HEALTH_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'pnpm dev',
      url: WEB_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});

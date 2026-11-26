# Next.js app: playwright-bdd + Playwright

`playwright-bdd` compiles `.feature` files into Playwright specs (`bddgen`) and runs them with the normal Playwright runner. You keep Playwright's browsers, auto-waiting, parallel workers, traces, screenshots and HTML report, and step functions receive Playwright fixtures (`page`, `request`, custom ones).

## Contents

1. Install
2. `playwright.config.ts`
3. Fixtures and `createBdd` (`e2e/steps/fixtures.ts`)
4. Feature and step examples
5. Locators for Next.js UIs
6. Test data and the backend
7. Scripts, tsconfig, gitignore
8. Pitfalls

## 1. Install

```bash
pnpm add -D @playwright/test playwright-bdd   # monorepo: --filter <web-workspace>
pnpm exec playwright install chromium         # once per machine / CI image
```

## 2. `playwright.config.ts`

```ts
import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

const testDir = defineBddConfig({
  features: 'e2e/features/**/*.feature',
  steps: 'e2e/steps/**/*.ts', // must include fixtures.ts
});

const WEB_URL = process.env.WEB_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: WEB_URL, trace: 'on-first-retry', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    // Add the backend first if the app needs one (e.g. a NestJS API):
    // { command: 'pnpm --filter @scope/api dev', url: 'http://localhost:3001/api/health',
    //   reuseExistingServer: !process.env.CI, timeout: 120_000 },
    { command: 'pnpm dev', url: WEB_URL, reuseExistingServer: !process.env.CI, timeout: 120_000 },
  ],
});
```

- `webServer.url` must return 2xx once the server is ready. For an API, point it at a health endpoint, not at a route that needs auth.
- In CI, consider `pnpm build && pnpm start` instead of `pnpm dev`. Production builds are faster per page and catch build-only errors.
- `reuseExistingServer` lets developers run tests while `pnpm dev` is already up.

## 3. Fixtures and `createBdd` (`e2e/steps/fixtures.ts`)

Create `Given/When/Then` once, bound to an extended `test`, so every step can use custom fixtures. Per-scenario data, like a unique user, belongs in a fixture.

```ts
import { test as base, createBdd } from 'playwright-bdd';

export interface TestUser {
  email: string;
  username: string;
  password: string;
}

export const test = base.extend<{ user: TestUser }>({
  user: async ({}, use, testInfo) => {
    const id = `${Date.now().toString(36)}${testInfo.workerIndex}${Math.random().toString(36).slice(2, 6)}`;
    await use({ email: `e2e_${id}@example.com`, username: `e2e_${id}`.slice(0, 20), password: 'pikachu123' });
  },
});

export const { Given, When, Then } = createBdd(test);
```

All step files import `Given/When/Then` from `./fixtures`, never from `playwright-bdd` directly. Otherwise custom fixtures aren't available.

## 4. Feature and step examples

```gherkin
# e2e/features/collect-stickers.feature
Feature: Collecting stickers
  As a trainer
  I want to mark the stickers I own
  So that I can track how complete my album is

  Background:
    Given I have registered as a new user

  Scenario: Marking a sticker as owned survives a reload
    Given I am on the album page "kanto"
    When I click the sticker "Pikachu"
    Then the sticker "Pikachu" is marked as owned
    When I reload the page
    Then the sticker "Pikachu" is marked as owned
```

```ts
// e2e/steps/auth.steps.ts
import { expect } from '@playwright/test';
import { Given } from './fixtures';

Given('I have registered as a new user', async ({ page, user }) => {
  await page.goto('/register');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Username').fill(user.username);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL('/');
});
```

```ts
// e2e/steps/album.steps.ts
import { expect, type Page } from '@playwright/test';
import { Given, Then, When } from './fixtures';

const sticker = (page: Page, name: string) =>
  page.getByRole('button', { name: new RegExp(`\\b${name}\\b`) });

Given('I am on the album page {string}', async ({ page }, slug: string) => {
  await page.goto(`/albums/${slug}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

When('I click the sticker {string}', async ({ page }, name: string) => {
  const button = sticker(page, name);
  const before = await button.getAttribute('aria-pressed');
  await button.click();
  await expect(button).not.toHaveAttribute('aria-pressed', before ?? ''); // wait for the UI to settle
});

Then('the sticker {string} is marked as owned', async ({ page }, name: string) => {
  await expect(sticker(page, name)).toHaveAttribute('aria-pressed', 'true');
});
```

Step signature: `async ({ fixtures… }, ...params) => {}`. The first argument is the fixtures object, and Gherkin parameters follow.

## 5. Locators for Next.js UIs

- Prefer `getByRole` (with `name`), `getByLabel` and `getByText`. They match what users see and survive Tailwind class changes. Use `data-testid` only when nothing accessible exists, and add accessible names to the component before reaching for test ids.
- Check state through accessible attributes (`aria-pressed`, `aria-checked`, `aria-expanded`, `disabled`) rather than CSS classes.
- Client components that fetch in `useEffect` render a loading state first. Assert on the final content with `expect(...).toBeVisible()`, which auto-waits; never use `waitForTimeout`.
- After a form submit that calls `router.push`, assert the new URL with `expect(page).toHaveURL(...)`.
- For optimistic updates, wait for the final settled state (e.g. button re-enabled) before reloading, or the reload can race the request.
- When a name is a prefix of another (`Mew` / `Mewtwo`), match it with a word-boundary regex or `{ exact: true }`.

## 6. Test data and the backend

- If the web app talks to a real API, the tests share that API's database. Make every scenario create its own data (unique user per scenario through a fixture) and rely only on seeded reference data, so parallel workers and re-runs don't collide.
- For a clean slate, run the API against a separate test DB in `webServer.env` (e.g. `env: { DATABASE_URL: 'file:./e2e.db' }`) and migrate or seed it in a `globalSetup`. Note that `reuseExistingServer` would then reuse a dev server on the dev DB, so turn it off for that setup.
- To skip UI login in scenarios that aren't about auth, register or log in through the API with the `request` fixture, then set the token or cookie in the page (`page.addInitScript(t => localStorage.setItem('token', t), token)` or `context.addCookies`).
- For pages that only render external data, `page.route('**/api/...', route => route.fulfill({ json }))` can stub responses, but keep at least the core journeys end-to-end against the real API.

## 7. Scripts, tsconfig, gitignore

- `package.json`: `"test:bdd": "bddgen && playwright test"` and `"test:bdd:ui": "bddgen && playwright test --ui"`. `bddgen` must run before every `playwright test`, or edited features are silently stale.
- `tsconfig.json`: Next's default `include: ["**/*.ts", "**/*.tsx"]` already covers `e2e/` and `playwright.config.ts`. Keep the folder outside `src/app` so Next doesn't treat it as routes.
- `.gitignore`: `.features-gen`, `playwright-report`, `test-results`.
- Monorepo with Turborepo: a `test:bdd` task with `dependsOn: ["^build"]` and `cache: false`. Run it with `--concurrency=1` if API and web suites would fight over ports or databases.

## 8. Pitfalls

| Symptom                                                                    | Cause / fix                                                                                                         |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `Missing step definitions` from `bddgen`                                   | The phrase doesn't match any step, or the step file is outside `steps:` glob. Implement the printed snippet.        |
| Custom fixture is `undefined` in a step                                    | The step file imports `Given` from `playwright-bdd` instead of `./fixtures`.                                        |
| Changes to `.feature` files have no effect                                 | `playwright test` ran without `bddgen`. Use the `test:bdd` script.                                                  |
| `webServer` times out                                                      | The `url` never returns 2xx (wrong port, needs auth, backend not up), or the first `next dev` compile is slow. Raise `timeout`. |
| Flaky clicks right after navigation                                        | Asserting before client data loaded. Wait for a visible element from the loaded state first.                         |
| Ports 3000/3001 still busy after a run (Windows)                           | Orphaned `next`/`node` processes. Find `node.exe` processes for the project and stop them.                           |
| `next dev` creates an `AGENTS.md`/other files during test runs             | Next 16 writes agent rules on start. Expected; commit it or ignore it.                                              |

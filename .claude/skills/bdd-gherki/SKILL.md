---
name: bdd-gherki
description: Set up and write BDD tests with Gherkin (.feature files, Given/When/Then) for Next.js applications (playwright-bdd + Playwright) and NestJS APIs (Cucumber.js + supertest + @nestjs/testing). Use this skill whenever the user wants BDD, Gherkin, Cucumber, feature files, acceptance tests, behaviour specs, end-to-end scenarios or "Given/When/Then" tests for a Next.js frontend or a NestJS backend, whether they are adding the test tooling for the first time, writing new scenarios for an existing feature, adding step definitions, or debugging a failing Cucumber or playwright-bdd run. Also use it when the user asks to "add tests" to a Next.js or NestJS project that already has .feature files.
---

# BDD with Gherkin for Next.js and NestJS

This skill covers two kinds of project. Each has its own stack, chosen because it runs the real app with the fewest moving parts:

| Target          | Runner                                  | Talks to the app through                              | Reference                                                              |
| --------------- | --------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------- |
| **NestJS API**  | `@cucumber/cucumber` (Cucumber.js)      | `supertest` against the real `AppModule`, in-process | [references/nestjs-cucumber.md](references/nestjs-cucumber.md)        |
| **Next.js app** | `playwright-bdd` + `@playwright/test`   | A real browser against `next dev` / `next start`      | [references/nextjs-playwright-bdd.md](references/nextjs-playwright-bdd.md) |

Read the reference for the target you are working on before writing files. It holds the config files, support code and the pitfalls that cost time when they're missed. If the project has both (a monorepo), set up each one in its own workspace with its own reference.

## Workflow

### 1. Look before you install

- Find out what's already there: an existing `cucumber.js` / `cucumber.mjs`, `playwright.config.ts` with `defineBddConfig`, `*.feature` files, step folders. If BDD is already set up, **skip setup** and go to step 3. Reuse the existing step phrases, World and fixtures instead of inventing parallel ones.
- Detect the package manager from the lockfile (`pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, `package-lock.json` → npm, `bun.lockb` → bun) and use it. In a pnpm monorepo, add dev dependencies to the specific workspace (`pnpm --filter <workspace> add -D ...`), because pnpm doesn't let a workspace import what it doesn't declare.
- Read the project's CLAUDE.md / README for conventions (test folders, DB, env files, ports).
- Read the code under test: controllers and DTOs for an API, pages and components for a web app. Scenarios must describe behaviour the app really has, using its real routes, messages, labels and status codes.
- If a docs tool such as Context7 is available, check the current docs for `@cucumber/cucumber` and `playwright-bdd` before installing; their config options change between majors.

### 2. Set up the tooling (only if missing)

Follow the matching reference. In short:

- **NestJS:** install `@cucumber/cucumber supertest @types/supertest ts-node @nestjs/testing`. `@nestjs/testing` must match the major version of `@nestjs/core`; an unpinned install can pull a newer major that crashes at startup. Load steps with `ts-node`, not `tsx`, because Nest's DI needs `emitDecoratorMetadata`. Boot the app with the same global setup as `main.ts` and use a separate test database.
- **Next.js:** install `@playwright/test playwright-bdd`, run `playwright install chromium`, configure `defineBddConfig` + `webServer`, and run tests with `bddgen && playwright test`.

Add a `test:bdd` script to each workspace (and to the monorepo task runner if there is one), and gitignore the generated output (`.features-gen/`, `playwright-report/`, `test-results/`, `reports/`, test DB files).

### 3. Write the features

Write the `.feature` file **before** the steps: it is the specification, and the steps are just glue. Good scenarios:

- **Describe behaviour, not clicks or HTTP verbs.** "When I mark sticker 25 of album "kanto" as owned" beats "When I send PUT /api/collection/stickers/abc". The step definition hides the mechanics, so the scenario survives refactors.
- **Have one behaviour each**, with a title that says the rule: "An email can only be registered once".
- **Follow Given (state) → When (one action) → Then (observable outcome).** Avoid several Whens in one scenario unless the behaviour is about the sequence (like idempotency).
- **Use concrete, realistic example data** in quotes and numbers: `"ash@example.com"`, `201`. Cucumber expressions turn them into `{string}` / `{int}` parameters.
- **Use `Background:`** for a Given shared by every scenario in the file (e.g. "Given I am logged in as "ash""), and **`Scenario Outline:` + `Examples:`** for the same rule over several inputs (validation tables).
- **Start with the user story** (`As a … I want … So that …`) under `Feature:`, which tells the reader why the feature exists.
- **Cover the unhappy paths** the code really handles: validation (400), not found (404), unauthenticated (401), conflicts (409), disabled UI for anonymous users.

### 4. Write the step definitions

- **One step file per domain area** (`auth.steps.ts`, `collection.steps.ts`), not per feature file. Steps are global, so a phrase defined twice is an "ambiguous step" error.
- **Reuse phrases.** Before adding `Then the status code should be {int}`, check whether `Then the response status is {int}` already exists.
- **Keep steps thin:** build a request or drive the page, then store results on the World (Cucumber) or in fixtures (playwright-bdd). Put shared mechanics in plain helper functions in the step file.
- **Type response bodies** with the project's DTO types (e.g. a shared contracts package) instead of `any`.
- **Write assertion messages that help the next reader:** include the response body when a status check fails.
- **Make scenarios independent:** each one creates the data it needs. On the API, reset per-scenario tables in a `Before` hook. In the browser, where you share a running server's DB, generate unique users per scenario.
- **Use `{string}`, `{int}`, `{float}` and `{word}` parameters.** Optional plural with `sticker(s)`, alternatives with `is/are`.

### 5. Run, fix and report

- Run the suite (`pnpm test:bdd` or the equivalent) and the typechecker. Don't report success without a green run. If something fails, read the error and fix the cause; don't weaken the assertion.
- A run that reports **undefined steps** prints a snippet for each missing step. Implement those snippets; don't rename the Gherkin to dodge them.
- On Windows, check that the dev servers started by Playwright's `webServer` shut down afterwards (ports 3000/3001 free).
- Update the project docs (CLAUDE.md / README) with the commands, the folder layout and how test data is isolated, so the next person (or agent) can add scenarios without rediscovering the setup.

## Layout

```
apis/<api>/                        # NestJS
  cucumber.js                      # Cucumber.js config
  test/
    features/*.feature
    steps/*.steps.ts
    support/world.ts               # per-scenario state
    support/hooks.ts               # DB prep, app boot, per-scenario reset
apps/<web>/                        # Next.js
  playwright.config.ts             # defineBddConfig + webServer
  e2e/
    features/*.feature
    steps/fixtures.ts              # test.extend + createBdd → Given/When/Then
    steps/*.steps.ts
```

For a single-app repo, drop the `apis/` / `apps/` prefix. The folder names are a convention; if the project already has a `test/` or `e2e/` structure, follow it.

# NestJS API: Cucumber.js + supertest

The suite boots the real Nest `AppModule` in-process with `@nestjs/testing`, applies the same global setup as `main.ts`, and calls it with `supertest`. No port is opened, so it doesn't clash with a running dev server, and every guard, pipe, filter and DB call is real.

## Contents

1. Install
2. Share the global app setup with `main.ts`
3. `cucumber.js` config
4. World (`test/support/world.ts`)
5. Hooks (`test/support/hooks.ts`)
6. Feature and step examples
7. Scripts, tsconfig, gitignore
8. Pitfalls

## 1. Install

```bash
# pnpm (in a monorepo add: --filter <api-workspace>)
pnpm add -D @cucumber/cucumber supertest @types/supertest ts-node @nestjs/testing@^<nest-major>
```

Pin `@nestjs/testing` to the major version of `@nestjs/core` in `package.json` (e.g. `@nestjs/testing@^11`). An unpinned install can pull the next major, which crashes with `Cannot find module '@nestjs/core/internal'` or similar.

## 2. Share the global app setup with `main.ts`

Tests must run the app exactly as production does: global prefix, `ValidationPipe` options, CORS, filters and interceptors. If `main.ts` configures these inline, move them into a function both can call:

```ts
// src/app.setup.ts
import { INestApplication, ValidationPipe } from '@nestjs/common';

export function configureApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix('api');
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000' });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  return app;
}
```

```ts
// src/main.ts
const app = configureApp(await NestFactory.create(AppModule));
app.enableShutdownHooks();
await app.listen(Number(process.env.PORT ?? 3000));
```

Copy whatever the project's real `main.ts` does; the values above are only an example. Globals registered as providers (`APP_PIPE`, `APP_GUARD`, …) inside modules are already picked up by `AppModule` and need nothing extra.

## 3. `cucumber.js` config

In a CommonJS package (no `"type": "module"`, which is the Nest default):

```js
// cucumber.js
// ts-node (not tsx): Nest DI needs emitDecoratorMetadata, which esbuild/tsx doesn't emit.
process.env.TS_NODE_TRANSPILE_ONLY ??= 'true';
process.env.TS_NODE_PROJECT ??= 'tsconfig.json';

module.exports = {
  default: {
    paths: ['test/features/**/*.feature'],
    requireModule: ['ts-node/register'],
    require: ['test/support/**/*.ts', 'test/steps/**/*.ts'],
    format: ['progress-bar', 'html:reports/cucumber-report.html'],
  },
};
```

If the package is ESM, name the file `cucumber.cjs` (or use `export default` in `cucumber.mjs`) and keep `requireModule: ['ts-node/register']`.

## 4. World (`test/support/world.ts`)

The World is a fresh object per scenario. It holds scenario state, while the Nest app is shared across scenarios through a module variable.

```ts
import type { INestApplication } from '@nestjs/common';
import { IWorldOptions, setWorldConstructor, World } from '@cucumber/cucumber';
import type { Response } from 'supertest';

export class ApiWorld extends World {
  response?: Response;
  accessToken?: string;

  constructor(options: IWorldOptions) {
    super(options);
  }

  get app(): INestApplication {
    return getApp();
  }
}

let app: INestApplication | undefined;
export const setApp = (instance: INestApplication | undefined) => void (app = instance);
export function getApp(): INestApplication {
  if (!app) throw new Error('Nest app is not initialised; check the BeforeAll hook');
  return app;
}

setWorldConstructor(ApiWorld);
```

Step functions must be regular `function`s (not arrows) typed `this: ApiWorld` to reach the World.

## 5. Hooks (`test/support/hooks.ts`)

Use a dedicated test database and set its env vars **before** importing anything that builds a DB client.

**Prisma + SQLite example:**

```ts
import { execSync } from 'node:child_process';
import { AfterAll, Before, BeforeAll, setDefaultTimeout } from '@cucumber/cucumber';
import { Test } from '@nestjs/testing';

process.env.DATABASE_URL = 'file:./test.db'; // relative to prisma/schema.prisma
process.env.JWT_SECRET ??= 'bdd-test-secret';

import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { PrismaService } from '../../src/prisma/prisma.service';
import { getApp, setApp } from './world';

setDefaultTimeout(60_000);

BeforeAll({ timeout: 180_000 }, async () => {
  execSync('pnpm exec prisma migrate deploy', { stdio: 'inherit', env: process.env });
  execSync('pnpm exec prisma db seed', { stdio: 'inherit', env: process.env }); // reference data only

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = configureApp(moduleRef.createNestApplication());
  await app.init();
  setApp(app);
});

Before(async () => {
  const prisma = getApp().get(PrismaService);
  // Children before parents; leave seeded reference data alone.
  await prisma.userSticker.deleteMany();
  await prisma.user.deleteMany();
});

AfterAll(async () => {
  await getApp().close();
  setApp(undefined);
});
```

Adapt this to the project's ORM:

- **Prisma with Postgres/MySQL:** point `DATABASE_URL` at a separate test database or schema (`?schema=test`), and use `prisma migrate reset --force --skip-seed` or `migrate deploy` in `BeforeAll`.
- **TypeORM:** set the test DB config through env and use `synchronize: true` or run migrations, then `dataSource.getRepository(X).clear()` / `TRUNCATE … CASCADE` in `Before`.
- **Mongoose:** use a separate DB name, then `connection.dropDatabase()` or `collection.deleteMany({})` in `Before`.
- **External services** (mail, payments, queues): replace them with `Test.createTestingModule({ imports: [AppModule] }).overrideProvider(MailService).useValue(fake)` before `.compile()`.

`@nestjs/config` and Prisma don't override variables already set in `process.env`, so setting them at the top of the hooks file beats `.env`.

## 6. Feature and step examples

```gherkin
# test/features/auth.feature
Feature: User accounts
  As a visitor
  I want to sign up and log in
  So that the app remembers my data

  Scenario: An email can only be registered once
    Given a user "ash" with email "ash@example.com" and password "pikachu123" exists
    When I register with email "ash@example.com", username "ash2" and password "pikachu123"
    Then the response status is 409
    And the error message is "Email is already registered"

  Scenario Outline: Registration input is validated
    When I register with email "<email>", username "<username>" and password "<password>"
    Then the response status is 400

    Examples:
      | email            | username | password   |
      | not-an-email     | gary     | eevee12345 |
      | gary@example.com | gary     | short      |
```

```ts
// test/steps/auth.steps.ts
import assert from 'node:assert/strict';
import { Given, Then, When } from '@cucumber/cucumber';
import request from 'supertest';
import type { ApiWorld } from '../support/world';

async function register(world: ApiWorld, email: string, username: string, password: string) {
  world.response = await request(world.app.getHttpServer())
    .post('/api/auth/register')
    .send({ email, username, password });
  return world.response;
}

Given(
  'a user {string} with email {string} and password {string} exists',
  async function (this: ApiWorld, username: string, email: string, password: string) {
    const res = await register(this, email, username, password);
    assert.equal(res.status, 201, JSON.stringify(res.body));
  },
);

When(
  'I register with email {string}, username {string} and password {string}',
  async function (this: ApiWorld, email: string, username: string, password: string) {
    await register(this, email, username, password);
  },
);

Then('the response status is {int}', function (this: ApiWorld, status: number) {
  assert.ok(this.response, 'no request was made');
  assert.equal(this.response.status, status, JSON.stringify(this.response.body));
});

Then('the error message is {string}', function (this: ApiWorld, message: string) {
  assert.equal((this.response?.body as { message: unknown }).message, message);
});
```

**Authenticated requests:** a `Given I am logged in as {string}` step registers or logs in and stores `this.accessToken`. A small helper then adds `Authorization: Bearer …` when it is set, and `Given I am not logged in` clears it.

**Entity ids the scenario doesn't know:** look them up through the API inside the step (e.g. fetch the album, find sticker number 25, use its `id`) so the Gherkin can stay in business terms.

## 7. Scripts, tsconfig, gitignore

- `package.json`: `"test:bdd": "cucumber-js"`.
- `tsconfig.json`: add `"test/**/*.ts"` to `include` so `tsc --noEmit` typechecks the steps. Make sure `tsconfig.build.json` still excludes `test`, so `nest build` doesn't ship it.
- `.gitignore`: `reports`, plus the test DB file (`*.db` / `test.db`).
- Monorepo with Turborepo: add a `test:bdd` task with `dependsOn: ["^build"]` (plus any codegen task like `db:generate`) and `cache: false`.

## 8. Pitfalls

| Symptom                                                                         | Cause / fix                                                                                                                                              |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Nest can't resolve dependencies of XService (?)` only in tests                 | Steps loaded with `tsx`/esbuild, which drops decorator metadata. Use `ts-node/register` (transpile-only is fine).                                         |
| `Cannot find module '@nestjs/core/internal'` (or similar) from `@nestjs/testing` | Major mismatch. Pin `@nestjs/testing` to the `@nestjs/core` major.                                                                                        |
| Validation or route prefix behaves differently than in prod                     | Test app skipped `main.ts` setup. Use the shared `configureApp`.                                                                                          |
| Tests wipe or pollute dev data                                                  | DB env set after the client was imported, or no separate DB. Set `process.env` at the top of hooks, before importing app modules.                         |
| `function timed out, ensure the promise resolves within 5000 milliseconds`     | Use `setDefaultTimeout(60_000)`, and give `BeforeAll` its own larger timeout for migrations and seeding.                                                  |
| `Cannot use 'progress-bar' formatter … not a TTY`                               | Harmless in CI; it falls back to `progress`.                                                                                                              |
| Ambiguous step definitions                                                      | The same phrase is defined in two files. Keep one, and import shared helpers instead.                                                                     |

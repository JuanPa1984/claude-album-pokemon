import { test as base, createBdd } from 'playwright-bdd';

export interface Trainer {
  email: string;
  username: string;
  password: string;
}

/** Per-scenario state. Each trainer is unique so scenarios can run in parallel against a shared DB. */
export const test = base.extend<{ trainer: Trainer }>({
  trainer: async ({}, use, testInfo) => {
    const id = `${Date.now().toString(36)}${testInfo.workerIndex}${Math.random().toString(36).slice(2, 6)}`;
    await use({
      email: `e2e_${id}@example.com`,
      username: `e2e_${id}`.slice(0, 20),
      password: 'pikachu123',
    });
  },
});

export const { Given, When, Then } = createBdd(test);

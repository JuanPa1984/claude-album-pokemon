import type { INestApplication } from '@nestjs/common';
import { IWorldOptions, setWorldConstructor, World } from '@cucumber/cucumber';
import type { Response } from 'supertest';

/** Per-scenario state shared between step definitions. */
export class ApiWorld extends World {
  /** Last HTTP response received. */
  response?: Response;
  /** JWT of the user acting in the scenario, if logged in. */
  accessToken?: string;

  constructor(options: IWorldOptions) {
    super(options);
  }

  get app(): INestApplication {
    return getApp();
  }
}

let app: INestApplication | undefined;

export function setApp(instance: INestApplication | undefined): void {
  app = instance;
}

export function getApp(): INestApplication {
  if (!app) throw new Error('Nest app is not initialised; check the BeforeAll hook');
  return app;
}

setWorldConstructor(ApiWorld);

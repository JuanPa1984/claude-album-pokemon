import { execSync } from 'node:child_process';
import { AfterAll, Before, BeforeAll, setDefaultTimeout } from '@cucumber/cucumber';
import { Test } from '@nestjs/testing';

// The BDD suite runs against its own SQLite file so it never touches dev.db.
// Relative to prisma/schema.prisma. Set before anything instantiates PrismaClient.
process.env.DATABASE_URL = 'file:./test.db';
process.env.JWT_SECRET ??= 'bdd-test-secret';

import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { PrismaService } from '../../src/prisma/prisma.service';
import { getApp, setApp } from './world';

setDefaultTimeout(60_000);

BeforeAll({ timeout: 180_000 }, async () => {
  // Bring the test database schema up to date and load the album catalogue.
  execSync('pnpm exec prisma migrate deploy', { stdio: 'inherit', env: process.env });
  execSync('pnpm exec prisma db seed', { stdio: 'inherit', env: process.env });

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = configureApp(moduleRef.createNestApplication());
  await app.init();
  setApp(app);
});

// Each scenario starts without users or collections; the seeded catalogue stays.
Before(async () => {
  const prisma = getApp().get(PrismaService);
  await prisma.userSticker.deleteMany();
  await prisma.user.deleteMany();
});

AfterAll(async () => {
  await getApp().close();
  setApp(undefined);
});

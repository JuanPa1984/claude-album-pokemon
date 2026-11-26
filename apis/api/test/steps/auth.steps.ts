import assert from 'node:assert/strict';
import { Given, Then, When } from '@cucumber/cucumber';
import type { AuthResponseDto } from '@album-pokemon/shared';
import request from 'supertest';
import type { ApiWorld } from '../support/world';

async function register(world: ApiWorld, email: string, username: string, password: string) {
  world.response = await request(world.app.getHttpServer())
    .post('/api/auth/register')
    .send({ email, username, password });
  return world.response;
}

Given(
  'a trainer {string} with email {string} and password {string} exists',
  async function (this: ApiWorld, username: string, email: string, password: string) {
    const res = await register(this, email, username, password);
    assert.equal(res.status, 201, `could not create trainer: ${JSON.stringify(res.body)}`);
  },
);

Given('I am logged in as {string}', async function (this: ApiWorld, username: string) {
  const res = await register(this, `${username}@example.com`, username, 'password123');
  assert.equal(res.status, 201, `could not create trainer: ${JSON.stringify(res.body)}`);
  this.accessToken = (res.body as AuthResponseDto).accessToken;
});

Given('I am not logged in', function (this: ApiWorld) {
  this.accessToken = undefined;
});

When(
  'I register with email {string}, username {string} and password {string}',
  async function (this: ApiWorld, email: string, username: string, password: string) {
    await register(this, email, username, password);
  },
);

When(
  'I log in with email {string} and password {string}',
  async function (this: ApiWorld, email: string, password: string) {
    this.response = await request(this.app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password });
  },
);

Then('the response status is {int}', function (this: ApiWorld, status: number) {
  assert.ok(this.response, 'no request was made');
  assert.equal(this.response.status, status, JSON.stringify(this.response.body));
});

Then(
  'the response contains an access token for {string}',
  function (this: ApiWorld, username: string) {
    const body = this.response?.body as AuthResponseDto;
    assert.ok(body.accessToken, 'missing accessToken');
    assert.equal(body.user.username, username);
    assert.equal('passwordHash' in body.user, false, 'passwordHash must never leave the API');
  },
);

Then('the error message is {string}', function (this: ApiWorld, message: string) {
  assert.equal((this.response?.body as { message: unknown }).message, message);
});

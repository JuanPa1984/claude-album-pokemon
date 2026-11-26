import assert from 'node:assert/strict';
import { Given, Then, When } from '@cucumber/cucumber';
import type { AlbumDetailDto, AlbumSummaryDto } from '@album-pokemon/shared';
import request from 'supertest';
import type { ApiWorld } from '../support/world';

function get(world: ApiWorld, path: string) {
  const req = request(world.app.getHttpServer()).get(path);
  return world.accessToken ? req.set('Authorization', `Bearer ${world.accessToken}`) : req;
}

async function fetchAlbum(world: ApiWorld, slug: string): Promise<AlbumDetailDto> {
  const res = await get(world, `/api/albums/${slug}`);
  assert.equal(res.status, 200, `album "${slug}" not found`);
  return res.body as AlbumDetailDto;
}

async function stickerId(world: ApiWorld, slug: string, number: number): Promise<string> {
  const sticker = (await fetchAlbum(world, slug)).stickers.find((s) => s.number === number);
  assert.ok(sticker, `album "${slug}" has no sticker number ${number}`);
  return sticker.id;
}

async function setOwned(world: ApiWorld, slug: string, number: number, owned: boolean) {
  const id = await stickerId(world, slug, number);
  const server = request(world.app.getHttpServer());
  const req = owned
    ? server.put(`/api/collection/stickers/${id}`)
    : server.delete(`/api/collection/stickers/${id}`);
  world.response = await (world.accessToken
    ? req.set('Authorization', `Bearer ${world.accessToken}`)
    : req);
}

Given(
  'I own sticker number {int} of album {string}',
  async function (this: ApiWorld, number: number, slug: string) {
    await setOwned(this, slug, number, true);
    assert.equal(this.response?.status, 200);
  },
);

When('I request the album list', async function (this: ApiWorld) {
  this.response = await get(this, '/api/albums');
});

When('I request the album {string}', async function (this: ApiWorld, slug: string) {
  this.response = await get(this, `/api/albums/${slug}`);
});

When(
  'I mark sticker number {int} of album {string} as owned',
  async function (this: ApiWorld, number: number, slug: string) {
    await setOwned(this, slug, number, true);
  },
);

When(
  'I unmark sticker number {int} of album {string}',
  async function (this: ApiWorld, number: number, slug: string) {
    await setOwned(this, slug, number, false);
  },
);

Then(
  'the album {string} has {int} stickers and {int} owned',
  function (this: ApiWorld, slug: string, total: number, owned: number) {
    const album = (this.response?.body as AlbumSummaryDto[]).find((a) => a.slug === slug);
    assert.ok(album, `album "${slug}" is not in the list`);
    assert.equal(album.totalStickers, total);
    assert.equal(album.ownedStickers, owned);
  },
);

Then(
  'the album {string} shows {int} owned sticker(s)',
  async function (this: ApiWorld, slug: string, owned: number) {
    assert.equal((await fetchAlbum(this, slug)).ownedStickers, owned);
  },
);

Then(
  'sticker number {int} of album {string} is owned',
  async function (this: ApiWorld, number: number, slug: string) {
    const sticker = (await fetchAlbum(this, slug)).stickers.find((s) => s.number === number);
    assert.equal(sticker?.owned, true);
  },
);

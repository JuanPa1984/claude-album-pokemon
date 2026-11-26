import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { Given, Then, When } from './fixtures';

function sticker(page: Page, name: string) {
  return page.getByRole('button', { name: new RegExp(`\\b${name}\\b`) });
}

Given('I am on the home page', async ({ page }) => {
  await page.goto('/');
});

Given('I am on the album page {string}', async ({ page }, slug: string) => {
  await page.goto(`/albums/${slug}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

When('I reload the page', async ({ page }) => {
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

Then('I see the heading {string}', async ({ page }, text: string) => {
  await expect(page.getByRole('heading', { name: text })).toBeVisible();
});

Then('I see the album {string}', async ({ page }, name: string) => {
  await expect(page.getByRole('heading', { name, level: 2 })).toBeVisible();
});

When('I click the sticker {string}', async ({ page }, name: string) => {
  const button = sticker(page, name);
  await expect(button).toBeEnabled();
  const wasOwned = (await button.getAttribute('aria-pressed')) === 'true';
  await button.click();
  // Wait for the optimistic toggle and the API call to settle.
  await expect(button).toHaveAttribute('aria-pressed', String(!wasOwned));
  await expect(button).toBeEnabled();
});

Then('the sticker {string} is marked as owned', async ({ page }, name: string) => {
  await expect(sticker(page, name)).toHaveAttribute('aria-pressed', 'true');
});

Then('the sticker {string} is not marked as owned', async ({ page }, name: string) => {
  await expect(sticker(page, name)).toHaveAttribute('aria-pressed', 'false');
});

Then('the sticker {string} cannot be clicked', async ({ page }, name: string) => {
  await expect(sticker(page, name)).toBeDisabled();
});

import { expect } from '@playwright/test';
import { Given, Then } from './fixtures';

Given('I have registered as a new trainer', async ({ page, trainer }) => {
  await page.goto('/register');
  await page.getByLabel('Email').fill(trainer.email);
  await page.getByLabel('Username').fill(trainer.username);
  await page.getByLabel('Password').fill(trainer.password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
});

Then('the header shows my trainer name', async ({ page, trainer }) => {
  await expect(page.getByRole('banner')).toContainText(`Trainer ${trainer.username}`);
});

import { test, expect } from '@playwright/test';

test('app loads and shows landing page', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/CloudBlocks/);
  await expect(page.locator('body')).toBeVisible();
  await page.screenshot({ path: 'test-results/e2e/smoke-landing.png' });
});

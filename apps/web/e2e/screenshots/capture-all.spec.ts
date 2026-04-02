import { test, expect, type Page } from '@playwright/test';

const PROVIDERS = ['azure', 'aws', 'gcp'] as const;

const TEMPLATES = [
  { name: 'Three-Tier Web Application' },
  { name: 'Simple Compute Setup' },
  { name: 'Data Storage Backend' },
  { name: 'Serverless HTTP API' },
  { name: 'Event-Driven Pipeline' },
  { name: 'Full-Stack Serverless with Event Processing' },
] as const;

const SCENARIOS = [
  {
    name: 'Build a Three-Tier Web Application',
    firstStep: 'Create the Network',
  },
  {
    name: 'Serverless HTTP API',
    firstStep: 'Set Up Network Zones',
  },
  {
    name: 'Event-Driven Data Pipeline',
    firstStep: 'Add Event Sources',
  },
] as const;

function toKebabCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function goToBuilder(page: Page) {
  await page.goto('/');
  const startBtn = page.getByRole('button', { name: 'Start Learning' });
  if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await startBtn.click();
  }
  await expect(page.locator('.builder-canvas')).toBeVisible({ timeout: 10000 });
}

async function dismissOnboarding(page: Page) {
  const skipBtn = page.getByText('Skip');
  if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await skipBtn.click();
  }
}

async function openTemplateGallery(page: Page) {
  const templatesBtn = page.locator('.core-btn', { hasText: 'Templates' });
  await expect(templatesBtn).toBeVisible({ timeout: 5000 });
  await templatesBtn.click();
  await expect(page.locator('.template-gallery')).toBeVisible({ timeout: 5000 });
}

async function openScenarioGallery(page: Page) {
  const learnBtn = page.locator('.core-btn-learn');
  await expect(learnBtn).toBeVisible({ timeout: 5000 });
  await learnBtn.click();
  await expect(page.locator('.scenario-gallery')).toBeVisible({ timeout: 5000 });
}

async function switchProvider(page: Page, provider: (typeof PROVIDERS)[number]) {
  const targetProvider = page.locator(`.provider-btn[data-provider="${provider}"]`);
  await expect(targetProvider).toBeVisible({ timeout: 5000 });
  await targetProvider.click();

  const confirmButton = page.locator('.confirm-dialog-btn-confirm', { hasText: 'Confirm' });
  if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await confirmButton.click();
  }

  await expect(
    page.locator(`.provider-btn[data-provider="${provider}"][aria-selected="true"]`),
  ).toBeVisible({
    timeout: 5000,
  });
}

async function waitForCanvasContent(page: Page) {
  await expect(page.locator('.scene-viewport')).toBeVisible({ timeout: 5000 });
  await expect.poll(async () => page.locator('.block-sprite').count()).toBeGreaterThan(0);
  await page.waitForTimeout(500);
}

test.describe.serial('Capture all template and scenario screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('captures all template screenshots across providers', async ({ page }) => {
    for (const template of TEMPLATES) {
      for (const provider of PROVIDERS) {
        await goToBuilder(page);
        await dismissOnboarding(page);
        await openTemplateGallery(page);

        const card = page.locator('.template-gallery-card', { hasText: template.name });
        await expect(card).toBeVisible({ timeout: 5000 });
        await card.locator('.template-gallery-use-btn').click();

        await expect(page.locator('.template-gallery')).not.toBeVisible({ timeout: 5000 });
        await page.waitForTimeout(500);

        if (provider !== 'azure') {
          await switchProvider(page, provider);
          await openTemplateGallery(page);
          const providerCard = page.locator('.template-gallery-card', { hasText: template.name });
          await expect(providerCard).toBeVisible({ timeout: 5000 });
          await providerCard.locator('.template-gallery-use-btn').click();
          await expect(page.locator('.template-gallery')).not.toBeVisible({ timeout: 5000 });
          await page.waitForTimeout(500);
        }

        await waitForCanvasContent(page);

        await page.screenshot({
          path: `test-results/screenshots/template-${toKebabCase(template.name)}-${provider}.png`,
        });

        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
      }
    }
  });

  test('captures all scenario screenshots', async ({ page }) => {
    for (const scenario of SCENARIOS) {
      await goToBuilder(page);
      await dismissOnboarding(page);
      await openScenarioGallery(page);

      const card = page.locator('.scenario-gallery-card', { hasText: scenario.name });
      await expect(card).toBeVisible({ timeout: 5000 });
      await card.locator('.scenario-gallery-use-btn').click();

      await expect(page.locator('.scenario-gallery')).not.toBeVisible({ timeout: 5000 });
      await expect(page.locator('.learning-panel')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.learning-panel')).toContainText(scenario.firstStep);

      await page.screenshot({
        path: `test-results/screenshots/scenario-${toKebabCase(scenario.name)}.png`,
      });

      await page.goto('/');
      await page.evaluate(() => localStorage.clear());
    }
  });
});

import { test, expect, type Page } from '@playwright/test';

/**
 * E2E: Guided Scenario Validation (#1483)
 *
 * Validates that all 6 built-in guided scenarios are accessible,
 * display correct content, and can be started from the scenario gallery.
 *
 * Full interactive step completion (drag-and-drop, connections) requires
 * Playwright-level pointer automation that depends on canvas coordinates.
 * These tests validate the load → start → first-step-visible flow.
 */

const SCENARIOS = [
  {
    name: 'Build a Three-Tier Web Application',
    difficulty: 'beginner',
    firstStep: 'Create the Network',
    stepCount: 5,
  },
  {
    name: 'Serverless HTTP API',
    difficulty: 'intermediate',
    firstStep: 'Set Up Network Zones',
    stepCount: 4,
  },
  {
    name: 'Event-Driven Data Pipeline',
    difficulty: 'advanced',
    firstStep: 'Add Event Sources',
    stepCount: 5,
  },
  {
    name: 'Simple Compute Setup',
    difficulty: 'beginner',
    firstStep: 'Create the Network',
    stepCount: 4,
  },
  {
    name: 'Data Storage Backend',
    difficulty: 'intermediate',
    firstStep: 'Create the Network',
    stepCount: 5,
  },
  {
    name: 'Full-Stack Web App with Event Processing',
    difficulty: 'advanced',
    firstStep: 'Build the Network Foundation',
    stepCount: 5,
  },
] as const;

async function goToBuilder(page: Page) {
  await page.goto('/');
  // Click "Start Learning" on landing page to enter the builder
  const startBtn = page.getByRole('button', { name: 'Start Learning' });
  if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await startBtn.click();
  }
  // Wait for the builder canvas to appear
  await expect(page.locator('.builder-canvas')).toBeVisible({ timeout: 10000 });
}

async function dismissOnboarding(page: Page) {
  // If onboarding tour appears, skip it
  const skipBtn = page.getByText('Skip');
  if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await skipBtn.click();
  }
}

async function openScenarioGallery(page: Page) {
  // Click the Learn button in the menu bar
  const learnBtn = page.locator('.core-btn-learn');
  await expect(learnBtn).toBeVisible({ timeout: 5000 });
  await learnBtn.click();

  // Wait for the scenario gallery to appear
  await expect(page.locator('.scenario-gallery')).toBeVisible({ timeout: 5000 });
}

test.describe('Guided Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure clean state
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('scenario gallery is accessible from Learn button', async ({ page }) => {
    await goToBuilder(page);
    await dismissOnboarding(page);
    await openScenarioGallery(page);

    // Verify all 3 scenarios are listed
    for (const scenario of SCENARIOS) {
      await expect(
        page.locator('.scenario-gallery-card-name', { hasText: scenario.name }),
      ).toBeVisible();
    }

    await page.screenshot({ path: 'test-results/e2e/scenario-gallery.png' });
  });

  test('scenario gallery shows difficulty badges', async ({ page }) => {
    await goToBuilder(page);
    await dismissOnboarding(page);
    await openScenarioGallery(page);

    for (const scenario of SCENARIOS) {
      const card = page.locator('.scenario-gallery-card', { hasText: scenario.name });
      await expect(card.locator('.scenario-gallery-badge')).toContainText(scenario.difficulty, {
        ignoreCase: true,
      });
    }
  });

  test('scenario gallery filter buttons work', async ({ page }) => {
    await goToBuilder(page);
    await dismissOnboarding(page);
    await openScenarioGallery(page);

    // Click "beginner" filter
    const beginnerFilter = page.locator('.scenario-gallery-filter-btn', { hasText: /beginner/i });
    if (await beginnerFilter.isVisible().catch(() => false)) {
      await beginnerFilter.click();
      // The beginner scenario should remain visible
      await expect(
        page.locator('.scenario-gallery-card-name', {
          hasText: 'Build a Three-Tier Web Application',
        }),
      ).toBeVisible();
    }
  });

  for (const scenario of SCENARIOS) {
    test(`scenario "${scenario.name}" can be started`, async ({ page }) => {
      await goToBuilder(page);
      await dismissOnboarding(page);
      await openScenarioGallery(page);

      // Find the scenario card and click Start
      const card = page.locator('.scenario-gallery-card', { hasText: scenario.name });
      await expect(card).toBeVisible();
      await card.locator('.scenario-gallery-use-btn').click();

      // The learning panel should open showing the first step
      await expect(page.locator('.learning-panel')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.learning-panel')).toContainText(scenario.firstStep);

      await page.screenshot({
        path: `test-results/e2e/scenario-${scenario.difficulty}-started.png`,
      });
    });
  }

  test('scenario first step renders correctly (Three-Tier)', async ({ page }) => {
    await goToBuilder(page);
    await dismissOnboarding(page);
    await openScenarioGallery(page);

    // Start the Three-Tier scenario
    const card = page.locator('.scenario-gallery-card', {
      hasText: 'Build a Three-Tier Web Application',
    });
    await card.locator('.scenario-gallery-use-btn').click();
    await expect(page.locator('.learning-panel')).toBeVisible({ timeout: 5000 });

    // Verify the first step is visible
    await expect(page.locator('.learning-panel')).toContainText('Create the Network');

    await page.screenshot({
      path: 'test-results/e2e/scenario-three-tier-step1.png',
    });
  });

  test('Terraform export is available from menu during active scenario', async ({ page }) => {
    await goToBuilder(page);
    await dismissOnboarding(page);
    await openScenarioGallery(page);

    // Start any scenario
    const card = page.locator('.scenario-gallery-card', {
      hasText: 'Build a Three-Tier Web Application',
    });
    await card.locator('.scenario-gallery-use-btn').click();
    await expect(page.locator('.learning-panel')).toBeVisible({ timeout: 5000 });

    // The Generate Code option should still be available in the overflow menu
    const overflowBtn = page.getByRole('button', { name: 'Advanced' });
    if (await overflowBtn.isVisible().catch(() => false)) {
      await overflowBtn.click();
      await expect(
        page.locator('.overflow-dropdown .menu-item', { hasText: 'Generate Code' }),
      ).toBeVisible();
    }
  });
});

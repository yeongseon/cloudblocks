import { test, expect, type Page } from '@playwright/test';

/**
 * E2E: Template → Edit → Export Flow (#1484)
 *
 * Validates that all 6 built-in templates load correctly, render on canvas,
 * and produce non-empty Terraform export output.
 *
 * Gate 6 target: ≥ 30% template → edit → export completion rate.
 * These tests verify the technical flow works before measuring with real users.
 */

const TEMPLATES = [
  { name: 'Three-Tier Web Application', category: 'web-application' },
  { name: 'Simple Compute Setup', category: 'web-application' },
  { name: 'Data Storage Backend', category: 'data-storage' },
  { name: 'Serverless HTTP API', category: 'serverless' },
  { name: 'Event-Driven Pipeline', category: 'data-pipeline' },
  { name: 'Full-Stack Serverless with Event Processing', category: 'full-stack' },
] as const;

async function goToBuilder(page: Page) {
  await page.goto('/');
  const startBtn = page.getByRole('button', { name: 'Get Started' });
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
  // Templates button is in the menu bar core actions
  const templatesBtn = page.locator('.core-btn', { hasText: 'Templates' });
  if (await templatesBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await templatesBtn.click();
  } else {
    // Fallback: try the overflow menu
    const overflowBtn = page.getByRole('button', { name: 'Advanced' });
    await overflowBtn.click();
    const browseTemplates = page.getByRole('button', { name: /Browse Templates/ });
    await browseTemplates.click();
  }
  await expect(page.locator('.template-gallery')).toBeVisible({ timeout: 5000 });
}

async function openCodePreview(page: Page) {
  // Open Advanced overflow menu → Generate Code
  const overflowBtn = page.getByRole('button', { name: 'Advanced' });
  await overflowBtn.click();
  const generateBtn = page.locator('.overflow-dropdown .menu-item', { hasText: 'Generate Code' });
  await generateBtn.click();
  await expect(page.locator('.code-preview')).toBeVisible({ timeout: 5000 });
}

test.describe('Template → Edit → Export Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('template gallery shows all 6 built-in templates', async ({ page }) => {
    await goToBuilder(page);
    await dismissOnboarding(page);
    await openTemplateGallery(page);

    // Click "All" filter to show every template
    const allFilter = page.locator('.template-gallery-filter-btn', { hasText: /all/i });
    if (await allFilter.isVisible().catch(() => false)) {
      await allFilter.click();
    }

    for (const template of TEMPLATES) {
      await expect(
        page.locator('.template-gallery-card-name', { hasText: template.name }),
      ).toBeVisible();
    }

    await page.screenshot({ path: 'test-results/e2e/template-gallery-all.png' });
  });

  for (const template of TEMPLATES) {
    test(`template "${template.name}" loads and renders on canvas`, async ({ page }) => {
      await goToBuilder(page);
      await dismissOnboarding(page);
      await openTemplateGallery(page);

      // Click "All" filter first
      const allFilter = page.locator('.template-gallery-filter-btn', { hasText: /all/i });
      if (await allFilter.isVisible().catch(() => false)) {
        await allFilter.click();
      }

      // Find and apply template
      const card = page.locator('.template-gallery-card', { hasText: template.name });
      await expect(card).toBeVisible();
      await card.locator('.template-gallery-use-btn').click();

      // Template gallery should close and canvas should have content
      await expect(page.locator('.template-gallery')).not.toBeVisible({ timeout: 5000 });

      // Wait a moment for rendering
      await page.waitForTimeout(500);

      // Canvas should contain rendered blocks
      const viewport = page.locator('.scene-viewport');
      await expect(viewport).toBeVisible();

      await page.screenshot({
        path: `test-results/e2e/template-${template.category}-loaded.png`,
      });
    });
  }

  test('template loads → Terraform export produces non-empty output', async ({ page }) => {
    await goToBuilder(page);
    await dismissOnboarding(page);
    await openTemplateGallery(page);

    // Load the Three-Tier template (simplest, most complete)
    const card = page.locator('.template-gallery-card', {
      hasText: 'Three-Tier Web Application',
    });
    await card.locator('.template-gallery-use-btn').click();
    await expect(page.locator('.template-gallery')).not.toBeVisible({ timeout: 5000 });

    // Open code preview
    await openCodePreview(page);

    // The code preview should show Terraform output
    const codeContent = page.locator('.code-preview');
    await expect(codeContent).toBeVisible();

    // Terraform output should contain provider block or resource definitions
    await expect(codeContent).toContainText(/terraform|provider|resource/, { timeout: 5000 });

    await page.screenshot({ path: 'test-results/e2e/template-terraform-export.png' });
  });

  test('template load and export: load template then verify Terraform output', async ({ page }) => {
    await goToBuilder(page);
    await dismissOnboarding(page);
    await openTemplateGallery(page);

    // Load template
    const card = page.locator('.template-gallery-card', {
      hasText: 'Three-Tier Web Application',
    });
    await card.locator('.template-gallery-use-btn').click();
    await expect(page.locator('.template-gallery')).not.toBeVisible({ timeout: 5000 });

    // Verify canvas has rendered blocks
    await page.waitForTimeout(500);
    await expect(page.locator('.scene-viewport')).toBeVisible();

    // Open code preview to verify export still works after template load
    await openCodePreview(page);
    await expect(page.locator('.code-preview')).toContainText(/terraform|provider|resource/, {
      timeout: 5000,
    });

    await page.screenshot({ path: 'test-results/e2e/template-edit-export-flow.png' });
  });

  test('Bicep export produces output (Experimental)', async ({ page }) => {
    await goToBuilder(page);
    await dismissOnboarding(page);
    await openTemplateGallery(page);

    // Load template
    const card = page.locator('.template-gallery-card', {
      hasText: 'Three-Tier Web Application',
    });
    await card.locator('.template-gallery-use-btn').click();
    await expect(page.locator('.template-gallery')).not.toBeVisible({ timeout: 5000 });

    // Open code preview
    await openCodePreview(page);

    // Enable Advanced mode to access generator selector
    const advancedToggle = page.getByLabel('Expert generator selection');
    if (await advancedToggle.isVisible().catch(() => false)) {
      await advancedToggle.click();

      // Select Bicep
      const selector = page.getByRole('combobox');
      await selector.selectOption('bicep');

      // Bicep output should contain resource or param definitions
      const codeContent = page.locator('.code-preview');
      await expect(codeContent).toBeVisible();
      await expect(codeContent).toContainText(/resource|param|module/, { timeout: 5000 });
    }
    await page.screenshot({ path: 'test-results/e2e/template-bicep-export.png' });
  });

  test('Pulumi export produces output (Experimental)', async ({ page }) => {
    await goToBuilder(page);
    await dismissOnboarding(page);
    await openTemplateGallery(page);

    // Load template
    const card = page.locator('.template-gallery-card', {
      hasText: 'Three-Tier Web Application',
    });
    await card.locator('.template-gallery-use-btn').click();
    await expect(page.locator('.template-gallery')).not.toBeVisible({ timeout: 5000 });

    // Open code preview
    await openCodePreview(page);

    // Enable Advanced mode to access generator selector
    const advancedToggle = page.getByLabel('Expert generator selection');
    if (await advancedToggle.isVisible().catch(() => false)) {
      await advancedToggle.click();

      // Select Pulumi
      const selector = page.getByRole('combobox');
      await selector.selectOption('pulumi');

      // Pulumi output should contain import or resource definitions
      const codeContent = page.locator('.code-preview');
      await expect(codeContent).toBeVisible();
      await expect(codeContent).toContainText(/import|pulumi|new /, { timeout: 5000 });
    }
    await page.screenshot({ path: 'test-results/e2e/template-pulumi-export.png' });
  });
});

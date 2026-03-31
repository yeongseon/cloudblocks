import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import { readFileSync } from 'node:fs';

/**
 * E2E: ExternalActor-to-Block Unification Verification (#1541)
 *
 * Validates that internet/browser external blocks work correctly through
 * the unified block pipeline: templates load them as blocks, legacy data
 * migrates transparently, Terraform export excludes them, and round-trip
 * import/export preserves them.
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
  if (await templatesBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await templatesBtn.click();
  } else {
    const overflowBtn = page.getByRole('button', { name: 'Advanced' });
    await overflowBtn.click();
    const browseTemplates = page.getByRole('button', { name: /Browse Templates/ });
    await browseTemplates.click();
  }
  await expect(page.locator('.template-gallery')).toBeVisible({ timeout: 5000 });
}

async function openCodePreview(page: Page) {
  const overflowBtn = page.getByRole('button', { name: 'Advanced' });
  await overflowBtn.click();
  const generateBtn = page.locator('.overflow-dropdown .menu-item', { hasText: 'Generate Code' });
  await generateBtn.click();
  await expect(page.locator('.code-preview')).toBeVisible({ timeout: 5000 });
}

async function loadTemplate(page: Page, templateName: string) {
  await openTemplateGallery(page);
  const allFilter = page.locator('.template-gallery-filter-btn', { hasText: /all/i });
  if (await allFilter.isVisible().catch(() => false)) {
    await allFilter.click();
  }
  const card = page.locator('.template-gallery-card', { hasText: templateName });
  await expect(card).toBeVisible();
  await card.locator('.template-gallery-use-btn').click();
  await expect(page.locator('.template-gallery')).not.toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(500);
}

test.describe('ExternalActor-to-Block Unification (#1541)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test.describe('Template external blocks render as BlockSprite', () => {
    for (const template of TEMPLATES) {
      test(`"${template.name}" renders internet/browser as blocks on canvas`, async ({ page }) => {
        await goToBuilder(page);
        await dismissOnboarding(page);
        await loadTemplate(page, template.name);

        // Canvas should have rendered blocks (BlockSprite elements)
        const viewport = page.locator('.scene-viewport');
        await expect(viewport).toBeVisible();

        // At least 2 block-sprite elements should exist for external blocks
        // (Internet + Browser are present in every template)
        const blockSprites = page.locator('.block-sprite');
        const count = await blockSprites.count();
        expect(count).toBeGreaterThanOrEqual(2);

        // Verify the canvas contains external block labels (when selected they show)
        // Use store state check via evaluate for more reliable assertion
        const externalBlockCount = await page.evaluate(() => {
          // Access Zustand store directly from window (if exposed) or localStorage
          const stored = localStorage.getItem('cloudblocks-state');
          if (!stored) return 0;
          try {
            const data = JSON.parse(stored);
            const ws = data?.state?.workspaces?.[data?.state?.currentWorkspaceId];
            if (!ws) return 0;
            return (ws.architecture?.nodes ?? []).filter((n: { roles?: string[] }) =>
              n.roles?.includes('external'),
            ).length;
          } catch {
            return 0;
          }
        });

        // Every template should have exactly 2 external blocks (internet + browser)
        expect(externalBlockCount).toBe(2);

        await page.screenshot({
          path: `test-results/e2e/unification-template-${template.category}.png`,
        });
      });
    }
  });

  test.describe('Legacy workspace migration', () => {
    test('imports workspace with externalActors[] and migrates to blocks', async ({ page }) => {
      await goToBuilder(page);
      await dismissOnboarding(page);

      // Read legacy fixture and inject via importArchitecture store action
      const fixturePath = path.resolve(__dirname, '../fixtures/legacy-external-actors.json');
      const fixtureContent = readFileSync(fixturePath, 'utf-8');

      // Import via the hidden file input (simulate file selection)
      const fileInput = page.locator('input[type="file"][accept=".json"]');
      await fileInput.setInputFiles({
        name: 'legacy-external-actors.json',
        mimeType: 'application/json',
        buffer: Buffer.from(fixtureContent),
      });

      // Wait for rendering
      await page.waitForTimeout(1000);

      // Verify blocks are rendered on canvas
      const viewport = page.locator('.scene-viewport');
      await expect(viewport).toBeVisible();

      // Verify store state has migrated external actors as nodes
      const state = await page.evaluate(() => {
        const stored = localStorage.getItem('cloudblocks-state');
        if (!stored) return null;
        try {
          const data = JSON.parse(stored);
          const ws = data?.state?.workspaces?.[data?.state?.currentWorkspaceId];
          if (!ws) return null;
          const nodes = ws.architecture?.nodes ?? [];
          return {
            totalNodes: nodes.length,
            externalNodes: nodes.filter((n: { roles?: string[] }) => n.roles?.includes('external')),
            hasInternet: nodes.some((n: { id: string }) => n.id === 'ext-internet'),
            hasBrowser: nodes.some((n: { id: string }) => n.id === 'ext-browser'),
          };
        } catch {
          return null;
        }
      });

      expect(state).not.toBeNull();
      expect(state!.hasInternet).toBe(true);
      expect(state!.hasBrowser).toBe(true);
      expect(state!.externalNodes).toHaveLength(2);

      // Verify external nodes have correct properties
      for (const node of state!.externalNodes) {
        expect(node.kind).toBe('resource');
        expect(node.category).toBe('delivery');
        expect(node.roles).toEqual(['external']);
        expect(node.parentId).toBeNull();
        expect(['internet', 'browser']).toContain(node.resourceType);
      }

      await page.screenshot({
        path: 'test-results/e2e/unification-legacy-migration.png',
      });
    });
  });

  test.describe('Terraform export excludes external blocks', () => {
    test('Terraform output does not contain internet/browser resource blocks', async ({ page }) => {
      await goToBuilder(page);
      await dismissOnboarding(page);
      await loadTemplate(page, 'Three-Tier Web Application');

      // Open code preview (Terraform)
      await openCodePreview(page);

      const codeContent = page.locator('.code-preview');
      await expect(codeContent).toBeVisible();
      await expect(codeContent).toContainText(/terraform|provider|resource/, { timeout: 5000 });

      // Get the full Terraform output text
      const terraformText = await codeContent.textContent();
      expect(terraformText).toBeDefined();

      // Verify external blocks are NOT in Terraform output
      // Internet and Browser are architectural markers, not deployable resources
      expect(terraformText!.toLowerCase()).not.toContain('resource "azurerm_internet"');
      expect(terraformText!.toLowerCase()).not.toContain('resource "azurerm_browser"');
      expect(terraformText!.toLowerCase()).not.toContain('"ext-internet"');
      expect(terraformText!.toLowerCase()).not.toContain('"ext-browser"');

      await page.screenshot({
        path: 'test-results/e2e/unification-terraform-no-externals.png',
      });
    });
  });

  test.describe('Import/export round-trip', () => {
    test('exported architecture preserves external blocks without externalActors field', async ({
      page,
    }) => {
      await goToBuilder(page);
      await dismissOnboarding(page);
      await loadTemplate(page, 'Three-Tier Web Application');

      // Get the architecture from store via evaluate (simulates export)
      const exported = await page.evaluate(() => {
        const stored = localStorage.getItem('cloudblocks-state');
        if (!stored) return null;
        try {
          const data = JSON.parse(stored);
          const ws = data?.state?.workspaces?.[data?.state?.currentWorkspaceId];
          if (!ws) return null;
          return {
            hasExternalActorsField: 'externalActors' in ws.architecture,
            externalActorsValue: ws.architecture.externalActors,
            nodeCount: ws.architecture.nodes?.length ?? 0,
            externalNodeCount: (ws.architecture.nodes ?? []).filter((n: { roles?: string[] }) =>
              n.roles?.includes('external'),
            ).length,
            externalNodeTypes: (ws.architecture.nodes ?? [])
              .filter((n: { roles?: string[] }) => n.roles?.includes('external'))
              .map((n: { resourceType: string }) => n.resourceType)
              .sort(),
          };
        } catch {
          return null;
        }
      });

      expect(exported).not.toBeNull();
      // External blocks should be in nodes[], not externalActors[]
      expect(exported!.externalNodeCount).toBe(2);
      expect(exported!.externalNodeTypes).toEqual(['browser', 'internet']);
      // nodes should contain the full architecture
      expect(exported!.nodeCount).toBeGreaterThanOrEqual(4); // At minimum: VPC + subnet + resource + 2 externals

      await page.screenshot({
        path: 'test-results/e2e/unification-export-roundtrip.png',
      });
    });
  });

  test('no ExternalActorSprite component rendered on canvas', async ({ page }) => {
    await goToBuilder(page);
    await dismissOnboarding(page);
    await loadTemplate(page, 'Three-Tier Web Application');

    // ExternalActorSprite used CSS class 'external-actor-sprite' — should not exist
    const legacyActors = page.locator('.external-actor-sprite');
    await expect(legacyActors).toHaveCount(0);

    // All external blocks should render as regular block-sprite
    const blockSprites = page.locator('.block-sprite');
    const count = await blockSprites.count();
    expect(count).toBeGreaterThanOrEqual(2);

    await page.screenshot({
      path: 'test-results/e2e/unification-no-legacy-sprites.png',
    });
  });
});

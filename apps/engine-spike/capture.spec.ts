import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { spikeFixture } from './src/fixture';
import { denseFixture } from './src/denseFixture';
import { MIN_ZOOM, MAX_ZOOM } from './src/zoom';

const moments = ['rest', 'place', 'reject', 'connect', 'select'] as const;

for (const mode of ['stacked', 'three'] as const) {
  test(`${mode} loads the valid fixture and records representative states`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/?mode=${mode}`);
    await expect(page.locator('.viewport')).toHaveAttribute('data-mode', mode);
    if (mode === 'three') await expect(page.locator('#scene canvas')).toBeVisible();
    else await expect(page.locator('[data-node="app"]')).toHaveCount(1);
    await mkdir(`iterations/${mode}`, { recursive: true });
    for (const moment of moments) {
      await page.locator(`button[data-moment="${moment}"]`).click();
      await expect(page.locator('.viewport')).toHaveAttribute('data-moment', moment);
      await page.screenshot({ path: `iterations/${mode}/${moment}.png`, animations: 'disabled' });
    }
    expect(pageErrors).toEqual([]);
  });
}

test('unreadable selected-connection URL does not replace the default study', async ({ page }) => {
  await page.goto('/?mode=three&connection=app-sql');
  await expect(page.locator('#scene canvas')).toBeVisible();
  await expect(page.locator('[data-connection]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'All rails' })).toHaveCount(0);
});

test('block inspection shows directed typed adjacency without hiding the canvas', async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/?mode=three');
  await expect(page.locator('[data-relationship]')).toHaveCount(spikeFixture.connections.length);
  await page.getByLabel('INSPECT BLOCK').selectOption('app');
  await expect(page.locator('#scene canvas')).toBeVisible();
  await expect(page.locator('[data-relationship]')).toHaveCount(3);
  await expect(page.locator('[data-relationship="gateway-app"]')).toContainText(
    'App Gateway → App Service',
  );
  await expect(page.locator('[data-relationship="app-sql"]')).toContainText(
    'App Service → SQL Database',
  );
  await expect(page.locator('[data-relationship="app-sql"]')).toContainText('DATA');
  await mkdir('iterations/three-relationships', { recursive: true });
  await page.screenshot({
    path: 'iterations/three-relationships/app-service.png',
    animations: 'disabled',
  });
  await page.getByLabel('INSPECT BLOCK').selectOption('');
  await expect(page.locator('[data-relationship]')).toHaveCount(spikeFixture.connections.length);
  expect(pageErrors).toEqual([]);
});

test('keyboard activation reveals only the requested inspection path', async ({ page }) => {
  await page.goto('/?mode=three');
  await expect(page.locator('[data-inspection-path]')).toHaveCount(0);
  const link = page.locator('[data-relationship="app-sql"] button');
  await link.focus();
  await page.keyboard.press('Enter');
  await expect(link).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-inspection-path="app-sql"]')).toHaveCount(1);
  await expect(page.locator('[data-inspection-path]')).toHaveCount(1);
});

for (const id of ['gateway-app', 'front-gateway', 'app-sql'] as const) {
  test(`inspects ${id} without changing the model or base rails`, async ({ page }) => {
    await page.goto(`/?mode=three&link=${id}`);
    await expect(page.locator(`[data-inspection-path="${id}"]`)).toHaveCount(1);
    const semantic = id === 'app-sql' ? 'data' : 'http';
    await expect(page.locator(`[data-inspection-path="${id}"] path[marker-end]`)).toHaveAttribute(
      'marker-end',
      `url(#inspection-arrow-${semantic})`,
    );
    await expect(page.locator(`[data-relationship="${id}"] button`)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await mkdir('iterations/inspection-overlay', { recursive: true });
    await page.screenshot({
      path: `iterations/inspection-overlay/${id}.png`,
      animations: 'disabled',
    });
    await page.getByRole('button', { name: 'Clear inspected link' }).click();
    await expect(page.locator('[data-inspection-path]')).toHaveCount(0);
    await expect(page.locator('[data-relationship]')).toHaveCount(spikeFixture.connections.length);
  });
}

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'narrow', width: 820, height: 900 },
] as const) {
  test(`dense inspection at ${viewport.name} width`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/?mode=three&fixture=dense&link=app-sql');
    await expect(page.locator('#scene canvas')).toBeVisible();
    await expect(page.getByText('DENSE WEB API')).toBeVisible();
    await expect(page.locator('[data-relationship]')).toHaveCount(denseFixture.connections.length);
    await expect(page.locator('[data-inspection-path="app-sql"]')).toHaveCount(1);
    const source = page.locator('[data-relationship="app-sql"] button');
    await expect(source).toHaveAttribute('aria-pressed', 'true');
    await mkdir('iterations/dense-responsive', { recursive: true });
    await page.screenshot({
      path: `iterations/dense-responsive/${viewport.name}-app-sql.png`,
      animations: 'disabled',
    });
  });
}

test('Internet participates in both validated fixtures and zoom remains bounded', async ({
  page,
}) => {
  for (const fixture of ['baseline', 'dense'] as const) {
    await page.goto(`/?mode=three&fixture=${fixture}`);
    await expect(page.getByRole('option', { name: 'Internet' })).toHaveCount(1);
    await expect(page.locator('[data-relationship="internet-front"]')).toContainText(
      'Internet → Front Door',
    );
    await page.getByRole('button', { name: 'Zoom out' }).click();
    await expect(page.locator('.viewport')).toHaveAttribute('data-zoom', '0.8');
    await page.getByRole('button', { name: 'Reset zoom' }).click();
    await expect(page.locator('.viewport')).toHaveAttribute('data-zoom', '1.0');
    await mkdir(`iterations/zoom-${fixture}`, { recursive: true });
    await page.screenshot({ path: `iterations/zoom-${fixture}/rest.png`, animations: 'disabled' });
  }
  await page.goto('/?mode=three&fixture=dense&zoom=0.6&link=internet-front');
  await expect(page.locator('.viewport')).toHaveAttribute('data-zoom', MIN_ZOOM.toFixed(1));
  await expect(page.getByRole('button', { name: 'Zoom out' })).toBeDisabled();
  await expect(page.locator('[data-inspection-path="internet-front"]')).toHaveCount(1);
  await page.screenshot({
    path: 'iterations/zoom-dense/zoom-out-internet.png',
    animations: 'disabled',
  });
  await page.goto('/?mode=three&fixture=dense&zoom=1.8&link=app-sql');
  await expect(page.locator('.viewport')).toHaveAttribute('data-zoom', MAX_ZOOM.toFixed(1));
  await expect(page.getByRole('button', { name: 'Zoom in' })).toBeDisabled();
  await page.screenshot({
    path: 'iterations/zoom-dense/zoom-in-app-sql.png',
    animations: 'disabled',
  });
  const bounds = await page.locator('#scene canvas').boundingBox();
  if (!bounds) throw new Error('3D canvas has no bounding box');
  const startX = bounds.x + bounds.width * 0.22;
  const startY = bounds.y + bounds.height * 0.75;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 130, startY + 25, { steps: 5 });
  await page.mouse.up();
  await expect(page.locator('.viewport')).not.toHaveAttribute('data-pan-x', '0.00');
  await page.screenshot({
    path: 'iterations/zoom-dense/zoom-in-panned.png',
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Reset zoom' }).click();
  await expect(page.locator('.viewport')).toHaveAttribute('data-pan-x', '0.00');
  await expect(page.locator('.viewport')).toHaveAttribute('data-zoom', '1.0');
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await page.locator('button[data-mode="stacked"]').click();
  await expect(page.locator('.viewport')).toHaveAttribute('data-zoom', '1.2');
  await expect(page.locator('#scene svg')).toBeVisible();
  await page.getByRole('button', { name: 'Zoom out' }).click();
  await expect(page.locator('.viewport')).toHaveAttribute('data-zoom', '1.0');
});

test('dragging a resource is distinct from panning the camera', async ({ page }) => {
  await page.goto('/?mode=three&link=app-sql');
  const beforePath = await page
    .locator('[data-inspection-path="app-sql"] path[marker-end]')
    .getAttribute('d');
  const app = page.locator('.overlay text').filter({ hasText: /^App Service$/ });
  const bounds = await app.boundingBox();
  if (!bounds) throw new Error('App Service label not projected');
  const x = bounds.x + bounds.width / 2;
  const y = bounds.y + bounds.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 25, y - 10, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('.viewport')).toHaveAttribute('data-moved-count', '1');
  await expect(page.locator('.viewport')).toHaveAttribute('data-pan-x', '0.00');
  await expect(page.locator('.move-feedback')).toContainText('App Service moved');
  await expect(page.locator('[data-inspection-path="app-sql"]')).toHaveCount(1);
  expect(
    await page.locator('[data-inspection-path="app-sql"] path[marker-end]').getAttribute('d'),
  ).not.toBe(beforePath);
  await mkdir('iterations/resource-move', { recursive: true });
  await page.screenshot({ path: 'iterations/resource-move/accepted.png', animations: 'disabled' });
  await page.reload();
  await expect(page.locator('.viewport')).toHaveAttribute('data-moved-count', '0');
});

test('overlapping drop is rejected without changing the fixture position', async ({ page }) => {
  await page.goto('/?mode=three&link=app-sql');
  const beforePath = await page
    .locator('[data-inspection-path="app-sql"] path[marker-end]')
    .getAttribute('d');
  const app = page.locator('.overlay text').filter({ hasText: /^App Service$/ });
  const gateway = page.locator('.overlay text').filter({ hasText: /^App Gateway$/ });
  const before = await app.boundingBox();
  const destination = await gateway.boundingBox();
  if (!before || !destination) throw new Error('Fixture labels not projected');
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    destination.x + destination.width / 2,
    destination.y + destination.height / 2,
    { steps: 8 },
  );
  await page.mouse.up();
  await expect(page.locator('.viewport')).toHaveAttribute('data-moved-count', '0');
  await expect(page.locator('.move-feedback')).toContainText('App Service cannot be placed there');
  const after = await app.boundingBox();
  if (!after) throw new Error('App Service label disappeared');
  expect(Math.abs(after.x - before.x)).toBeLessThan(1);
  expect(Math.abs(after.y - before.y)).toBeLessThan(1);
  expect(
    await page.locator('[data-inspection-path="app-sql"] path[marker-end]').getAttribute('d'),
  ).toBe(beforePath);
  await mkdir('iterations/resource-move', { recursive: true });
  await page.screenshot({ path: 'iterations/resource-move/rejected.png', animations: 'disabled' });
});

test('zoomed scene keeps resource drag distinct from prior camera pan', async ({ page }) => {
  await page.goto('/?mode=three&zoom=1.4&link=app-sql');
  const canvas = page.locator('#scene canvas');
  const sceneBounds = await canvas.boundingBox();
  if (!sceneBounds) throw new Error('3D canvas has no bounds');
  const emptyX = sceneBounds.x + sceneBounds.width * 0.18;
  const emptyY = sceneBounds.y + sceneBounds.height * 0.8;
  await page.mouse.move(emptyX, emptyY);
  await page.mouse.down();
  await page.mouse.move(emptyX + 65, emptyY + 15, { steps: 6 });
  await page.mouse.up();
  await expect(page.locator('.viewport')).not.toHaveAttribute('data-pan-x', '0.00');
  const app = page.locator('.overlay text').filter({ hasText: /^App Service$/ });
  const bounds = await app.boundingBox();
  if (!bounds) throw new Error('App Service label not projected');
  const x = bounds.x + bounds.width / 2;
  const y = bounds.y + bounds.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 20, y - 12, { steps: 6 });
  await page.mouse.up();
  await expect(page.locator('.viewport')).toHaveAttribute('data-moved-count', '1');
  await expect(page.getByRole('status').filter({ hasText: 'App Service moved' })).toBeVisible();
  await expect(page.locator('[data-inspection-path="app-sql"]')).toHaveCount(1);
  await mkdir('iterations/resource-move', { recursive: true });
  await page.screenshot({
    path: 'iterations/resource-move/zoomed-panned.png',
    animations: 'disabled',
  });
});

test('subnet gateway transfers and undo/redo restores its position', async ({ page }) => {
  await page.goto('/?mode=three&inspect=gateway&link=gateway-app');
  const initialPath = await page
    .locator('[data-inspection-path="gateway-app"] path[marker-end]')
    .getAttribute('d');
  await page.getByRole('button', { name: 'Data Subnet' }).click();
  await expect(page.locator('.move-feedback')).toContainText('App Gateway moved to subnet-b');
  await expect(page.locator('.viewport')).toHaveAttribute('data-moved-count', '1');
  await expect(page.getByRole('button', { name: 'Data Subnet' })).toBeDisabled();
  const transferredPath = await page
    .locator('[data-inspection-path="gateway-app"] path[marker-end]')
    .getAttribute('d');
  expect(transferredPath).not.toBe(initialPath);
  await mkdir('iterations/resource-move', { recursive: true });
  await page.screenshot({
    path: 'iterations/resource-move/transferred.png',
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Undo move' }).click();
  await expect(page.locator('.viewport')).toHaveAttribute('data-moved-count', '0');
  expect(
    await page.locator('[data-inspection-path="gateway-app"] path[marker-end]').getAttribute('d'),
  ).toBe(initialPath);
  await page.getByRole('button', { name: 'Redo move' }).click();
  expect(
    await page.locator('[data-inspection-path="gateway-app"] path[marker-end]').getAttribute('d'),
  ).toBe(transferredPath);
  await page.keyboard.press('ControlOrMeta+z');
  expect(
    await page.locator('[data-inspection-path="gateway-app"] path[marker-end]').getAttribute('d'),
  ).toBe(initialPath);
});

test('keyboard arrow movement is undoable without stealing keys from the block selector', async ({
  page,
}) => {
  await page.goto('/?mode=three&inspect=app');
  await page.locator('main').click({ position: { x: 30, y: 12 } });
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.move-feedback')).toContainText('App Service moved');
  await expect(page.locator('.viewport')).toHaveAttribute('data-moved-count', '1');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(page.locator('.viewport')).toHaveAttribute('data-moved-count', '0');
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(page.locator('.viewport')).toHaveAttribute('data-moved-count', '1');
});

test('visible nudge controls move a selected resource without a pointer or shortcut', async ({
  page,
}) => {
  await page.goto('/?mode=three&inspect=app');
  await page.getByRole('button', { name: 'Move right' }).click();
  await expect(page.locator('.move-feedback')).toContainText('App Service moved');
  await expect(page.locator('.viewport')).toHaveAttribute('data-moved-count', '1');
  await page.getByRole('button', { name: 'Undo move' }).click();
  await expect(page.locator('.viewport')).toHaveAttribute('data-moved-count', '0');
});

test('cross-subnet gateway drag previews links and transfers on drop', async ({ page }) => {
  await page.goto('/?mode=three&link=gateway-app');
  const before = await page
    .locator('[data-inspection-path="gateway-app"] path[marker-end]')
    .getAttribute('d');
  const app = await page
    .locator('.overlay text')
    .filter({ hasText: /^App Gateway$/ })
    .boundingBox();
  const dataSubnet = await page
    .locator('.overlay text')
    .filter({ hasText: /^DATA SUBNET$/ })
    .boundingBox();
  if (!app || !dataSubnet) throw new Error('Transfer targets are not projected');
  await page.mouse.move(app.x + app.width / 2, app.y + app.height / 2);
  await page.mouse.down();
  await page.mouse.move(dataSubnet.x + dataSubnet.width / 2, dataSubnet.y - 80, { steps: 10 });
  const preview = await page
    .locator('[data-inspection-path="gateway-app"] path[marker-end]')
    .getAttribute('d');
  expect(preview).not.toBe(before);
  await mkdir('iterations/resource-move', { recursive: true });
  await page.screenshot({
    path: 'iterations/resource-move/transfer-preview.png',
    animations: 'disabled',
  });
  await page.mouse.up();
  await expect(page.locator('.move-feedback')).toContainText('App Gateway moved to subnet-b');
  expect(
    await page.locator('[data-inspection-path="gateway-app"] path[marker-end]').getAttribute('d'),
  ).toBe(preview);
  await page.getByRole('button', { name: 'Undo move' }).click();
  expect(
    await page.locator('[data-inspection-path="gateway-app"] path[marker-end]').getAttribute('d'),
  ).toBe(before);
});

test('invalid SQL-to-subnet move does not change history or link position', async ({ page }) => {
  await page.goto('/?mode=three&inspect=sql&link=app-sql');
  const before = await page
    .locator('[data-inspection-path="app-sql"] path[marker-end]')
    .getAttribute('d');
  await expect(page.getByRole('button', { name: 'Undo move' })).toBeDisabled();
  const sql = await page
    .locator('.overlay text')
    .filter({ hasText: /^SQL Database$/ })
    .boundingBox();
  const subnet = await page
    .locator('.overlay text')
    .filter({ hasText: /^DATA SUBNET$/ })
    .boundingBox();
  if (!sql || !subnet) throw new Error('Root SQL and subnet are not projected');
  await page.mouse.move(sql.x + sql.width / 2, sql.y + sql.height / 2);
  await page.mouse.down();
  await page.mouse.move(subnet.x + subnet.width / 2, subnet.y - 80, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('.move-feedback')).toContainText('SQL Database cannot be placed there');
  await expect(page.locator('.viewport')).toHaveAttribute('data-moved-count', '0');
  await expect(page.getByRole('button', { name: 'Undo move' })).toBeDisabled();
  expect(
    await page.locator('[data-inspection-path="app-sql"] path[marker-end]').getAttribute('d'),
  ).toBe(before);
});

test('root-only Internet cannot transfer into either subnet', async ({ page }) => {
  await page.goto('/?mode=three&inspect=internet');
  await expect(page.locator('[data-transfer]')).toHaveCount(0);
  const internet = await page
    .locator('.overlay text')
    .filter({ hasText: /^Internet$/ })
    .boundingBox();
  const app = await page
    .locator('.overlay text')
    .filter({ hasText: /^App Service$/ })
    .boundingBox();
  if (!internet || !app) throw new Error('Internet or App Service label is missing');
  await page.mouse.move(internet.x + internet.width / 2, internet.y + internet.height / 2);
  await page.mouse.down();
  await page.mouse.move(app.x + app.width / 2, app.y + app.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(page.locator('.viewport')).toHaveAttribute('data-moved-count', '0');
  await expect(page.locator('.move-feedback')).toContainText('Internet cannot be placed there');
});

test('hosted PaaS and SQL remain outside subnet surfaces', async ({ page }) => {
  await page.goto('/?mode=three&inspect=app');
  await expect(page.locator('[data-transfer]')).toHaveCount(0);
  await page.getByLabel('INSPECT BLOCK').selectOption('function');
  await expect(page.locator('[data-transfer]')).toHaveCount(0);
  await page.getByLabel('INSPECT BLOCK').selectOption('sql');
  await expect(page.locator('[data-transfer]')).toHaveCount(0);
  await page.getByLabel('INSPECT BLOCK').selectOption('vault');
  await expect(page.locator('[data-transfer]')).toHaveCount(0);
  await page.goto('/?mode=three&fixture=dense&inspect=cache');
  await expect(page.locator('[data-transfer]')).toHaveCount(0);
});

test('hybrid is not misrepresented as a tested renderer', async ({ page }) => {
  await page.goto('/');
  await page.locator('button[data-mode="hybrid"]').click();
  await expect(page.getByText('Not tested.')).toBeVisible();
  await expect(page.locator('button[data-mode="hybrid"]')).toHaveAttribute('aria-pressed', 'true');
});

test('WebGL-unavailable mode reports SVG as the available alternative', async ({ page }) => {
  await page.addInitScript(() => {
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: function (this: HTMLCanvasElement, ...args: Parameters<typeof originalGetContext>) {
        if (args[0] === 'webgl' || args[0] === 'webgl2' || args[0] === 'experimental-webgl')
          return null;
        return originalGetContext.apply(this, args);
      },
    });
  });
  await page.goto('/?mode=three');
  await expect(page.getByText('WebGL unavailable.')).toBeVisible();
  await page.locator('button[data-mode="stacked"]').click();
  await expect(page.locator('#scene svg')).toBeVisible();
});

test('captures the actual production SVG editor with the same architecture', async ({ page }) => {
  const workspace = {
    id: 'spike-workspace',
    name: 'Web API / Layer Study',
    provider: 'azure',
    architecture: spikeFixture,
    createdAt: spikeFixture.createdAt,
    updatedAt: spikeFixture.updatedAt,
  };
  await page.addInitScript((snapshot) => {
    if (location.port === '4179') {
      localStorage.setItem(
        'cloudblocks:workspaces',
        JSON.stringify({ schemaVersion: '4.1.0', workspaces: [snapshot] }),
      );
      localStorage.setItem('cloudblocks:activeWorkspaceId', snapshot.id);
    }
  }, workspace);
  await page.goto('http://127.0.0.1:4179/');
  const start = page.getByRole('button', { name: 'Get Started' });
  if (await start.isVisible().catch(() => false)) await start.click();
  const skip = page.getByText('Skip', { exact: true });
  if (await skip.isVisible().catch(() => false)) await skip.click();
  await expect(page.locator('.scene-viewport')).toBeVisible();
  await expect(page.locator('.block-sprite')).toHaveCount(
    spikeFixture.nodes.filter((node) => node.kind === 'resource').length,
  );
  for (const node of spikeFixture.nodes.filter((entry) => entry.kind === 'resource')) {
    await expect(page.locator('.block-sprite').filter({ hasText: node.name })).toHaveCount(1);
  }
  await expect(page.getByText('Start with Learn')).toHaveCount(0);
  await expect(page.locator('.block-sprite').filter({ hasText: 'Internet' })).toHaveCount(1);
  const helperDismiss = page.getByTestId('helper-widget-dismiss');
  if (await helperDismiss.isVisible().catch(() => false)) {
    await helperDismiss.evaluate((button: HTMLButtonElement) => button.click());
  }
  await page
    .getByRole('button', { name: 'Fit to screen' })
    .evaluate((button: HTMLButtonElement) => button.click());
  await mkdir('iterations/production-svg', { recursive: true });
  await page.screenshot({ path: 'iterations/production-svg/rest.png', animations: 'disabled' });
});

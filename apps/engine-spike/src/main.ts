import { activeFixture, fixtureName } from './activeFixture';
import type { Mode, Moment } from './geometry';
import { blockName, relationships, relationshipsForBlock } from './relationships';
import { renderSvg } from './svg';
import { mountThree } from './three';
import { clampZoom, MAX_ZOOM, MIN_ZOOM, ZOOM_STEP } from './zoom';
import { resources } from './geometry';
import { parentOf } from './geometry';
import type { MovePositions } from './geometry';
import { firstAvailableInParent, validateStudyMove } from './movement';
import type { StudyPlacement } from './movement';
import './style.css';

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing study root');

const modes: { id: Mode; name: string; description: string }[] = [
  { id: 'stacked', name: 'Layered SVG', description: 'Derived height and vector shadows' },
  { id: 'three', name: 'Lit 3D', description: 'Orthographic geometry and live light' },
  {
    id: 'hybrid',
    name: 'Prerender hybrid',
    description: 'Not tested: authored assets unavailable',
  },
];
const moments: Moment[] = ['rest', 'place', 'reject', 'connect', 'select'];
let mode: Mode = new URLSearchParams(location.search).get('mode') === 'three' ? 'three' : 'stacked';
let moment: Moment = 'rest';
let zoom = clampZoom(Number(new URLSearchParams(location.search).get('zoom') ?? 1));
let pan = { x: 0, z: 0 };
let moved: MovePositions = new Map();
let past: MovePositions[] = [];
let future: MovePositions[] = [];
let moveFeedback = '';
const requestedBlock = new URLSearchParams(location.search).get('inspect');
let inspectedBlockId: string | null = activeFixture.nodes.some(
  (node) => node.kind === 'resource' && node.id === requestedBlock,
)
  ? requestedBlock
  : null;
const requestedLink = new URLSearchParams(location.search).get('link');
let inspectedConnectionId: string | null = relationships.some((item) => item.id === requestedLink)
  ? requestedLink
  : null;
let dispose: (() => void) | undefined;

function inspectBlock(id: string | null): void {
  inspectedBlockId = id;
  inspectedConnectionId = null;
  const url = new URL(location.href);
  if (id) url.searchParams.set('inspect', id);
  else url.searchParams.delete('inspect');
  url.searchParams.delete('link');
  history.replaceState(null, '', url);
  render();
}

function setZoom(value: number): void {
  const next = clampZoom(value);
  if (next === zoom) return;
  zoom = next;
  const url = new URL(location.href);
  if (zoom === 1) url.searchParams.delete('zoom');
  else url.searchParams.set('zoom', zoom.toFixed(1));
  history.replaceState(null, '', url);
  render();
}

function moveBlock(id: string, position: StudyPlacement): void {
  const node = resources.find((resource) => resource.id === id);
  if (!node) return;
  const result = validateStudyMove(node, position, moved, position.parentId);
  if (!result.valid) {
    moveFeedback = `Move rejected: ${result.reason}.`;
  } else {
    const current = moved.get(id) ?? { ...node.position, parentId: node.parentId };
    if (
      current.x === result.position.x &&
      current.z === result.position.z &&
      current.parentId === result.position.parentId
    )
      return;
    past = [...past, moved];
    future = [];
    moved = new Map(moved).set(id, result.position);
    moveFeedback = `${node.name} moved to ${result.position.parentId ?? 'root'} grid ${result.position.x}, ${result.position.z}.`;
  }
  render();
}

function transferSelected(parentId: string): void {
  if (!inspectedBlockId) return;
  const node = resources.find((resource) => resource.id === inspectedBlockId);
  if (!node) return;
  if (parentOf(node, moved) === parentId) return;
  const result = firstAvailableInParent(node, moved, parentId);
  if (result.valid) moveBlock(node.id, result.position);
  else {
    moveFeedback = `${node.name} cannot be placed there.`;
    render();
  }
}

function undoMove(): void {
  const previous = past.at(-1);
  if (!previous) return;
  past = past.slice(0, -1);
  future = [moved, ...future];
  moved = previous;
  moveFeedback = 'Move undone.';
  render();
}

function redoMove(): void {
  const next = future[0];
  if (!next) return;
  future = future.slice(1);
  past = [...past, moved];
  moved = next;
  moveFeedback = 'Move restored.';
  render();
}

function keyboardMove(key: string): void {
  if (!inspectedBlockId) return;
  const node = resources.find((resource) => resource.id === inspectedBlockId);
  if (!node) return;
  const current = moved.get(node.id) ?? { ...node.position, parentId: node.parentId };
  const deltas: Record<string, { x: number; z: number }> = {
    ArrowLeft: { x: -1, z: 0 },
    ArrowRight: { x: 1, z: 0 },
    ArrowUp: { x: 0, z: -1 },
    ArrowDown: { x: 0, z: 1 },
  };
  const delta = deltas[key];
  if (!delta) return;
  const result = validateStudyMove(
    node,
    { x: current.x + delta.x, z: current.z + delta.z },
    moved,
    current.parentId,
  );
  if (result.valid && (result.position.x !== current.x || result.position.z !== current.z))
    moveBlock(node.id, result.position);
  else {
    moveFeedback = `${node.name} cannot be placed there.`;
    render();
  }
}

window.addEventListener('keydown', (event) => {
  if (mode !== 'three' || event.altKey) return;
  const target = event.target;
  if (
    target instanceof HTMLElement &&
    target.closest('input, select, textarea, [contenteditable="true"]')
  )
    return;
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    if (event.shiftKey) redoMove();
    else undoMove();
  } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y') {
    event.preventDefault();
    redoMove();
  } else if (
    !event.metaKey &&
    !event.ctrlKey &&
    event.key.startsWith('Arrow') &&
    !(target instanceof HTMLElement && target.closest('button')) &&
    inspectedBlockId
  ) {
    event.preventDefault();
    keyboardMove(event.key);
  }
});

function inspectConnection(id: string | null): void {
  inspectedConnectionId = id;
  const url = new URL(location.href);
  if (id) url.searchParams.set('link', id);
  else url.searchParams.delete('link');
  history.replaceState(null, '', url);
  render();
}

function render(): void {
  dispose?.();
  dispose = undefined;
  if (!root) return;
  const visibleRelationships = inspectedBlockId
    ? relationshipsForBlock(inspectedBlockId)
    : relationships;
  const inspectedName = inspectedBlockId ? blockName(inspectedBlockId) : 'All blocks';
  root.innerHTML = `<div class="shell"><header><div class="brand">CLOUDBLOCKS <span>/ RENDER STUDY</span></div><div class="tag">ISSUE #1927 · v0.53.0 · NOT A PRODUCT VIEW</div></header>
  <div class="layout"><aside class="panel"><div class="eyebrow">01 / METHOD</div><h1>One model.<br><b>Different light.</b></h1><p>Test whether vertical hierarchy helps learners read scope without rewriting the architecture.</p><div class="fixture-switch" role="group" aria-label="Architecture fixture"><a href="?mode=three&fixture=baseline" aria-current="${fixtureName === 'baseline' ? 'true' : 'false'}">Baseline</a><a href="?mode=three&fixture=dense" aria-current="${fixtureName === 'dense' ? 'true' : 'false'}">Dense</a></div>
  <nav aria-label="Renderer candidates">${modes.map((candidate, index) => `<button data-mode="${candidate.id}" aria-pressed="${candidate.id === mode}"><small>0${index + 1}</small><span><strong>${candidate.name}</strong><em>${candidate.description}</em></span></button>`).join('')}</nav><div class="method-note">The real production SVG baseline is captured separately from the editor; this panel does not impersonate it.</div></aside>
  <main><div class="heading"><div><div class="eyebrow">02 / LIVE PROTOTYPE</div><h2>${modes.find((item) => item.id === mode)?.name}</h2></div><div class="fixture-label">${fixtureName === 'dense' ? 'DENSE WEB API' : 'WEB API'} · AZURE<br><span>1 VNet / 2 subnets / ${activeFixture.nodes.filter((node) => node.kind === 'resource').length} resources</span></div></div>
  <div class="viewport" data-mode="${mode}" data-moment="${moment}" data-zoom="${zoom.toFixed(1)}" data-pan-x="${pan.x.toFixed(2)}" data-moved-count="${moved.size}"><div class="scene" id="scene">${mode === 'stacked' ? renderSvg(moment, zoom, moved) : mode === 'hybrid' ? '<div class="notice"><strong>Not tested.</strong><p>There is no authored render atlas or resizable surface art. A generated gradient would not test this pipeline.</p></div>' : ''}</div><div class="caption">SHARED FIXTURE · FIXED ORTHOGRAPHIC VIEW · VISUAL STATES ONLY</div><div class="zoom-controls" role="group" aria-label="Scene zoom"><button type="button" data-zoom-action="out" aria-label="Zoom out" ${zoom <= MIN_ZOOM ? 'disabled' : ''}>−</button><output aria-label="Zoom level">${Math.round(zoom * 100)}%</output><button type="button" data-zoom-action="in" aria-label="Zoom in" ${zoom >= MAX_ZOOM ? 'disabled' : ''}>+</button><button type="button" data-zoom-action="reset" aria-label="Reset zoom" ${zoom === 1 && pan.x === 0 && pan.z === 0 ? 'disabled' : ''}>Fit</button></div></div>
  <div class="controls"><span class="eyebrow">03 / MOMENT</span>${moments.map((item) => `<button data-moment="${item}" aria-pressed="${item === moment}">${item}</button>`).join('')}</div><div class="move-controls" role="group" aria-label="Move history"><button type="button" data-history="undo" ${past.length ? '' : 'disabled'}>Undo move</button><button type="button" data-history="redo" ${future.length ? '' : 'disabled'}>Redo move</button></div><p class="disclaimer">${mode === 'three' ? 'Drag a resource across subnets to move it; drag empty space to pan. ' : ''}Choose a block then use arrow keys to nudge it. Moment buttons show representative states only.</p><p class="move-feedback" role="status">${moveFeedback}</p></main>
  <aside class="panel notes"><div class="eyebrow">04 / RELATIONSHIPS</div><h2>Follow the<br/>architecture.</h2><p>Choose a block to read its incoming and outgoing connections. Select a link to compare an above-scene inspection path; the surface rails remain unchanged.</p><div class="inspect-picker"><label for="inspect-block">INSPECT BLOCK</label><select id="inspect-block"><option value="" ${inspectedBlockId === null ? 'selected' : ''}>All blocks</option>${activeFixture.nodes
    .filter((node) => node.kind === 'resource')
    .map(
      (node) =>
        `<option value="${node.id}" ${node.id === inspectedBlockId ? 'selected' : ''}>${node.name}</option>`,
    )
    .join(
      '',
    )}</select></div>${inspectedBlockId && resources.some((node) => node.id === inspectedBlockId) ? `<div class="nudge-controls" role="group" aria-label="Nudge selected resource"><button type="button" data-nudge="ArrowLeft" aria-label="Move left">←</button><button type="button" data-nudge="ArrowUp" aria-label="Move up">↑</button><button type="button" data-nudge="ArrowDown" aria-label="Move down">↓</button><button type="button" data-nudge="ArrowRight" aria-label="Move right">→</button></div>` : ''}${inspectedBlockId && resources.some((node) => node.id === inspectedBlockId && parentOf(node, moved) !== null) ? `<div class="transfer-controls" role="group" aria-label="Move selected resource to"><button type="button" data-transfer="subnet-a" ${resources.some((node) => node.id === inspectedBlockId && parentOf(node, moved) === 'subnet-a') ? 'disabled' : ''}>App Subnet</button><button type="button" data-transfer="subnet-b" ${resources.some((node) => node.id === inspectedBlockId && parentOf(node, moved) === 'subnet-b') ? 'disabled' : ''}>Data Subnet</button></div>` : ''}<div class="relationship-heading"><span>${inspectedName}</span><strong>${visibleRelationships.length} ${visibleRelationships.length === 1 ? 'connection' : 'connections'}</strong></div><ol class="relationship-list">${visibleRelationships.map((item) => `<li data-relationship="${item.id}"><button type="button" data-inspect-link="${item.id}" aria-pressed="${inspectedConnectionId === item.id}"><span class="relationship-type relationship-type-${item.semantic}">${item.semantic.toUpperCase()}</span><strong>${item.sourceName} <span aria-label="to">→</span> ${item.targetName}</strong></button></li>`).join('')}</ol>${inspectedConnectionId ? '<button class="clear-link" type="button" data-inspect-link="">Clear inspected link</button>' : ''}<p class="relationship-note">The over-scene path is an inspection aid, not a physical connection or proof of editor interaction parity.</p></aside></div><footer>MODEL STAYS 2D. HEIGHT IS DERIVED. <span>EXPERIMENTAL · NO ENGINE DECISION</span></footer></div>`;
  root.querySelectorAll<HTMLButtonElement>('button[data-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      mode = button.dataset.mode as Mode;
      const url = new URL(location.href);
      url.searchParams.set('mode', mode);
      history.replaceState(null, '', url);
      render();
    });
  });
  root.querySelectorAll<HTMLButtonElement>('button[data-moment]').forEach((button) => {
    button.addEventListener('click', () => {
      moment = button.dataset.moment as Moment;
      render();
    });
  });
  root.querySelector<HTMLSelectElement>('#inspect-block')?.addEventListener('change', (event) => {
    const select = event.currentTarget;
    if (select instanceof HTMLSelectElement) inspectBlock(select.value || null);
  });
  root.querySelectorAll<HTMLButtonElement>('[data-inspect-link]').forEach((button) => {
    button.addEventListener('click', () => inspectConnection(button.dataset.inspectLink || null));
  });
  root.querySelectorAll<HTMLButtonElement>('[data-transfer]').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.transfer) transferSelected(button.dataset.transfer);
    });
  });
  root.querySelectorAll<HTMLButtonElement>('[data-nudge]').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.nudge) keyboardMove(button.dataset.nudge);
    });
  });
  root.querySelectorAll<HTMLButtonElement>('[data-history]').forEach((button) => {
    button.addEventListener('click', () =>
      button.dataset.history === 'undo' ? undoMove() : redoMove(),
    );
  });
  root.querySelectorAll<HTMLButtonElement>('[data-zoom-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.zoomAction;
      if (action === 'reset') {
        pan = { x: 0, z: 0 };
        zoom = 1;
        const url = new URL(location.href);
        url.searchParams.delete('zoom');
        history.replaceState(null, '', url);
        render();
      } else {
        setZoom(zoom + (action === 'in' ? ZOOM_STEP : -ZOOM_STEP));
      }
    });
  });
  if (mode === 'three') {
    const host = root.querySelector<HTMLElement>('#scene');
    if (host) {
      try {
        dispose = mountThree(
          host,
          moment,
          inspectedBlockId,
          inspectedConnectionId,
          zoom,
          inspectBlock,
          (x, z) => {
            pan = { x, z };
            const viewport = root.querySelector<HTMLElement>('.viewport');
            if (viewport) viewport.dataset.panX = x.toFixed(2);
            const reset = root.querySelector<HTMLButtonElement>('[data-zoom-action="reset"]');
            if (reset) reset.disabled = false;
          },
          pan,
          moved,
          moveBlock,
          (id) => {
            const node = resources.find((resource) => resource.id === id);
            moveFeedback = `${node?.name ?? 'Resource'} cannot be placed there.`;
            render();
          },
        );
      } catch (error) {
        console.error('WebGL unavailable', error);
        host.innerHTML =
          '<div class="notice"><strong>WebGL unavailable.</strong><p>The layered SVG candidate remains accessible.</p></div>';
      }
    }
  }
}
render();

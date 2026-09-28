import { beforeEach, describe, expect, it } from 'vitest';
import { useArchitectureStore } from '../architectureStore';

/**
 * #1955 — a drag is one edit.
 *
 * `BlockSprite` calls the move action on every pointer move, and the release
 * snap adds another. Without a transaction boundary one long drag consumes the
 * 50-entry undo budget and evicts unrelated earlier work.
 */

function seedContainerAndBlock(): { subnetId: string; blockId: string } {
  const store = useArchitectureStore.getState();
  store.addNode({
    kind: 'container',
    resourceType: 'virtual_network',
    name: 'VNet',
    parentId: null,
    layer: 'region',
  });

  const vnetId = useArchitectureStore
    .getState()
    .workspace.architecture.nodes.find(
      (node) => node.kind === 'container' && node.layer === 'region',
    )!.id;

  useArchitectureStore.getState().addNode({
    kind: 'container',
    resourceType: 'subnet',
    name: 'Subnet',
    parentId: vnetId,
    layer: 'subnet',
  });

  const subnetId = useArchitectureStore
    .getState()
    .workspace.architecture.nodes.find(
      (node) => node.kind === 'container' && node.layer === 'subnet',
    )!.id;

  useArchitectureStore.getState().addNode({
    kind: 'resource',
    resourceType: 'virtual_machine',
    name: 'VM',
    parentId: subnetId,
    provider: 'azure',
    subtype: 'vm',
  });

  const blockId = useArchitectureStore
    .getState()
    .workspace.architecture.nodes.find((node) => node.kind === 'resource')!.id;

  return { subnetId, blockId };
}

const positionOf = (blockId: string) =>
  useArchitectureStore.getState().nodeById.get(blockId)!.position;

const historyDepth = () => useArchitectureStore.getState().history.past.length;

describe('#1955 drag is a single history transaction', () => {
  beforeEach(() => {
    useArchitectureStore.getState().resetWorkspace();
  });

  it('collapses many pointer moves plus the release snap into one undo', () => {
    const { blockId } = seedContainerAndBlock();
    const before = useArchitectureStore.getState().workspace.architecture;
    const depthBefore = historyDepth();

    useArchitectureStore.getState().beginGesture();
    for (let i = 0; i < 100; i += 1) {
      useArchitectureStore.getState().moveNodePosition(blockId, 0.01, 0);
    }
    // release snap, still inside the same gesture
    useArchitectureStore.getState().moveNodePosition(blockId, 0.5, 0);
    useArchitectureStore.getState().commitGesture();

    expect(historyDepth()).toBe(depthBefore + 1);
    expect(positionOf(blockId)).not.toEqual(before.nodes.find((n) => n.id === blockId)!.position);

    useArchitectureStore.getState().undo();

    expect(useArchitectureStore.getState().workspace.architecture.nodes).toEqual(before.nodes);
  });

  it('adds no history entry for a gesture that ends where it started', () => {
    const { blockId } = seedContainerAndBlock();
    const depthBefore = historyDepth();

    useArchitectureStore.getState().beginGesture();
    useArchitectureStore.getState().moveNodePosition(blockId, 0, 0);
    useArchitectureStore.getState().commitGesture();

    expect(historyDepth()).toBe(depthBefore);
  });

  it('preserves the redo stack when a no-op gesture happens after an undo', () => {
    const { blockId } = seedContainerAndBlock();

    useArchitectureStore.getState().beginGesture();
    useArchitectureStore.getState().moveNodePosition(blockId, 1, 0);
    useArchitectureStore.getState().commitGesture();
    useArchitectureStore.getState().undo();

    expect(useArchitectureStore.getState().canRedo).toBe(true);

    useArchitectureStore.getState().beginGesture();
    useArchitectureStore.getState().moveNodePosition(blockId, 0, 0);
    useArchitectureStore.getState().commitGesture();

    expect(useArchitectureStore.getState().canRedo).toBe(true);
  });

  it('restores the origin and records nothing when a gesture is cancelled', () => {
    const { blockId } = seedContainerAndBlock();
    const before = useArchitectureStore.getState().workspace.architecture;
    const depthBefore = historyDepth();

    useArchitectureStore.getState().beginGesture();
    for (let i = 0; i < 20; i += 1) {
      useArchitectureStore.getState().moveNodePosition(blockId, 0.05, 0.05);
    }
    useArchitectureStore.getState().cancelGesture();

    expect(useArchitectureStore.getState().workspace.architecture).toBe(before);
    expect(historyDepth()).toBe(depthBefore);
  });

  it('keeps earlier unrelated history available after a long drag', () => {
    const { subnetId, blockId } = seedContainerAndBlock();

    useArchitectureStore.getState().renameNode(subnetId, 'Renamed Subnet');
    const afterRename = useArchitectureStore.getState().workspace.architecture;

    useArchitectureStore.getState().beginGesture();
    for (let i = 0; i < 80; i += 1) {
      useArchitectureStore.getState().moveNodePosition(blockId, 0.02, 0);
    }
    useArchitectureStore.getState().commitGesture();

    useArchitectureStore.getState().undo();

    expect(useArchitectureStore.getState().workspace.architecture.nodes).toEqual(afterRename.nodes);
    expect(useArchitectureStore.getState().canUndo).toBe(true);
  });

  it('records one entry per gesture when two drags follow each other', () => {
    const { blockId } = seedContainerAndBlock();
    const depthBefore = historyDepth();

    for (const delta of [1, 1]) {
      useArchitectureStore.getState().beginGesture();
      useArchitectureStore.getState().moveNodePosition(blockId, delta, 0);
      useArchitectureStore.getState().commitGesture();
    }

    expect(historyDepth()).toBe(depthBefore + 2);
  });

  it('still records one entry per edit outside a gesture', () => {
    const { blockId } = seedContainerAndBlock();
    const depthBefore = historyDepth();

    useArchitectureStore.getState().moveNodePosition(blockId, 1, 0);
    useArchitectureStore.getState().moveNodePosition(blockId, 1, 0);

    expect(historyDepth()).toBe(depthBefore + 2);
  });
});

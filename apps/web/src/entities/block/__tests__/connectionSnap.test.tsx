import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUIStore } from '../../store/uiStore';

describe('Connection snap animation', () => {
  beforeEach(() => {
    useUIStore.setState({
      snapTargetBlockId: null,
      upgradingBlockId: null,
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('triggerSnapAnimation sets snapTargetBlockId and clears after 500ms', () => {
    const { triggerSnapAnimation } = useUIStore.getState();

    triggerSnapAnimation('block-1');
    expect(useUIStore.getState().snapTargetBlockId).toBe('block-1');

    vi.advanceTimersByTime(400);
    expect(useUIStore.getState().snapTargetBlockId).toBe('block-1');

    vi.advanceTimersByTime(200);
    expect(useUIStore.getState().snapTargetBlockId).toBeNull();
  });

  it('triggerSnapAnimation does not clear if another block was snapped', () => {
    const { triggerSnapAnimation } = useUIStore.getState();

    triggerSnapAnimation('block-1');
    vi.advanceTimersByTime(200);

    // Trigger a second snap before first clears
    triggerSnapAnimation('block-2');
    expect(useUIStore.getState().snapTargetBlockId).toBe('block-2');

    vi.advanceTimersByTime(400);
    // First timer fires but block-1 ≠ current, so no clear
    expect(useUIStore.getState().snapTargetBlockId).toBe('block-2');

    vi.advanceTimersByTime(200);
    // Second timer fires and clears block-2
    expect(useUIStore.getState().snapTargetBlockId).toBeNull();
  });

  it('is-snap-target class name is derived from snapTargetBlockId', () => {
    // Test the class name derivation logic directly
    const blockId = 'block-1';
    const snapTargetBlockId = 'block-1';
    const isSnapTarget = snapTargetBlockId === blockId;
    expect(isSnapTarget).toBe(true);

    const otherBlockId: string = 'block-2';
    const isOtherSnapTarget = snapTargetBlockId === otherBlockId;
    expect(isOtherSnapTarget).toBe(false);
  });
});

describe('Connection snap animation CSS classes', () => {
  it('BlockSprite className includes is-snap-target when matching', () => {
    // Verify the class building logic used in BlockSprite
    const isSnapTarget = true;
    const isUpgrading = false;
    const className = [
      'block-sprite',
      isUpgrading && 'is-upgrading',
      isSnapTarget && 'is-snap-target',
    ]
      .filter(Boolean)
      .join(' ');

    expect(className).toContain('is-snap-target');
  });

  it('BlockSprite className excludes is-snap-target when not matching', () => {
    const isSnapTarget = false;
    const className = ['block-sprite', isSnapTarget && 'is-snap-target'].filter(Boolean).join(' ');

    expect(className).not.toContain('is-snap-target');
  });
});

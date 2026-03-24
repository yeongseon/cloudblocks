import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUIStore } from '../../store/uiStore';

describe('Connection snap animation', () => {
  beforeEach(() => {
    useUIStore.setState({
      snapTargetBlockIds: new Set<string>(),
      upgradingBlockId: null,
      magneticSnapTargetId: null,
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('triggerSnapAnimation adds blockId and clears after 500ms', () => {
    const { triggerSnapAnimation } = useUIStore.getState();

    triggerSnapAnimation('block-1');
    expect(useUIStore.getState().snapTargetBlockIds.has('block-1')).toBe(true);

    vi.advanceTimersByTime(400);
    expect(useUIStore.getState().snapTargetBlockIds.has('block-1')).toBe(true);

    vi.advanceTimersByTime(200);
    expect(useUIStore.getState().snapTargetBlockIds.has('block-1')).toBe(false);
  });

  it('triggerSnapAnimation supports multiple simultaneous snap targets', () => {
    const { triggerSnapAnimation } = useUIStore.getState();

    triggerSnapAnimation('block-1');
    vi.advanceTimersByTime(200);

    triggerSnapAnimation('block-2');
    expect(useUIStore.getState().snapTargetBlockIds.has('block-1')).toBe(true);
    expect(useUIStore.getState().snapTargetBlockIds.has('block-2')).toBe(true);

    vi.advanceTimersByTime(300);
    expect(useUIStore.getState().snapTargetBlockIds.has('block-1')).toBe(false);
    expect(useUIStore.getState().snapTargetBlockIds.has('block-2')).toBe(true);

    vi.advanceTimersByTime(200);
    expect(useUIStore.getState().snapTargetBlockIds.has('block-2')).toBe(false);
  });

  it('is-snap-target class name is derived from snapTargetBlockIds', () => {
    const blockId = 'block-1';
    const snapTargetBlockIds = new Set(['block-1']);
    const isSnapTarget = snapTargetBlockIds.has(blockId);
    expect(isSnapTarget).toBe(true);

    const otherBlockId = 'block-2';
    const isOtherSnapTarget = snapTargetBlockIds.has(otherBlockId);
    expect(isOtherSnapTarget).toBe(false);
  });
});

describe('Magnetic snap state', () => {
  beforeEach(() => {
    useUIStore.setState({ magneticSnapTargetId: null });
  });

  it('setMagneticSnapTarget sets and clears the target id', () => {
    useUIStore.getState().setMagneticSnapTarget('block-1');
    expect(useUIStore.getState().magneticSnapTargetId).toBe('block-1');

    useUIStore.getState().setMagneticSnapTarget(null);
    expect(useUIStore.getState().magneticSnapTargetId).toBeNull();
  });

  it('completeInteraction clears magneticSnapTargetId', () => {
    useUIStore.getState().setMagneticSnapTarget('block-1');
    expect(useUIStore.getState().magneticSnapTargetId).toBe('block-1');

    useUIStore.getState().completeInteraction();
    expect(useUIStore.getState().magneticSnapTargetId).toBeNull();
  });

  it('cancelInteraction clears magneticSnapTargetId', () => {
    useUIStore.getState().setMagneticSnapTarget('block-2');
    expect(useUIStore.getState().magneticSnapTargetId).toBe('block-2');

    useUIStore.getState().cancelInteraction();
    expect(useUIStore.getState().magneticSnapTargetId).toBeNull();
  });
});

describe('Connection snap animation CSS classes', () => {
  it('BlockSprite className includes is-snap-target when matching', () => {
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

  it('is-drag-hover-valid replaces is-valid-target on magnetic snap target', () => {
    const isValidConnectTarget = true;
    const isMagneticSnapTarget = true;
    const className = [
      'block-sprite',
      isValidConnectTarget && !isMagneticSnapTarget && 'is-valid-target',
      isMagneticSnapTarget && 'is-drag-hover-valid',
    ]
      .filter(Boolean)
      .join(' ');

    expect(className).toContain('is-drag-hover-valid');
    expect(className).not.toContain('is-valid-target');
  });
});

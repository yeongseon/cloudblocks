import { describe, it, expect } from 'vitest';
import {
  INVALID_PACKET_COLOR,
  PACKET_LENGTH,
  PACKET_SPEED_HOVER_MS,
  PACKET_SPEED_IDLE_MS,
  PACKET_SPEED_INVALID_MS,
  PACKET_SPEED_SELECTED_MS,
  PACKET_WIDTH,
  PACKET_TAIL_LENGTH,
  PACKET_OPACITY,
  IDLE_CYCLE_MS,
  PACKET_SELECTED_SCALE,
  PACKET_SPEED_MS,
  SHORT_PATH_THRESHOLD,
  MEDIUM_PATH_THRESHOLD,
} from './packetFlowTokens';

describe('packetFlowTokens M46 tuning', () => {
  it('PACKET_LENGTH is 18', () => {
    expect(PACKET_LENGTH).toBe(18);
  });

  it('PACKET_WIDTH is 7', () => {
    expect(PACKET_WIDTH).toBe(7);
  });

  it('PACKET_TAIL_LENGTH is 20', () => {
    expect(PACKET_TAIL_LENGTH).toBe(20);
  });

  it('PACKET_OPACITY idle is 0', () => {
    expect(PACKET_OPACITY.idle).toBe(0);
  });

  it('PACKET_OPACITY hover is 0.72', () => {
    expect(PACKET_OPACITY.hover).toBe(0.72);
  });

  it('PACKET_OPACITY selected is 1.0', () => {
    expect(PACKET_OPACITY.selected).toBe(1.0);
  });

  it('PACKET_OPACITY creation is 1.0', () => {
    expect(PACKET_OPACITY.creation).toBe(1.0);
  });

  it('IDLE_CYCLE_MS aliases PACKET_SPEED_IDLE_MS', () => {
    expect(IDLE_CYCLE_MS).toBe(PACKET_SPEED_IDLE_MS);
  });

  it('PACKET_SELECTED_SCALE is 1.45', () => {
    expect(PACKET_SELECTED_SCALE).toBe(1.45);
  });

  it('PACKET_SPEED_MS is 2200', () => {
    expect(PACKET_SPEED_MS).toBe(2200);
  });

  it('PACKET_SPEED_IDLE_MS is 3200', () => {
    expect(PACKET_SPEED_IDLE_MS).toBe(3200);
  });

  it('PACKET_SPEED_HOVER_MS is 2400', () => {
    expect(PACKET_SPEED_HOVER_MS).toBe(2400);
  });

  it('PACKET_SPEED_SELECTED_MS is 1700', () => {
    expect(PACKET_SPEED_SELECTED_MS).toBe(1700);
  });

  it('PACKET_SPEED_INVALID_MS is 1400', () => {
    expect(PACKET_SPEED_INVALID_MS).toBe(1400);
  });

  it('INVALID_PACKET_COLOR is red semantic pair', () => {
    expect(INVALID_PACKET_COLOR).toEqual({ halo: '#DC2626', core: '#ef4444' });
  });

  it('SHORT_PATH_THRESHOLD is 80', () => {
    expect(SHORT_PATH_THRESHOLD).toBe(80);
  });

  it('MEDIUM_PATH_THRESHOLD is 180', () => {
    expect(MEDIUM_PATH_THRESHOLD).toBe(180);
  });
});

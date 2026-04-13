import { describe, it, expect } from 'vitest';
import {
  PACKET_LENGTH,
  PACKET_WIDTH,
  PACKET_TAIL_LENGTH,
  PACKET_OPACITY,
  IDLE_CYCLE_MS,
  PACKET_SELECTED_SCALE,
  PACKET_SPEED_MS,
  SHORT_PATH_THRESHOLD,
  MEDIUM_PATH_THRESHOLD,
} from './packetFlowTokens';

describe('packetFlowTokens M45 tuning', () => {
  it('PACKET_LENGTH is 16', () => {
    expect(PACKET_LENGTH).toBe(16);
  });

  it('PACKET_WIDTH is 6', () => {
    expect(PACKET_WIDTH).toBe(6);
  });

  it('PACKET_TAIL_LENGTH is 18', () => {
    expect(PACKET_TAIL_LENGTH).toBe(18);
  });

  it('PACKET_OPACITY idle is 0.56', () => {
    expect(PACKET_OPACITY.idle).toBe(0.56);
  });

  it('PACKET_OPACITY hover is 0.72', () => {
    expect(PACKET_OPACITY.hover).toBe(0.72);
  });

  it('PACKET_OPACITY selected is 0.95', () => {
    expect(PACKET_OPACITY.selected).toBe(0.95);
  });

  it('PACKET_OPACITY creation is 1.0', () => {
    expect(PACKET_OPACITY.creation).toBe(1.0);
  });

  it('IDLE_CYCLE_MS is 3200', () => {
    expect(IDLE_CYCLE_MS).toBe(3200);
  });

  it('PACKET_SELECTED_SCALE is 1.2', () => {
    expect(PACKET_SELECTED_SCALE).toBe(1.2);
  });

  it('PACKET_SPEED_MS is 2600', () => {
    expect(PACKET_SPEED_MS).toBe(2600);
  });

  it('SHORT_PATH_THRESHOLD is 80', () => {
    expect(SHORT_PATH_THRESHOLD).toBe(80);
  });

  it('MEDIUM_PATH_THRESHOLD is 180', () => {
    expect(MEDIUM_PATH_THRESHOLD).toBe(180);
  });
});

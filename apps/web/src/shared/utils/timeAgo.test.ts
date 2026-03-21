import { describe, it, expect } from 'vitest';
import { timeAgo } from './timeAgo';

describe('timeAgo', () => {
  it('returns "just now" for less than 60 seconds ago', () => {
    const now = new Date().toISOString();
    expect(timeAgo(now)).toBe('just now');
  });

  it('returns minutes ago for less than 1 hour', () => {
    const date = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(timeAgo(date)).toBe('5m ago');
  });

  it('returns hours ago for less than 1 day', () => {
    const date = new Date(Date.now() - 3 * 3600_000).toISOString();
    expect(timeAgo(date)).toBe('3h ago');
  });

  it('returns days ago for 1 day or more', () => {
    const date = new Date(Date.now() - 2 * 86400_000).toISOString();
    expect(timeAgo(date)).toBe('2d ago');
  });
});

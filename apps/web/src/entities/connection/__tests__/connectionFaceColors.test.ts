import { describe, it, expect } from 'vitest';
import {
  CONNECTION_SEMANTIC_BASE_COLORS,
  DEFAULT_CONNECTION_SEMANTIC,
  getConnectionBrickColors,
} from '../connectionFaceColors';
import type { ConnectionRenderSemantic } from '../connectionFaceColors';
import { deriveFaceColors } from '../../block/blockFaceColors';

const ALL_SEMANTICS: ConnectionRenderSemantic[] = ['http', 'event', 'data'];

describe('CONNECTION_SEMANTIC_BASE_COLORS', () => {
  it('covers all three render semantics', () => {
    expect(Object.keys(CONNECTION_SEMANTIC_BASE_COLORS).sort()).toEqual(['data', 'event', 'http']);
  });

  it('uses correct hex values per design spec', () => {
    expect(CONNECTION_SEMANTIC_BASE_COLORS.http).toBe('#6366F1');
    expect(CONNECTION_SEMANTIC_BASE_COLORS.event).toBe('#F43F5E');
    expect(CONNECTION_SEMANTIC_BASE_COLORS.data).toBe('#84CC16');
  });

  it.each([
    ['#0078D4'],
    ['#4285F4'],
    ['#D86613'],
    ['#FF8C00'],
    ['#E0301E'],
    ['#D6232C'],
    ['#EA4335'],
    ['#3F8624'],
    ['#34A853'],
    ['#F59E0B'],
    ['#FBBC05'],
    ['#693BC5'],
    ['#A166FF'],
    ['#14B8A6'],
    ['#32D4F5'],
    ['#59B4D9'],
    ['#CD2264'],
  ])('does not conflict with provider color %s', (providerHex) => {
    const semanticColors = Object.values(CONNECTION_SEMANTIC_BASE_COLORS);
    expect(semanticColors).not.toContain(providerHex);
  });
});

describe('getConnectionBrickColors', () => {
  it.each(ALL_SEMANTICS)('returns all required fields for "%s"', (semantic) => {
    const colors = getConnectionBrickColors(semantic);
    expect(colors).toHaveProperty('base');
    expect(colors).toHaveProperty('topFaceColor');
    expect(colors).toHaveProperty('topFaceStroke');
    expect(colors).toHaveProperty('leftSideColor');
    expect(colors).toHaveProperty('rightSideColor');
    expect(colors).toHaveProperty('studColors');
    expect(colors.studColors).toHaveProperty('main');
    expect(colors.studColors).toHaveProperty('shadow');
    expect(colors.studColors).toHaveProperty('highlight');
  });

  it.each(ALL_SEMANTICS)('base matches CONNECTION_SEMANTIC_BASE_COLORS for "%s"', (semantic) => {
    const colors = getConnectionBrickColors(semantic);
    expect(colors.base).toBe(CONNECTION_SEMANTIC_BASE_COLORS[semantic]);
  });

  it.each(ALL_SEMANTICS)('derivation matches deriveFaceColors() output for "%s"', (semantic) => {
    const colors = getConnectionBrickColors(semantic);
    const expected = deriveFaceColors(CONNECTION_SEMANTIC_BASE_COLORS[semantic]);
    expect(colors.topFaceColor).toBe(expected.top);
    expect(colors.topFaceStroke).toBe(expected.topStroke);
    expect(colors.leftSideColor).toBe(expected.left);
    expect(colors.rightSideColor).toBe(expected.right);
    expect(colors.studColors.main).toBe(expected.studMain);
    expect(colors.studColors.shadow).toBe(expected.studShadow);
    expect(colors.studColors.highlight).toBe(expected.studHighlight);
  });

  it('returns distinct color sets per semantic', () => {
    const httpColors = getConnectionBrickColors('http');
    const eventColors = getConnectionBrickColors('event');
    const dataColors = getConnectionBrickColors('data');

    expect(httpColors.topFaceColor).not.toBe(eventColors.topFaceColor);
    expect(httpColors.topFaceColor).not.toBe(dataColors.topFaceColor);
    expect(eventColors.topFaceColor).not.toBe(dataColors.topFaceColor);
  });
});

describe('DEFAULT_CONNECTION_SEMANTIC', () => {
  it('is http', () => {
    expect(DEFAULT_CONNECTION_SEMANTIC).toBe('http');
  });
});

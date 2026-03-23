import { memo } from 'react';
import type { StudColorSpec } from '../types/index';
import {
  STUD_HEIGHT,
  STUD_INNER_OPACITY,
  STUD_INNER_RX,
  STUD_INNER_RY,
  STUD_RX,
  STUD_RY,
} from '../tokens/designTokens';

interface StudDefsProps {
  studId: string;
  studColors: StudColorSpec;
}

/**
 * SVG `<defs>` block defining the Universal Stud symbol.
 * Place inside an `<svg>` element before any `<use>` references.
 *
 * Universal Stud Standard (INVIOLABLE):
 * - rx=12, ry=6 (outer ellipse)
 * - height=5 (shadow offset cy=5)
 * - inner ring: rx=7.2, ry=3.6, opacity=0.3
 * - 3-layer structure: shadow + main + highlight ring
 */
export const StudDefs = memo(function StudDefs({ studId, studColors }: StudDefsProps) {
  return (
    <defs>
      <g id={studId}>
        <ellipse cx="0" cy={STUD_HEIGHT} rx={STUD_RX} ry={STUD_RY} fill={studColors.shadow} />
        <ellipse cx="0" cy="0" rx={STUD_RX} ry={STUD_RY} fill={studColors.main} />
        <ellipse
          cx="0"
          cy="0"
          rx={STUD_INNER_RX}
          ry={STUD_INNER_RY}
          fill={studColors.highlight}
          opacity={STUD_INNER_OPACITY}
        />
      </g>
    </defs>
  );
});

interface StudGridProps {
  studId: string;
  studs: ReadonlyArray<{ x: number; y: number; key: string }>;
}

/**
 * Renders `<use>` instances of the stud symbol at given positions.
 * Must be used inside the same `<svg>` that contains the matching `<StudDefs>`.
 */
export const StudGrid = memo(function StudGrid({ studId, studs }: StudGridProps) {
  return (
    <>
      {studs.map((stud) => (
        <use key={stud.key} href={`#${studId}`} x={stud.x} y={stud.y} />
      ))}
    </>
  );
});

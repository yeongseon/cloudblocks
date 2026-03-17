import { memo } from 'react';
import type { StudColorSpec } from '../types/index';

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
        <ellipse cx="0" cy="5" rx="12" ry="6" fill={studColors.shadow} />
        <ellipse cx="0" cy="0" rx="12" ry="6" fill={studColors.main} />
        <ellipse cx="0" cy="0" rx="7.2" ry="3.6" fill={studColors.highlight} opacity="0.3" />
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

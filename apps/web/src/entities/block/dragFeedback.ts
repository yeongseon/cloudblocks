import type { ResourceBlock } from '@cloudblocks/schema';

import { getBlockDimensions } from '../../shared/types/visualProfile';

interface BlockRect {
  cx: number;
  cz: number;
  halfW: number;
  halfD: number;
}

type SiblingBlock = Pick<ResourceBlock, 'id' | 'category' | 'provider' | 'subtype'> & {
  position: { x: number; z: number };
};

function toRect(
  position: { x: number; z: number },
  size: { width: number; depth: number },
): BlockRect {
  return {
    cx: position.x,
    cz: position.z,
    halfW: size.width / 2,
    halfD: size.depth / 2,
  };
}

function getAabbGap(a: BlockRect, b: BlockRect): { gap: number; overlap: boolean } {
  const gapX = Math.abs(a.cx - b.cx) - (a.halfW + b.halfW);
  const gapZ = Math.abs(a.cz - b.cz) - (a.halfD + b.halfD);

  const overlap = gapX < 0 && gapZ < 0;
  if (overlap) {
    return { gap: Math.max(gapX, gapZ), overlap: true };
  }

  const separationX = Math.max(0, gapX);
  const separationZ = Math.max(0, gapZ);
  return {
    gap: Math.hypot(separationX, separationZ),
    overlap: false,
  };
}

export function getSiblingProximity(
  blockId: string,
  position: { x: number; z: number },
  blockSize: { width: number; depth: number },
  siblings: ReadonlyArray<SiblingBlock>,
): { nearestGap: number; wouldOverlap: boolean } {
  const selfRect = toRect(position, blockSize);

  let nearestGap = Number.POSITIVE_INFINITY;
  let wouldOverlap = false;

  for (const sibling of siblings) {
    if (sibling.id === blockId) continue;

    const siblingSize = getBlockDimensions(sibling.category, sibling.provider, sibling.subtype);
    const siblingRect = toRect(sibling.position, {
      width: siblingSize.width,
      depth: siblingSize.depth,
    });

    const { gap, overlap } = getAabbGap(selfRect, siblingRect);
    if (gap < nearestGap) {
      nearestGap = gap;
    }
    if (overlap) {
      wouldOverlap = true;
    }
  }

  return { nearestGap, wouldOverlap };
}

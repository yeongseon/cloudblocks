import type { ResourceBlock } from '@cloudblocks/schema';

import { getBlockDimensions } from '../../shared/types/visualProfile';

interface BlockRect {
  x: number;
  z: number;
  width: number;
  depth: number;
}

type SiblingBlock = Pick<ResourceBlock, 'id' | 'category' | 'provider' | 'subtype'> & {
  position: { x: number; z: number };
};

function toRect(
  position: { x: number; z: number },
  size: { width: number; depth: number },
): BlockRect {
  return {
    x: position.x,
    z: position.z,
    width: size.width,
    depth: size.depth,
  };
}

function getAabbGap(a: BlockRect, b: BlockRect): { gap: number; overlap: boolean } {
  const gapX = Math.max(a.x - (b.x + b.width), b.x - (a.x + a.width));
  const gapZ = Math.max(a.z - (b.z + b.depth), b.z - (a.z + a.depth));

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
  _threshold: number,
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

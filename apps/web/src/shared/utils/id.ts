import { v4 as uuidv4 } from 'uuid';

type EntityType = 'container' | 'block' | 'conn' | 'ext' | 'arch' | 'ws';

/**
 * Generate a unique ID following the convention: {type}-{uuid}
 * Examples: container-a1b2c3d4, block-e5f6g7h8, conn-i9j0k1l2
 */
export function generateId(type: EntityType): string {
  const uuid = uuidv4().replace(/-/g, '').slice(0, 8);
  return `${type}-${uuid}`;
}

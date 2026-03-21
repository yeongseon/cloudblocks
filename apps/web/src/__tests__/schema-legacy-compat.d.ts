import type { Block, Plate } from '@cloudblocks/schema';

declare module '@cloudblocks/schema' {
  interface ArchitectureModel {
    plates?: Plate[];
    blocks?: Block[];
  }

  interface ContainerNode {
    type?: ContainerNode['layer'];
    children?: string[];
  }

  interface LeafNode {
    placementId?: string;
  }
}

export {};

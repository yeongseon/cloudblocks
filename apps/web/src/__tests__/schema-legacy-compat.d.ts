declare module '@cloudblocks/schema' {
  interface ArchitectureModel {
    plates?: ContainerNode[];
    blocks?: LeafNode[];
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

declare module '@cloudblocks/schema' {
  interface ArchitectureModel {
    plates?: ContainerBlock[];
    blocks?: ResourceBlock[];
  }

  interface ContainerBlock {
    type?: ContainerBlock['layer'];
    children?: string[];
  }

  interface ResourceBlock {
    placementId?: string;
  }
}

export {};

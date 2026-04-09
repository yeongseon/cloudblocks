import { useArchitectureStore } from './architectureStore';
import { useUIStore } from './uiStore';

export function syncWorkspaceUI(options?: { fitToContent?: boolean }): void {
  const uiState = useUIStore.getState();
  const provider = useArchitectureStore.getState().workspace.provider ?? 'azure';
  uiState.clearDiffState();
  uiState.setActiveProvider(provider);
  if (options?.fitToContent) {
    uiState.requestFitToContent();
  }
}

export function clearWorkspaceDiffUI(): void {
  useUIStore.getState().clearDiffState();
}

import { useMemo } from 'react';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import type { HelperMessage } from './helperMessages';
import { HINT_EMPTY_CANVAS, HINT_FIRST_BLOCK, SUCCESS_VALID } from './helperMessages';

export function useHelperTrigger(): HelperMessage | null {
  const complexityLevel = useUIStore((s) => s.complexityLevel);
  const nodes = useArchitectureStore((s) => s.workspace.architecture.nodes);
  const connections = useArchitectureStore((s) => s.workspace.architecture.connections);
  const validationResult = useArchitectureStore((s) => s.validationResult);

  return useMemo(() => {
    if (complexityLevel !== 'beginner') return null;

    const hasNodes = nodes.length > 0;
    const hasConnections = connections.length > 0;

    if (validationResult && !validationResult.valid && validationResult.errors.length > 0) {
      const first = validationResult.errors[0];
      return {
        key: `error-${first.ruleId}-${first.targetId}`,
        type: 'error',
        text: first.message,
        targetId: first.targetId,
      };
    }

    if (!hasNodes) {
      return HINT_EMPTY_CANVAS;
    }

    if (hasNodes && !hasConnections) {
      return HINT_FIRST_BLOCK;
    }

    if (validationResult?.valid) {
      return SUCCESS_VALID;
    }

    return null;
  }, [complexityLevel, nodes, connections, validationResult]);
}

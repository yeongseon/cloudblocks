import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FigureHelper } from './FigureHelper';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import type { ValidationResult } from '@cloudblocks/domain';
import type { ContainerNode, LeafNode, Connection } from '@cloudblocks/schema';

const NOW = '2026-01-01T00:00:00.000Z';

function makeWorkspace(
  overrides: {
    nodes?: (ContainerNode | LeafNode)[];
    connections?: Connection[];
  } = {},
) {
  return {
    id: 'ws-test',
    name: 'Test',
    architecture: {
      id: 'arch-test',
      name: 'Test',
      version: '2' as const,
      nodes: overrides.nodes ?? [],
      connections: overrides.connections ?? [],
      endpoints: [],
      externalActors: [],
      createdAt: NOW,
      updatedAt: NOW,
    },
    createdAt: NOW,
    updatedAt: NOW,
  };
}

const SAMPLE_NODE: LeafNode = {
  id: 'block-1',
  kind: 'resource',
  resourceType: 'web_compute',
  name: 'VM-1',
  parentId: null,
  position: { x: 0, y: 0, z: 0 },
  provider: 'azure',
  layer: 'resource',
  category: 'compute',
  metadata: {},
};

const SAMPLE_CONNECTION: Connection = {
  id: 'conn-1',
  from: 'endpoint-block-1-output-data',
  to: 'endpoint-block-2-input-data',
  metadata: {},
};

function resetStores() {
  useUIStore.setState({ complexityLevel: 'beginner' });
  useArchitectureStore.setState({
    workspace: makeWorkspace(),
    validationResult: null,
  });
}

describe('FigureHelper', () => {
  beforeEach(() => {
    resetStores();
  });

  it('renders nothing when complexityLevel is not beginner', () => {
    useUIStore.setState({ complexityLevel: 'standard' });
    const { container } = render(<FigureHelper />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when complexityLevel is advanced', () => {
    useUIStore.setState({ complexityLevel: 'advanced' });
    const { container } = render(<FigureHelper />);
    expect(container.innerHTML).toBe('');
  });

  it('shows empty canvas hint when no nodes exist', () => {
    render(<FigureHelper />);
    expect(screen.getByTestId('figure-helper')).toBeInTheDocument();
    expect(
      screen.getByText('Add a block to start building your architecture.'),
    ).toBeInTheDocument();
  });

  it('shows first-block hint when nodes exist but no connections', () => {
    useArchitectureStore.setState({
      workspace: makeWorkspace({ nodes: [SAMPLE_NODE] }),
    });
    render(<FigureHelper />);
    expect(
      screen.getByText('Nice! Now connect blocks to define relationships.'),
    ).toBeInTheDocument();
  });

  it('shows validation error with Go to button', () => {
    const result: ValidationResult = {
      valid: false,
      errors: [
        {
          ruleId: 'placement-001',
          severity: 'error',
          message: 'Gateway must be on public subnet',
          targetId: 'block-1',
        },
      ],
      warnings: [],
    };
    useArchitectureStore.setState({
      workspace: makeWorkspace({ nodes: [SAMPLE_NODE] }),
      validationResult: result,
    });
    render(<FigureHelper />);
    expect(screen.getByText('Gateway must be on public subnet')).toBeInTheDocument();
    expect(screen.getByTestId('figure-helper-goto')).toBeInTheDocument();
  });

  it('Go to button calls setSelectedId with targetId', () => {
    const result: ValidationResult = {
      valid: false,
      errors: [
        {
          ruleId: 'placement-001',
          severity: 'error',
          message: 'Error msg',
          targetId: 'block-1',
        },
      ],
      warnings: [],
    };
    useArchitectureStore.setState({
      workspace: makeWorkspace({ nodes: [SAMPLE_NODE] }),
      validationResult: result,
    });
    render(<FigureHelper />);
    fireEvent.click(screen.getByTestId('figure-helper-goto'));
    expect(useUIStore.getState().selectedId).toBe('block-1');
  });

  it('shows success message when architecture is valid', () => {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };
    useArchitectureStore.setState({
      workspace: makeWorkspace({
        nodes: [SAMPLE_NODE],
        connections: [SAMPLE_CONNECTION],
      }),
      validationResult: result,
    });
    render(<FigureHelper />);
    expect(screen.getByText(/Everything looks good/)).toBeInTheDocument();
  });

  it('dismiss button hides the bubble', () => {
    render(<FigureHelper />);
    expect(screen.getByTestId('figure-helper-bubble')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('figure-helper-dismiss'));
    expect(screen.queryByTestId('figure-helper-bubble')).not.toBeInTheDocument();
  });

  it('toggle button re-opens bubble after dismiss (different message key)', () => {
    render(<FigureHelper />);
    fireEvent.click(screen.getByTestId('figure-helper-dismiss'));
    expect(screen.queryByTestId('figure-helper-bubble')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('figure-helper-toggle'));
    expect(screen.queryByTestId('figure-helper-bubble')).not.toBeInTheDocument();
  });

  it('error messages do not show Go to when no targetId', () => {
    const result: ValidationResult = {
      valid: false,
      errors: [
        {
          ruleId: 'general-001',
          severity: 'error',
          message: 'Some general error',
          targetId: '',
        },
      ],
      warnings: [],
    };
    useArchitectureStore.setState({
      workspace: makeWorkspace({ nodes: [SAMPLE_NODE] }),
      validationResult: result,
    });
    render(<FigureHelper />);
    expect(screen.getByText('Some general error')).toBeInTheDocument();
  });

  it('error takes priority over hint', () => {
    const result: ValidationResult = {
      valid: false,
      errors: [
        {
          ruleId: 'placement-001',
          severity: 'error',
          message: 'Validation error',
          targetId: 'block-1',
        },
      ],
      warnings: [],
    };
    useArchitectureStore.setState({
      workspace: makeWorkspace({ nodes: [SAMPLE_NODE] }),
      validationResult: result,
    });
    render(<FigureHelper />);
    expect(screen.getByText('Validation error')).toBeInTheDocument();
    expect(screen.queryByText(/connect blocks/)).not.toBeInTheDocument();
  });

  it('hint messages do not show Go to button', () => {
    render(<FigureHelper />);
    expect(screen.queryByTestId('figure-helper-goto')).not.toBeInTheDocument();
  });

  it('toggle button is always visible when message exists', () => {
    render(<FigureHelper />);
    expect(screen.getByTestId('figure-helper-toggle')).toBeInTheDocument();
  });
});

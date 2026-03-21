import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConnectionPreview } from './ConnectionPreview';
import { useUIStore } from '../../entities/store/uiStore';
import { useArchitectureStore } from '../../entities/store/architectureStore';

vi.mock('../../entities/store/uiStore');
vi.mock('../../entities/store/architectureStore');

function setupMocks(interactionState: 'idle' | 'connecting', connectionSource: string | null) {
  vi.mocked(useUIStore).mockImplementation(((selector: unknown) => {
    const state = {
      interactionState,
      connectionSource,
    };
    return (selector as (s: typeof state) => unknown)(state);
  }) as typeof useUIStore);

  vi.mocked(useArchitectureStore).mockImplementation(((selector: unknown) => {
    const state = {
      workspace: {
        architecture: {
          nodes: [
            {
              id: 'plate-1',
              name: 'VNet',
              kind: 'container' as const,
              layer: 'region' as const,
              resourceType: 'virtual_network' as const,
              category: 'network' as const,
              provider: 'azure' as const,
              parentId: null,
              position: { x: 0, y: 0, z: 0 },
              size: { width: 16, height: 0.3, depth: 20 },
              metadata: {},
            },
            {
              id: 'block-1',
              name: 'VM',
              kind: 'resource' as const,
              layer: 'resource' as const,
              resourceType: 'web_compute',
              category: 'compute' as const,
              provider: 'azure' as const,
              parentId: 'plate-1',
              position: { x: 3, y: 0, z: 6 },
              metadata: {},
            },
          ],
          externalActors: [
            {
              id: 'actor-1',
              name: 'Internet',
              type: 'internet' as const,
              position: { x: -3, y: 0, z: 5 },
            },
          ],
        },
      },
    };
    return (selector as (s: typeof state) => unknown)(state);
  }) as typeof useArchitectureStore);
}

describe('ConnectionPreview', () => {
  it('renders nothing when interactionState is idle', () => {
    setupMocks('idle', 'block-1');

    const { container } = render(
      <svg>
        <title>Connection preview test canvas</title>
        <ConnectionPreview originX={0} originY={0} />
      </svg>
    );

    expect(container.querySelector('[data-testid="connection-preview-path"]')).toBeNull();
  });

  it('renders nothing when connecting and connectionSource is null', () => {
    setupMocks('connecting', null);

    const { container } = render(
      <svg>
        <title>Connection preview test canvas</title>
        <ConnectionPreview originX={0} originY={0} />
      </svg>
    );

    expect(container.querySelector('[data-testid="connection-preview-path"]')).toBeNull();
  });

  it('renders an SVG path when connecting with a source block', async () => {
    setupMocks('connecting', 'block-1');

    render(
      <svg>
        <title>Connection preview test canvas</title>
        <ConnectionPreview originX={0} originY={0} />
      </svg>
    );

    expect(await screen.findByTestId('connection-preview-path')).toBeInTheDocument();
  });

  it('renders an SVG path when connecting with a source external actor', async () => {
    setupMocks('connecting', 'actor-1');

    render(
      <svg>
        <title>Connection preview test canvas</title>
        <ConnectionPreview originX={0} originY={0} />
      </svg>
    );

    expect(await screen.findByTestId('connection-preview-path')).toBeInTheDocument();
  });

  it('renders preview after idle to connecting transition', async () => {
    setupMocks('idle', 'block-1');
    const { container, rerender } = render(
      <svg>
        <title>Connection preview test canvas</title>
        <ConnectionPreview originX={0} originY={0} />
      </svg>
    );

    expect(container.querySelector('[data-testid="connection-preview-path"]')).toBeNull();

    setupMocks('connecting', 'block-1');
    rerender(
      <svg>
        <title>Connection preview test canvas</title>
        <ConnectionPreview originX={0} originY={0} />
      </svg>
    );

    expect(await screen.findByTestId('connection-preview-path')).toBeInTheDocument();
  });

  it('does not render preview after connecting to idle transition', async () => {
    setupMocks('connecting', 'block-1');
    const { container, rerender } = render(
      <svg>
        <title>Connection preview test canvas</title>
        <ConnectionPreview originX={0} originY={0} />
      </svg>
    );

    expect(await screen.findByTestId('connection-preview-path')).toBeInTheDocument();

    setupMocks('idle', 'block-1');
    rerender(
      <svg>
        <title>Connection preview test canvas</title>
        <ConnectionPreview originX={0} originY={0} />
      </svg>
    );

    expect(container.querySelector('[data-testid="connection-preview-path"]')).toBeNull();
  });
});

import { memo, useEffect, useRef } from 'react';
import interact from 'interactjs';
import { toast } from 'react-hot-toast';
import type { ContainerNode, LeafNode, ProviderType, ResourceCategory } from '@cloudblocks/schema';
import { parseEndpointId } from '@cloudblocks/schema';
import { useUIStore } from '../store/uiStore';
import { useArchitectureStore } from '../store/architectureStore';
import { getDiffState } from '../../features/diff/engine';
import type { DiffDelta } from '../../shared/types/diff';
import { screenDeltaToWorld, snapToGrid } from '../../shared/utils/isometric';
import { audioService } from '../../shared/utils/audioService';
import { canConnect } from '../validation/connection';
import { validatePlacement } from '../validation/placement';
import { getBlockDimensions } from '../../shared/types/visualProfile';
import { cuToSilhouetteDimensions } from './silhouettes';
import { BLOCK_PADDING } from '../../shared/tokens/designTokens';
import { BlockSvg } from './BlockSvg';
import './BlockSprite.css';

/** Derive screen size for the block clickable area from CU dimensions. */
function getBlockScreenSize(
  category: ResourceCategory,
  provider?: ProviderType,
  subtype?: string,
): { width: number; height: number } {
  const cu = getBlockDimensions(category, provider, subtype);
  const dims = cuToSilhouetteDimensions(cu);
  return {
    width: dims.screenWidth,
    height: dims.diamondHeight + dims.sideWallPx + BLOCK_PADDING,
  };
}

const PROVIDER_BADGES = {
  azure: { label: 'AZ', color: '#0078D4' },
  aws: { label: 'AWS', color: '#FF9900' },
  gcp: { label: 'GCP', color: '#4285F4' },
} as const;

interface BlockSpriteProps {
  block: LeafNode;
  parentPlate: ContainerNode;
  screenX: number;
  screenY: number;
  zIndex: number;
}

export const BlockSprite = memo(function BlockSprite({
  block,
  parentPlate,
  screenX,
  screenY,
  zIndex,
}: BlockSpriteProps) {
  const selectedId = useUIStore((s) => s.selectedId);
  const setSelectedId = useUIStore((s) => s.setSelectedId);
  const toolMode = useUIStore((s) => s.toolMode);
  const connectionSource = useUIStore((s) => s.connectionSource);
  const startConnecting = useUIStore((s) => s.startConnecting);
  const completeInteraction = useUIStore((s) => s.completeInteraction);
  const addConnection = useArchitectureStore((s) => s.addConnection);
  const removeNode = useArchitectureStore((s) => s.removeNode);
  const moveNodePosition = useArchitectureStore((s) => s.moveNodePosition);
  const nodes = useArchitectureStore((s) => s.workspace.architecture.nodes);
  const blocks = nodes.filter((node): node is LeafNode => node.kind === 'resource');
  const externalActors = useArchitectureStore((s) => s.workspace.architecture.externalActors) ?? [];
  const connections = useArchitectureStore((s) => s.workspace.architecture.connections);
  const endpointsList = useArchitectureStore((s) => s.workspace.architecture.endpoints);
  const diffMode = useUIStore((s) => s.diffMode);
  const diffDelta: DiffDelta | null = useUIStore((s) => s.diffDelta);
  const blockRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragZoomRef = useRef(1);

  const isSelected = selectedId === block.id;
  const isConnectionSource = connectionSource === block.id;
  const isDeleteMode = toolMode === 'delete';

  // Connect-mode visual states
  const isConnectMode = toolMode === 'connect';
  const sourceBlock = isConnectMode && connectionSource
    ? blocks.find((b) => b.id === connectionSource)
    : null;
  const sourceActor = isConnectMode && connectionSource
    ? externalActors.find((actor) => actor.id === connectionSource)
    : null;
  const sourceType = sourceBlock?.category ?? sourceActor?.type ?? null;
  const isValidConnectTarget = sourceType !== null
    && block.id !== connectionSource
    && canConnect(sourceType, block.category);
  const isInvalidConnectTarget = isConnectMode && connectionSource !== null
    && block.id !== connectionSource
    && !isValidConnectTarget;
  const isAlreadyConnected = connections.some((c) => {
    const fromEp = endpointsList.find((ep) => ep.id === c.from);
    const toEp = endpointsList.find((ep) => ep.id === c.to);
    const fromNodeId = fromEp?.nodeId ?? parseEndpointId(c.from)?.nodeId;
    const toNodeId = toEp?.nodeId ?? parseEndpointId(c.to)?.nodeId;
    return fromNodeId === block.id || toNodeId === block.id;
  });

  const hasValidationWarning = validatePlacement(block, parentPlate) !== null;
  const diffState = diffMode && diffDelta ? getDiffState(block.id, diffDelta) : 'unchanged';
  const upgradingBlockId = useUIStore((s) => s.upgradingBlockId);
  const isUpgrading = upgradingBlockId === block.id;

  useEffect(() => {
    const el = blockRef.current;
    if (toolMode === 'delete' || toolMode === 'connect' || !el) {
      return;
    }

    const interactable = interact(el).draggable({
      listeners: {
        start(event) {
          isDragging.current = false;

          dragZoomRef.current = 1;
          const sceneWorld = event.target.closest('.scene-world') as HTMLElement | null;
          if (sceneWorld) {
            const transform = sceneWorld.style.transform;
            const scaleMatch = transform.match(/scale\(([\d.]+)\)/);
            if (scaleMatch?.[1]) {
              const parsedZoom = Number.parseFloat(scaleMatch[1]);
              if (Number.isFinite(parsedZoom) && parsedZoom > 0) {
                dragZoomRef.current = parsedZoom;
              }
            }
          }
        },
        move(event) {
          isDragging.current = true;

          const imgEl = blockRef.current?.querySelector('.block-img') as HTMLElement | null;
          if (imgEl) imgEl.classList.add('is-dragging');

          const dxScreen = event.dx / dragZoomRef.current;
          const dyScreen = event.dy / dragZoomRef.current;
          const { dWorldX, dWorldZ } = screenDeltaToWorld(dxScreen, dyScreen);

          moveNodePosition(block.id, dWorldX, dWorldZ);
        },
        end() {
          const imgEl = blockRef.current?.querySelector('.block-img') as HTMLElement | null;
          if (imgEl) imgEl.classList.remove('is-dragging');

          if (isDragging.current) {
            const droppingEl = blockRef.current?.querySelector('.block-img') as HTMLElement | null;
            if (droppingEl) {
              droppingEl.classList.add('is-dropping');
              const handleAnimEnd = () => {
                droppingEl.classList.remove('is-dropping');
                droppingEl.removeEventListener('animationend', handleAnimEnd);
              };
              droppingEl.addEventListener('animationend', handleAnimEnd);
            }
          }

          if (isDragging.current) {
            const currentBlock = useArchitectureStore
              .getState()
              .workspace
              .architecture
              .nodes
              .filter((node): node is LeafNode => node.kind === 'resource')
              .find((candidate) => candidate.id === block.id);

            if (currentBlock) {
              const snappedPosition = snapToGrid(currentBlock.position.x, currentBlock.position.z);
              const deltaX = snappedPosition.x - currentBlock.position.x;
              const deltaZ = snappedPosition.z - currentBlock.position.z;

              if (deltaX !== 0 || deltaZ !== 0) {
                moveNodePosition(block.id, deltaX, deltaZ);

                const { isSoundMuted } = useUIStore.getState();
                if (!isSoundMuted) {
                  audioService.playSound('block-snap');
                }
              }
            }
          }

          if (dragResetTimerRef.current) {
            clearTimeout(dragResetTimerRef.current);
          }
          dragResetTimerRef.current = setTimeout(() => {
            isDragging.current = false;
          }, 50);
        },
      },
      autoScroll: false,
    });

    return () => {
      if (dragResetTimerRef.current) {
        clearTimeout(dragResetTimerRef.current);
      }
      el.querySelector('.block-img')?.classList.remove('is-dragging');
      el.querySelector('.block-img')?.classList.remove('is-dropping');
      interactable.unset();
    };
  }, [block.id, moveNodePosition, toolMode]);

  const handleClick = (e: React.MouseEvent) => {
    if (diffMode && diffState === 'removed') return;
    if (isDragging.current) {
      return;
    }
    e.stopPropagation();

    if (toolMode === 'delete') {
      removeNode(block.id);
      return;
    }

    if (toolMode === 'connect') {
      if (!connectionSource) {
        startConnecting(block.id);
      } else if (connectionSource !== block.id) {
        const success = addConnection(connectionSource, block.id);
        if (!success) {
          toast.error('Invalid connection: check allowed connection rules');
        }
        completeInteraction();
      }
      return;
    }

    setSelectedId(block.id);
  };

  const blockSize = getBlockScreenSize(block.category, block.provider, block.subtype);

  const className = [
    'block-sprite',
    isSelected && 'is-selected',
    isConnectionSource && 'is-connection-source',
    isDeleteMode && 'is-delete-mode',
    isValidConnectTarget && 'is-valid-target',
    isInvalidConnectTarget && 'is-invalid-target',
    isAlreadyConnected && isConnectMode && 'is-connected',
    hasValidationWarning && !isSelected && !isConnectMode && !isDeleteMode && 'is-warning',
    diffState === 'added' && 'diff-added',
    diffState === 'modified' && 'diff-modified',
    diffState === 'removed' && 'diff-removed',
    isUpgrading && 'is-upgrading',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={blockRef}
      className={className}
      style={{
        left: `${screenX}px`,
        top: `${screenY}px`,
        zIndex,
        '--build-progress': 1,
      } as React.CSSProperties}
    >
      <button
        type="button"
        onClick={handleClick}
        className="block-button"
        style={{
          width: `${blockSize.width}px`,
          height: `${blockSize.height}px`,
          left: `-${blockSize.width / 2}px`,
          top: `-${blockSize.height / 2}px`,
        }}
        aria-label={`Node: ${block.name}`}
      >
        <div className="block-img" draggable={false}>
          <BlockSvg category={block.category} provider={block.provider} subtype={block.subtype} name={block.name} aggregationCount={block.aggregation?.count} roles={block.roles} showStubs={isConnectMode} />
        </div>
        {block.provider && (
          <span
            className="block-provider-badge"
            style={{ borderColor: PROVIDER_BADGES[block.provider].color, color: PROVIDER_BADGES[block.provider].color }}
            title={`Provider: ${block.provider.toUpperCase()}`}
          >
            {PROVIDER_BADGES[block.provider].label}
          </span>
        )}
      </button>
    </div>
  );
});

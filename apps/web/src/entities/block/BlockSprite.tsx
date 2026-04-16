import { memo, useEffect, useRef } from 'react';
import interact from 'interactjs';
import { useShallow } from 'zustand/react/shallow';

import type {
  ContainerBlock,
  ProviderType,
  ResourceBlock,
  ResourceCategory,
} from '@cloudblocks/schema';
import {
  generateEndpointsForBlock,
  isExternalResourceType,
  CATEGORY_PORTS,
} from '@cloudblocks/schema';
import { useUIStore } from '../store/uiStore';
import { useArchitectureStore } from '../store/architectureStore';
import type { DiffDelta } from '../../shared/types/diff';
import { getDiffState } from '../../shared/utils/diff';
import { screenDeltaToWorld, snapToGrid } from '../../shared/utils/isometric';
import { audioService } from '../../shared/utils/audioService';
import { canConnect } from '../validation/connection';
import type { EndpointType } from '../../shared/types/endpoint';
import { validatePlacement } from '../validation/placement';
import { getBlockDimensions } from '../../shared/types/visualProfile';
import { cuToSilhouetteDimensions } from './silhouettes';
import { BLOCK_PADDING } from '../../shared/tokens/designTokens';
import { BlockSvg, type OccupiedPorts } from './BlockSvg';
import { useReducedMotion } from '../../shared/hooks/useReducedMotion';
import { criticallyDampedSpring } from '../../shared/utils/springMath';
import './BlockSprite.css';
import { resolveBlockPresentation } from '../../shared/presentation/blockPresentation';
import { semanticToPortIndex } from '../connection/endpointAnchors';

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

interface BlockSpriteProps {
  blockId?: string;
  block?: ResourceBlock;
  parentContainerId?: string | null;
  parentContainer?: ContainerBlock;
  screenX: number;
  screenY: number;
  zIndex: number;
  /** Override move handler for root external blocks (bridge action). */
  onMove?: (id: string, deltaX: number, deltaZ: number) => void;
}

export const BlockSprite = memo(function BlockSprite({
  blockId,
  block,
  parentContainerId,
  parentContainer,
  screenX,
  screenY,
  zIndex,
  onMove,
}: BlockSpriteProps) {
  const resolvedBlockId = blockId ?? block?.id ?? null;
  const storeBlock = useArchitectureStore((state) => {
    if (!resolvedBlockId) return null;
    const node = state.nodeById.get(resolvedBlockId);
    return node?.kind === 'resource' ? node : null;
  });
  const resolvedBlock = storeBlock ?? block ?? null;
  const resolvedParentContainerId =
    parentContainerId ?? resolvedBlock?.parentId ?? parentContainer?.id ?? null;
  const storeParentContainer = useArchitectureStore((state) => {
    if (!resolvedParentContainerId) return null;
    const node = state.nodeById.get(resolvedParentContainerId);
    return node?.kind === 'container' ? node : null;
  });
  const resolvedParentContainer = storeParentContainer ?? parentContainer ?? undefined;

  const isSelected = useUIStore((s) =>
    resolvedBlockId ? s.selectedIds.has(resolvedBlockId) : false,
  );
  const setSelectedId = useUIStore((s) => s.setSelectedId);
  const toggleSelection = useUIStore((s) => s.toggleSelection);
  const toolMode = useUIStore((s) => s.toolMode);
  const connectionSource = useUIStore((s) => s.connectionSource);
  const isConnectionSource = useUIStore((s) => s.connectionSource === resolvedBlockId);
  const startConnecting = useUIStore((s) => s.startConnecting);
  const completeInteraction = useUIStore((s) => s.completeInteraction);
  const addConnection = useArchitectureStore((s) => s.addConnection);
  const removeNode = useArchitectureStore((s) => s.removeNode);
  const moveNodePosition = useArchitectureStore((s) => s.moveNodePosition);
  const sourceNode = useArchitectureStore((state) => {
    if (!connectionSource) return null;
    const node = state.nodeById.get(connectionSource);
    return node?.kind === 'resource' ? node : null;
  });
  const relevantConnectionIds = useArchitectureStore(
    useShallow((state) => {
      if (!resolvedBlockId) return [] as string[];
      const relevantConnectionIds = new Set<string>();
      for (const endpoint of generateEndpointsForBlock(resolvedBlockId)) {
        for (const connection of state.connectionsByEndpoint.get(endpoint.id) ?? []) {
          relevantConnectionIds.add(connection.id);
        }
      }
      return [...relevantConnectionIds];
    }),
  );
  // Encode occupied ports as a flat sorted array: [inboundCount, ...inbound, ...outbound]
  // so useShallow can do element-wise comparison on a single array.
  const occupiedPortKey = useArchitectureStore(
    useShallow((state) => {
      if (!resolvedBlockId) return undefined;
      const block = state.nodeById.get(resolvedBlockId);
      if (!block || block.kind !== 'resource') return undefined;
      const ports = CATEGORY_PORTS[block.category];
      if (!ports) return undefined;
      const inbound: number[] = [];
      const outbound: number[] = [];
      for (const endpoint of generateEndpointsForBlock(resolvedBlockId)) {
        const connections = state.connectionsByEndpoint.get(endpoint.id);
        if (connections && connections.length > 0) {
          const side = endpoint.direction === 'output' ? 'outbound' : 'inbound';
          const total = side === 'inbound' ? ports.inbound : ports.outbound;
          const portIndex = semanticToPortIndex(endpoint.semantic, total);
          if (portIndex !== null) {
            if (side === 'inbound') inbound.push(portIndex);
            else outbound.push(portIndex);
          }
        }
      }
      if (inbound.length === 0 && outbound.length === 0) return undefined;
      inbound.sort();
      outbound.sort();
      // Flat array: [inboundCount, ...inboundPorts, ...outboundPorts]
      return [inbound.length, ...inbound, ...outbound];
    }),
  );
  const occupiedPorts: OccupiedPorts | undefined = occupiedPortKey
    ? {
        inbound: new Set(occupiedPortKey.slice(1, 1 + occupiedPortKey[0])),
        outbound: new Set(occupiedPortKey.slice(1 + occupiedPortKey[0])),
      }
    : undefined;

  const activeProvider = useUIStore((s) => s.activeProvider);
  const diffMode = useUIStore((s) => s.diffMode);
  const diffDelta: DiffDelta | null = useUIStore((s) => s.diffDelta);
  const blockRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapAnimationFrameRef = useRef<number | null>(null);
  const dragZoomRef = useRef(1);
  const previousParentContainerIdRef = useRef<string | null | undefined | symbol>(
    Symbol('initial'),
  );
  const prefersReducedMotion = useReducedMotion();

  // Resolve provider-aware presentation for correct short labels / icons
  const isExternalBlock = resolvedBlock
    ? resolvedBlock.roles?.includes('external') ||
      isExternalResourceType(resolvedBlock.resourceType)
    : false;
  const pres = resolvedBlock
    ? resolveBlockPresentation(resolvedBlock.subtype ?? resolvedBlock.resourceType, {
        kind: isExternalBlock ? 'external' : 'resource',
        provider: activeProvider,
      })
    : null;

  const isDeleteMode = toolMode === 'delete';

  // Connect-mode visual states
  const isConnectMode = toolMode === 'connect';
  const sourceType: EndpointType | null = sourceNode
    ? isExternalResourceType(sourceNode.resourceType)
      ? (sourceNode.resourceType as EndpointType)
      : sourceNode.category
    : null;
  const isValidConnectTarget =
    resolvedBlock !== null &&
    sourceType !== null &&
    resolvedBlockId !== connectionSource &&
    canConnect(sourceType, resolvedBlock.category);
  const isInvalidConnectTarget =
    isConnectMode &&
    connectionSource !== null &&
    resolvedBlockId !== connectionSource &&
    !isValidConnectTarget;
  const isAlreadyConnected = relevantConnectionIds.length > 0;

  const hasValidationWarning = resolvedParentContainer
    ? resolvedBlock !== null && validatePlacement(resolvedBlock, resolvedParentContainer) !== null
    : false;
  const diffState =
    diffMode && diffDelta && resolvedBlockId
      ? getDiffState(resolvedBlockId, diffDelta)
      : 'unchanged';
  const upgradingBlockId = useUIStore((s) => s.upgradingBlockId);
  const isSnapTarget = useUIStore((s) =>
    resolvedBlockId ? s.snapTargetBlockIds.has(resolvedBlockId) : false,
  );
  const triggerSnapAnimation = useUIStore((s) => s.triggerSnapAnimation);
  const isMagneticSnapTarget = useUIStore((s) => s.magneticSnapTargetId === resolvedBlockId);

  // ── Block status overlay (#1591) ──
  const blockStatus = useUIStore((s) =>
    resolvedBlockId ? s.blockStatuses.get(resolvedBlockId) : undefined,
  );
  const isUpgrading = upgradingBlockId === resolvedBlockId;

  useEffect(() => {
    const el = blockRef.current;
    if (
      !resolvedBlockId ||
      toolMode === 'delete' ||
      toolMode === 'connect' ||
      blockStatus?.disabled ||
      !el
    ) {
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
          if (!isDragging.current) {
            useUIStore.getState().startDragging();
          }
          isDragging.current = true;

          const imgEl = blockRef.current?.querySelector('.block-img') as HTMLElement | null;
          if (imgEl) imgEl.classList.add('is-dragging');

          const dxScreen = event.dx / dragZoomRef.current;
          const dyScreen = event.dy / dragZoomRef.current;
          const { dWorldX, dWorldZ } = screenDeltaToWorld(dxScreen, dyScreen);

          (onMove ?? moveNodePosition)(resolvedBlockId, dWorldX, dWorldZ);
        },
        end() {
          const imgEl = blockRef.current?.querySelector('.block-img') as HTMLElement | null;
          if (imgEl) imgEl.classList.remove('is-dragging');

          let didSnap = false;
          let snapRejected = false;
          if (isDragging.current) {
            const currentNode = useArchitectureStore.getState().nodeById.get(resolvedBlockId);
            const currentBlock = currentNode?.kind === 'resource' ? currentNode : null;

            if (currentBlock) {
              const snappedPosition = snapToGrid(currentBlock.position.x, currentBlock.position.z);
              const deltaX = snappedPosition.x - currentBlock.position.x;
              const deltaZ = snappedPosition.z - currentBlock.position.z;

              if (deltaX !== 0 || deltaZ !== 0) {
                // Record position before attempting move
                const posBefore = { x: currentBlock.position.x, z: currentBlock.position.z };
                (onMove ?? moveNodePosition)(resolvedBlockId, deltaX, deltaZ);

                // Re-read position to check if move was accepted
                const updatedNode = useArchitectureStore.getState().nodeById.get(resolvedBlockId);
                const updatedBlock = updatedNode?.kind === 'resource' ? updatedNode : null;
                const posAfter = updatedBlock
                  ? { x: updatedBlock.position.x, z: updatedBlock.position.z }
                  : posBefore;

                if (posAfter.x === posBefore.x && posAfter.z === posBefore.z) {
                  // Move was rejected — invalid placement
                  didSnap = false;
                  snapRejected = true;
                } else {
                  // Move was accepted — normal snap
                  didSnap = true;
                  const { isSoundMuted } = useUIStore.getState();
                  if (!isSoundMuted) {
                    audioService.playSound('block-snap');
                  }
                }
              }
            }
          }

          if (isDragging.current) {
            const droppingEl = blockRef.current?.querySelector('.block-img') as HTMLElement | null;
            if (droppingEl) {
              if (snapAnimationFrameRef.current !== null) {
                cancelAnimationFrame(snapAnimationFrameRef.current);
                snapAnimationFrameRef.current = null;
              }

              droppingEl.classList.remove('is-snapping');
              droppingEl.classList.remove('is-dropping');
              droppingEl.style.removeProperty('--snap-scale');
              droppingEl.style.removeProperty('--snap-rotate');

              if (didSnap && !prefersReducedMotion) {
                const startTime = performance.now();
                const durationMs = 200;

                const animateSnap = (frameTime: number) => {
                  const elapsedMs = frameTime - startTime;
                  const elapsedSec = elapsedMs / 1000;
                  const scale = criticallyDampedSpring(elapsedSec, 1.04, 1, 6);
                  const rotate = criticallyDampedSpring(elapsedSec, 2, 0, 6);

                  droppingEl.classList.add('is-snapping');
                  droppingEl.style.setProperty('--snap-scale', String(scale));
                  droppingEl.style.setProperty('--snap-rotate', `${rotate}deg`);

                  if (elapsedMs >= durationMs || (scale === 1 && rotate === 0)) {
                    droppingEl.classList.remove('is-snapping');
                    droppingEl.style.removeProperty('--snap-scale');
                    droppingEl.style.removeProperty('--snap-rotate');
                    snapAnimationFrameRef.current = null;
                    return;
                  }

                  snapAnimationFrameRef.current = requestAnimationFrame(animateSnap);
                };

                snapAnimationFrameRef.current = requestAnimationFrame(animateSnap);
              } else if (!didSnap && !snapRejected) {
                droppingEl.classList.add('is-dropping');
                const handleAnimEnd = () => {
                  droppingEl.classList.remove('is-dropping');
                  droppingEl.removeEventListener('animationend', handleAnimEnd);
                };
                droppingEl.addEventListener('animationend', handleAnimEnd);
              }
              // Handle shake for rejected snaps
              if (snapRejected && !prefersReducedMotion) {
                droppingEl.classList.add('is-shake-invalid');
                const handleShakeEnd = () => {
                  droppingEl.classList.remove('is-shake-invalid');
                  droppingEl.removeEventListener('animationend', handleShakeEnd);
                };
                droppingEl.addEventListener('animationend', handleShakeEnd);
              }
            }
          }

          if (dragResetTimerRef.current) {
            clearTimeout(dragResetTimerRef.current);
          }
          if (isDragging.current) {
            useUIStore.getState().completeInteraction();
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
      if (snapAnimationFrameRef.current !== null) {
        cancelAnimationFrame(snapAnimationFrameRef.current);
      }
      el.querySelector('.block-img')?.classList.remove('is-dragging');
      el.querySelector('.block-img')?.classList.remove('is-dropping');
      el.querySelector('.block-img')?.classList.remove('is-shake-invalid');
      const snapEl = el.querySelector('.block-img') as HTMLElement | null;
      if (snapEl) {
        snapEl.classList.remove('is-snapping');
        snapEl.style.removeProperty('--snap-scale');
        snapEl.style.removeProperty('--snap-rotate');
      }
      interactable.unset();
    };
  }, [
    blockStatus?.disabled,
    moveNodePosition,
    onMove,
    prefersReducedMotion,
    resolvedBlockId,
    toolMode,
  ]);
  // ── Container settle animation (#1874) ──
  useEffect(() => {
    const imgEl = blockRef.current?.querySelector('.block-img') as HTMLElement | null;
    if (!imgEl || !resolvedBlockId) return;

    // Check if parentContainerId changed (not initial mount)
    const prevParentId = previousParentContainerIdRef.current;
    const isInitialMount = typeof prevParentId === 'symbol';
    const hasChanged = prevParentId !== resolvedParentContainerId && !isInitialMount;

    if (hasChanged && !prefersReducedMotion) {
      imgEl.classList.add('is-settling');
      const handleSettleEnd = () => {
        imgEl.classList.remove('is-settling');
        imgEl.removeEventListener('animationend', handleSettleEnd);
      };
      imgEl.addEventListener('animationend', handleSettleEnd);
    }

    previousParentContainerIdRef.current = resolvedParentContainerId;
  }, [resolvedParentContainerId, prefersReducedMotion, resolvedBlockId]);

  const handleClick = (e: React.MouseEvent) => {
    if (!resolvedBlock || !resolvedBlockId) return;
    if (blockStatus?.disabled) return;
    if (diffMode && diffState === 'removed') return;
    if (isDragging.current) {
      return;
    }
    e.stopPropagation();

    if (toolMode === 'delete') {
      removeNode(resolvedBlockId);
      return;
    }

    if (toolMode === 'connect') {
      if (!connectionSource) {
        startConnecting(resolvedBlockId);
      } else if (connectionSource !== resolvedBlockId) {
        const connectionId = addConnection(connectionSource, resolvedBlockId);
        if (connectionId) {
          triggerSnapAnimation(resolvedBlockId);
          triggerSnapAnimation(connectionSource);
          useUIStore.getState().triggerConnectionCreationBurst(connectionId);
          const { isSoundMuted } = useUIStore.getState();
          if (!isSoundMuted) audioService.playSound('block-snap');
        }
        completeInteraction();
      }
      return;
    }

    if (e.shiftKey) {
      toggleSelection(resolvedBlockId);
    } else {
      setSelectedId(resolvedBlockId);
    }
  };

  if (!resolvedBlock || !resolvedBlockId || !pres) {
    return null;
  }

  const blockSize = getBlockScreenSize(
    resolvedBlock.category,
    resolvedBlock.provider,
    resolvedBlock.subtype,
  );

  const className = [
    'block-sprite',
    parentContainer && 'is-mounted',
    isSelected && 'is-selected',
    isConnectionSource && 'is-connection-source',
    isDeleteMode && 'is-delete-mode',
    isValidConnectTarget && !isMagneticSnapTarget && 'is-valid-target',
    isMagneticSnapTarget && 'is-drag-hover-valid',
    isInvalidConnectTarget && 'is-invalid-target',
    isAlreadyConnected && isConnectMode && 'is-connected',
    hasValidationWarning && !isSelected && !isConnectMode && !isDeleteMode && 'is-warning',
    diffState === 'added' && 'diff-added',
    diffState === 'modified' && 'diff-modified',
    diffState === 'removed' && 'diff-removed',
    isUpgrading && 'is-upgrading',
    isSnapTarget && 'is-snap-target',
    resolvedBlock.roles?.includes('external') && 'is-external',
    // ── Block status overlay (#1591) ── priority: disabled > error > health > unconnected ──
    blockStatus?.disabled && 'is-disabled',
    !blockStatus?.disabled && blockStatus?.error && 'is-error',
    !blockStatus?.disabled &&
      !blockStatus?.error &&
      blockStatus?.healthStatus === 'warn' &&
      'is-health-warn',
    !blockStatus?.disabled &&
      !blockStatus?.error &&
      blockStatus?.healthStatus === 'error' &&
      'is-health-error',
    !blockStatus?.disabled &&
      !blockStatus?.error &&
      !blockStatus?.healthStatus &&
      !isAlreadyConnected &&
      !isConnectMode &&
      !isDeleteMode &&
      'is-unconnected',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={blockRef}
      className={className}
      style={
        {
          left: `${screenX}px`,
          top: `${screenY}px`,
          zIndex,
          '--build-progress': 1,
        } as React.CSSProperties
      }
    >
      <button
        type="button"
        onClick={handleClick}
        className="block-button"
        disabled={!!blockStatus?.disabled}
        aria-disabled={!!blockStatus?.disabled || undefined}
        style={{
          width: `${blockSize.width}px`,
          height: `${blockSize.height}px`,
          left: `-${blockSize.width / 2}px`,
          top: `-${blockSize.height / 2}px`,
        }}
        aria-label={`Node: ${resolvedBlock.name}`}
        title={pres.displayLabel ?? resolvedBlock.name}
      >
        <div className="block-img" draggable={false}>
          <BlockSvg
            category={resolvedBlock.category}
            provider={activeProvider}
            subtype={isExternalBlock ? undefined : (pres.subtype ?? resolvedBlock.subtype)}
            resourceType={resolvedBlock.resourceType}
            name={resolvedBlock.name}
            aggregationCount={resolvedBlock.aggregation?.count}
            roles={resolvedBlock.roles}
            healthStatus={blockStatus?.disabled ? undefined : blockStatus?.healthStatus}
            occupiedPorts={occupiedPorts}
          />
        </div>
      </button>
      {resolvedBlock.name && isSelected && (
        <span className="block-label-chip">{resolvedBlock.name}</span>
      )}
    </div>
  );
});

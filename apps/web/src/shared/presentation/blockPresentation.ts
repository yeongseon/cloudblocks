/**
 * Block Presentation Resolver
 *
 * Single source of truth for labels and icons across palette and canvas.
 * Both `useTechTree` (palette) and `iconResolver` (canvas) delegate to
 * this module, ensuring consistent presentation everywhere.
 *
 * Pure module — no React hooks, no store dependencies.
 */
import type { LayerType, ProviderType, ResourceCategory } from '@cloudblocks/schema';
import {
  getBlockIconUrl,
  getResourceIconUrl,
  getSubtypeShortLabel,
  getSubtypeDisplayLabel,
  getContainerBlockIconUrl,
} from '../utils/iconResolver';
import { remapSubtype, getContainerLabel, getContainerShortLabel } from '../utils/providerMapping';
import { RESOURCE_DEFINITIONS, type ResourceType } from '../hooks/useTechTree';

// ─── Types ───────────────────────────────────────────────────

export type BlockPresentationKind = 'resource' | 'container' | 'external';

export interface BlockPresentation {
  /** Block kind */
  readonly kind: BlockPresentationKind;
  /** Resolved subtype key (provider-specific) */
  readonly subtype: string;
  /** Short label for block face (e.g. "VM", "AKS", "VPC") */
  readonly shortLabel: string;
  /** Full display label (e.g. "Virtual Machine", "Azure Kubernetes Service") */
  readonly displayLabel: string;
  /** SVG icon URL — always a path, never emoji */
  readonly iconUrl: string | null;
  /** Resource category (e.g. "compute", "network") */
  readonly category: string;
  /** Provider for this resolution */
  readonly provider: ProviderType;
  /** Container layer (only for container blocks) */
  readonly layer?: string;
  /** True if iconUrl is a fallback (not an exact match) */
  readonly isFallback: boolean;
  /** Human-readable description (e.g. for tooltips or properties panel) */
  readonly description?: string;
}

// ─── Options ─────────────────────────────────────────────────

export interface ResolveResourceOptions {
  /** Provider to resolve for (default: 'azure') */
  provider?: ProviderType;
}

export interface ResolveContainerOptions {
  /** Provider to resolve for (default: 'azure') */
  provider?: ProviderType;
  /** Container layer type */
  layer?: LayerType;
}

export interface ResolveExternalOptions {
  /** Provider to resolve for (default: 'azure') */
  provider?: ProviderType;
}

// ─── Resource Block Presentation ─────────────────────────────

/**
 * Resolve presentation metadata for a resource block.
 *
 * Accepts either:
 * - A ResourceType key (palette path, e.g. 'vm', 'sql', 'function')
 * - A provider-specific subtype (canvas path, e.g. 'ec2', 'lambda', 'compute-engine')
 *
 * The resolver normalizes both paths to produce the same result.
 */
export function resolveResourcePresentation(
  resourceTypeOrSubtype: string,
  options: ResolveResourceOptions = {},
): BlockPresentation {
  const provider = options.provider ?? 'azure';

  // Path 1: Direct ResourceType key from RESOURCE_DEFINITIONS
  const resDef = RESOURCE_DEFINITIONS[resourceTypeOrSubtype as ResourceType];
  if (resDef) {
    return resolveFromResourceDef(resDef, provider);
  }

  // Path 2: Try reverse lookup — find a RESOURCE_DEFINITIONS entry whose
  // remapped subtype matches the input (e.g. 'ec2' → vm, 'lambda' → function).
  // This preserves the correct category from RESOURCE_DEFINITIONS.
  for (const def of Object.values(RESOURCE_DEFINITIONS)) {
    const remapped = remapSubtype(def.azureSubtype ?? def.schemaResourceType, provider);
    if (remapped === resourceTypeOrSubtype) {
      return resolveFromResourceDef(def, provider);
    }
  }

  // Path 3: Provider-specific subtype with no RESOURCE_DEFINITIONS match.
  // Falls back to iconResolver's subtype maps for labels/icons.
  // Category is best-effort since we cannot determine it from subtype alone.
  const shortLabel = getSubtypeShortLabel(provider, resourceTypeOrSubtype);
  const displayLabel = getSubtypeDisplayLabel(provider, resourceTypeOrSubtype);
  const iconUrl = getBlockIconUrl(provider, 'compute' as ResourceCategory, resourceTypeOrSubtype);

  if (shortLabel || displayLabel || iconUrl) {
    return {
      kind: 'resource',
      subtype: resourceTypeOrSubtype,
      shortLabel: shortLabel ?? humanizeSubtype(resourceTypeOrSubtype),
      displayLabel: displayLabel ?? humanizeSubtype(resourceTypeOrSubtype),
      iconUrl,
      category: 'compute', // Best-effort — no RESOURCE_DEFINITIONS match found
      provider,
      isFallback: !iconUrl,
    };
  }

  // Fallback: unknown subtype
  return {
    kind: 'resource',
    subtype: resourceTypeOrSubtype,
    shortLabel: humanizeSubtype(resourceTypeOrSubtype),
    displayLabel: humanizeSubtype(resourceTypeOrSubtype),
    iconUrl: null,
    category: 'unknown',
    provider,
    isFallback: true,
  };
}

function resolveFromResourceDef(
  def: (typeof RESOURCE_DEFINITIONS)[ResourceType],
  provider: ProviderType,
): BlockPresentation {
  const providerSubtype = remapSubtype(def.azureSubtype ?? def.schemaResourceType, provider);

  // Icon resolution: try subtype-specific icon first, then resourceType-level icon
  const subtypeIcon = getBlockIconUrl(
    provider,
    (def.blockCategory ?? 'compute') as ResourceCategory,
    providerSubtype,
  );
  const resourceIcon = getResourceIconUrl(def.id, provider);
  const iconUrl = subtypeIcon ?? resourceIcon;

  // Label resolution: use iconResolver's provider-specific labels, then tech tree defaults
  const shortLabel = getSubtypeShortLabel(provider, providerSubtype) ?? def.shortLabel;
  const displayLabel = getSubtypeDisplayLabel(provider, providerSubtype) ?? def.label;

  return {
    kind: 'resource',
    subtype: providerSubtype,
    shortLabel,
    displayLabel,
    iconUrl,
    category: def.blockCategory ?? 'unknown',
    provider,
    isFallback: !iconUrl,
  };
}

// ─── Container Block Presentation ────────────────────────────

/**
 * Resolve presentation metadata for a container block.
 */
export function resolveContainerPresentation(
  layer: LayerType,
  options: ResolveContainerOptions = {},
): BlockPresentation {
  const provider = options.provider ?? 'azure';

  const iconUrl = getContainerBlockIconUrl(layer, provider);
  const displayLabel = getContainerLabel(layer, provider) ?? humanizeLayer(layer);
  const shortLabel = getContainerShortLabel(layer, provider);

  return {
    kind: 'container',
    subtype: layer,
    shortLabel,
    displayLabel,
    iconUrl,
    category: 'network',
    provider,
    layer,
    isFallback: false, // Container icons always resolve (region fallback)
  };
}

// ─── External Block Presentation ─────────────────────────────

/** Resolve a public asset path with Vite base URL prefix. */
function resolvePublicUrl(rawPath: string): string {
  const base = import.meta.env.BASE_URL ?? '/';
  return base + rawPath.replace(/^\//, '');
}

const EXTERNAL_PRESENTATIONS: Record<
  string,
  { shortLabel: string; displayLabel: string; description: string; iconUrl: string }
> = {
  internet: {
    shortLabel: 'Internet',
    displayLabel: 'Internet',
    description: 'Public network boundary for traffic entering or leaving the architecture.',
    iconUrl: resolvePublicUrl('/actor-sprites/internet.svg'),
  },
  browser: {
    shortLabel: 'Client',
    displayLabel: 'Client',
    description: 'External client that initiates HTTP requests to your application.',
    iconUrl: resolvePublicUrl('/actor-sprites/browser.svg'),
  },
};

/**
 * Resolve presentation metadata for an external block (internet, browser).
 */
export function resolveExternalPresentation(
  resourceType: string,
  options: ResolveExternalOptions = {},
): BlockPresentation {
  const provider = options.provider ?? 'azure';
  const ext = EXTERNAL_PRESENTATIONS[resourceType];

  if (ext) {
    return {
      kind: 'external',
      subtype: resourceType,
      shortLabel: ext.shortLabel,
      displayLabel: ext.displayLabel,
      description: ext.description,
      iconUrl: ext.iconUrl,
      category: 'external',
      provider,
      isFallback: false,
    };
  }

  return {
    kind: 'external',
    subtype: resourceType,
    shortLabel: humanizeSubtype(resourceType),
    displayLabel: humanizeSubtype(resourceType),
    iconUrl: null,
    category: 'external',
    provider,
    isFallback: true,
  };
}

// ─── Unified Resolver ────────────────────────────────────────

export interface ResolveBlockPresentationOptions {
  kind?: BlockPresentationKind;
  provider?: ProviderType;
  layer?: LayerType;
}

/**
 * Unified entry point — delegates to the appropriate specialized resolver.
 *
 * If `kind` is omitted, attempts to infer:
 * - Known external types ('internet', 'browser') → external
 * - Known layer types ('global', 'edge', 'region', 'zone', 'subnet') → container
 * - Everything else → resource
 */
export function resolveBlockPresentation(
  subtypeOrKey: string,
  options: ResolveBlockPresentationOptions = {},
): BlockPresentation {
  const kind = options.kind ?? inferKind(subtypeOrKey);

  switch (kind) {
    case 'external':
      return resolveExternalPresentation(subtypeOrKey, { provider: options.provider });
    case 'container':
      return resolveContainerPresentation(subtypeOrKey as LayerType, {
        provider: options.provider,
        layer: options.layer ?? (subtypeOrKey as LayerType),
      });
    case 'resource':
    default:
      return resolveResourcePresentation(subtypeOrKey, { provider: options.provider });
  }
}

// ─── Utilities ───────────────────────────────────────────────

const EXTERNAL_TYPES = new Set(['internet', 'browser']);
const LAYER_TYPES = new Set<string>(['global', 'edge', 'region', 'zone', 'subnet']);

function inferKind(key: string): BlockPresentationKind {
  if (EXTERNAL_TYPES.has(key)) return 'external';
  if (LAYER_TYPES.has(key)) return 'container';
  return 'resource';
}

/** Convert a kebab-case subtype to a human-readable label. */
function humanizeSubtype(subtype: string): string {
  return subtype
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function humanizeLayer(layer: string): string {
  const labels: Record<string, string> = {
    global: 'Global Layer',
    edge: 'Edge Layer',
    region: 'Region',
    zone: 'Zone',
    subnet: 'Subnet',
  };
  return labels[layer] ?? layer;
}

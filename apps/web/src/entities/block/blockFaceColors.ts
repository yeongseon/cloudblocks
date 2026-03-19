import type { BlockCategory, ProviderType, StudColorSpec } from '../../shared/types/index';

// ═══════════════════════════════════════════════════════════════
// Block Face Color System — v2.0
// See CLOUDBLOCKS_SPEC_V2.md §7 (Color System)
//
// Color represents PROVIDER RESOURCE IDENTITY.
// Not category, not arbitrary palette — the provider's official
// brand color for that service family.
//
// Flow: provider + subtype → service family → base hex → deriveFaceColors()
// ═══════════════════════════════════════════════════════════════

export interface BlockFaceColors {
  topFaceColor: string;
  topFaceStroke: string;
  leftSideColor: string;
  rightSideColor: string;
}

/** Full derived color set from a single base hex. */
export interface DerivedFaceColors {
  top: string;
  topStroke: string;
  right: string;
  left: string;
  studMain: string;
  studShadow: string;
  studHighlight: string;
}

// ─── Color Utilities ─────────────────────────────────────────

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const v = Number.parseInt(h, 16);
  return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
}

function toHex(r: number, g: number, b: number): string {
  const ch = (c: number) => Math.max(0, Math.min(255, Math.round(c)))
    .toString(16).padStart(2, '0').toUpperCase();
  return `#${ch(r)}${ch(g)}${ch(b)}`;
}

/**
 * Lighten a hex color by mixing toward white.
 * `percent` is 0-100 (e.g. 15 means 15%).
 */
export function lighten(hex: string, percent: number): string {
  const [r, g, b] = parseHex(hex);
  const ratio = percent / 100;
  return toHex(
    r + (255 - r) * ratio,
    g + (255 - g) * ratio,
    b + (255 - b) * ratio,
  );
}

/**
 * Darken a hex color by mixing toward black.
 * `percent` is 0-100 (e.g. 10 means 10%).
 */
export function darken(hex: string, percent: number): string {
  const [r, g, b] = parseHex(hex);
  const ratio = 1 - percent / 100;
  return toHex(r * ratio, g * ratio, b * ratio);
}

// ─── Face Color Derivation (§7.7) ────────────────────────────

/**
 * Derive all face and stud colors from a single provider base color.
 * See CLOUDBLOCKS_SPEC_V2.md §7.7.
 */
export function deriveFaceColors(base: string): DerivedFaceColors {
  return {
    top: base,
    topStroke: lighten(base, 15),
    right: darken(base, 10),
    left: darken(base, 20),
    studMain: lighten(base, 15),
    studShadow: darken(base, 15),
    studHighlight: lighten(base, 40),
  };
}

// ─── Provider Color Palettes (§7.2–§7.4) ─────────────────────

/** Base hex colors per provider, keyed by service family. */
export const PROVIDER_COLORS: Record<ProviderType, Record<string, string>> = {
  // §7.2 AWS Service Colors
  aws: {
    compute:         '#D86613',
    database:        '#CD2264',
    storage:         '#3F8624',
    networking:      '#693BC5',
    'app-integration': '#CD2264',
    security:        '#D6232C',
    analytics:       '#693BC5',
    ml:              '#1B7B67',
    management:      '#693BC5',
  },
  // §7.3 Azure Service Colors
  azure: {
    compute:         '#0078D4',
    serverless:      '#FF8C00',
    database:        '#0078D4',
    'database-nosql':  '#32D4F5',
    storage:         '#59B4D9',
    networking:      '#0078D4',
    security:        '#E0301E',
    messaging:       '#0078D4',
    identity:        '#0078D4',
    monitoring:      '#0078D4',
    iot:             '#B19AD7',
  },
  // §7.4 GCP Service Colors
  gcp: {
    compute:         '#4285F4',
    'storage-db':    '#4285F4',
    networking:      '#EA4335',
    'data-analytics':  '#34A853',
    operations:      '#FBBC05',
  },
};

// ─── Subtype → Service Family Mapping ─────────────────────────

/**
 * Maps `provider:subtype` to a service family key.
 * If a subtype is not in this map, category-based fallback is used.
 */
const SUBTYPE_FAMILY_MAP: Record<string, string> = {
  // ── AWS ──
  'aws:EC2':           'compute',
  'aws:Lambda':        'compute',
  'aws:ECS':           'compute',
  'aws:EKS':           'compute',
  'aws:RDS':           'database',
  'aws:DynamoDB':      'database',
  'aws:ElastiCache':   'database',
  'aws:Redshift':      'database',
  'aws:S3':            'storage',
  'aws:VPC':           'networking',
  'aws:Route 53':      'networking',
  'aws:CloudFront':    'networking',
  'aws:ALB':           'networking',
  'aws:ELB':           'networking',
  'aws:API Gateway':   'networking',
  'aws:NAT Gateway':   'networking',
  'aws:SQS':           'app-integration',
  'aws:SNS':           'app-integration',
  'aws:EventBridge':   'app-integration',
  'aws:IAM':           'security',
  'aws:KMS':           'security',
  'aws:Kinesis':       'analytics',
  'aws:Athena':        'analytics',
  'aws:SageMaker':     'ml',
  'aws:CloudWatch':    'management',

  // ── Azure ──
  'azure:Virtual Machine':       'compute',
  'azure:App Service':           'compute',
  'azure:Function App':          'serverless',
  'azure:AKS':                   'database-nosql',
  'azure:Azure SQL Database':    'database',
  'azure:Azure Synapse':         'database',
  'azure:Cosmos DB':             'database-nosql',
  'azure:Storage Account':       'storage',
  'azure:VNet':                  'networking',
  'azure:Application Gateway':   'networking',
  'azure:Front Door':            'networking',
  'azure:NAT Gateway':           'networking',
  'azure:Azure DNS':             'networking',
  'azure:Azure Firewall':        'security',
  'azure:Azure Cache for Redis': 'security',
  'azure:Service Bus':           'messaging',
  'azure:Event Grid':            'messaging',
  'azure:Event Hubs':            'messaging',
  'azure:Entra ID':              'identity',
  'azure:Azure Monitor':         'monitoring',
  'azure:IoT Hub':               'iot',

  // ── GCP ──
  'gcp:Compute Engine':        'compute',
  'gcp:GKE':                   'compute',
  'gcp:Cloud Functions':       'compute',
  'gcp:Cloud SQL':             'storage-db',
  'gcp:Cloud Spanner':         'storage-db',
  'gcp:Cloud Storage':         'storage-db',
  'gcp:Memorystore':           'storage-db',
  'gcp:Cloud Load Balancing':  'networking',
  'gcp:Cloud CDN':             'networking',
  'gcp:Cloud Armor':           'networking',
  'gcp:VPC':                   'networking',
  'gcp:Cloud DNS':             'networking',
  'gcp:BigQuery':              'data-analytics',
  'gcp:Dataflow':              'data-analytics',
  'gcp:Pub/Sub':               'data-analytics',
  'gcp:Eventarc':              'data-analytics',
  'gcp:Cloud Monitoring':      'operations',
  'gcp:Cloud IAM':             'operations',
};

// ─── Category → Service Family Fallback ──────────────────────

/**
 * When no subtype is available, map category to the most appropriate
 * service family for each provider.
 */
const CATEGORY_FAMILY_FALLBACK: Record<ProviderType, Record<BlockCategory, string>> = {
  aws: {
    compute:       'compute',
    database:      'database',
    storage:       'storage',
    gateway:       'networking',
    function:      'compute',
    queue:         'app-integration',
    event:         'app-integration',
    analytics:     'analytics',
    identity:      'security',
    observability: 'management',
  },
  azure: {
    compute:       'compute',
    database:      'database',
    storage:       'storage',
    gateway:       'networking',
    function:      'serverless',
    queue:         'messaging',
    event:         'messaging',
    analytics:     'database',
    identity:      'identity',
    observability: 'monitoring',
  },
  gcp: {
    compute:       'compute',
    database:      'storage-db',
    storage:       'storage-db',
    gateway:       'networking',
    function:      'compute',
    queue:         'data-analytics',
    event:         'data-analytics',
    analytics:     'data-analytics',
    identity:      'operations',
    observability: 'operations',
  },
};

// ─── Color Lookup ─────────────────────────────────────────────

/**
 * Resolve the base provider color for a block.
 *
 * Priority:
 *   1. Subtype override (provider:subtype → service family → base color)
 *   2. Category fallback (category → service family → base color)
 *
 * @returns A hex color string (e.g. '#D86613')
 */
export function getBlockColor(
  provider: ProviderType,
  subtype: string | undefined,
  category: BlockCategory,
): string {
  const palette = PROVIDER_COLORS[provider];

  // 1. Try subtype-specific family mapping
  if (subtype) {
    const key = `${provider}:${subtype}`;
    const family = SUBTYPE_FAMILY_MAP[key];
    if (family && palette[family]) {
      return palette[family];
    }
  }

  // 2. Fall back to category → family mapping
  const fallbackFamily = CATEGORY_FAMILY_FALLBACK[provider][category];
  return palette[fallbackFamily] ?? palette.compute;
}

// ─── Public API (backward-compatible) ─────────────────────────

/**
 * Get face colors for a block. Uses provider-resource color derivation.
 *
 * For v2.0: colors are derived algorithmically from a single base color
 * determined by the provider's service family for the given category.
 */
export function getBlockFaceColors(
  category: BlockCategory,
  provider: ProviderType = 'azure',
  subtype?: string,
): BlockFaceColors {
  const base = getBlockColor(provider, subtype, category);
  const derived = deriveFaceColors(base);
  return {
    topFaceColor: derived.top,
    topFaceStroke: derived.topStroke,
    leftSideColor: derived.left,
    rightSideColor: derived.right,
  };
}

/**
 * Get stud colors for a block. Uses provider-resource color derivation.
 */
export function getBlockStudColors(
  category: BlockCategory,
  provider: ProviderType = 'azure',
  subtype?: string,
): StudColorSpec {
  const base = getBlockColor(provider, subtype, category);
  const derived = deriveFaceColors(base);
  return {
    main: derived.studMain,
    shadow: derived.studShadow,
    highlight: derived.studHighlight,
  };
}

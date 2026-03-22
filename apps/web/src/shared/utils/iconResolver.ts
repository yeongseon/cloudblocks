import type { LayerType, ProviderType, ResourceCategory } from '@cloudblocks/schema';

const vmIcon = '/azure-icons/virtual-machine.svg';
const sqlIcon = '/azure-icons/sql-database.svg';
const storageIcon = '/azure-icons/storage-account.svg';
const gatewayIcon = '/azure-icons/application-gateway.svg';
const appServiceIcon = '/azure-icons/app-service.svg';
const logicAppsIcon = '/azure-icons/logic-apps.svg';
const queueIcon = '/azure-icons/service-bus.svg';
const eventIcon = '/azure-icons/event-hub.svg';
const vnetIcon = '/azure-icons/virtual-network.svg';
const subnetIcon = '/azure-icons/subnet.svg';

// ─── Block Icon Maps ─────────────────────────────────────────

/** Azure category → icon mapping (canonical source). */
const AZURE_BLOCK_ICONS: Record<ResourceCategory, string> = {
  network: vnetIcon,
  security: gatewayIcon,
  edge: gatewayIcon,
  compute: vmIcon,
  data: sqlIcon,
  messaging: queueIcon,
  operations: eventIcon,
};

/**
 * Subtype-specific icon overrides.
 * When a block has a specific subtype, use a more accurate icon
 * instead of the generic category icon.
 */
const SUBTYPE_ICON_OVERRIDES: Record<string, string> = {
  'app-service': appServiceIcon,
  functions: logicAppsIcon,
  'blob-storage': storageIcon,
};

/**
 * Provider-specific block icon overrides.
 * AWS and GCP fall back to Azure icons until vendor packs are added.
 */
const PROVIDER_BLOCK_ICONS: Record<ProviderType, Record<ResourceCategory, string>> = {
  azure: AZURE_BLOCK_ICONS,
  aws: { ...AZURE_BLOCK_ICONS },  // fallback: Azure icons until AWS icon pack added
  gcp: { ...AZURE_BLOCK_ICONS },  // fallback: Azure icons until GCP icon pack added
};

// ─── Plate Icon Maps ─────────────────────────────────────────

/** Plate type → icon mapping. */
type PlateLayer = Exclude<LayerType, 'resource'>;

const PLATE_ICONS: Record<PlateLayer, string> = {
  global: vnetIcon,
  edge: vnetIcon,
  region: vnetIcon,
  zone: vnetIcon,
  subnet: subnetIcon,
};

// ─── Public API ──────────────────────────────────────────────

/**
 * Resolve the SVG icon URL for a block.
 *
 * Priority:
 *   1. Subtype-specific override (e.g., app-service gets its own icon)
 *   2. Provider + category mapping
 *   3. Azure fallback (always available)
 *
 * @returns An SVG asset URL string (Vite-resolved)
 */
export function getBlockIconUrl(
  provider: ProviderType,
  category: ResourceCategory,
  subtype?: string,
): string {
  if (subtype && SUBTYPE_ICON_OVERRIDES[subtype]) {
    return SUBTYPE_ICON_OVERRIDES[subtype];
  }
  return PROVIDER_BLOCK_ICONS[provider]?.[category]
    ?? AZURE_BLOCK_ICONS[category]
    ?? vmIcon;
}

/**
 * Resolve the SVG icon URL for a plate.
 *
 * Subnet plates always use the subnet icon regardless of access level.
 * Network-layer plates (global, edge, region, zone) use the VNet icon.
 *
 * @returns An SVG asset URL string (Vite-resolved)
 */
export function getPlateIconUrl(
  plateType: LayerType,
): string {
  if (plateType === 'resource') {
    return vnetIcon;
  }
  return PLATE_ICONS[plateType] ?? vnetIcon;
}

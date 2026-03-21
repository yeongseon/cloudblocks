import type { BlockCategory, PlateType, ProviderType, SubnetAccess } from '@cloudblocks/schema';

// ─── Azure Icon Imports ──────────────────────────────────────
import vmIcon from '../assets/azure-icons/virtual-machine.svg';
import sqlIcon from '../assets/azure-icons/sql-database.svg';
import storageIcon from '../assets/azure-icons/storage-account.svg';
import gatewayIcon from '../assets/azure-icons/application-gateway.svg';
import appServiceIcon from '../assets/azure-icons/app-service.svg';
import logicAppsIcon from '../assets/azure-icons/logic-apps.svg';
import queueIcon from '../assets/azure-icons/service-bus.svg';
import eventIcon from '../assets/azure-icons/event-hub.svg';
import vnetIcon from '../assets/azure-icons/virtual-network.svg';
import subnetIcon from '../assets/azure-icons/subnet.svg';

// ─── Block Icon Maps ─────────────────────────────────────────

/** Azure category → icon mapping (canonical source). */
const AZURE_BLOCK_ICONS: Record<BlockCategory, string> = {
  compute: vmIcon,
  database: sqlIcon,
  storage: storageIcon,
  gateway: gatewayIcon,
  function: logicAppsIcon,   // Generic serverless icon (Logic Apps SVG reused)
  queue: queueIcon,
  event: eventIcon,
  analytics: eventIcon,      // TODO: add dedicated analytics icon
  identity: gatewayIcon,     // TODO: add dedicated identity/key-vault icon
  observability: eventIcon,  // TODO: add dedicated observability icon
};

/**
 * Subtype-specific icon overrides.
 * When a block has a specific subtype, use a more accurate icon
 * instead of the generic category icon.
 */
const SUBTYPE_ICON_OVERRIDES: Record<string, string> = {
  'app-service': appServiceIcon,
};

/**
 * Provider-specific block icon overrides.
 * AWS and GCP fall back to Azure icons until vendor packs are added.
 */
const PROVIDER_BLOCK_ICONS: Record<ProviderType, Record<BlockCategory, string>> = {
  azure: AZURE_BLOCK_ICONS,
  aws: { ...AZURE_BLOCK_ICONS },  // fallback: Azure icons until AWS icon pack added
  gcp: { ...AZURE_BLOCK_ICONS },  // fallback: Azure icons until GCP icon pack added
};

// ─── Plate Icon Maps ─────────────────────────────────────────

/** Plate type → icon mapping. */
const PLATE_ICONS: Record<PlateType, string> = {
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
  category: BlockCategory,
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
  plateType: PlateType,
  _subnetAccess?: SubnetAccess,
): string {
  return PLATE_ICONS[plateType] ?? vnetIcon;
}

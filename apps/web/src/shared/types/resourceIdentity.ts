/**
 * Canonical resource identity.
 *
 * `resourceType` is the provider-independent schema identity and must always be
 * a `RESOURCE_RULES` key. `subtype` carries the provider/display alias. Changing
 * the active provider remaps `subtype` only — never `resourceType`.
 *
 * Builds up to and including v4.1.0 stored the Azure subtype alias in
 * `resourceType`, so every ingestion path canonicalizes through this module.
 */
import type { ProviderType, ResourceType } from '@cloudblocks/schema';
import { KNOWN_RESOURCE_TYPES } from '@cloudblocks/schema';
import { RESOURCE_DEFINITIONS } from '../hooks/useTechTree';
import { toAzureSubtypeCandidates } from '../utils/providerMapping';

/** Azure subtypes used by built-in templates that have no palette definition. */
const TEMPLATE_ONLY_ALIASES: Readonly<Record<string, ResourceType>> = {
  'api-management': 'api_management',
  'event-grid': 'event_grid',
  'timer-trigger': 'function_compute',
  'azure-postgresql': 'relational_database',
  'azure-cache-for-redis': 'cache_store',
  'entra-id': 'identity_access',
};

function buildAzureAliasTable(): ReadonlyMap<string, ResourceType> {
  const table = new Map<string, ResourceType>();

  for (const definition of Object.values(RESOURCE_DEFINITIONS)) {
    const alias = definition.azureSubtype;
    if (alias && alias !== definition.schemaResourceType) {
      table.set(alias, definition.schemaResourceType);
    }
  }

  for (const [alias, canonical] of Object.entries(TEMPLATE_ONLY_ALIASES)) {
    table.set(alias, canonical);
  }

  return table;
}

const AZURE_ALIAS_TO_CANONICAL = buildAzureAliasTable();

export function isCanonicalResourceType(value: string): value is ResourceType {
  return KNOWN_RESOURCE_TYPES.has(value);
}

/**
 * Resolve any historical or provider-specific resource identifier to its
 * canonical `RESOURCE_RULES` key.
 *
 * Returns `undefined` when the value is unknown, or when a provider alias maps
 * back to more than one canonical type (e.g. AWS `iam` came from both
 * `managed-identity` and `entra-id`). Callers must not guess: an unresolved
 * value is reported, never silently replaced with a category default.
 */
export function toCanonicalResourceType(
  value: string,
  provider: ProviderType = 'azure',
): ResourceType | undefined {
  if (isCanonicalResourceType(value)) {
    return value;
  }

  const azureMatch = AZURE_ALIAS_TO_CANONICAL.get(value);
  if (azureMatch) {
    return azureMatch;
  }

  const resolved = new Set<ResourceType>();
  for (const candidate of toAzureSubtypeCandidates(value, provider)) {
    const canonical = isCanonicalResourceType(candidate)
      ? candidate
      : AZURE_ALIAS_TO_CANONICAL.get(candidate);
    if (canonical) {
      resolved.add(canonical);
    }
  }

  return resolved.size === 1 ? [...resolved][0] : undefined;
}

/**
 * Migrate a persisted resource identity to the canonical invariant.
 *
 * When `resourceType` holds a provider alias, it is replaced by its canonical
 * form and the original alias is preserved as `subtype`. Values that cannot be
 * resolved are returned untouched so ingestion reports them instead of guessing.
 */
export function canonicalizeResourceIdentity(
  resourceType: string,
  subtype: string | undefined,
  provider: ProviderType,
): { resourceType: string; subtype: string | undefined } {
  const canonical = toCanonicalResourceType(resourceType, provider);

  if (!canonical || canonical === resourceType) {
    return { resourceType, subtype };
  }

  return { resourceType: canonical, subtype: subtype ?? resourceType };
}

interface CanonicalizableNode {
  kind: string;
  resourceType: string;
  subtype?: string;
  provider?: ProviderType;
}

export function canonicalizeResourceNodes<T extends CanonicalizableNode>(
  nodes: readonly T[],
  fallbackProvider: ProviderType,
): void {
  for (const node of nodes) {
    if (node.kind !== 'resource') {
      continue;
    }

    const canonical = canonicalizeResourceIdentity(
      node.resourceType,
      node.subtype,
      node.provider ?? fallbackProvider,
    );

    node.resourceType = canonical.resourceType;
    if (canonical.subtype !== undefined) {
      node.subtype = canonical.subtype;
    }
  }
}

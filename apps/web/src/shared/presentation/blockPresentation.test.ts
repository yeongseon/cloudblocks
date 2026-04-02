import { describe, expect, it } from 'vitest';
import type { LayerType, ProviderType } from '@cloudblocks/schema';
import {
  resolveResourcePresentation,
  resolveContainerPresentation,
  resolveExternalPresentation,
  resolveBlockPresentation,
  type BlockPresentation,
} from './blockPresentation';
import { RESOURCE_DEFINITIONS, type ResourceType } from '../hooks/useTechTree';
import { remapSubtype } from '../utils/providerMapping';
import { getSubtypeShortLabel, getBlockIconUrl, getResourceIconUrl } from '../utils/iconResolver';

const ALL_PROVIDERS: ProviderType[] = ['azure', 'aws', 'gcp'];
const ALL_RESOURCE_TYPES = Object.keys(RESOURCE_DEFINITIONS) as ResourceType[];
const ALL_CONTAINER_LAYERS: LayerType[] = ['global', 'edge', 'region', 'zone', 'subnet'];

// ─── Resource Presentation ───────────────────────────────────

describe('resolveResourcePresentation', () => {
  describe('every RESOURCE_DEFINITIONS entry produces valid presentation', () => {
    for (const provider of ALL_PROVIDERS) {
      describe(`provider: ${provider}`, () => {
        for (const resType of ALL_RESOURCE_TYPES) {
          it(`${resType} returns non-empty shortLabel, displayLabel, and valid kind`, () => {
            const result = resolveResourcePresentation(resType, { provider });

            expect(result.kind).toBe('resource');
            expect(result.shortLabel).toBeTruthy();
            expect(result.displayLabel).toBeTruthy();
            expect(result.provider).toBe(provider);
            expect(typeof result.shortLabel).toBe('string');
            expect(typeof result.displayLabel).toBe('string');
            expect(result.shortLabel.length).toBeGreaterThan(0);
            expect(result.displayLabel.length).toBeGreaterThan(0);
          });
        }
      });
    }
  });

  describe('icon resolution matches iconResolver for Azure subtypes', () => {
    for (const resType of ALL_RESOURCE_TYPES) {
      const def = RESOURCE_DEFINITIONS[resType];
      if (!def.azureSubtype) continue;

      it(`${resType} (azure subtype: ${def.azureSubtype}) resolves matching icon`, () => {
        const result = resolveResourcePresentation(resType, { provider: 'azure' });
        // The resolver should find an icon via either subtype or resourceType path
        const expectedSubtypeIcon = getBlockIconUrl(
          'azure',
          (def.blockCategory ?? 'compute') as never,
          def.azureSubtype,
        );
        const expectedResourceIcon = getResourceIconUrl(resType, 'azure');
        const expectedIcon = expectedSubtypeIcon ?? expectedResourceIcon;

        expect(result.iconUrl).toBe(expectedIcon);
      });
    }
  });

  describe('label consistency with iconResolver for provider subtypes', () => {
    for (const provider of ALL_PROVIDERS) {
      for (const resType of ALL_RESOURCE_TYPES) {
        const def = RESOURCE_DEFINITIONS[resType];
        const providerSubtype = remapSubtype(def.azureSubtype ?? def.schemaResourceType, provider);
        const iconResolverLabel = getSubtypeShortLabel(provider, providerSubtype);

        // Only test cases where iconResolver has a label
        if (!iconResolverLabel) continue;

        it(`${resType} (${provider}/${providerSubtype}) shortLabel matches iconResolver`, () => {
          const result = resolveResourcePresentation(resType, { provider });
          expect(result.shortLabel).toBe(iconResolverLabel);
        });
      }
    }
  });

  describe('provider subtype reverse lookup', () => {
    it('resolves AWS subtype "ec2" back to vm resource', () => {
      const result = resolveResourcePresentation('ec2', { provider: 'aws' });
      expect(result.kind).toBe('resource');
      expect(result.shortLabel).toBeTruthy();
      expect(result.iconUrl).toBeTruthy();
    });

    it('resolves GCP subtype "compute-engine" back to vm resource', () => {
      const result = resolveResourcePresentation('compute-engine', { provider: 'gcp' });
      expect(result.kind).toBe('resource');
      expect(result.shortLabel).toBeTruthy();
      expect(result.iconUrl).toBeTruthy();
    });

    it('resolves AWS subtype "lambda" correctly', () => {
      const result = resolveResourcePresentation('lambda', { provider: 'aws' });
      expect(result.kind).toBe('resource');
      expect(result.shortLabel).toBe('Lambda');
    });
  });

  describe('unknown subtype fallback', () => {
    it('returns humanized label for unknown subtype', () => {
      const result = resolveResourcePresentation('totally-unknown-thing', { provider: 'azure' });
      expect(result.kind).toBe('resource');
      expect(result.shortLabel).toBe('Totally Unknown Thing');
      expect(result.displayLabel).toBe('Totally Unknown Thing');
      expect(result.iconUrl).toBeNull();
      expect(result.isFallback).toBe(true);
      expect(result.category).toBe('unknown');
    });
  });

  describe('defaults to azure provider when not specified', () => {
    it('uses azure as default provider', () => {
      const result = resolveResourcePresentation('vm');
      expect(result.provider).toBe('azure');
      expect(result.shortLabel).toBe('VM');
    });
  });
});

// ─── Container Presentation ──────────────────────────────────

describe('resolveContainerPresentation', () => {
  describe('every container layer produces valid presentation', () => {
    for (const provider of ALL_PROVIDERS) {
      for (const layer of ALL_CONTAINER_LAYERS) {
        it(`${layer} (${provider}) returns non-empty labels and icon`, () => {
          const result = resolveContainerPresentation(layer, { provider });

          expect(result.kind).toBe('container');
          expect(result.shortLabel).toBeTruthy();
          expect(result.displayLabel).toBeTruthy();
          expect(result.iconUrl).toBeTruthy();
          expect(result.layer).toBe(layer);
          expect(result.provider).toBe(provider);
          expect(result.category).toBe('network');
          expect(result.isFallback).toBe(false);
        });
      }
    }
  });

  describe('provider-specific labels', () => {
    it('region layer: Azure=VNet, AWS=VPC, GCP=VPC Network', () => {
      expect(resolveContainerPresentation('region', { provider: 'azure' }).displayLabel).toBe(
        'VNet',
      );
      expect(resolveContainerPresentation('region', { provider: 'aws' }).displayLabel).toBe('VPC');
      expect(resolveContainerPresentation('region', { provider: 'gcp' }).displayLabel).toBe(
        'VPC Network',
      );
    });

    it('region shortLabel: Azure=VNet, AWS=VPC, GCP=VPC', () => {
      expect(resolveContainerPresentation('region', { provider: 'azure' }).shortLabel).toBe('VNet');
      expect(resolveContainerPresentation('region', { provider: 'aws' }).shortLabel).toBe('VPC');
      expect(resolveContainerPresentation('region', { provider: 'gcp' }).shortLabel).toBe('VPC');
    });
  });
});

// ─── External Presentation ───────────────────────────────────

describe('resolveExternalPresentation', () => {
  it('internet resolves correctly', () => {
    const result = resolveExternalPresentation('internet');
    expect(result.kind).toBe('external');
    expect(result.shortLabel).toBe('Internet');
    expect(result.displayLabel).toBe('Internet');
    expect(result.iconUrl).toBe('/actor-sprites/internet.svg');
    expect(result.isFallback).toBe(false);
  });

  it('browser resolves correctly', () => {
    const result = resolveExternalPresentation('browser');
    expect(result.kind).toBe('external');
    expect(result.shortLabel).toBe('Client');
    expect(result.displayLabel).toBe('Client');
    expect(result.iconUrl).toBe('/actor-sprites/browser.svg');
    expect(result.isFallback).toBe(false);
  });

  it('unknown external type produces fallback', () => {
    const result = resolveExternalPresentation('unknown-actor');
    expect(result.kind).toBe('external');
    expect(result.shortLabel).toBe('Unknown Actor');
    expect(result.isFallback).toBe(true);
    expect(result.iconUrl).toBeNull();
  });
});

// ─── Unified Resolver ────────────────────────────────────────

describe('resolveBlockPresentation', () => {
  describe('kind inference', () => {
    it('infers external for "internet"', () => {
      const result = resolveBlockPresentation('internet');
      expect(result.kind).toBe('external');
    });

    it('infers external for "browser"', () => {
      const result = resolveBlockPresentation('browser');
      expect(result.kind).toBe('external');
    });

    it('infers container for "region"', () => {
      const result = resolveBlockPresentation('region');
      expect(result.kind).toBe('container');
    });

    it('infers container for "subnet"', () => {
      const result = resolveBlockPresentation('subnet', { kind: 'container' });
      expect(result.kind).toBe('container');
    });

    it('infers resource for "vm"', () => {
      const result = resolveBlockPresentation('vm');
      expect(result.kind).toBe('resource');
    });
  });

  describe('explicit kind overrides inference', () => {
    it('treats "subnet" as resource when kind=resource', () => {
      const result = resolveBlockPresentation('subnet', { kind: 'resource' });
      expect(result.kind).toBe('resource');
    });
  });

  describe('provider passthrough', () => {
    it('passes provider to resource resolution', () => {
      const result = resolveBlockPresentation('vm', { provider: 'aws' });
      expect(result.provider).toBe('aws');
    });

    it('passes provider to container resolution', () => {
      const result = resolveBlockPresentation('region', { provider: 'gcp' });
      expect(result.provider).toBe('gcp');
      expect(result.displayLabel).toBe('VPC Network');
    });
  });
});

// ─── Cross-cutting: Palette vs Canvas consistency ────────────

describe('palette-canvas consistency', () => {
  describe('every resource type resolves identically regardless of entry path', () => {
    for (const provider of ALL_PROVIDERS) {
      for (const resType of ALL_RESOURCE_TYPES) {
        const def = RESOURCE_DEFINITIONS[resType];
        const providerSubtype = remapSubtype(def.azureSubtype ?? def.schemaResourceType, provider);

        it(`${resType} (${provider}): ResourceType path and subtype path produce same icon`, () => {
          const fromResType = resolveResourcePresentation(resType, { provider });
          const fromSubtype = resolveResourcePresentation(providerSubtype, { provider });

          // Both paths should resolve to the same icon URL
          expect(fromResType.iconUrl).toBe(fromSubtype.iconUrl);
        });
      }
    }
  });
});

// ─── Type safety: BlockPresentation shape ────────────────────

describe('BlockPresentation shape', () => {
  it('resource presentation has all required fields', () => {
    const result = resolveResourcePresentation('vm', { provider: 'azure' });
    const keys: (keyof BlockPresentation)[] = [
      'kind',
      'subtype',
      'shortLabel',
      'displayLabel',
      'iconUrl',
      'category',
      'provider',
      'isFallback',
    ];
    for (const key of keys) {
      expect(result).toHaveProperty(key);
    }
  });

  it('container presentation includes layer', () => {
    const result = resolveContainerPresentation('region', { provider: 'azure' });
    expect(result.layer).toBe('region');
  });
});

// ─── Category correctness via provider subtypes ──────────────

describe('category correctness via provider subtypes', () => {
  describe('provider subtype path preserves correct category from RESOURCE_DEFINITIONS', () => {
    // Build a set of ambiguous subtypes (multiple RESOURCE_DEFINITIONS map to same provider subtype)
    const ambiguousSubtypes = new Set<string>();
    const subtypeMap = new Map<string, string>();
    for (const provider of ALL_PROVIDERS) {
      subtypeMap.clear();
      for (const resType of ALL_RESOURCE_TYPES) {
        const def = RESOURCE_DEFINITIONS[resType];
        const providerSubtype = remapSubtype(def.azureSubtype ?? def.schemaResourceType, provider);
        const key = `${provider}:${providerSubtype}`;
        if (subtypeMap.has(key)) {
          ambiguousSubtypes.add(key);
        }
        subtypeMap.set(key, resType);
      }
    }

    for (const provider of ALL_PROVIDERS) {
      for (const resType of ALL_RESOURCE_TYPES) {
        const def = RESOURCE_DEFINITIONS[resType];
        const providerSubtype = remapSubtype(def.azureSubtype ?? def.schemaResourceType, provider);
        const key = `${provider}:${providerSubtype}`;

        // Direct ResourceType path always resolves correctly
        it(`${resType} (${provider}) direct path has correct category`, () => {
          const fromResType = resolveResourcePresentation(resType, { provider });
          expect(fromResType.category).toBe(def.blockCategory ?? 'unknown');
        });

        // Subtype path matches direct path only for unambiguous subtypes
        if (!ambiguousSubtypes.has(key)) {
          it(`${resType} (${provider}/${providerSubtype}) subtype path category matches`, () => {
            const fromResType = resolveResourcePresentation(resType, { provider });
            const fromSubtype = resolveResourcePresentation(providerSubtype, { provider });
            expect(fromSubtype.category).toBe(fromResType.category);
          });
        }
      }
    }
  });

  it('AWS S3 resolves to data category, not compute', () => {
    const result = resolveResourcePresentation('s3', { provider: 'aws' });
    expect(result.category).toBe('data');
  });

  it('AWS VPC resolves to network category, not compute', () => {
    const result = resolveResourcePresentation('vpc', { provider: 'aws' });
    expect(result.category).toBe('network');
  });

  it('GCP Pub/Sub resolves to messaging category, not compute', () => {
    const result = resolveResourcePresentation('pub-sub', { provider: 'gcp' });
    expect(result.category).toBe('messaging');
  });

  it('AWS Lambda resolves to compute category', () => {
    const result = resolveResourcePresentation('lambda', { provider: 'aws' });
    expect(result.category).toBe('compute');
  });
});

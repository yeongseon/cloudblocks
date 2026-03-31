# Provider-Specific Resource System — Design Document

> Covers: block palette labels, icons, subtypes, and provider badge behavior across Azure/AWS/GCP.

## 1. Current Problems

### P1: All providers show Azure resource names

`RESOURCE_DEFINITIONS` hardcodes Azure-specific labels ("Azure SQL", "Azure Functions", "AKS"). `PROVIDER_RESOURCE_ALLOWLIST` maps all three providers to the same set. Switching provider tab has no effect on the block palette.

### P2: Wrong icon mappings

| Resource                | Icon file used                           | Correct icon                                    |
| ----------------------- | ---------------------------------------- | ----------------------------------------------- | -------------------------------------------------------- |
| `function` category     | `logic-apps.svg`                         | Should use a functions icon (doesn't exist yet) |
| `app-service` (subtype) | `logic-apps.svg` (via function category) | `app-service.svg` exists but is unused          |
| `identity` (key-vault)  | `storage-account.svg`                    | Needs dedicated icon                            |
|                         | `operations`                             | `event-hub.svg`                                 | Needs dedicated icon (was `analytics` + `observability`) |

### P3: Provider badge always shows

`BlockSvg` renders "Az"/"AW"/"GC" badge on every block unconditionally. When working with a single provider, the badge is noise. It should only appear when the architecture contains blocks from multiple providers.

### P4: `_subtype` parameter ignored in icon resolution

`getBlockIconUrl(provider, category, _subtype)` ignores subtype entirely. App Service and Azure Functions both resolve to the `function` category icon. With subtype-aware resolution, `app-service.svg` could be used for App Service.

### P5: AWS/GCP icons are Azure fallback

`PROVIDER_BLOCK_ICONS` for AWS and GCP spread Azure icons. No AWS or GCP icon packs exist.

## 2. Design

### 2.1 Provider Label Map

Replace the flat `RESOURCE_DEFINITIONS` labels with a provider-indexed map:

```typescript
// useTechTree.ts

interface ProviderLabel {
  label: string; // "Amazon RDS"
  shortLabel: string; // "RDS"
}

const PROVIDER_LABELS: Record<ProviderType, Record<ResourceType, ProviderLabel>> = {
  azure: {
    network: { label: 'Virtual Network (VNet)', shortLabel: 'VNet' },
    storage: { label: 'Blob Storage', shortLabel: 'Storage' },
    sql: { label: 'Azure SQL', shortLabel: 'SQL' },
    function: { label: 'Azure Functions', shortLabel: 'Func' },
    'app-service': { label: 'App Service', shortLabel: 'AppSvc' },
    vm: { label: 'Virtual Machine', shortLabel: 'VM' },
    aks: { label: 'Kubernetes (AKS)', shortLabel: 'AKS' },
    // ... (all 20 resources)
  },
  aws: {
    network: { label: 'VPC', shortLabel: 'VPC' },
    storage: { label: 'S3', shortLabel: 'S3' },
    sql: { label: 'Amazon RDS', shortLabel: 'RDS' },
    function: { label: 'Lambda', shortLabel: 'Lambda' },
    'app-service': { label: 'Elastic Beanstalk', shortLabel: 'EB' },
    vm: { label: 'EC2', shortLabel: 'EC2' },
    aks: { label: 'EKS', shortLabel: 'EKS' },
    // ...
  },
  gcp: {
    network: { label: 'VPC Network', shortLabel: 'VPC' },
    storage: { label: 'Cloud Storage', shortLabel: 'GCS' },
    sql: { label: 'Cloud SQL', shortLabel: 'CloudSQL' },
    function: { label: 'Cloud Functions', shortLabel: 'GCF' },
    'app-service': { label: 'App Engine', shortLabel: 'GAE' },
    vm: { label: 'Compute Engine', shortLabel: 'GCE' },
    aks: { label: 'GKE', shortLabel: 'GKE' },
    // ...
  },
};
```

`RESOURCE_DEFINITIONS` keeps only provider-agnostic fields: `id`, `icon`, `category`, `blockCategory`, `disabledReason`. Labels come from `PROVIDER_LABELS[activeProvider][resourceType]`.

### 2.2 Icon Resolution Fix

Update `iconResolver.ts`:

```typescript
// Subtype-specific overrides (provider-agnostic)
const SUBTYPE_ICON_OVERRIDES: Record<string, string> = {
  'app-service': appServiceIcon, // use existing app-service.svg
};

export function getBlockIconUrl(provider, category, subtype?) {
  // 1. Check subtype override first
  if (subtype && SUBTYPE_ICON_OVERRIDES[subtype]) {
    return SUBTYPE_ICON_OVERRIDES[subtype];
  }
  // 2. Provider + category
  return PROVIDER_BLOCK_ICONS[provider]?.[category] ?? AZURE_BLOCK_ICONS[category];
}
```

Also fix the `function` category mapping: `logic-apps.svg` → a proper functions icon. Since no `azure-functions.svg` exists, we have two options:

- **Option A**: Create a simple Azure Functions SVG icon
- **Option B**: Use `logic-apps.svg` but rename it to `functions.svg` for clarity

Recommend **Option A** for accuracy.

### 2.3 Provider Badge Rules

Show provider badge only when architecture has **multiple providers**:

```typescript
// BlockSvg.tsx
const showProviderBadge = allProviders.size > 1;
```

Where `allProviders` is derived from the architecture's blocks. This requires passing a `showBadge` prop or reading the architecture store.

Simpler approach: always show badge **except** when all blocks share the same provider as the active provider tab. This avoids reading the entire architecture in every BlockSvg render.

### 2.4 Subtype Storage

When a block is created via the sidebar palette, `Block.subtype` stores the `ResourceType` ID (e.g., `'sql'`, `'app-service'`, `'vm'`). This is already working — `def.id` is passed as subtype in `addBlock()`.

No change needed here, but the subtype should also be provider-aware for future use:

- Store: `subtype = resourceType` (e.g., `'sql'`)
- The provider field already distinguishes Azure SQL from RDS
- Display label comes from `PROVIDER_LABELS[block.provider][block.subtype]`

## 3. Full Resource Mapping

### Container Blocks

| ID               | Azure                  | AWS            | GCP            |
| ---------------- | ---------------------- | -------------- | -------------- |
| `network`        | Virtual Network (VNet) | VPC            | VPC Network    |
| `public-subnet`  | Public Subnet          | Public Subnet  | Public Subnet  |
| `private-subnet` | Private Subnet         | Private Subnet | Private Subnet |

### Always-available (edge/global)

| ID  | Cat          | Azure    | AWS          | GCP                |
| --- | ------------ | -------- | ------------ | ------------------ | -------------------- |
|     | `storage`    | data     | Blob Storage | S3                 | Cloud Storage        |
|     | `dns`        | delivery | DNS Zone     | Route 53           | Cloud DNS            |
|     | `cdn`        | delivery | CDN Profile  | CloudFront         | Cloud CDN            |
|     | `front-door` | delivery | Front Door   | Global Accelerator | Cloud Load Balancing |

### VNet-optional

| ID  | Cat                   | Azure     | AWS                 | GCP               |
| --- | --------------------- | --------- | ------------------- | ----------------- | --------------- |
|     | `sql`                 | data      | Azure SQL           | Amazon RDS        | Cloud SQL       |
|     | `function`            | compute   | Azure Functions     | Lambda            | Cloud Functions |
|     | `queue`               | messaging | Queue Storage       | SQS               | Cloud Tasks     |
|     | `event`               | messaging | Event Hub           | EventBridge       | Pub/Sub         |
|     | `app-service`         | compute   | App Service         | Elastic Beanstalk | App Engine      |
|     | `container-instances` | compute   | Container Instances | ECS Fargate       | Cloud Run       |
|     | `cosmos-db`           | data      | Cosmos DB           | DynamoDB          | Firestore       |
|     | `key-vault`           | security  | Key Vault           | Secrets Manager   | Secret Manager  |

### VNet-required

| ID  | Cat           | Azure    | AWS              | GCP              |
| --- | ------------- | -------- | ---------------- | ---------------- | -------------- |
|     | `vm`          | compute  | Virtual Machine  | EC2              | Compute Engine |
|     | `aks`         | compute  | Kubernetes (AKS) | EKS              | GKE            |
|     | `internal-lb` | delivery | Internal LB      | Internal ALB     | Internal LB    |
|     | `firewall`    | security | Azure Firewall   | Network Firewall | Cloud Firewall |
|     | `nsg`         | security | NSG              | Security Group   | Firewall Rules |
|     | `bastion`     | security | Azure Bastion    | Session Manager  | IAP Tunnel     |

## 4. Implementation Issues

### Issue 1: Provider-specific resource labels (#1023)

- Add `PROVIDER_LABELS` to `useTechTree.ts`
- Update `SidebarPalette` to read labels from provider map
- Files: `useTechTree.ts`, `SidebarPalette.tsx`

### Issue 2: Fix wrong icon mappings

- Use `app-service.svg` for app-service subtype
- Create/source proper icons for functions, identity, analytics, observability
- Make `getBlockIconUrl` subtype-aware
- Files: `iconResolver.ts`, `assets/azure-icons/`

### Issue 3: Provider badge conditional display

- Only show "Az"/"AW"/"GC" badge when multi-provider blocks exist
- Files: `BlockSvg.tsx`

### Issue 4: AWS/GCP icon packs (future)

- Out of scope for this iteration
- AWS/GCP will continue using Azure icon fallbacks with correct labels
- Icon packs can be added later without code changes (just add SVGs + update `PROVIDER_BLOCK_ICONS`)

## 5. Unified Presentation Resolver

> Added in #1555 (Milestone 35).

### Problem

Label and icon resolution was split across three modules:

| Path | Module | Key used |
| --- | --- | --- |
| Palette (sidebar) | `useTechTree.ts` → `RESOURCE_DEFINITIONS` | `ResourceType` (`'vm'`, `'sql'`) |
| Canvas (blocks) | `iconResolver.ts` → `SUBTYPE_LABELS` | Provider subtype (`'ec2'`, `'lambda'`) |
| Canvas (containers) | `providerMapping.ts` → `CONTAINER_LABELS` | `LayerType` (`'region'`, `'subnet'`) |

This caused label/icon divergence: the sidebar showed one name and icon while the canvas showed another.

### Solution: `shared/presentation/blockPresentation.ts`

A single **pure module** (no React hooks, no store dependencies) that resolves `BlockPresentation` metadata for any block kind:

```typescript
interface BlockPresentation {
  kind: 'resource' | 'container' | 'external';
  subtype: string;
  shortLabel: string;   // Face label ("VM", "VPC")
  displayLabel: string; // Full label ("Virtual Machine", "VPC Network")
  iconUrl: string | null;
  category: string;     // Resource category ("compute", "network")
  provider: ProviderType;
  layer?: string;       // Container layer (only for containers)
  isFallback: boolean;  // True if iconUrl is a category/generic fallback
}
```

### API

| Function | Input | Use case |
| --- | --- | --- |
| `resolveResourcePresentation(key, { provider })` | `ResourceType` or provider subtype | Palette + canvas resource blocks |
| `resolveContainerPresentation(layer, { provider })` | `LayerType` | Container blocks |
| `resolveExternalPresentation(type, { provider })` | `'internet'` \| `'browser'` | External blocks |
| `resolveBlockPresentation(key, { kind?, provider?, layer? })` | Any key | Unified entry point with auto-inference |

### Resolution Order (Resource Blocks)

1. **Direct match**: `ResourceType` key in `RESOURCE_DEFINITIONS` → exact category, remapped subtype
2. **Reverse lookup**: Provider subtype (`'ec2'`) matches a remapped `RESOURCE_DEFINITIONS` entry → preserves correct category
3. **iconResolver fallback**: Subtype exists in `iconResolver` maps but not in `RESOURCE_DEFINITIONS` → best-effort `'compute'` category
4. **Unknown fallback**: Humanized label, null icon, `category: 'unknown'`, `isFallback: true`

### FSD Layer

Lives in `shared/presentation/` — importable from any layer (`entities/`, `features/`, `widgets/`). No upward imports.

### Migration Path

Existing consumers (`SidebarPalette.tsx`, `BlockSvg.tsx`, `ContainerBlockSprite.tsx`) currently import directly from `useTechTree`, `iconResolver`, and `providerMapping`. Future issues (#1558, #1559) will migrate these consumers to use `blockPresentation.ts` instead, consolidating the resolution path.

## 6. Container Block Color System (#1557)

### Problem

Container blocks used the same face derivation deltas as resource blocks (lighten 4 / darken 6 / darken 12), making containers visually compete with resources instead of receding as background plates. All container layers used full-saturation provider brand colors with high stroke widths and strong depth shadows.

### Design

Container blocks now use an HSL desaturation pipeline that preserves provider hue while reducing saturation and boosting lightness. Each container layer type receives a different treatment so layers remain visually distinguishable.

#### HSL Pipeline

```
brand hex → adjustColorHsl(brand, { saturationScale, lightnessBoost }) → deriveContainerFaceColors(desaturated)
```

- `adjustColorHsl()`: Converts to HSL, scales saturation, boosts lightness, converts back to hex.
- `deriveContainerFaceColors()`: Uses narrower deltas than resource blocks (lighten 2 / darken 3 / darken 6 vs lighten 4 / darken 6 / darken 12).

#### Per-Layer Adjustments

| Layer | Saturation Scale | Lightness Boost | Visual Effect |
| --- | --- | --- | --- |
| `global` | 0.25 (25%) | +30 | Most washed-out, lightest background |
| `edge` | 0.28 (28%) | +26 | Slightly more color than global |
| `region` | 0.38 (38%) | +16 | Moderate muting, primary workspace |
| `zone` | 0.32 (32%) | +22 | Between edge and region |
| `subnet` | 0.35 (35%) | +18 | Between zone and region |

#### Stroke Width Reduction

| Layer | Previous | New |
| --- | --- | --- |
| `global` | 3 | 1.5 |
| `edge` | 2.5 | 1.2 |
| `region` | 2 | 1.0 |
| `zone` | 1.5 | 0.8 |
| `subnet` | 1 | 0.6 |

#### Shadow and Inset Softening

- **Inset highlight**: `rgba(203,213,225, 0.16)` → `rgba(203,213,225, 0.08)` (50% reduction)
- **Inset shadow**: `rgba(2,6,23, 0.45)` → `rgba(2,6,23, 0.25)` (44% reduction)
- **Neutral depth shadow**: `3px 6px 0px rgba(0,0,0,0.2)` → `2px 3px 0px rgba(0,0,0,0.12)` (halved offset, 40% opacity reduction)
- **Selection/diff glows**: Preserved at original strength (these are intentional emphasis effects)

### Files Modified

| File | Change |
| --- | --- |
| `entities/block/blockFaceColors.ts` | Added `adjustColorHsl()`, `deriveContainerFaceColors()`, HSL conversion internals |
| `entities/container-block/containerBlockFaceColors.ts` | Rewrote with HSL desaturation pipeline and per-layer config |
| `entities/container-block/ContainerBlockSvg.tsx` | Reduced `LAYER_VISUALS` stroke widths, softened inset highlight/shadow |
| `entities/container-block/ContainerBlockSprite.css` | Softened neutral depth shadows |

### Invariants

1. **Hue preservation**: Container top face hue stays within ±5° of provider brand hue.
2. **Desaturation**: Container top face saturation is always less than brand saturation.
3. **Lightness boost**: Container top face lightness is always greater than brand lightness.
4. **Narrow deltas**: Container face top-to-left luminance delta is <15 units (vs resource blocks which have wider spread).
5. **Provider distinguishability**: Azure, AWS, and GCP container colors for the same layer are always visually distinct.

## 7. Label Token Standardization (#1558)

### Problem

Block and container labels used divergent typography tokens:

| Element | Block | Container | Problem |
| --- | --- | --- | --- |
| Chip `font-size` | `10px` | `11px` | Two different sizes for the same visual role |
| Chip `font-weight` | `500` | `600` | Inconsistent weight |
| Face label min | `8` | `10` | Two different floor values |
| Face label scale | `0.28` | `0.32` | Two different scaling factors |

### Resolution

**Chip labels (CSS custom properties)**:
- `--cb-label-chip-font-size: 10px` — shared by `.block-label-chip` and `.container-label-chip`
- `--cb-label-chip-font-weight: 600` — shared weight (600 chosen for better legibility at 10px)

**Face labels (JS design tokens in `designTokens.ts`)**:
- `LABEL_FACE_MIN_PX = 8` — minimum font size floor
- `LABEL_FACE_SCALE = 0.28` — multiplier applied to `sideWallPx`
- Formula: `Math.max(LABEL_FACE_MIN_PX, Math.round(sideWallPx * LABEL_FACE_SCALE))`

### Design Decisions

1. **CSS vars for CSS, JS tokens for JS**: Chip tokens live in `index.css` (consumed by CSS files). Face label tokens live in `designTokens.ts` (consumed by TSX computed expressions). No cross-runtime duplication.
2. **Unified chip weight at 600**: `500` appeared too light at `10px` on both themes. `600` provides consistent readability.
3. **No letter-spacing token**: Neither block nor container chip had `letter-spacing` before. Adding it would be a new design decision, not convergence. Deferred to a future issue if needed.
4. **Container face labels use same formula**: Containers previously used `min 10 / scale 0.32` but this was not an intentional design decision — it was drift. Visual verification confirmed `min 8 / scale 0.28` remains legible on container side walls.

### Files Modified

| File | Change |
| --- | --- |
| `app/index.css` | Added `--cb-label-chip-font-size` and `--cb-label-chip-font-weight` CSS custom properties |
| `entities/block/BlockSprite.css` | Replaced hardcoded `10px`/`500` with CSS variables |
| `entities/container-block/ContainerBlockSprite.css` | Replaced hardcoded `11px`/`600` with CSS variables |
| `shared/tokens/designTokens.ts` | Added `LABEL_FACE_MIN_PX` and `LABEL_FACE_SCALE` exports |
| `entities/block/BlockSvg.tsx` | Replaced inline `Math.max(8, ...)` with token-based formula |
| `entities/container-block/ContainerBlockSvg.tsx` | Replaced inline `Math.max(10, ...)` with token-based formula |

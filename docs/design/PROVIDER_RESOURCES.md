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

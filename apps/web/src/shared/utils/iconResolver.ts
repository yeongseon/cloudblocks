import type { LayerType, ProviderType, ResourceCategory } from '@cloudblocks/schema';

const vnetIcon = '/azure-icons/virtual-network.svg';
const subnetIcon = '/azure-icons/subnet.svg';

const AZURE_SUBTYPE_ICONS: Record<string, string> = {
  vm: '/azure-icons/virtual-machine.svg',
  'app-service': '/azure-icons/app-service.svg',
  functions: '/azure-icons/function-apps.svg',
  aks: '/azure-icons/kubernetes-services.svg',
  'container-instances': '/azure-icons/container-instances.svg',
  'sql-database': '/azure-icons/sql-database.svg',
  'cosmos-db': '/azure-icons/cosmos-db.svg',
  'azure-synapse': '/azure-icons/synapse-analytics.svg',
  'azure-cache-for-redis': '/azure-icons/cache-redis.svg',
  'blob-storage': '/azure-icons/storage-account.svg',
  vnet: '/azure-icons/virtual-network.svg',
  subnet: '/azure-icons/subnet.svg',
  'application-gateway': '/azure-icons/application-gateway.svg',
  'front-door': '/azure-icons/front-door.svg',
  'nat-gateway': '/azure-icons/nat-gateway.svg',
  'azure-dns': '/azure-icons/dns-zone.svg',
  'azure-firewall': '/azure-icons/firewall.svg',
  'service-bus': '/azure-icons/service-bus.svg',
  'event-grid': '/azure-icons/event-grid.svg',
  'event-hubs': '/azure-icons/event-hub.svg',
  'entra-id': '/azure-icons/entra-id.svg',
  'azure-monitor': '/azure-icons/monitor.svg',
  'iot-hub': '/azure-icons/iot-hub.svg',
  'key-vault': '/azure-icons/key-vault.svg',
  'managed-identity': '/azure-icons/managed-identity.svg',
  nsg: '/azure-icons/nsg.svg',
  bastion: '/azure-icons/bastion.svg',
  'public-ip': '/azure-icons/public-ip.svg',
  'route-table': '/azure-icons/route-table.svg',
  'private-endpoint': '/azure-icons/private-endpoint.svg',
  'load-balancer': '/azure-icons/load-balancer.svg',
  'cdn-profile': '/azure-icons/cdn-profile.svg',
};

const AZURE_RESOURCE_ICONS: Record<string, string> = {
  network: '/azure-icons/virtual-network.svg',
  subnet: '/azure-icons/subnet.svg',
  storage: '/azure-icons/storage-account.svg',
  dns: '/azure-icons/dns-zone.svg',
  cdn: '/azure-icons/cdn-profile.svg',
  'front-door': '/azure-icons/front-door.svg',
  sql: '/azure-icons/sql-database.svg',
  function: '/azure-icons/function-apps.svg',
  queue: '/azure-icons/service-bus.svg',
  event: '/azure-icons/event-hub.svg',
  'app-service': '/azure-icons/app-service.svg',
  'container-instances': '/azure-icons/container-instances.svg',
  'cosmos-db': '/azure-icons/cosmos-db.svg',
  'key-vault': '/azure-icons/key-vault.svg',
  'managed-identity': '/azure-icons/managed-identity.svg',
  vm: '/azure-icons/virtual-machine.svg',
  aks: '/azure-icons/kubernetes-services.svg',
  'internal-lb': '/azure-icons/load-balancer.svg',
  firewall: '/azure-icons/firewall.svg',
  nsg: '/azure-icons/nsg.svg',
  bastion: '/azure-icons/bastion.svg',
  'nat-gateway': '/azure-icons/nat-gateway.svg',
  'public-ip': '/azure-icons/public-ip.svg',
  'route-table': '/azure-icons/route-table.svg',
  'private-endpoint': '/azure-icons/private-endpoint.svg',
  'app-gateway': '/azure-icons/application-gateway.svg',
};

const VENDOR_ICON_REGISTRY: Record<ProviderType, Record<string, string>> = {
  azure: AZURE_SUBTYPE_ICONS,
  aws: {},
  gcp: {},
};

export function getBlockIconUrl(
  provider: ProviderType,
  _category: ResourceCategory,
  subtype?: string,
): string | null {
  if (!subtype) return null;
  return VENDOR_ICON_REGISTRY[provider]?.[subtype] ?? null;
}

export function getResourceIconUrl(resourceType: string, provider: ProviderType): string | null {
  if (provider !== 'azure') return null;
  return AZURE_RESOURCE_ICONS[resourceType] ?? null;
}

// ─── Subtype Display Labels ─────────────────────────────────

const SUBTYPE_LABELS: Record<string, Record<string, string>> = {
  azure: {
    vm: 'Virtual Machine',
    'app-service': 'App Service',
    functions: 'Functions',
    aks: 'Kubernetes Service',
    'container-instances': 'Container Instances',
    'sql-database': 'SQL Database',
    'azure-synapse': 'Synapse Analytics',
    'cosmos-db': 'Cosmos DB',
    'blob-storage': 'Storage Account',
    vnet: 'Virtual Network',
    subnet: 'Subnet',
    'application-gateway': 'Application Gateway',
    'front-door': 'Front Door',
    'nat-gateway': 'NAT Gateway',
    'azure-dns': 'DNS Zone',
    'azure-firewall': 'Firewall',
    'azure-cache-for-redis': 'Azure Cache for Redis',
    'service-bus': 'Service Bus',
    'event-grid': 'Event Grid',
    'event-hubs': 'Event Hubs',
    'entra-id': 'Entra ID',
    'azure-monitor': 'Monitor',
    'iot-hub': 'IoT Hub',
    'key-vault': 'Key Vault',
    'managed-identity': 'Managed Identity',
    nsg: 'Network Security Group',
    bastion: 'Bastion',
    'public-ip': 'Public IP',
    'route-table': 'Route Table',
    'private-endpoint': 'Private Endpoint',
    'load-balancer': 'Load Balancer',
    'cdn-profile': 'CDN Profile',
  },
  aws: {
    ec2: 'EC2',
    lambda: 'Lambda',
    ecs: 'ECS',
    eks: 'EKS',
    'rds-postgres': 'RDS',
    dynamodb: 'DynamoDB',
    elasticache: 'ElastiCache',
    redshift: 'Redshift',
    s3: 'S3',
    vpc: 'VPC',
    'route-53': 'Route 53',
    cloudfront: 'CloudFront',
    alb: 'ALB',
    elb: 'ELB',
    'api-gateway': 'API GW',
    'nat-gateway': 'NAT GW',
    sqs: 'SQS',
    sns: 'SNS',
    eventbridge: 'EventBridge',
    iam: 'IAM',
    kms: 'KMS',
    kinesis: 'Kinesis',
    athena: 'Athena',
    sagemaker: 'SageMaker',
    cloudwatch: 'CloudWatch',
  },
  gcp: {
    'compute-engine': 'Compute',
    gke: 'GKE',
    'cloud-functions': 'Functions',
    'cloud-sql-postgres': 'Cloud SQL',
    'cloud-spanner': 'Spanner',
    'cloud-storage': 'GCS',
    memorystore: 'Memorystore',
    'cloud-load-balancing': 'Load Bal.',
    'cloud-cdn': 'CDN',
    'cloud-armor': 'Armor',
    vpc: 'VPC',
    'cloud-dns': 'DNS',
    bigquery: 'BigQuery',
    dataflow: 'Dataflow',
    'pub-sub': 'Pub/Sub',
    eventarc: 'Eventarc',
    'cloud-monitoring': 'Monitoring',
    'cloud-iam': 'IAM',
  },
};

export function getSubtypeDisplayLabel(provider: ProviderType, subtype?: string): string | null {
  if (!subtype) return null;
  return SUBTYPE_LABELS[provider]?.[subtype] ?? null;
}

// ─── Subtype Short Labels (block face abbreviations) ────────

const SUBTYPE_SHORT_LABELS: Record<string, Record<string, string>> = {
  azure: {
    vm: 'VM',
    'app-service': 'App Service',
    functions: 'Functions',
    aks: 'AKS',
    'container-instances': 'ACI',
    'sql-database': 'SQL',
    'azure-synapse': 'Synapse',
    'cosmos-db': 'Cosmos DB',
    'blob-storage': 'Storage',
    vnet: 'VNet',
    subnet: 'Subnet',
    'application-gateway': 'AGW',
    'front-door': 'Front Door',
    'nat-gateway': 'NAT GW',
    'azure-dns': 'DNS',
    'azure-firewall': 'Firewall',
    'azure-cache-for-redis': 'Redis',
    'service-bus': 'Service Bus',
    'event-grid': 'Event Grid',
    'event-hubs': 'Event Hubs',
    'entra-id': 'Entra ID',
    'azure-monitor': 'Monitor',
    'iot-hub': 'IoT Hub',
    'key-vault': 'Key Vault',
    'managed-identity': 'Managed ID',
    nsg: 'NSG',
    bastion: 'Bastion',
    'public-ip': 'PIP',
    'route-table': 'Route Table',
    'private-endpoint': 'PE',
    'load-balancer': 'ILB',
    'cdn-profile': 'CDN',
  },
  aws: {},
  gcp: {},
};

/**
 * Get abbreviated label for block face rendering.
 * Returns a short label suitable for the limited space on isometric block walls.
 */
export function getSubtypeShortLabel(provider: ProviderType, subtype?: string): string | null {
  if (!subtype) return null;
  return SUBTYPE_SHORT_LABELS[provider]?.[subtype] ?? null;
}

// ─── ContainerBlock Icon Maps ─────────────────────────────────────────

/** ContainerBlock type → icon mapping. */
type ContainerLayer = Exclude<LayerType, 'resource'>;

const CONTAINER_LAYER_ICONS: Record<ContainerLayer, string> = {
  global: vnetIcon,
  edge: vnetIcon,
  region: vnetIcon,
  zone: vnetIcon,
  subnet: subnetIcon,
};

/**
 * Resolve the SVG icon URL for a container.
 *
 * Subnet container blocks always use the subnet icon regardless of access level.
 * Network-layer container blocks (global, edge, region, zone) use the VNet icon.
 *
 * @returns An SVG asset URL string (Vite-resolved)
 */
export function getContainerBlockIconUrl(containerLayer: LayerType): string {
  if (containerLayer === 'resource') {
    return vnetIcon;
  }
  return CONTAINER_LAYER_ICONS[containerLayer] ?? vnetIcon;
}

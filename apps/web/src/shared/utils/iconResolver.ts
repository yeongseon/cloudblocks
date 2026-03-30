import type { LayerType, ProviderType, ResourceCategory } from '@cloudblocks/schema';

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

const AWS_SUBTYPE_ICONS: Record<string, string> = {
  ec2: '/aws-icons/ec2.svg',
  lambda: '/aws-icons/lambda.svg',
  ecs: '/aws-icons/ecs.svg',
  eks: '/aws-icons/eks.svg',
  'rds-postgres': '/aws-icons/rds.svg',
  dynamodb: '/aws-icons/dynamodb.svg',
  elasticache: '/aws-icons/elasticache.svg',
  redshift: '/aws-icons/redshift.svg',
  s3: '/aws-icons/s3.svg',
  vpc: '/aws-icons/vpc.svg',
  subnet: '/aws-icons/subnet.svg',
  'route-53': '/aws-icons/route-53.svg',
  cloudfront: '/aws-icons/cloudfront.svg',
  alb: '/aws-icons/alb.svg',
  elb: '/aws-icons/elb.svg',
  'api-gateway': '/aws-icons/api-gateway.svg',
  'nat-gateway': '/aws-icons/nat-gateway.svg',
  sqs: '/aws-icons/sqs.svg',
  sns: '/aws-icons/sns.svg',
  eventbridge: '/aws-icons/eventbridge.svg',
  iam: '/aws-icons/iam.svg',
  kms: '/aws-icons/kms.svg',
  kinesis: '/aws-icons/kinesis.svg',
  athena: '/aws-icons/athena.svg',
  sagemaker: '/aws-icons/sagemaker.svg',
  cloudwatch: '/aws-icons/cloudwatch.svg',
  'network-firewall': '/aws-icons/network-firewall.svg',
  'security-group': '/aws-icons/security-group.svg',
  'session-manager': '/aws-icons/session-manager.svg',
  'elastic-ip': '/aws-icons/elastic-ip.svg',
  'route-table': '/aws-icons/route-table.svg',
  privatelink: '/aws-icons/privatelink.svg',
};

const GCP_SUBTYPE_ICONS: Record<string, string> = {
  'compute-engine': '/gcp-icons/compute-engine.svg',
  gke: '/gcp-icons/gke.svg',
  'cloud-functions': '/gcp-icons/cloud-functions.svg',
  'cloud-sql-postgres': '/gcp-icons/cloud-sql.svg',
  'cloud-spanner': '/gcp-icons/cloud-spanner.svg',
  'cloud-storage': '/gcp-icons/cloud-storage.svg',
  memorystore: '/gcp-icons/memorystore.svg',
  'cloud-load-balancing': '/gcp-icons/cloud-load-balancing.svg',
  'cloud-cdn': '/gcp-icons/cloud-cdn.svg',
  'cloud-armor': '/gcp-icons/cloud-armor.svg',
  vpc: '/gcp-icons/vpc.svg',
  subnet: '/gcp-icons/vpc.svg',
  'cloud-dns': '/gcp-icons/cloud-dns.svg',
  bigquery: '/gcp-icons/bigquery.svg',
  dataflow: '/gcp-icons/dataflow.svg',
  'pub-sub': '/gcp-icons/pub-sub.svg',
  eventarc: '/gcp-icons/eventarc.svg',
  'cloud-monitoring': '/gcp-icons/cloud-monitoring.svg',
  'cloud-iam': '/gcp-icons/cloud-iam.svg',
  'cloud-nat': '/gcp-icons/cloud-nat.svg',
  firestore: '/gcp-icons/firestore.svg',
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
  monitor: '/azure-icons/monitor.svg',
  redis: '/azure-icons/cache-redis.svg',
};

// AWS/GCP resource-type → icon maps (parallel to AZURE_RESOURCE_ICONS)
// These use the same resource-type keys that the sidebar palette passes.
const AWS_RESOURCE_ICONS: Record<string, string> = {
  network: '/aws-icons/vpc.svg',
  subnet: '/aws-icons/subnet.svg',
  storage: '/aws-icons/s3.svg',
  dns: '/aws-icons/route-53.svg',
  cdn: '/aws-icons/cloudfront.svg',
  'front-door': '/aws-icons/cloudfront.svg',
  sql: '/aws-icons/rds.svg',
  function: '/aws-icons/lambda.svg',
  queue: '/aws-icons/sqs.svg',
  event: '/aws-icons/eventbridge.svg',
  'app-service': '/aws-icons/ec2.svg',
  'container-instances': '/aws-icons/ecs.svg',
  'cosmos-db': '/aws-icons/dynamodb.svg',
  'key-vault': '/aws-icons/kms.svg',
  'managed-identity': '/aws-icons/iam.svg',
  vm: '/aws-icons/ec2.svg',
  aks: '/aws-icons/eks.svg',
  'internal-lb': '/aws-icons/elb.svg',
  firewall: '/aws-icons/network-firewall.svg',
  nsg: '/aws-icons/security-group.svg',
  bastion: '/aws-icons/session-manager.svg',
  'nat-gateway': '/aws-icons/nat-gateway.svg',
  'public-ip': '/aws-icons/elastic-ip.svg',
  'route-table': '/aws-icons/route-table.svg',
  'private-endpoint': '/aws-icons/privatelink.svg',
  'app-gateway': '/aws-icons/alb.svg',
  monitor: '/aws-icons/cloudwatch.svg',
  redis: '/aws-icons/elasticache.svg',
};

const GCP_RESOURCE_ICONS: Record<string, string> = {
  network: '/gcp-icons/vpc.svg',
  subnet: '/gcp-icons/vpc.svg',
  storage: '/gcp-icons/cloud-storage.svg',
  dns: '/gcp-icons/cloud-dns.svg',
  cdn: '/gcp-icons/cloud-cdn.svg',
  'front-door': '/gcp-icons/cloud-cdn.svg',
  sql: '/gcp-icons/cloud-sql.svg',
  function: '/gcp-icons/cloud-functions.svg',
  queue: '/gcp-icons/pub-sub.svg',
  event: '/gcp-icons/eventarc.svg',
  'app-service': '/gcp-icons/compute-engine.svg',
  'container-instances': '/gcp-icons/cloud-functions.svg',
  'cosmos-db': '/gcp-icons/firestore.svg',
  'key-vault': '/gcp-icons/cloud-iam.svg',
  'managed-identity': '/gcp-icons/cloud-iam.svg',
  vm: '/gcp-icons/compute-engine.svg',
  aks: '/gcp-icons/gke.svg',
  'internal-lb': '/gcp-icons/cloud-load-balancing.svg',
  firewall: '/gcp-icons/cloud-armor.svg',
  nsg: '/gcp-icons/cloud-armor.svg',
  bastion: '/gcp-icons/cloud-iam.svg',
  'nat-gateway': '/gcp-icons/cloud-nat.svg',
  'public-ip': '/gcp-icons/vpc.svg',
  'route-table': '/gcp-icons/vpc.svg',
  'private-endpoint': '/gcp-icons/vpc.svg',
  'app-gateway': '/gcp-icons/cloud-load-balancing.svg',
  monitor: '/gcp-icons/cloud-monitoring.svg',
  redis: '/gcp-icons/memorystore.svg',
};

const AWS_GCP_RESOURCE_ICONS: Partial<Record<ProviderType, Record<string, string>>> = {
  aws: AWS_RESOURCE_ICONS,
  gcp: GCP_RESOURCE_ICONS,
};

const VENDOR_ICON_REGISTRY: Record<ProviderType, Record<string, string>> = {
  azure: AZURE_SUBTYPE_ICONS,
  aws: AWS_SUBTYPE_ICONS,
  gcp: GCP_SUBTYPE_ICONS,
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
  // For Azure, use the legacy resource-type → icon mapping
  if (provider === 'azure') {
    return AZURE_RESOURCE_ICONS[resourceType] ?? null;
  }
  // For AWS/GCP, resolve via the subtype icon registry using remapSubtype
  // The resourceType from RESOURCE_DEFINITIONS has an azureSubtype field;
  // we need to find the matching Azure subtype and remap it to the vendor subtype.
  // Since sidebar calls this with resource category keys (e.g. 'vm', 'function'),
  // we first check if it exists directly in AZURE_RESOURCE_ICONS (to get the Azure subtype),
  // then remap that subtype to the vendor equivalent.
  //
  // However, the sidebar also passes RESOURCE_DEFINITIONS keys like 'vm', 'function', 'sql', etc.
  // We need a reverse lookup: given a resource type key, find the Azure subtype, remap it,
  // and look up in the vendor registry.
  //
  // Simpler approach: build AWS/GCP resource-type → icon maps parallel to AZURE_RESOURCE_ICONS.
  return (
    (AWS_GCP_RESOURCE_ICONS[provider] as Record<string, string> | undefined)?.[resourceType] ?? null
  );
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
    subnet: 'Subnet',
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
    'network-firewall': 'Network Firewall',
    'security-group': 'Security Group',
    'session-manager': 'Session Manager',
    'elastic-ip': 'Elastic IP',
    'route-table': 'Route Table',
    privatelink: 'PrivateLink',
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
    subnet: 'Subnet',
    'cloud-dns': 'DNS',
    bigquery: 'BigQuery',
    dataflow: 'Dataflow',
    'pub-sub': 'Pub/Sub',
    eventarc: 'Eventarc',
    'cloud-monitoring': 'Monitoring',
    'cloud-iam': 'IAM',
    'cloud-nat': 'Cloud NAT',
    firestore: 'Firestore',
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
  aws: {
    ec2: 'EC2',
    lambda: 'Lambda',
    ecs: 'ECS',
    eks: 'EKS',
    'rds-postgres': 'RDS',
    dynamodb: 'DDB',
    elasticache: 'Cache',
    redshift: 'RS',
    s3: 'S3',
    vpc: 'VPC',
    subnet: 'Subnet',
    'route-53': 'R53',
    cloudfront: 'CF',
    alb: 'ALB',
    elb: 'ELB',
    'api-gateway': 'APIGW',
    'nat-gateway': 'NAT',
    sqs: 'SQS',
    sns: 'SNS',
    eventbridge: 'EvBridge',
    iam: 'IAM',
    kms: 'KMS',
    kinesis: 'Kinesis',
    athena: 'Athena',
    sagemaker: 'SM',
    cloudwatch: 'CW',
    'network-firewall': 'NFW',
    'security-group': 'SG',
    'session-manager': 'SSM',
    'elastic-ip': 'EIP',
    'route-table': 'RT',
    privatelink: 'PL',
  },
  gcp: {
    'compute-engine': 'GCE',
    gke: 'GKE',
    'cloud-functions': 'GCF',
    'cloud-sql-postgres': 'SQL',
    'cloud-spanner': 'Spanner',
    'cloud-storage': 'GCS',
    memorystore: 'Mem',
    'cloud-load-balancing': 'CLB',
    'cloud-cdn': 'CDN',
    'cloud-armor': 'Armor',
    vpc: 'VPC',
    subnet: 'Subnet',
    'cloud-dns': 'DNS',
    bigquery: 'BQ',
    dataflow: 'DF',
    'pub-sub': 'PubSub',
    eventarc: 'Eventarc',
    'cloud-monitoring': 'Monitor',
    'cloud-iam': 'IAM',
    'cloud-nat': 'NAT',
    firestore: 'Firestore',
  },
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

/** ContainerBlock type → icon mapping, per provider. */
type ContainerLayer = Exclude<LayerType, 'resource'>;

const CONTAINER_LAYER_ICONS: Record<ProviderType, Record<ContainerLayer, string>> = {
  azure: {
    global: '/azure-icons/virtual-network.svg',
    edge: '/azure-icons/virtual-network.svg',
    region: '/azure-icons/virtual-network.svg',
    zone: '/azure-icons/virtual-network.svg',
    subnet: '/azure-icons/subnet.svg',
  },
  aws: {
    global: '/aws-icons/vpc.svg',
    edge: '/aws-icons/vpc.svg',
    region: '/aws-icons/vpc.svg',
    zone: '/aws-icons/vpc.svg',
    subnet: '/aws-icons/subnet.svg',
  },
  gcp: {
    global: '/gcp-icons/vpc.svg',
    edge: '/gcp-icons/vpc.svg',
    region: '/gcp-icons/vpc.svg',
    zone: '/gcp-icons/vpc.svg',
    subnet: '/gcp-icons/vpc.svg',
  },
};

/**
 * Resolve the SVG icon URL for a container block.
 *
 * Provider-aware: Azure uses VNet/Subnet icons, AWS uses VPC icons, GCP uses VPC icons.
 *
 * @returns An SVG asset URL string (Vite-resolved)
 */
export function getContainerBlockIconUrl(
  containerLayer: LayerType,
  provider: ProviderType = 'azure',
): string {
  const fallback = CONTAINER_LAYER_ICONS[provider].region;
  if (containerLayer === 'resource') {
    return fallback;
  }
  return CONTAINER_LAYER_ICONS[provider][containerLayer as ContainerLayer] ?? fallback;
}

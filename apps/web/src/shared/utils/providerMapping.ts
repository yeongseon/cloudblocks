/**
 * Provider Mapping Utility
 *
 * Maps Azure-centric template data (subtypes, names, container labels)
 * to AWS and GCP equivalents. Used when loading templates or importing
 * architectures into a workspace whose active provider is not Azure.
 */
import type { ProviderType } from '@cloudblocks/schema';

// ─── Azure Subtype → Provider Subtype Mapping ──────────────
// Keys = Azure subtypes (as used in builtin templates and RESOURCE_DEFINITIONS.azureSubtype)
// Values = equivalent subtypes matching AWS_SUBTYPE_ICONS / GCP_SUBTYPE_ICONS in iconResolver.ts

const AZURE_TO_AWS_SUBTYPE: Record<string, string> = {
  // Network / Containers
  vnet: 'vpc',
  subnet: 'subnet',
  'nat-gateway': 'nat-gateway',
  'route-table': 'route-table',
  'public-ip': 'elastic-ip',
  'private-endpoint': 'privatelink',
  // Delivery
  'application-gateway': 'alb',
  'front-door': 'cloudfront',
  'cdn-profile': 'cloudfront',
  'load-balancer': 'elb',
  // Compute
  vm: 'ec2',
  'app-service': 'elastic-beanstalk',
  functions: 'lambda',
  aks: 'eks',
  'container-instances': 'ecs',
  // Data
  'sql-database': 'rds-postgres',
  'cosmos-db': 'dynamodb',
  'blob-storage': 's3',
  'azure-cache-for-redis': 'elasticache',
  'redis-cache': 'elasticache',
  // Messaging
  'service-bus': 'sqs',
  'event-hubs': 'eventbridge',
  'event-grid': 'eventbridge',
  // Scheduling / API Management
  'api-management': 'api-gateway',
  'timer-trigger': 'eventbridge-scheduler',
  'azure-postgresql': 'rds-postgres',
  // Security
  'azure-firewall': 'network-firewall',
  nsg: 'security-group',
  'key-vault': 'kms',
  bastion: 'session-manager',
  // Identity
  'managed-identity': 'iam',
  'entra-id': 'iam',
  // Operations
  'azure-monitor': 'cloudwatch',
  // DNS
  'azure-dns': 'route-53',
  // Misc
  'azure-synapse': 'redshift',
  'iot-hub': 'kinesis',
};

const AZURE_TO_GCP_SUBTYPE: Record<string, string> = {
  // Network / Containers
  vnet: 'vpc',
  subnet: 'subnet',
  'nat-gateway': 'cloud-nat',
  'route-table': 'vpc',
  'public-ip': 'vpc',
  'private-endpoint': 'vpc',
  // Delivery
  'application-gateway': 'cloud-load-balancing',
  'front-door': 'cloud-cdn',
  'cdn-profile': 'cloud-cdn',
  'load-balancer': 'cloud-load-balancing',
  // Compute
  vm: 'compute-engine',
  'app-service': 'app-engine',
  functions: 'cloud-functions',
  aks: 'gke',
  'container-instances': 'cloud-run',
  // Data
  'sql-database': 'cloud-sql-postgres',
  'cosmos-db': 'firestore',
  'blob-storage': 'cloud-storage',
  'azure-cache-for-redis': 'memorystore',
  'redis-cache': 'memorystore',
  // Messaging
  'service-bus': 'pubsub',
  'event-hubs': 'eventarc',
  'event-grid': 'eventarc',
  // Scheduling / API Management
  'api-management': 'api-gateway',
  'timer-trigger': 'cloud-scheduler',
  'azure-postgresql': 'cloud-sql-postgres',
  // Security
  'azure-firewall': 'cloud-armor',
  nsg: 'cloud-armor',
  'key-vault': 'cloud-iam',
  bastion: 'cloud-iam',
  // Identity
  'managed-identity': 'cloud-iam',
  'entra-id': 'cloud-iam',
  // Operations
  'azure-monitor': 'cloud-monitoring',
  // DNS
  'azure-dns': 'cloud-dns',
  // Misc
  'azure-synapse': 'bigquery',
  'iot-hub': 'pubsub',
};

const PROVIDER_SUBTYPE_MAP: Record<ProviderType, Record<string, string>> = {
  azure: {}, // identity — Azure subtypes pass through unchanged
  aws: AZURE_TO_AWS_SUBTYPE,
  gcp: AZURE_TO_GCP_SUBTYPE,
};

/**
 * Remap an Azure subtype to the equivalent subtype for the given provider.
 * Returns the original subtype if no mapping exists (passthrough).
 */
export function remapSubtype(azureSubtype: string, provider: ProviderType): string {
  if (provider === 'azure') return azureSubtype;
  return PROVIDER_SUBTYPE_MAP[provider][azureSubtype] ?? azureSubtype;
}

// ─── Azure Resource Name → Provider Name Mapping ──────────
// Maps Azure-specific display names to provider-appropriate names.
// Keyed by Azure subtype for easy lookup from template nodes.

const AZURE_TO_AWS_NAME: Record<string, string> = {
  vnet: 'VPC',
  subnet: 'Subnet',
  'application-gateway': 'Application Load Balancer',
  vm: 'EC2 Instance',
  'app-service': 'AWS Elastic Beanstalk',
  functions: 'AWS Lambda',
  aks: 'Amazon EKS',
  'container-instances': 'Amazon ECS',
  'sql-database': 'Amazon RDS',
  'cosmos-db': 'Amazon DynamoDB',
  'blob-storage': 'Amazon S3',
  'azure-cache-for-redis': 'Amazon ElastiCache',
  'redis-cache': 'Amazon ElastiCache',
  'service-bus': 'Amazon SQS',
  'event-hubs': 'Amazon EventBridge',
  'event-grid': 'Amazon EventBridge',
  'azure-firewall': 'AWS Network Firewall',
  nsg: 'Security Group',
  'key-vault': 'AWS KMS',
  bastion: 'AWS Session Manager',
  'managed-identity': 'IAM Role',
  'entra-id': 'AWS IAM',
  'azure-monitor': 'Amazon CloudWatch',
  'azure-dns': 'Amazon Route 53',
  'front-door': 'Amazon CloudFront',
  'cdn-profile': 'Amazon CloudFront',
  'load-balancer': 'Elastic Load Balancer',
  'nat-gateway': 'NAT Gateway',
  'route-table': 'Route Table',
  'public-ip': 'Elastic IP',
  'private-endpoint': 'AWS PrivateLink',
  'azure-synapse': 'Amazon Redshift',
  'iot-hub': 'Amazon Kinesis',
  'api-management': 'Amazon API Gateway',
  'timer-trigger': 'Amazon EventBridge Scheduler',
  'azure-postgresql': 'Amazon RDS for PostgreSQL',
};

const AZURE_TO_GCP_NAME: Record<string, string> = {
  vnet: 'VPC Network',
  subnet: 'Subnet',
  'application-gateway': 'Cloud Load Balancing',
  vm: 'Compute Engine',
  'app-service': 'App Engine',
  functions: 'Cloud Functions',
  aks: 'Google Kubernetes Engine',
  'container-instances': 'Cloud Run',
  'sql-database': 'Cloud SQL',
  'cosmos-db': 'Firestore',
  'blob-storage': 'Cloud Storage',
  'azure-cache-for-redis': 'Memorystore',
  'redis-cache': 'Memorystore',
  'service-bus': 'Pub/Sub',
  'event-hubs': 'Eventarc',
  'event-grid': 'Eventarc',
  'azure-firewall': 'Cloud Armor',
  nsg: 'Cloud Armor',
  'key-vault': 'Cloud IAM',
  bastion: 'Cloud IAM',
  'managed-identity': 'Service Account',
  'entra-id': 'Cloud IAM',
  'azure-monitor': 'Cloud Monitoring',
  'azure-dns': 'Cloud DNS',
  'front-door': 'Cloud CDN',
  'cdn-profile': 'Cloud CDN',
  'load-balancer': 'Cloud Load Balancing',
  'nat-gateway': 'Cloud NAT',
  'route-table': 'VPC Routes',
  'public-ip': 'External IP',
  'private-endpoint': 'Private Service Connect',
  'azure-synapse': 'BigQuery',
  'iot-hub': 'Pub/Sub',
  'api-management': 'API Gateway',
  'timer-trigger': 'Cloud Scheduler',
  'azure-postgresql': 'Cloud SQL for PostgreSQL',
};

const PROVIDER_NAME_MAP: Record<ProviderType, Record<string, string>> = {
  azure: {},
  aws: AZURE_TO_AWS_NAME,
  gcp: AZURE_TO_GCP_NAME,
};

/**
 * Remap an Azure resource display name to the equivalent for the given provider.
 * Uses the Azure subtype as key. Returns original name if no mapping exists.
 */
export function remapName(
  azureSubtype: string,
  originalName: string,
  provider: ProviderType,
): string {
  if (provider === 'azure') return originalName;
  const mapped = PROVIDER_NAME_MAP[provider][azureSubtype];
  if (!mapped) return originalName;

  // Preserve parenthetical suffixes from original name (e.g. "Azure Functions (Worker)" → "AWS Lambda (Worker)")
  const parenMatch = originalName.match(/\s*\(([^)]+)\)\s*$/);
  return parenMatch ? `${mapped} (${parenMatch[1]})` : mapped;
}

// ─── Container Name Mapping ─────────────────────────────────

const CONTAINER_NAMES: Record<ProviderType, Record<string, string>> = {
  azure: { region: 'VNet', subnet: 'Subnet' },
  aws: { region: 'VPC', subnet: 'Subnet' },
  gcp: { region: 'VPC Network', subnet: 'Subnet' },
};

/**
 * Get the provider-appropriate container label for a given layer.
 * Only region and subnet have provider-specific names; others pass through.
 */
export function getContainerLabel(layer: string, provider: ProviderType): string | null {
  return CONTAINER_NAMES[provider]?.[layer] ?? null;
}

// ─── Container Short Labels (for block face rendering) ──────

const CONTAINER_SHORT_LABELS: Record<ProviderType, Record<string, string>> = {
  azure: { global: 'Global', edge: 'Edge', region: 'VNet', zone: 'Zone', subnet: 'Subnet' },
  aws: { global: 'Global', edge: 'Edge', region: 'VPC', zone: 'Zone', subnet: 'Subnet' },
  gcp: { global: 'Global', edge: 'Edge', region: 'VPC', zone: 'Zone', subnet: 'Subnet' },
};

/**
 * Get provider-aware short label for container block face rendering.
 */
export function getContainerShortLabel(layer: string, provider: ProviderType): string {
  return CONTAINER_SHORT_LABELS[provider]?.[layer] ?? layer;
}

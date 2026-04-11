import type {
  ArchitectureModel,
  ContainerBlock,
  ResourceBlock,
  ResourceCategory,
} from '@cloudblocks/schema';
import type { ValidationError } from '@cloudblocks/domain';

const KNOWN_SUBTYPES: Record<string, Partial<Record<ResourceCategory, string[]>>> = {
  aws: {
    compute: ['ec2', 'ecs', 'lambda', 'elastic-beanstalk', 'app-runner'],
    data: ['rds-postgres', 'dynamodb', 's3'],
    delivery: ['alb', 'api-gateway', 'nat-gateway'],
    messaging: ['sqs', 'sns', 'eventbridge', 'eventbridge-scheduler'],
    operations: ['cloudwatch', 'athena'],
    security: ['iam', 'kms', 'nsg'],
    identity: [
      'managed-identity',
      'managed_identity',
      'service-account',
      'service_account',
      'service-principal',
      'service_principal',
    ],
    network: ['vpc', 'route-53'],
  },
  gcp: {
    compute: ['compute-engine', 'cloud-run', 'cloud-functions', 'app-engine'],
    data: ['cloud-sql-postgres', 'firestore', 'cloud-storage'],
    delivery: ['cloud-load-balancing', 'api-gateway', 'nat-gateway'],
    messaging: ['pubsub', 'eventarc', 'cloud-scheduler'],
    operations: ['bigquery', 'monitoring', 'cloud-monitoring'],
    security: ['iam', 'nsg', 'cloud-armor'],
    identity: [
      'managed-identity',
      'managed_identity',
      'service-account',
      'service_account',
      'cloud-iam',
    ],
    network: ['vpc', 'cloud-dns'],
  },
  azure: {
    compute: ['vm', 'container-instances', 'functions', 'app-service'],
    data: ['sql-database', 'cosmos-db', 'blob-storage', 'azure-postgresql'],
    delivery: ['application-gateway', 'api-management'],
    messaging: ['service-bus', 'event-grid', 'event-hubs', 'timer-trigger'],
    operations: ['azure-monitor'],
    security: ['azure-firewall', 'entra-id'],
    identity: ['managed_identity', 'service_account', 'service_principal'],
    network: ['vnet', 'azure-dns'],
  },
};

function validateBlockProviderRules(
  block: ResourceBlock,
  container: ContainerBlock | undefined,
): ValidationError[] {
  const warnings: ValidationError[] = [];

  if (block.provider === 'aws' && block.subtype === 'lambda' && container?.layer === 'subnet') {
    warnings.push({
      ruleId: 'rule-provider-aws-lambda-subnet',
      severity: 'warning',
      message: `AWS Lambda "${block.name}" is inside a subnet.`,
      suggestion:
        "Lambda is serverless — it usually doesn't need VPC placement. If you need private resource access, keep it here; otherwise, consider placing it outside the subnet.",
      targetId: block.id,
    });
  }

  if (
    block.provider === 'gcp' &&
    block.subtype === 'cloud-sql-postgres' &&
    container?.layer === 'subnet'
  ) {
    warnings.push({
      ruleId: 'rule-provider-gcp-sql-public',
      severity: 'warning',
      message: `GCP Cloud SQL "${block.name}" is on a subnet without explicit security.`,
      suggestion:
        'Database instances should be protected with VPC firewall rules or private service access. This is a reminder to configure network security for your database.',
      targetId: block.id,
    });
  }

  if (block.provider && block.subtype) {
    const providerSubtypes = KNOWN_SUBTYPES[block.provider];
    const categorySubtypes = providerSubtypes?.[block.category];

    if (categorySubtypes && !categorySubtypes.includes(block.subtype)) {
      warnings.push({
        ruleId: 'rule-provider-unknown-subtype',
        severity: 'warning',
        message: `"${block.name}" uses an unrecognized subtype "${block.subtype}" for ${block.provider} ${block.category}.`,
        suggestion: `This subtype may not be a standard ${block.provider} service. Check available subtypes for ${block.provider} ${block.category} resources, or verify the spelling.`,
        targetId: block.id,
      });
    }
  }

  return warnings;
}

export function validateProviderRules(model: ArchitectureModel): ValidationError[] {
  const warnings: ValidationError[] = [];
  const blocks = model.nodes.filter((n): n is ResourceBlock => n.kind === 'resource');
  const plates = model.nodes.filter((n): n is ContainerBlock => n.kind === 'container');

  for (const block of blocks) {
    const container = plates.find((p) => p.id === block.parentId);
    warnings.push(...validateBlockProviderRules(block, container));
  }

  return warnings;
}

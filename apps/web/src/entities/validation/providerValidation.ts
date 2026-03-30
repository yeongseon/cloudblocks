import type {
  ArchitectureModel,
  ContainerBlock,
  ResourceBlock,
  ResourceCategory,
} from '@cloudblocks/schema';
import type { ValidationError } from '@cloudblocks/domain';

const KNOWN_SUBTYPES: Record<string, Partial<Record<ResourceCategory, string[]>>> = {
  aws: {
    compute: ['ec2', 'ecs', 'lambda'],
    data: ['rds-postgres', 'dynamodb', 's3'],
    delivery: ['alb', 'api-gateway', 'nat-gateway'],
    messaging: ['sqs', 'sns', 'eventbridge'],
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
    compute: ['compute-engine', 'cloud-run', 'cloud-functions'],
    data: ['cloud-sql-postgres', 'firestore', 'cloud-storage'],
    delivery: ['cloud-load-balancing', 'api-gateway'],
    messaging: ['pub-sub', 'eventarc'],
    operations: ['cloud-monitoring', 'cloud-iam'],
    identity: ['service_account'],
    network: ['vpc', 'cloud-dns'],
  },
  azure: {
    compute: ['vm', 'container-instances', 'functions'],
    data: ['sql-database', 'cosmos-db', 'blob-storage'],
    delivery: ['application-gateway', 'api-management'],
    messaging: ['service-bus', 'event-grid', 'event-hubs'],
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
      message: `AWS Lambda "${block.name}" is placed on a subnet. Lambda functions are serverless and typically don't require VPC placement unless accessing private resources.`,
      suggestion: 'Consider whether VPC placement is intentional for private resource access.',
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
      message: `GCP Cloud SQL "${block.name}" is on a subnet. Database instances should typically be secured with appropriate NSG rules.`,
      suggestion: 'Ensure proper network security group rules are applied to the subnet.',
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
        message: `Block "${block.name}" has unknown subtype "${block.subtype}" for ${block.provider} ${block.category}.`,
        suggestion: `Check available subtypes for ${block.provider} ${block.category} resources.`,
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

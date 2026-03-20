import type { ArchitectureModel, Block, Plate } from '@cloudblocks/schema';
import type { ValidationError } from '@cloudblocks/domain';

const KNOWN_SUBTYPES: Record<string, Record<string, string[]>> = {
  aws: {
    compute: ['ec2', 'ecs', 'lambda'],
    database: ['rds-postgres', 'dynamodb'],
    storage: ['s3'],
    gateway: ['alb', 'api-gateway'],
  },
  gcp: {
    compute: ['compute-engine', 'cloud-run', 'cloud-functions'],
    database: ['cloud-sql-postgres', 'firestore'],
    storage: ['cloud-storage'],
    gateway: ['cloud-load-balancing', 'api-gateway'],
  },
  azure: {
    compute: ['vm', 'container-instances', 'functions'],
    database: ['sql-database', 'cosmos-db'],
    storage: ['blob-storage'],
    gateway: ['application-gateway', 'api-management'],
  },
};

function validateBlockProviderRules(
  block: Block,
  plate: Plate | undefined
): ValidationError[] {
  const warnings: ValidationError[] = [];

  if (
    block.provider === 'aws' &&
    block.subtype === 'lambda' &&
    plate?.type === 'subnet'
  ) {
    warnings.push({
      ruleId: 'rule-provider-aws-lambda-subnet',
      severity: 'warning',
      message: `AWS Lambda "${block.name}" is placed on a subnet. Lambda functions are serverless and typically don't require VPC placement unless accessing private resources.`,
      suggestion:
        'Consider whether VPC placement is intentional for private resource access.',
      targetId: block.id,
    });
  }

  if (
    block.provider === 'gcp' &&
    block.subtype === 'cloud-sql-postgres' &&
    plate?.type === 'subnet' &&
    plate.subnetAccess === 'public'
  ) {
    warnings.push({
      ruleId: 'rule-provider-gcp-sql-public',
      severity: 'warning',
      message: `GCP Cloud SQL "${block.name}" is on a public subnet. Database instances should typically be on private subnets for security.`,
      suggestion: 'Move the database block to a private subnet.',
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

  for (const block of model.blocks) {
    const plate = model.plates.find((p) => p.id === block.placementId);
    warnings.push(...validateBlockProviderRules(block, plate));
  }

  return warnings;
}

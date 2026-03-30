import type {
  ProviderDefinition,
  SubtypeResourceMap,
  TerraformBlockContext,
  TerraformContainerContext,
  TerraformRenderContext,
} from '../../types';

// ─── Shared Data Sources ─────────────────────────────────────

function buildAwsSharedResources(_ctx: TerraformRenderContext): string[] {
  const lines: string[] = [];

  // SSM parameter for region-agnostic Amazon Linux 2 AMI lookup
  lines.push('data "aws_ssm_parameter" "amazon_linux_ami" {');
  lines.push('  name = "/aws/service/ami-amazon-linux-latest/amzn2-ami-hvm-x86_64-gp2"');
  lines.push('}');
  lines.push('');

  // Available AZs for the selected region
  lines.push('data "aws_availability_zones" "available" {');
  lines.push('  state = "available"');
  lines.push('}');
  lines.push('');

  return lines;
}

// ─── Container Body ──────────────────────────────────────────

function buildAwsContainerBody(ctx: TerraformContainerContext): string[] {
  const lines: string[] = [];

  if (ctx.container.layer !== 'subnet') {
    lines.push('  cidr_block           = "10.0.0.0/16"');
    lines.push('  enable_dns_support   = true');
    lines.push('  enable_dns_hostnames = true');
    lines.push('  tags = {');
    lines.push(`    Name = "\${var.project_name}-${ctx.resourceName}"`);
    lines.push('  }');
    return lines;
  }

  if (ctx.parentResourceName) {
    lines.push(`  vpc_id            = aws_vpc.${ctx.parentResourceName}.id`);

    const containers = ctx.normalized.architecture.nodes.filter((n) => n.kind === 'container');
    const siblingSubnets = containers.filter(
      (container) => container.layer === 'subnet' && container.parentId === ctx.container.parentId,
    );
    const cidrIndex =
      siblingSubnets.findIndex((container) => container.id === ctx.container.id) + 1;

    lines.push(`  cidr_block        = "10.0.${cidrIndex}.0/24"`);
  }

  lines.push('  availability_zone = data.aws_availability_zones.available.names[0]');
  lines.push('  tags = {');
  lines.push(`    Name = "\${var.project_name}-${ctx.resourceName}"`);
  lines.push('  }');

  return lines;
}

// ─── Block Body ──────────────────────────────────────────────

function findAncestorVpcName(ctx: TerraformBlockContext): string | null {
  const nodeById = new Map(ctx.normalized.architecture.nodes.map((node) => [node.id, node]));
  let cursorId = ctx.block.parentId;

  while (cursorId) {
    const node = nodeById.get(cursorId);
    if (!node || node.kind !== 'container') {
      break;
    }

    if (node.layer !== 'subnet') {
      return ctx.resourceNames.get(node.id) ?? null;
    }

    cursorId = node.parentId;
  }

  return null;
}

function buildAwsBlockBody(ctx: TerraformBlockContext): string[] {
  const lines: string[] = [];
  const tagName = `${'${var.project_name}'}-${ctx.resourceName}`;

  switch (ctx.mapping.resourceType) {
    case 'aws_instance':
      lines.push('  instance_type = "t3.micro"');
      lines.push('  ami           = data.aws_ssm_parameter.amazon_linux_ami.value');
      if (ctx.parentResourceName) {
        lines.push(`  subnet_id     = aws_subnet.${ctx.parentResourceName}.id`);
      }
      lines.push('  tags = {');
      lines.push(`    Name = "${tagName}"`);
      lines.push('  }');
      break;
    case 'aws_ecs_service':
      lines.push('  # TODO: ECS requires aws_ecs_cluster and aws_ecs_task_definition');
      lines.push('  # This resource cannot be planned without its dependencies.');
      lines.push('  # Configure cluster, task_definition, desired_count, and launch_type');
      break;
    case 'aws_lambda_function':
      lines.push('  # TODO: Lambda requires IAM execution role and deployment package');
      lines.push('  # This resource cannot be planned without its dependencies.');
      lines.push('  # Configure function_name, runtime, handler, role, and filename');
      break;
    case 'aws_db_instance':
      lines.push('  engine               = "postgres"');
      lines.push('  engine_version       = "14"');
      lines.push('  instance_class       = "db.t3.micro"');
      lines.push('  allocated_storage    = 20');
      lines.push('  db_name              = "appdb"');
      lines.push('  username             = var.db_admin_username');
      lines.push('  password             = var.db_admin_password');
      lines.push('  skip_final_snapshot  = true');
      lines.push('  tags = {');
      lines.push(`    Name = "${tagName}"`);
      lines.push('  }');
      break;
    case 'aws_dynamodb_table':
      lines.push('  billing_mode = "PAY_PER_REQUEST"');
      lines.push('  hash_key     = "id"');
      lines.push('  attribute {');
      lines.push('    name = "id"');
      lines.push('    type = "S"');
      lines.push('  }');
      lines.push('  tags = {');
      lines.push(`    Name = "${tagName}"`);
      lines.push('  }');
      break;
    case 'aws_s3_bucket': {
      const sanitizedResourceName = ctx.resourceName.replace(/_/g, '-');
      const trimmedPrefix = sanitizedResourceName.slice(0, 24);
      const hclReplace = '${replace(var.project_name, "_", "-")}';
      lines.push(`  bucket_prefix = "${hclReplace}-${trimmedPrefix}"`);
      lines.push('  tags = {');
      lines.push(`    Name = "${tagName}"`);
      lines.push('  }');
      break;
    }
    case 'aws_lb':
      lines.push('  # TODO: ALB requires aws_lb_target_group and aws_lb_listener');
      lines.push('  # This resource cannot be planned without its dependencies.');
      lines.push('  load_balancer_type = "application"');
      lines.push('  internal           = false');
      lines.push('  tags = {');
      lines.push(`    Name = "${tagName}"`);
      lines.push('  }');
      break;
    case 'aws_apigatewayv2_api':
      lines.push(`  name          = "${tagName}"`);
      lines.push('  protocol_type = "HTTP"');
      break;
    case 'aws_sqs_queue':
      lines.push(`  name = "${tagName}"`);
      lines.push('  tags = {');
      lines.push(`    Name = "${tagName}"`);
      lines.push('  }');
      break;
    case 'aws_sns_topic':
      lines.push(`  name = "${tagName}"`);
      lines.push('  tags = {');
      lines.push(`    Name = "${tagName}"`);
      lines.push('  }');
      break;
    case 'aws_security_group': {
      const vpcName = findAncestorVpcName(ctx);
      if (vpcName) {
        lines.push(`  vpc_id = aws_vpc.${vpcName}.id`);
      } else {
        lines.push(
          '  # ERROR: Security group requires a VPC ancestor. Place this block inside a VPC container.',
        );
      }
      lines.push('  egress {');
      lines.push('    from_port   = 0');
      lines.push('    to_port     = 0');
      lines.push('    protocol    = "-1"');
      lines.push('    cidr_blocks = ["0.0.0.0/0"]');
      lines.push('  }');
      lines.push('  tags = {');
      lines.push(`    Name = "${tagName}"`);
      lines.push('  }');
      break;
    }
    case 'aws_iam_role':
      lines.push(`  name = "${tagName}"`);
      lines.push('  assume_role_policy = jsonencode({');
      lines.push('    Version = "2012-10-17"');
      lines.push('    Statement = [');
      lines.push('      {');
      lines.push('        Effect = "Allow"');
      lines.push('        Principal = {');
      lines.push('          Service = "ec2.amazonaws.com"');
      lines.push('          # TODO: Replace principal based on your service needs');
      lines.push('        }');
      lines.push('        Action = "sts:AssumeRole"');
      lines.push('      }');
      lines.push('    ]');
      lines.push('  })');
      break;
    case 'aws_cloudwatch_dashboard':
      lines.push(`  dashboard_name = "${tagName}"`);
      lines.push('  dashboard_body = jsonencode({');
      lines.push('    widgets = []');
      lines.push('  })');
      break;
    case 'aws_nat_gateway':
      lines.push('  # TODO: NAT Gateway requires aws_eip');
      lines.push('  # This resource cannot be planned without its dependencies.');
      if (ctx.parentResourceName) {
        lines.push(`  subnet_id = aws_subnet.${ctx.parentResourceName}.id`);
      }
      lines.push('  tags = {');
      lines.push(`    Name = "${tagName}"`);
      lines.push('  }');
      break;
    case 'aws_iam_user':
      lines.push(`  name = "${tagName}"`);
      lines.push('  tags = {');
      lines.push(`    Name = "${tagName}"`);
      lines.push('  }');
      break;
    case 'aws_athena_workgroup':
      lines.push(`  name = "${tagName}"`);
      lines.push('  tags = {');
      lines.push(`    Name = "${tagName}"`);
      lines.push('  }');
      break;
    default:
      lines.push(`  # Configure ${ctx.mapping.resourceType}`);
      break;
  }

  return lines;
}

// ─── Subtype Block Mappings ──────────────────────────────────

const awsSubtypeBlockMappings: SubtypeResourceMap = {
  compute: {
    ec2: { resourceType: 'aws_instance', namePrefix: 'ec2' },
    ecs: { resourceType: 'aws_ecs_service', namePrefix: 'ecs' },
    lambda: { resourceType: 'aws_lambda_function', namePrefix: 'fn' },
  },
  data: {
    'rds-postgres': { resourceType: 'aws_db_instance', namePrefix: 'rds' },
    dynamodb: { resourceType: 'aws_dynamodb_table', namePrefix: 'ddb' },
    s3: { resourceType: 'aws_s3_bucket', namePrefix: 's3' },
  },
  delivery: {
    alb: { resourceType: 'aws_lb', namePrefix: 'alb' },
    'api-gateway': { resourceType: 'aws_apigatewayv2_api', namePrefix: 'apigw' },
    'nat-gateway': { resourceType: 'aws_nat_gateway', namePrefix: 'natgw' },
  },
  messaging: {
    sqs: { resourceType: 'aws_sqs_queue', namePrefix: 'queue' },
    sns: { resourceType: 'aws_sns_topic', namePrefix: 'topic' },
  },
  security: {
    iam: { resourceType: 'aws_iam_role', namePrefix: 'role' },
    nsg: { resourceType: 'aws_security_group', namePrefix: 'sg' },
  },
  identity: {
    'managed-identity': { resourceType: 'aws_iam_role', namePrefix: 'identity' },
    managed_identity: { resourceType: 'aws_iam_role', namePrefix: 'identity' },
    'service-account': { resourceType: 'aws_iam_user', namePrefix: 'svcacct' },
    service_account: { resourceType: 'aws_iam_user', namePrefix: 'svcacct' },
    'service-principal': { resourceType: 'aws_iam_role', namePrefix: 'svcpr' },
    service_principal: { resourceType: 'aws_iam_role', namePrefix: 'svcpr' },
  },
  operations: {
    cloudwatch: { resourceType: 'aws_cloudwatch_dashboard', namePrefix: 'dashboard' },
    athena: { resourceType: 'aws_athena_workgroup', namePrefix: 'analytics' },
  },
};

// ─── Provider Definition ─────────────────────────────────────

export const awsProviderDefinition: ProviderDefinition = {
  name: 'aws',
  displayName: 'AWS',
  blockMappings: {
    network: {
      resourceType: 'aws_vpc',
      namePrefix: 'network',
    },
    security: {
      resourceType: 'aws_iam_role',
      namePrefix: 'role',
    },
    identity: {
      resourceType: 'aws_iam_role',
      namePrefix: 'identity',
    },
    delivery: {
      resourceType: 'aws_lb',
      namePrefix: 'lb',
    },
    compute: {
      resourceType: 'aws_instance',
      namePrefix: 'ec2',
    },
    data: {
      resourceType: 'aws_db_instance',
      namePrefix: 'db',
    },
    messaging: {
      resourceType: 'aws_sqs_queue',
      namePrefix: 'queue',
    },
    operations: {
      resourceType: 'aws_athena_workgroup',
      namePrefix: 'analytics',
    },
  },
  containerLayerMappings: {
    global: {
      resourceType: 'aws_vpc',
      namePrefix: 'global',
    },
    edge: {
      resourceType: 'aws_vpc',
      namePrefix: 'edge',
    },
    region: {
      resourceType: 'aws_vpc',
      namePrefix: 'vpc',
    },
    zone: {
      resourceType: 'aws_vpc',
      namePrefix: 'zone',
    },
    subnet: {
      resourceType: 'aws_subnet',
      namePrefix: 'subnet',
    },
  },
  generators: {
    terraform: {
      requiredProviders: () =>
        [
          'terraform {',
          '  required_providers {',
          '    aws = {',
          '      source  = "hashicorp/aws"',
          '      version = "~> 5.0"',
          '    }',
          '  }',
          '}',
        ].join('\n'),
      providerBlock: (region: string) =>
        ['provider "aws" {', `  region = "${region}"`, '}'].join('\n'),
      regionVariableDescription: 'AWS region for resource deployment',
      renderSharedResources: (ctx: TerraformRenderContext) => buildAwsSharedResources(ctx),
      renderContainerBody: (ctx) => buildAwsContainerBody(ctx),
      renderContainerCompanions: () => [],
      extraVariables: () => [],
      renderBlockCompanions: () => [],
      renderBlockBody: (ctx) => buildAwsBlockBody(ctx),
      extraOutputs: () => [],
    },
    bicep: {
      targetScope: 'resourceGroup',
    },
    pulumi: {
      packageName: '@pulumi/aws',
      runtime: 'nodejs',
    },
  },
  subtypeBlockMappings: awsSubtypeBlockMappings,
};

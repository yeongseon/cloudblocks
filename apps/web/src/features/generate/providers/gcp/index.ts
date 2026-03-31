import type {
  ProviderDefinition,
  SubtypeResourceMap,
  TerraformBlockContext,
  TerraformContainerContext,
  TerraformRenderContext,
} from '../../types';

import { isExternalResourceType } from '@cloudblocks/schema';

// ─── Shared Resources ──────────────────────────────────────────

function inferGcpApiShortName(resourceType: string): string | null {
  if (resourceType === 'google_service_account') {
    return 'iam';
  }

  if (resourceType.startsWith('google_compute_')) {
    return 'compute';
  }

  if (resourceType.startsWith('google_sql_')) {
    return 'sqladmin';
  }

  if (resourceType.startsWith('google_storage_')) {
    return 'storage';
  }

  if (resourceType.startsWith('google_cloud_run_')) {
    return 'run';
  }

  if (resourceType.startsWith('google_cloudfunctions2_')) {
    return 'cloudfunctions';
  }

  if (resourceType.startsWith('google_pubsub_')) {
    return 'pubsub';
  }

  if (resourceType.startsWith('google_eventarc_')) {
    return 'eventarc';
  }

  if (resourceType.startsWith('google_bigquery_')) {
    return 'bigquery';
  }

  if (resourceType.startsWith('google_monitoring_')) {
    return 'monitoring';
  }

  if (resourceType.startsWith('google_firestore_')) {
    return 'firestore';
  }

  if (resourceType.startsWith('google_api_gateway_')) {
    return 'apigateway';
  }

  return null;
}

function toGcpName(name: string, maxLength = 63): string {
  return name
    .replace(/_/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-|-$/g, '')
    .slice(0, maxLength);
}

function normalizeGcpContainerLayer(
  layer: string,
): 'global' | 'edge' | 'region' | 'zone' | 'subnet' {
  if (layer === 'resource') {
    return 'region';
  }

  return layer as 'global' | 'edge' | 'region' | 'zone' | 'subnet';
}

function getGcpResourceTypeForBlock(ctx: TerraformRenderContext, blockId: string): string | null {
  const node = ctx.normalized.architecture.nodes.find((candidate) => candidate.id === blockId);
  if (!node) {
    return null;
  }

  if (node.kind === 'container') {
    const mapping =
      gcpProviderDefinition.containerLayerMappings[normalizeGcpContainerLayer(node.layer)];
    return mapping?.resourceType ?? null;
  }

  const subtypeMapping =
    node.subtype !== undefined ? gcpSubtypeBlockMappings[node.category]?.[node.subtype] : undefined;
  const mapping = subtypeMapping ?? gcpProviderDefinition.blockMappings[node.category];

  return mapping?.resourceType ?? null;
}

function buildGcpSharedResources(ctx: TerraformRenderContext): string[] {
  const lines: string[] = [];
  const requiredApis = new Set<string>();

  for (const node of ctx.normalized.architecture.nodes) {
    if (isExternalResourceType(node.resourceType)) {
      continue;
    }
    const resourceType = getGcpResourceTypeForBlock(ctx, node.id);
    if (!resourceType) {
      continue;
    }

    const apiShortName = inferGcpApiShortName(resourceType);
    if (apiShortName) {
      requiredApis.add(apiShortName);
    }
  }

  for (const apiShortName of Array.from(requiredApis).sort()) {
    lines.push(`resource "google_project_service" "${apiShortName}" {`);
    lines.push(`  service            = "${apiShortName}.googleapis.com"`);
    lines.push('  disable_on_destroy = false');
    lines.push('}');
    lines.push('');
  }

  return lines;
}

// ─── Container Body ────────────────────────────────────────────

function buildGcpContainerBody(ctx: TerraformContainerContext): string[] {
  const lines: string[] = [];

  if (ctx.container.layer !== 'subnet') {
    lines.push(`  name                    = "${toGcpName(ctx.resourceName)}"`);
    lines.push('  auto_create_subnetworks = false');
  } else {
    lines.push(`  name          = "${toGcpName(ctx.resourceName)}"`);

    if (ctx.parentResourceName) {
      lines.push(`  network       = google_compute_network.${ctx.parentResourceName}.id`);

      const containers = ctx.normalized.architecture.nodes.filter(
        (node) => node.kind === 'container',
      );
      const siblingSubnets = containers.filter(
        (container) =>
          container.layer === 'subnet' && container.parentId === ctx.container.parentId,
      );
      const cidrIndex =
        siblingSubnets.findIndex((container) => container.id === ctx.container.id) + 1;
      lines.push(`  ip_cidr_range = "10.0.${cidrIndex}.0/24"`);
    }

    lines.push('  region        = var.location');
  }
  lines.push('  depends_on    = [google_project_service.compute]');

  return lines;
}

// ─── Block Body ────────────────────────────────────────────────

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

function buildGcpBlockBody(ctx: TerraformBlockContext): string[] {
  const lines: string[] = [];
  const gcpName = toGcpName(ctx.resourceName);
  const tagName = `${'${var.project_name}'}-${gcpName}`;

  switch (ctx.mapping.resourceType) {
    case 'google_compute_instance':
      lines.push('  machine_type = "e2-micro"');
      lines.push('  zone         = var.zone');
      lines.push(`  name         = "${tagName}"`);
      lines.push(`  boot_disk {`);
      lines.push('    initialize_params {');
      lines.push(`      image = data.google_compute_image.${ctx.resourceName}_image.self_link`);
      lines.push('    }');
      lines.push('  }');
      lines.push('  network_interface {');
      if (ctx.parentResourceName) {
        lines.push(`    subnetwork = google_compute_subnetwork.${ctx.parentResourceName}.id`);
      } else {
        lines.push(
          '    # ERROR: Compute instance requires a subnet parent. Place this block inside a subnet container.',
        );
      }
      lines.push('  }');
      break;
    case 'google_cloud_run_v2_service':
      lines.push(`  name     = "${tagName}"`);
      lines.push('  location = var.location');
      lines.push('  template {');
      lines.push('    containers {');
      lines.push(
        '      image = "us-docker.pkg.dev/cloudrun/container/hello"  # TODO: Replace with your container image',
      );
      lines.push('    }');
      lines.push('  }');
      break;
    case 'google_cloudfunctions2_function':
      lines.push(
        '  # TODO: Cloud Functions (2nd gen) requires source bucket/object and entry point',
      );
      lines.push('  # This resource cannot be planned without its dependencies.');
      lines.push('  # Configure build_config, service_config, and source archive inputs');
      break;
    case 'google_sql_database_instance':
      lines.push(`  name                = "${tagName}"`);
      lines.push('  database_version    = "POSTGRES_14"');
      lines.push('  region              = var.location');
      lines.push(
        '  deletion_protection = false  # WARNING: Set to true for production to prevent accidental database deletion',
      );
      lines.push('  settings {');
      lines.push('    tier = "db-f1-micro"');
      lines.push('  }');
      lines.push(
        '  # TODO: Configure connectivity (public IP / private service access) for your environment',
      );
      break;
    case 'google_firestore_database':
      lines.push('  # WARNING: Only one "(default)" Firestore database allowed per GCP project');
      lines.push('  name        = "(default)"');
      lines.push('  location_id = var.location');
      lines.push('  type        = "FIRESTORE_NATIVE"');
      break;
    case 'google_storage_bucket': {
      const gcpBucketName = toGcpName(ctx.resourceName);
      lines.push(`  name                        = "${'${var.project_id}'}-${gcpBucketName}"`);
      lines.push('  location                    = var.location');
      lines.push('  force_destroy               = false');
      lines.push('  uniform_bucket_level_access = true');
      lines.push('  public_access_prevention    = "enforced"');
      break;
    }
    case 'google_compute_url_map':
      lines.push('  # TODO: Cloud Load Balancing URL map requires backend service wiring');
      lines.push('  # This resource cannot be planned without backend and host/path matchers');
      lines.push(`  name = "${tagName}"`);
      break;
    case 'google_api_gateway_api':
      lines.push('  # TODO: API Gateway requires API config/OpenAPI specification');
      lines.push('  # This resource cannot be planned without an API config dependency');
      lines.push(`  api_id = "${ctx.resourceName}"`);
      break;
    case 'google_compute_router_nat':
      lines.push('  # TODO: Cloud NAT requires google_compute_router and router association');
      lines.push(
        '  # This resource cannot be planned without router, subnet, and IP allocation settings',
      );
      break;
    case 'google_pubsub_topic':
      lines.push(`  name = "${tagName}"`);
      break;
    case 'google_eventarc_trigger':
      lines.push('  # TODO: Eventarc trigger requires destination service and matching criteria');
      lines.push('  # This resource cannot be planned without event source and destination wiring');
      break;
    case 'google_service_account': {
      const accountId = toGcpName(ctx.resourceName, 28);
      lines.push(`  account_id   = "${accountId}"`);
      lines.push(`  display_name = "${tagName}"`);
      break;
    }
    case 'google_compute_firewall': {
      const vpcName = findAncestorVpcName(ctx);
      lines.push(`  name    = "${tagName}"`);
      if (vpcName) {
        lines.push(`  network = google_compute_network.${vpcName}.id`);
      } else {
        lines.push(
          '  # ERROR: Firewall requires a VPC ancestor. Place this block inside a VPC container.',
        );
      }
      lines.push('  # TODO: Define firewall rules for required traffic');
      lines.push('  direction     = "INGRESS"');
      lines.push(
        '  source_ranges = ["0.0.0.0/0"]  # WARNING: Restrict to your IP range for production',
      );
      lines.push('  allow {');
      lines.push('    protocol = "tcp"');
      lines.push('    ports    = ["22"]  # TODO: Adjust ports for your application');
      lines.push('  }');
      break;
    }
    case 'google_bigquery_dataset':
      lines.push(`  dataset_id = "${ctx.resourceName}"`);
      lines.push('  location   = var.location');
      break;
    case 'google_monitoring_dashboard':
      lines.push('  dashboard_json = jsonencode({');
      lines.push(`    displayName = "${tagName}"`);
      lines.push('    gridLayout = {');
      lines.push('      columns = "12"');
      lines.push('      widgets = []');
      lines.push('    }');
      lines.push('  })');
      break;
    default:
      lines.push(`  # Configure ${ctx.mapping.resourceType}`);
      break;
  }

  const apiShortName = inferGcpApiShortName(ctx.mapping.resourceType);
  if (apiShortName) {
    lines.push(`  depends_on = [google_project_service.${apiShortName}]`);
  }

  return lines;
}

// ─── Block Companions ──────────────────────────────────────────

function buildGcpBlockCompanions(ctx: TerraformBlockContext): string[] {
  const sections: string[] = [];

  if (ctx.mapping.resourceType === 'google_compute_instance') {
    sections.push(`data "google_compute_image" "${ctx.resourceName}_image" {`);
    sections.push('  family  = "debian-12"');
    sections.push('  project = "debian-cloud"');
    sections.push('  depends_on = [google_project_service.compute]');
    sections.push('}');
    sections.push('');
  }

  return sections;
}

// ─── Subtype Block Mappings ────────────────────────────────────

const gcpSubtypeBlockMappings: SubtypeResourceMap = {
  compute: {
    'compute-engine': { resourceType: 'google_compute_instance', namePrefix: 'gce' },
    'cloud-run': { resourceType: 'google_cloud_run_v2_service', namePrefix: 'run' },
    'cloud-functions': { resourceType: 'google_cloudfunctions2_function', namePrefix: 'gcf' },
  },
  data: {
    'cloud-sql-postgres': { resourceType: 'google_sql_database_instance', namePrefix: 'sql' },
    firestore: { resourceType: 'google_firestore_database', namePrefix: 'fdb' },
    'cloud-storage': { resourceType: 'google_storage_bucket', namePrefix: 'gcs' },
  },
  delivery: {
    'cloud-load-balancing': { resourceType: 'google_compute_url_map', namePrefix: 'lb' },
    'api-gateway': { resourceType: 'google_api_gateway_api', namePrefix: 'apigw' },
    'nat-gateway': { resourceType: 'google_compute_router_nat', namePrefix: 'nat' },
  },
  messaging: {
    pubsub: { resourceType: 'google_pubsub_topic', namePrefix: 'topic' },
    eventarc: { resourceType: 'google_eventarc_trigger', namePrefix: 'trigger' },
  },
  security: {
    iam: { resourceType: 'google_service_account', namePrefix: 'sa' },
    nsg: { resourceType: 'google_compute_firewall', namePrefix: 'fw' },
  },
  identity: {
    'managed-identity': { resourceType: 'google_service_account', namePrefix: 'identity' },
    managed_identity: { resourceType: 'google_service_account', namePrefix: 'identity' },
    'service-account': { resourceType: 'google_service_account', namePrefix: 'svcacct' },
    service_account: { resourceType: 'google_service_account', namePrefix: 'svcacct' },
  },
  operations: {
    bigquery: { resourceType: 'google_bigquery_dataset', namePrefix: 'analytics' },
    monitoring: { resourceType: 'google_monitoring_dashboard', namePrefix: 'dashboard' },
  },
};

export const gcpProviderDefinition: ProviderDefinition = {
  name: 'gcp',
  displayName: 'GCP',
  blockMappings: {
    network: {
      resourceType: 'google_compute_network',
      namePrefix: 'network',
    },
    security: {
      resourceType: 'google_service_account',
      namePrefix: 'sa',
    },
    identity: {
      resourceType: 'google_service_account',
      namePrefix: 'identity',
    },
    delivery: {
      resourceType: 'google_compute_backend_service',
      namePrefix: 'backend',
    },
    compute: {
      resourceType: 'google_cloud_run_v2_service',
      namePrefix: 'run',
    },
    data: {
      resourceType: 'google_sql_database_instance',
      namePrefix: 'sql',
    },
    messaging: {
      resourceType: 'google_pubsub_topic',
      namePrefix: 'topic',
    },
    operations: {
      resourceType: 'google_bigquery_dataset',
      namePrefix: 'analytics',
    },
  },
  containerLayerMappings: {
    global: {
      resourceType: 'google_compute_network',
      namePrefix: 'global',
    },
    edge: {
      resourceType: 'google_compute_network',
      namePrefix: 'edge',
    },
    region: {
      resourceType: 'google_compute_network',
      namePrefix: 'network',
    },
    zone: {
      resourceType: 'google_compute_network',
      namePrefix: 'zone',
    },
    subnet: {
      resourceType: 'google_compute_subnetwork',
      namePrefix: 'subnet',
    },
  },
  generators: {
    terraform: {
      requiredProviders: () =>
        [
          'terraform {',
          '  required_providers {',
          '    google = {',
          '      source  = "hashicorp/google"',
          '      version = "~> 5.0"',
          '    }',
          '  }',
          '}',
        ].join('\n'),
      providerBlock: (region: string) =>
        ['provider "google" {', '  project = var.project_id', `  region  = "${region}"`, '}'].join(
          '\n',
        ),
      regionVariableDescription: 'GCP region for resource deployment',
      renderSharedResources: (ctx: TerraformRenderContext) => buildGcpSharedResources(ctx),
      renderContainerBody: (ctx) => buildGcpContainerBody(ctx),
      renderContainerCompanions: () => [],
      extraVariables: () => [
        'variable "project_id" {',
        '  description = "GCP project ID for resource deployment"',
        '  type        = string',
        '}',
        '',
        'variable "zone" {',
        '  description = "GCP zone for zonal resources (e.g., us-central1-a)"',
        '  type        = string',
        '  default     = "us-central1-a"',
        '}',
      ],
      renderBlockCompanions: (ctx) => buildGcpBlockCompanions(ctx),
      renderBlockBody: (ctx) => buildGcpBlockBody(ctx),
      extraOutputs: () => [],
    },
    bicep: {
      targetScope: 'resourceGroup',
    },
    pulumi: {
      packageName: '@pulumi/gcp',
      runtime: 'nodejs',
    },
  },
  subtypeBlockMappings: gcpSubtypeBlockMappings,
};

import type { ProviderAdapter, ProviderDefinition, SubtypeResourceMap } from '../../types';

const gcpSubtypeBlockMappings: SubtypeResourceMap = {
  compute: {
    'compute-engine': { resourceType: 'google_compute_instance', namePrefix: 'gce' },
    'cloud-run': { resourceType: 'google_cloud_run_v2_service', namePrefix: 'run' },
    'cloud-functions': { resourceType: 'google_cloudfunctions2_function', namePrefix: 'gcf' },
  },
  database: {
    'cloud-sql-postgres': { resourceType: 'google_sql_database_instance', namePrefix: 'sql' },
    firestore: { resourceType: 'google_firestore_database', namePrefix: 'fdb' },
  },
  storage: {
    'cloud-storage': { resourceType: 'google_storage_bucket', namePrefix: 'gcs' },
  },
  gateway: {
    'cloud-load-balancing': { resourceType: 'google_compute_url_map', namePrefix: 'lb' },
    'api-gateway': { resourceType: 'google_api_gateway_api', namePrefix: 'apigw' },
  },
};

export const gcpProviderDefinition: ProviderDefinition = {
  name: 'gcp',
  displayName: 'GCP',
  blockMappings: {
    compute: {
      resourceType: 'google_cloud_run_v2_service',
      namePrefix: 'run',
    },
    database: {
      resourceType: 'google_sql_database_instance',
      namePrefix: 'sql',
    },
    storage: {
      resourceType: 'google_storage_bucket',
      namePrefix: 'bucket',
    },
    gateway: {
      resourceType: 'google_compute_backend_service',
      namePrefix: 'backend',
    },
    function: {
      resourceType: 'google_cloudfunctions_function',
      namePrefix: 'function',
    },
    queue: {
      resourceType: 'google_pubsub_topic',
      namePrefix: 'topic',
    },
    event: {
      resourceType: 'google_eventarc_trigger',
      namePrefix: 'trigger',
    },
    timer: {
      resourceType: 'google_cloud_scheduler_job',
      namePrefix: 'schedule',
    },
  },
  plateMappings: {
    network: {
      resourceType: 'google_compute_network',
      namePrefix: 'network',
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
        [
          'provider "google" {',
          `  region = "${region}"`,
          '}',
        ].join('\n'),
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

export const gcpProvider: ProviderAdapter = {
  name: gcpProviderDefinition.name,
  displayName: gcpProviderDefinition.displayName,
  blockMappings: gcpProviderDefinition.blockMappings,
  plateMappings: gcpProviderDefinition.plateMappings,
  providerBlock: gcpProviderDefinition.generators.terraform.providerBlock,
  requiredProviders: gcpProviderDefinition.generators.terraform.requiredProviders,
};

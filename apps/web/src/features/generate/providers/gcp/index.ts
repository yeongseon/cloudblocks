import type { ProviderDefinition, SubtypeResourceMap } from '../../types';

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
  edge: {
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
    edge: {
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
  plateMappings: {
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

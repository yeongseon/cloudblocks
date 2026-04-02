import { describe, expect, it } from 'vitest';
import {
  getContainerLabel,
  getContainerShortLabel,
  remapName,
  remapSubtype,
} from './providerMapping';

describe('remapSubtype', () => {
  it('keeps Azure subtype unchanged for azure provider', () => {
    expect(remapSubtype('vm', 'azure')).toBe('vm');
  });

  it('maps known Azure subtypes for AWS and GCP', () => {
    expect(remapSubtype('vm', 'aws')).toBe('ec2');
    expect(remapSubtype('vm', 'gcp')).toBe('compute-engine');
  });

  it('falls back to original subtype when no mapping exists', () => {
    expect(remapSubtype('custom-service', 'aws')).toBe('custom-service');
    expect(remapSubtype('custom-service', 'gcp')).toBe('custom-service');
  });

  it('maps app-service to PaaS equivalents (not IaaS)', () => {
    expect(remapSubtype('app-service', 'aws')).toBe('elastic-beanstalk');
    expect(remapSubtype('app-service', 'gcp')).toBe('app-engine');
  });

  it('maps container-instances to cloud-run for GCP', () => {
    expect(remapSubtype('container-instances', 'gcp')).toBe('cloud-run');
  });

  it('maps new subtypes for API management, timer, and PostgreSQL', () => {
    expect(remapSubtype('api-management', 'aws')).toBe('api-gateway');
    expect(remapSubtype('api-management', 'gcp')).toBe('api-gateway');
    expect(remapSubtype('timer-trigger', 'aws')).toBe('eventbridge-scheduler');
    expect(remapSubtype('timer-trigger', 'gcp')).toBe('cloud-scheduler');
    expect(remapSubtype('azure-postgresql', 'aws')).toBe('rds-postgres');
    expect(remapSubtype('azure-postgresql', 'gcp')).toBe('cloud-sql-postgres');
  });
});

describe('remapName', () => {
  it('keeps original name for azure provider', () => {
    expect(remapName('vm', 'Azure VM', 'azure')).toBe('Azure VM');
  });

  it('maps known names for non-azure providers', () => {
    expect(remapName('vm', 'Virtual Machine', 'aws')).toBe('EC2 Instance');
    expect(remapName('vm', 'Virtual Machine', 'gcp')).toBe('Compute Engine');
  });

  it('preserves parenthetical suffix when name is mapped', () => {
    expect(remapName('functions', 'Azure Functions (Worker)', 'aws')).toBe('AWS Lambda (Worker)');
  });

  it('falls back to original name when no mapping exists', () => {
    expect(remapName('custom-service', 'Custom Service', 'aws')).toBe('Custom Service');
  });
  it('maps app-service to PaaS equivalents', () => {
    expect(remapName('app-service', 'Azure App Service', 'aws')).toBe('AWS Elastic Beanstalk');
    expect(remapName('app-service', 'Azure App Service', 'gcp')).toBe('App Engine');
  });

  it('maps container-instances to Cloud Run for GCP', () => {
    expect(remapName('container-instances', 'Container Instances', 'gcp')).toBe('Cloud Run');
  });

  it('maps new subtypes (api-management, timer-trigger, azure-postgresql)', () => {
    expect(remapName('api-management', 'Azure API Management', 'aws')).toBe('Amazon API Gateway');
    expect(remapName('api-management', 'Azure API Management', 'gcp')).toBe('API Gateway');
    expect(remapName('timer-trigger', 'Timer Trigger', 'aws')).toBe('Amazon EventBridge Scheduler');
    expect(remapName('timer-trigger', 'Timer Trigger', 'gcp')).toBe('Cloud Scheduler');
    expect(remapName('azure-postgresql', 'Azure PostgreSQL', 'aws')).toBe(
      'Amazon RDS for PostgreSQL',
    );
    expect(remapName('azure-postgresql', 'Azure PostgreSQL', 'gcp')).toBe(
      'Cloud SQL for PostgreSQL',
    );
  });
});

describe('getContainerLabel', () => {
  it('returns provider-specific labels for known layers', () => {
    expect(getContainerLabel('region', 'azure')).toBe('VNet');
    expect(getContainerLabel('region', 'aws')).toBe('VPC');
    expect(getContainerLabel('region', 'gcp')).toBe('VPC Network');
    expect(getContainerLabel('subnet', 'aws')).toBe('Subnet');
  });

  it('returns null for unknown layers', () => {
    expect(getContainerLabel('zone', 'aws')).toBeNull();
  });
});

describe('getContainerShortLabel', () => {
  it('returns provider-aware short labels for known layers', () => {
    expect(getContainerShortLabel('region', 'azure')).toBe('VNet');
    expect(getContainerShortLabel('region', 'aws')).toBe('VPC');
    expect(getContainerShortLabel('region', 'gcp')).toBe('VPC');
  });

  it('falls back to layer name when short label is missing', () => {
    expect(getContainerShortLabel('workspace', 'aws')).toBe('workspace');
  });
});

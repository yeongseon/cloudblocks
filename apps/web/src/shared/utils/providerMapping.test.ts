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

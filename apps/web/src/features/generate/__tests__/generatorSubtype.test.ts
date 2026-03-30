import { describe, expect, it } from 'vitest';

import type { ArchitectureModel } from '@cloudblocks/schema';
import { normalizeBicep } from '../bicep';
import { normalizePulumi } from '../pulumi';
import { awsProviderDefinition } from '../providers/aws';
import { generateMainTf, generateOutputsTf, normalize } from '../terraform';

function createArchitecture(subtype?: string): ArchitectureModel {
  return {
    id: 'arch-subtype-1',
    name: 'Subtype Mapping Architecture',
    version: '1',
    nodes: [
      {
        id: 'subnet-1',
        name: 'Subnet',
        kind: 'container',
        layer: 'subnet',
        resourceType: 'subnet',
        category: 'network',
        provider: 'aws',
        parentId: null,
        position: { x: 0, y: 0, z: 0 },
        frame: { width: 8, height: 1, depth: 6 },
        metadata: {},
      },
      {
        id: 'block-1',
        name: 'Compute',
        kind: 'resource',
        layer: 'resource',
        resourceType: 'web_compute',
        category: 'compute',
        subtype,
        parentId: 'subnet-1',
        position: { x: 0, y: 0, z: 0 },
        metadata: {},
        provider: 'aws',
      },
    ],
    connections: [],
    endpoints: [],
    externalActors: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

describe('generator subtype mapping integration', () => {
  it('terraform normalize uses subtype mapping when block has subtype', () => {
    const model = normalize(createArchitecture('ec2'), awsProviderDefinition);

    expect(model.resourceNames.get('block-1')).toBe('ec2_compute');
  });

  it('bicep normalize uses subtype mapping when block has subtype', () => {
    const model = normalizeBicep(createArchitecture('ec2'), awsProviderDefinition);

    expect(model.resourceNames.get('block-1')).toBe('ec2Compute');
  });

  it('pulumi normalize uses subtype mapping when block has subtype', () => {
    const model = normalizePulumi(createArchitecture('ec2'), awsProviderDefinition);

    expect(model.resourceNames.get('block-1')).toBe('ec2Compute');
  });

  it('generated terraform output uses subtype-specific resource type', () => {
    const normalized = normalize(createArchitecture('ec2'), awsProviderDefinition);

    const mainTf = generateMainTf(normalized, awsProviderDefinition, {
      provider: 'aws',
      mode: 'draft',
      projectName: 'subtype-test',
      region: 'us-east-1',
      generator: 'terraform',
    });

    const outputsTf = generateOutputsTf(normalized, awsProviderDefinition, {
      provider: 'aws',
      mode: 'draft',
      projectName: 'subtype-test',
      region: 'us-east-1',
      generator: 'terraform',
    });

    expect(mainTf).toContain('resource "aws_instance" "ec2_compute"');
    expect(mainTf).not.toContain('resource "aws_ecs_service" "ec2_compute"');
    expect(outputsTf).toContain('value = aws_instance.ec2_compute.id');
  });

  it('falls back to category-level mapping when block subtype is not set', () => {
    const architecture = createArchitecture(undefined);

    const terraformModel = normalize(architecture, awsProviderDefinition);
    const bicepModel = normalizeBicep(architecture, awsProviderDefinition);
    const pulumiModel = normalizePulumi(architecture, awsProviderDefinition);

    expect(terraformModel.resourceNames.get('block-1')).toBe('ec2_compute');
    expect(bicepModel.resourceNames.get('block-1')).toBe('ec2Compute');
    expect(pulumiModel.resourceNames.get('block-1')).toBe('ec2Compute');
  });
});

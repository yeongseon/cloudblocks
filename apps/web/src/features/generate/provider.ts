import type { ProviderDefinition, ProviderName } from './types';
import { awsProviderDefinition } from './providers/aws/index';
import { azureProviderDefinition } from './providers/azure/index';
import { gcpProviderDefinition } from './providers/gcp/index';

export {
  awsProviderDefinition,
  azureProviderDefinition,
  gcpProviderDefinition,
};

const providerDefinitions: Record<string, ProviderDefinition> = {
  azure: azureProviderDefinition,
  aws: awsProviderDefinition,
  gcp: gcpProviderDefinition,
};

export function getProviderDefinition(name: ProviderName): ProviderDefinition | undefined {
  return providerDefinitions[name];
}

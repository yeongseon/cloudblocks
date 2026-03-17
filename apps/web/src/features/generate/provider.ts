import type { ProviderAdapter, ProviderDefinition, ProviderName } from './types';
import { awsProvider, awsProviderDefinition } from './providers/aws/index';
import { azureProvider, azureProviderDefinition } from './providers/azure/index';
import { gcpProvider, gcpProviderDefinition } from './providers/gcp/index';

export {
  awsProvider,
  awsProviderDefinition,
  azureProvider,
  azureProviderDefinition,
  gcpProvider,
  gcpProviderDefinition,
};

/** Provider registry — extensible for future providers */
const providers: Record<string, ProviderAdapter> = {
  azure: azureProvider,
  aws: awsProvider,
  gcp: gcpProvider,
};

const providerDefinitions: Record<string, ProviderDefinition> = {
  azure: azureProviderDefinition,
  aws: awsProviderDefinition,
  gcp: gcpProviderDefinition,
};

export function getProvider(name: string): ProviderAdapter | undefined {
  return providers[name];
}

export function getProviderDefinition(name: ProviderName): ProviderDefinition | undefined {
  return providerDefinitions[name];
}

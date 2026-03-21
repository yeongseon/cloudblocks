import type { ProviderType } from '@cloudblocks/schema';
import type {
  ArchitectureSnapshot,
  Scenario,
  ScenarioStep,
} from '../../shared/types/learning';

const NETWORK_TERMS: Record<ProviderType, { vnet: string; vnetLong: string }> = {
  azure: { vnet: 'VNet', vnetLong: 'Virtual Network (VNet)' },
  aws: { vnet: 'VPC', vnetLong: 'Virtual Private Cloud (VPC)' },
  gcp: { vnet: 'VPC', vnetLong: 'VPC Network' },
};

function substituteText(text: string, provider: ProviderType): string {
  const terms = NETWORK_TERMS[provider];
  let result = text.replace(/Virtual Network \(VNet\)/g, terms.vnetLong);
  result = result.replace(/\bVNet\b/g, terms.vnet);
  result = result.replace(/a virtual network/gi, `a ${terms.vnet}`);
  return result;
}

function adaptSnapshot(
  snapshot: ArchitectureSnapshot,
  provider: ProviderType,
): ArchitectureSnapshot {
  const terms = NETWORK_TERMS[provider];
  return {
    ...snapshot,
    plates: snapshot.plates.map((plate) => ({
      ...plate,
      name: plate.name === 'VNet' ? terms.vnet : plate.name,
    })),
  };
}

function adaptStep(step: ScenarioStep, provider: ProviderType): ScenarioStep {
  return {
    ...step,
    title: substituteText(step.title, provider),
    instruction: substituteText(step.instruction, provider),
    hints: step.hints.map((hint) => substituteText(hint, provider)),
    checkpoint: step.checkpoint
      ? adaptSnapshot(step.checkpoint, provider)
      : undefined,
  };
}

export function formatScenarioForProvider(
  scenario: Scenario,
  provider: ProviderType,
): Scenario {
  if (provider === 'azure') return scenario;
  return {
    ...scenario,
    description: substituteText(scenario.description, provider),
    steps: scenario.steps.map((step) => adaptStep(step, provider)),
    initialArchitecture: adaptSnapshot(scenario.initialArchitecture, provider),
  };
}

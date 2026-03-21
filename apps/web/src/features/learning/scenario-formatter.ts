import type { ProviderType } from '@cloudblocks/schema';
import type { ArchitectureSnapshot, Scenario, ScenarioStep } from '../../shared/types/learning';

// ─── Provider-Specific Term Mappings ─────────────────────

/**
 * Network-level terminology per provider.
 * Used for text substitution in learning scenario content.
 */
const NETWORK_TERMS: Record<ProviderType, { vnet: string; vnetLong: string }> = {
  azure: { vnet: 'VNet', vnetLong: 'Virtual Network (VNet)' },
  aws:   { vnet: 'VPC',  vnetLong: 'Virtual Private Cloud (VPC)' },
  gcp:   { vnet: 'VPC',  vnetLong: 'VPC Network' },
};

// ─── Text Substitution ───────────────────────────────────

/**
 * Replace Azure-centric terms in a string with provider-appropriate equivalents.
 * Handles both the long-form "Virtual Network (VNet)" and short-form "VNet" references.
 */
function substituteText(text: string, provider: ProviderType): string {
  if (provider === 'azure') return text;

  const terms = NETWORK_TERMS[provider];

  // Replace long-form first to avoid partial matches
  let result = text.replace(/Virtual Network \(VNet\)/g, terms.vnetLong);
  // Replace standalone "VNet" (word boundary to avoid matching inside other words)
  result = result.replace(/\bVNet\b/g, terms.vnet);
  // Replace "a virtual network" / "a Virtual Network" (article-aware)
  result = result.replace(/a virtual network/gi, `a ${terms.vnet}`);

  return result;
}

// ─── Snapshot Adaptation ─────────────────────────────────

/**
 * Replace plate names in architecture snapshots with provider-appropriate terms.
 */
function adaptSnapshot(snapshot: ArchitectureSnapshot, provider: ProviderType): ArchitectureSnapshot {
  if (provider === 'azure') return snapshot;

  const terms = NETWORK_TERMS[provider];

  return {
    ...snapshot,
    plates: snapshot.plates.map((plate) => ({
      ...plate,
      name: plate.name === 'VNet' ? terms.vnet : plate.name,
    })),
  };
}

// ─── Step Adaptation ─────────────────────────────────────

function adaptStep(step: ScenarioStep, provider: ProviderType): ScenarioStep {
  if (provider === 'azure') return step;

  return {
    ...step,
    title: substituteText(step.title, provider),
    instruction: substituteText(step.instruction, provider),
    hints: step.hints.map((hint) => substituteText(hint, provider)),
    checkpoint: step.checkpoint ? adaptSnapshot(step.checkpoint, provider) : undefined,
  };
}

// ─── Public API ──────────────────────────────────────────

/**
 * Adapt a scenario's content for the given cloud provider.
 *
 * Replaces Azure-centric terminology (VNet, Virtual Network) with
 * provider-appropriate equivalents in all user-facing text and
 * architecture snapshots.
 *
 * Validation rules are category-based and remain unchanged.
 */
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

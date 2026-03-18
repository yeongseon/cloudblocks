import { useUIStore } from '../../entities/store/uiStore';
import type { ProviderType } from '../../shared/types/index';

const PROVIDER_OPTIONS: Array<{ id: ProviderType; label: string; accent: string }> = [
  { id: 'azure', label: 'Azure', accent: '#0078D4' },
  { id: 'aws', label: 'AWS', accent: '#FF9900' },
  { id: 'gcp', label: 'GCP', accent: '#4285F4' },
];

export function ProviderToggle() {
  const activeProvider = useUIStore((s) => s.activeProvider);
  const setActiveProvider = useUIStore((s) => s.setActiveProvider);

  return (
    <div className="provider-toggle" role="tablist" aria-label="Provider mode">
      {PROVIDER_OPTIONS.map((provider) => {
        const isActive = provider.id === activeProvider;

        return (
          <button
            key={provider.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`provider-toggle-btn ${isActive ? 'is-active' : ''}`}
            onClick={() => setActiveProvider(provider.id)}
            style={isActive ? { borderColor: provider.accent, color: provider.accent } : undefined}
            title={`Switch provider to ${provider.label}`}
          >
            {provider.label}
          </button>
        );
      })}
    </div>
  );
}

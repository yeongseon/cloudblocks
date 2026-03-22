import { useEffect, useRef, useState } from 'react';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { generateCode, GenerationError } from '../../features/generate/pipeline';
import {
  DEFAULT_REGION_BY_PROVIDER,
  type GeneratedOutput,
  type GenerationOptions,
  type GeneratorId,
} from '../../features/generate/types';
import { listGenerators } from '../../features/generate/registry';
import type { ProviderType } from '@cloudblocks/schema';
import './CodePreview.css';

const PROVIDERS: ProviderType[] = ['azure', 'aws', 'gcp'];

function clearGeneratedState(
  setError: (value: string | null) => void,
  setOutput: (value: GeneratedOutput | null) => void,
  setComparisonOutputs: (value: Record<ProviderType, GeneratedOutput> | null) => void,
  setComparisonErrors: (value: Partial<Record<ProviderType, string>> | null) => void,
  setActiveTab: (value: number) => void,
) {
  setError(null);
  setOutput(null);
  setComparisonOutputs(null);
  setComparisonErrors(null);
  setActiveTab(0);
}

export function CodePreview() {
  const toggleCodePreview = useUIStore((s) => s.toggleCodePreview);
  const activeProvider = useUIStore((s) => s.activeProvider);
  const architecture = useArchitectureStore((s) => s.workspace.architecture);

  const sanitizedName = architecture.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'myproject';

  const generatorOptions = listGenerators().map((generatorPlugin) => ({
    id: generatorPlugin.id,
    label: generatorPlugin.displayName,
    supportedProviders: generatorPlugin.supportedProviders,
  }));
  const [activeTab, setActiveTab] = useState(0);
  const [projectName, setProjectName] = useState(sanitizedName);
  const [regions, setRegions] = useState<Record<ProviderType, string>>({ ...DEFAULT_REGION_BY_PROVIDER });
  const [generator, setGenerator] = useState<GeneratorId>(
    generatorOptions[0]?.id ?? 'terraform'
  );
  const [compareProviders, setCompareProviders] = useState(false);
  const [output, setOutput] = useState<GeneratedOutput | null>(null);
  const [comparisonOutputs, setComparisonOutputs] = useState<Record<ProviderType, GeneratedOutput> | null>(null);
  const [comparisonErrors, setComparisonErrors] = useState<Partial<Record<ProviderType, string>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const prevProviderRef = useRef(activeProvider);
  const selectedGenerator = generatorOptions.find((g) => g.id === generator);
  const supportedProviders = selectedGenerator?.supportedProviders ?? [];
  const canCompareProviders = PROVIDERS.every((provider) =>
    supportedProviders.includes(provider)
  );

  const effectiveCompare = compareProviders && canCompareProviders;

  const mismatchedProviders = architecture.nodes
    .filter((node) => node.kind === 'resource')
    .filter((block) => block.provider && block.provider !== activeProvider)
    .reduce((acc, block) => {
      const p = block.provider ?? 'unknown';
      acc.set(p, (acc.get(p) ?? 0) + 1);
      return acc;
    }, new Map<string, number>());
  const hasMismatch = mismatchedProviders.size > 0;

  useEffect(() => {
    if (prevProviderRef.current !== activeProvider) {
      prevProviderRef.current = activeProvider;
      queueMicrotask(() => {
        clearGeneratedState(setError, setOutput, setComparisonOutputs, setComparisonErrors, setActiveTab);
        setRegions((prev) => ({
          ...prev,
          [activeProvider]: DEFAULT_REGION_BY_PROVIDER[activeProvider],
        }));
      });
    }
  }, [activeProvider]);

  const handleGeneratorChange = (newGenerator: GeneratorId) => {
    setGenerator(newGenerator);
    clearGeneratedState(setError, setOutput, setComparisonOutputs, setComparisonErrors, setActiveTab);
  };

  const handleCompareChange = (checked: boolean) => {
    setCompareProviders(checked);
    clearGeneratedState(setError, setOutput, setComparisonOutputs, setComparisonErrors, setActiveTab);
  };

  const handleGenerate = () => {
    setError(null);
    setOutput(null);
    setComparisonOutputs(null);
    setComparisonErrors(null);

    try {
      const baseOptions = {
        mode: 'draft',
        projectName,
        generator,
      } as const;

      if (effectiveCompare) {

        const generated: Partial<Record<ProviderType, GeneratedOutput>> = {};
        const errors: Partial<Record<ProviderType, string>> = {};

        for (const provider of PROVIDERS) {
          const options: GenerationOptions = {
            ...baseOptions,
            provider,
            region: regions[provider],
          };
          try {
            generated[provider] = generateCode(architecture, options);
          } catch (providerError) {
            if (providerError instanceof GenerationError) {
              errors[provider] = providerError.message;
            } else {
              errors[provider] = 'Unexpected error during code generation.';
            }
          }
        }

        if (Object.keys(generated).length === 0) {
          setComparisonErrors(errors);
          setError('All provider generations failed.');
          return;
        }

        setComparisonOutputs(generated as Record<ProviderType, GeneratedOutput>);
        setComparisonErrors(Object.keys(errors).length > 0 ? errors : null);
        if (Object.keys(errors).length > 0) {
          setError('Some providers failed. Showing partial comparison results.');
        }
      } else {
        const options: GenerationOptions = {
          ...baseOptions,
          provider: activeProvider,
          region: regions[activeProvider],
        };
        const result = generateCode(architecture, options);
        setOutput(result);
      }

      setActiveTab(0);
    } catch (err) {
      if (err instanceof GenerationError) {
        setError(err.message);
      } else {
        setError('Unexpected error during code generation.');
      }
    }
  };

  const handleCopyFile = () => {
    if (output) {
      const file = output.files[clampedTab];
      if (file && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(file.content).catch(() => {});
      }
    } else if (comparisonOutputs) {
      const texts = PROVIDERS.map((provider) => {
        const providerOutput = comparisonOutputs[provider];
        if (!providerOutput) return '';
        const file = providerOutput.files[clampedTab] ?? providerOutput.files[0];
        return file ? `// --- ${provider.toUpperCase()} ---\n${file.content}` : '';
      }).filter(Boolean).join('\n\n');
      if (texts && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(texts).catch(() => {});
      }
    }
  };

  const handleDownloadAll = () => {
    const downloadFile = (content: string, path: string) => {
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = path;
      a.click();
      URL.revokeObjectURL(url);
    };

    if (output) {
      for (const file of output.files) {
        downloadFile(file.content, file.path);
      }
    } else if (comparisonOutputs) {
      for (const provider of PROVIDERS) {
        const providerFiles = comparisonOutputs[provider]?.files;
        if (!providerFiles) continue;
        for (const file of providerFiles) {
          downloadFile(file.content, `${provider}-${file.path}`);
        }
      }
    }
  };

  const visibleFiles = output
    ? output.files
    : (() => {
        if (!comparisonOutputs) return [];
        const firstProvider = PROVIDERS.find((provider) => comparisonOutputs[provider]?.files.length > 0);
        return firstProvider ? comparisonOutputs[firstProvider].files : [];
      })();

  const clampedTab = visibleFiles.length === 0
    ? 0
    : activeTab >= visibleFiles.length
      ? 0
      : activeTab;

  return (
    <div className="code-preview">
      <div className="code-preview-header">
        <h3 className="code-preview-title">⚡ Code Generation</h3>
        <button type="button" className="code-preview-close" onClick={toggleCodePreview} aria-label="Close code preview panel">
          ✕
        </button>
      </div>

      <div className="code-preview-options">
        {hasMismatch && (
          <div className="code-preview-mismatch-warning" role="alert">
            ⚠️ Canvas has {Array.from(mismatchedProviders.entries()).map(([p, count]) => `${count} ${p.toUpperCase()}`).join(', ')} block(s) but generating for {activeProvider.toUpperCase()}. Use &quot;Compare&quot; to see all providers.
          </div>
        )}
        <label className="code-preview-field">
          <span className="code-preview-field-label">Generator</span>
          <select
            className="code-preview-input"
            value={generator}
            onChange={(e) => handleGeneratorChange(e.target.value as GeneratorId)}
          >
            {generatorOptions.map((g) => (
              <option key={g.id} value={g.id}>{g.label}</option>
            ))}
          </select>
        </label>
        <label className="code-preview-field">
          <span className="code-preview-field-label">Project</span>
          <input
            className="code-preview-input"
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
          />
        </label>
        {effectiveCompare ? (
          <div className="code-preview-region-group">
            <span className="code-preview-field-label">Regions</span>
            <div className="code-preview-region-row">
              {PROVIDERS.map((provider) => (
                <label key={provider} className="code-preview-region-field">
                  <span className="code-preview-region-provider-label">{provider.toUpperCase()}</span>
                  <input
                    className="code-preview-input"
                    type="text"
                    value={regions[provider]}
                    onChange={(e) =>
                      setRegions((prev) => ({ ...prev, [provider]: e.target.value }))
                    }
                  />
                </label>
              ))}
            </div>
          </div>
        ) : (
          <label className="code-preview-field">
            <span className="code-preview-field-label">Region</span>
            <input
              className="code-preview-input"
              type="text"
              value={regions[activeProvider]}
              onChange={(e) =>
                setRegions((prev) => ({ ...prev, [activeProvider]: e.target.value }))
              }
            />
          </label>
        )}
        <label className="code-preview-field code-preview-field-checkbox">
          <span className="code-preview-field-label">Compare</span>
          <label className="code-preview-checkbox-label">
            <input
              type="checkbox"
              checked={effectiveCompare}
              disabled={!canCompareProviders}
              onChange={(e) => handleCompareChange(e.target.checked)}
            />
            Azure / AWS / GCP
          </label>
        </label>
        <button type="button" className="code-preview-generate-btn" onClick={handleGenerate}>
          🚀 {effectiveCompare ? 'Compare Providers' : `Generate ${selectedGenerator?.label ?? 'Code'}`}
        </button>
      </div>

      {error && <div className="code-preview-error">{error}</div>}

      {output && (
        <>
          <div className="code-preview-tabs">
            {output.files.map((file, i) => (
                <button
                  type="button"
                  key={file.path}
                   className={`code-preview-tab ${i === clampedTab ? 'code-preview-tab-active' : ''}`}
                   onClick={() => setActiveTab(i)}
                >
                {file.path}
              </button>
            ))}
          </div>

          <div className="code-preview-actions">
            <button type="button" className="code-preview-action-btn" onClick={handleCopyFile}>
              📋 Copy
            </button>
            <button type="button" className="code-preview-action-btn" onClick={handleDownloadAll}>
              💾 Download All
            </button>
          </div>

          <pre className="code-preview-code">
            <code>{output.files[clampedTab]?.content ?? ''}</code>
          </pre>

          <div className="code-preview-meta">
            {output.metadata.generator} v{output.metadata.version} · {output.metadata.provider} ·{' '}
            {new Date(output.metadata.generatedAt).toLocaleTimeString()}
          </div>
        </>
      )}

      {comparisonOutputs && (
        <>
          <div className="code-preview-tabs">
            {(() => {
              const firstProvider = PROVIDERS.find(
                (p) => comparisonOutputs[p]?.files.length > 0
              );
              const files = firstProvider ? comparisonOutputs[firstProvider].files : [];
              return files.map((file, i) => (
                <button
                  type="button"
                  key={file.path}
                   className={`code-preview-tab ${i === clampedTab ? 'code-preview-tab-active' : ''}`}
                  onClick={() => setActiveTab(i)}
                >
                  {file.path}
                </button>
              ));
            })()}
          </div>

          <div className="code-preview-actions">
            <button type="button" className="code-preview-action-btn" onClick={handleCopyFile}>
              📋 Copy
            </button>
            <button type="button" className="code-preview-action-btn" onClick={handleDownloadAll}>
              💾 Download All
            </button>
          </div>

          <div className="code-preview-compare-grid">
          {PROVIDERS.map((provider) => {
            const providerOutput = comparisonOutputs[provider];
            const providerError = comparisonErrors?.[provider];

            if (!providerOutput) {
              return (
                <section key={provider} className="code-preview-compare-card">
                  <header className="code-preview-compare-header">
                    <strong>{provider.toUpperCase()}</strong>
                    <span>Error</span>
                  </header>
                  <pre className="code-preview-code code-preview-code-compare">
                    <code>{providerError ?? 'Generation failed.'}</code>
                  </pre>
                </section>
              );
            }

            const activeFile = providerOutput.files[clampedTab] ?? providerOutput.files[0];

            return (
              <section key={provider} className="code-preview-compare-card">
                <header className="code-preview-compare-header">
                  <strong>{provider.toUpperCase()}</strong>
                  <span>{providerOutput.files.length} files</span>
                </header>
                <pre className="code-preview-code code-preview-code-compare">
                  <code>{activeFile?.content ?? ''}</code>
                </pre>
              </section>
            );
          })}
          </div>
        </>
      )}
    </div>
  );
}

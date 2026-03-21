import { useRef, useState } from 'react';
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
import { confirmDialog } from '../../shared/ui/ConfirmDialog';
import type { ProviderType } from '@cloudblocks/schema';
import './CodePreview.css';

const PROVIDERS: ProviderType[] = ['azure', 'aws', 'gcp'];

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
  const [prevProvider, setPrevProvider] = useState(activeProvider);
  const [generator, setGenerator] = useState<GeneratorId>(
    generatorOptions[0]?.id ?? 'terraform'
  );
  const [compareProviders, setCompareProviders] = useState(false);
  const [output, setOutput] = useState<GeneratedOutput | null>(null);
  const [comparisonOutputs, setComparisonOutputs] = useState<Record<ProviderType, GeneratedOutput> | null>(null);
  const [comparisonErrors, setComparisonErrors] = useState<Partial<Record<ProviderType, string>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedGenerator = generatorOptions.find((g) => g.id === generator);
  const supportedProviders = selectedGenerator?.supportedProviders ?? [];
  const canCompareProviders = PROVIDERS.every((provider) =>
    supportedProviders.includes(provider)
  );

  // Track user-modified regions to avoid overwriting (#872)
  const userModifiedRegions = useRef<Set<ProviderType>>(new Set());

  // #872: Only reset region when the user has not manually set it
  if (activeProvider !== prevProvider) {
    setPrevProvider(activeProvider);
    if (!userModifiedRegions.current.has(activeProvider)) {
      setRegions((prev) => ({
        ...prev,
        [activeProvider]: DEFAULT_REGION_BY_PROVIDER[activeProvider],
      }));
    }
    // #873: Don't clear compare results when switching provider tab in compare mode
    if (!compareProviders) {
      setError(null);
      setOutput(null);
      setComparisonOutputs(null);
      setComparisonErrors(null);
      setActiveTab(0);
    }
  }

  const effectiveCompare = compareProviders && canCompareProviders;

  const clearGeneratedState = () => {
    setError(null);
    setOutput(null);
    setComparisonOutputs(null);
    setComparisonErrors(null);
    setActiveTab(0);
  };

  const handleGeneratorChange = (newGenerator: GeneratorId) => {
    setGenerator(newGenerator);
    clearGeneratedState();
  };

  // #873: Confirm before clearing compare results
  const handleCompareChange = async (checked: boolean) => {
    if (!checked && comparisonOutputs) {
      const ok = await confirmDialog(
        'Disabling compare mode will discard the current multi-cloud comparison results.',
        'Discard Comparison?',
      );
      if (!ok) return;
    }
    setCompareProviders(checked);
    clearGeneratedState();
  };

  const handleRegionChange = (provider: ProviderType, value: string) => {
    userModifiedRegions.current.add(provider);
    setRegions((prev) => ({ ...prev, [provider]: value }));
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

        // #871: Always show per-provider errors, even when all fail
        if (Object.keys(generated).length === 0) {
          setComparisonErrors(errors);
          setError('All provider generations failed. See details below.');
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

  // #869: Merge file sets from all providers instead of using only the first
  const visibleFiles = output
    ? output.files
    : (() => {
        if (!comparisonOutputs) return [];
        const allPaths = new Map<string, { path: string; content: string }>();
        for (const provider of PROVIDERS) {
          const files = comparisonOutputs[provider]?.files;
          if (!files) continue;
          for (const file of files) {
            if (!allPaths.has(file.path)) {
              allPaths.set(file.path, file);
            }
          }
        }
        return Array.from(allPaths.values());
      })();

  const clampedTab = visibleFiles.length === 0
    ? 0
    : activeTab >= visibleFiles.length
      ? 0
      : activeTab;

  return (
    <div className="code-preview">
      <div className="code-preview-header">
        <h3 className="code-preview-title">Code Generation</h3>
        <button type="button" className="code-preview-close" onClick={toggleCodePreview} aria-label="Close code preview panel">
          ✕
        </button>
      </div>

      <div className="code-preview-options">
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
                    onChange={(e) => handleRegionChange(provider, e.target.value)}
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
              onChange={(e) => handleRegionChange(activeProvider, e.target.value)}
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
              onChange={(e) => void handleCompareChange(e.target.checked)}
            />
            Azure / AWS / GCP
          </label>
        </label>
        <button type="button" className="code-preview-generate-btn" onClick={handleGenerate}>
          {effectiveCompare ? 'Compare Providers' : `Generate ${selectedGenerator?.label ?? 'Code'}`}
        </button>
      </div>

      {error && <div className="code-preview-error">{error}</div>}

      {/* #871: Show per-provider error details even when all fail */}
      {!comparisonOutputs && comparisonErrors && Object.keys(comparisonErrors).length > 0 && (
        <div className="code-preview-compare-grid">
          {PROVIDERS.map((provider) => {
            const providerError = comparisonErrors[provider];
            if (!providerError) return null;
            return (
              <section key={provider} className="code-preview-compare-card">
                <header className="code-preview-compare-header">
                  <strong>{provider.toUpperCase()}</strong>
                  <span>Error</span>
                </header>
                <pre className="code-preview-code code-preview-code-compare">
                  <code>{providerError}</code>
                </pre>
              </section>
            );
          })}
        </div>
      )}

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
              Copy
            </button>
            <button type="button" className="code-preview-action-btn" onClick={handleDownloadAll}>
              Download All
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
          {/* #869: Merged file tabs from all providers */}
          <div className="code-preview-tabs">
            {visibleFiles.map((file, i) => (
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
              Copy
            </button>
            <button type="button" className="code-preview-action-btn" onClick={handleDownloadAll}>
              Download All
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

            // #869: Find file matching the selected tab by path
            const selectedPath = visibleFiles[clampedTab]?.path;
            const activeFile = providerOutput.files.find((f) => f.path === selectedPath) ?? providerOutput.files[0];

            return (
              <section key={provider} className="code-preview-compare-card">
                <header className="code-preview-compare-header">
                  <strong>{provider.toUpperCase()}</strong>
                  <span>{providerOutput.files.length} files</span>
                </header>
                {/* #868: Per-provider generation metadata */}
                <div className="code-preview-compare-meta">
                  {providerOutput.metadata.generator} v{providerOutput.metadata.version} · {regions[provider]} ·{' '}
                  {new Date(providerOutput.metadata.generatedAt).toLocaleTimeString()}
                </div>
                <pre className="code-preview-code code-preview-code-compare">
                  <code>{activeFile?.content ?? `(no ${selectedPath ?? 'file'} for ${provider})`}</code>
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

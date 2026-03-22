import { useState } from 'react';
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

function clearGeneratedState(
  setError: (value: string | null) => void,
  setOutput: (value: GeneratedOutput | null) => void,
  setActiveTab: (value: number) => void,
) {
  setError(null);
  setOutput(null);
  setActiveTab(0);
}

export function CodePreview() {
  const toggleCodePreview = useUIStore((s) => s.toggleCodePreview);
  const showAdvancedGeneration = useUIStore((s) => s.showAdvancedGeneration);
  const toggleAdvancedGeneration = useUIStore((s) => s.toggleAdvancedGeneration);
  const activeProvider = useUIStore((s) => s.activeProvider);
  const architecture = useArchitectureStore((s) => s.workspace.architecture);

  const sanitizedName = architecture.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'myproject';

  const generatorOptions = listGenerators().map((generatorPlugin) => ({
    id: generatorPlugin.id,
    label: generatorPlugin.displayName,
  }));
  const [activeTab, setActiveTab] = useState(0);
  const [projectName, setProjectName] = useState(sanitizedName);
  const [regions, setRegions] = useState<Record<ProviderType, string>>({ ...DEFAULT_REGION_BY_PROVIDER });
  const [generator, setGenerator] = useState<GeneratorId>(
    generatorOptions[0]?.id ?? 'terraform'
  );
  const [output, setOutput] = useState<GeneratedOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mismatchedProviders = architecture.nodes
    .filter((node) => node.kind === 'resource')
    .filter((block) => block.provider && block.provider !== activeProvider)
    .reduce((acc, block) => {
      const p = block.provider ?? 'unknown';
      acc.set(p, (acc.get(p) ?? 0) + 1);
      return acc;
    }, new Map<string, number>());
  const hasMismatch = mismatchedProviders.size > 0;

  const handleGeneratorChange = (newGenerator: GeneratorId) => {
    setGenerator(newGenerator);
    clearGeneratedState(setError, setOutput, setActiveTab);
  };

  const handleAdvancedToggle = (checked: boolean) => {
    if (!checked && generator !== 'terraform') {
      setGenerator('terraform');
      clearGeneratedState(setError, setOutput, setActiveTab);
    }
    toggleAdvancedGeneration();
  };

  const handleGenerate = () => {
    setError(null);
    setOutput(null);

    try {
      const baseOptions = {
        mode: 'draft',
        projectName,
        generator,
      } as const;
      const options: GenerationOptions = {
        ...baseOptions,
        provider: activeProvider,
        region: regions[activeProvider],
      };
      const result = generateCode(architecture, options);
      setOutput(result);

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
    }
  };

  const visibleFiles = output?.files ?? [];

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
            ⚠️ Canvas has {Array.from(mismatchedProviders.entries()).map(([p, count]) => `${count} ${p.toUpperCase()}`).join(', ')} block(s) but generating for {activeProvider.toUpperCase()}. Switch those blocks to AZURE for consistent output.
          </div>
        )}
        <label className="code-preview-field code-preview-field-checkbox">
          <span className="code-preview-field-label">Advanced</span>
          <label className="code-preview-checkbox-label">
            <input
              type="checkbox"
              checked={showAdvancedGeneration}
              onChange={(e) => handleAdvancedToggle(e.target.checked)}
            />
            Expert generator selection
          </label>
        </label>
        {showAdvancedGeneration && (
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
        )}
        <label className="code-preview-field">
          <span className="code-preview-field-label">Project</span>
          <input
            className="code-preview-input"
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
          />
        </label>
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
        <button
          type="button"
          className="code-preview-generate-btn"
          onClick={handleGenerate}
        >
          🚀 Generate Code
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
    </div>
  );
}

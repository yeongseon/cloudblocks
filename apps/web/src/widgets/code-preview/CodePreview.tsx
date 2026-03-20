import { useEffect, useRef, useState } from 'react';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { generateCode, GenerationError } from '../../features/generate/pipeline';
import type { GeneratedOutput, GenerationOptions, GeneratorId } from '../../features/generate/types';
import type { ProviderType } from '@cloudblocks/schema';
import './CodePreview.css';

const GENERATORS: { id: GeneratorId; label: string }[] = [
  { id: 'terraform', label: 'Terraform (HCL)' },
  { id: 'bicep', label: 'Bicep (Azure)' },
  { id: 'pulumi', label: 'Pulumi (TypeScript)' },
];

export function CodePreview() {
  const show = useUIStore((s) => s.showCodePreview);
  const toggleCodePreview = useUIStore((s) => s.toggleCodePreview);
  const activeProvider = useUIStore((s) => s.activeProvider);
  const architecture = useArchitectureStore((s) => s.workspace.architecture);
  const workspaceId = useArchitectureStore((s) => s.workspace.id);

  const [activeTab, setActiveTab] = useState(0);
  const [projectName, setProjectName] = useState('myproject');
  const [region, setRegion] = useState('eastus');
  const [generator, setGenerator] = useState<GeneratorId>('terraform');
  const [compareProviders, setCompareProviders] = useState(false);
  const [output, setOutput] = useState<GeneratedOutput | null>(null);
  const [comparisonOutputs, setComparisonOutputs] = useState<Record<ProviderType, GeneratedOutput> | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset local state when panel transitions from closed to open or workspace changes
  const prevShowRef = useRef(show);
  const prevWorkspaceIdRef = useRef(workspaceId);
  useEffect(() => {
    const panelOpened = show && !prevShowRef.current;
    const workspaceChanged = workspaceId !== prevWorkspaceIdRef.current;
    if (panelOpened || workspaceChanged) {
      setActiveTab(0);
      setProjectName('myproject');
      setRegion('eastus');
      setGenerator('terraform');
      setCompareProviders(false);
      setOutput(null);
      setComparisonOutputs(null);
      setError(null);
    }
    prevShowRef.current = show;
    prevWorkspaceIdRef.current = workspaceId;
  }, [show, workspaceId]);

  if (!show) return null;

  const handleGenerate = () => {
    setError(null);
    setOutput(null);
    setComparisonOutputs(null);

    try {
      const baseOptions = {
        mode: 'draft',
        projectName,
        region,
        generator,
      } as const;

      if (compareProviders) {
        if (generator !== 'terraform') {
          setError('Provider comparison is currently available for Terraform only.');
          return;
        }

        const providers: ProviderType[] = ['azure', 'aws', 'gcp'];
        const generated = Object.fromEntries(
          providers.map((provider) => {
            const options: GenerationOptions = { ...baseOptions, provider };
            return [provider, generateCode(architecture, options)];
          }),
        ) as Record<ProviderType, GeneratedOutput>;

        setComparisonOutputs(generated);
      } else {
        const options: GenerationOptions = {
          ...baseOptions,
          provider: activeProvider,
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
    if (!output) return;
    const file = output.files[activeTab];
    if (file) {
      navigator.clipboard.writeText(file.content).catch(() => {
        // Clipboard API may fail in some contexts
      });
    }
  };

  const handleDownloadAll = () => {
    if (!output) return;
    output.files.forEach((file) => {
      const blob = new Blob([file.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.path;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const selectedGenerator = GENERATORS.find((g) => g.id === generator);

  return (
    <div className="code-preview">
      <div className="code-preview-header">
        <h3 className="code-preview-title">⚡ Code Generation</h3>
        <button type="button" className="code-preview-close" onClick={toggleCodePreview}>
          ✕
        </button>
      </div>

      <div className="code-preview-options">
        <label className="code-preview-field">
          <span className="code-preview-field-label">Generator</span>
          <select
            className="code-preview-input"
            value={generator}
            onChange={(e) => setGenerator(e.target.value as GeneratorId)}
          >
            {GENERATORS.map((g) => (
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
        <label className="code-preview-field">
          <span className="code-preview-field-label">Region</span>
          <input
            className="code-preview-input"
            type="text"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          />
        </label>
        <label className="code-preview-field code-preview-field-checkbox">
          <span className="code-preview-field-label">Compare</span>
          <label className="code-preview-checkbox-label">
            <input
              type="checkbox"
              checked={compareProviders}
              onChange={(e) => setCompareProviders(e.target.checked)}
            />
            Azure / AWS / GCP
          </label>
        </label>
        <button type="button" className="code-preview-generate-btn" onClick={handleGenerate}>
          🚀 {compareProviders ? 'Compare Providers' : `Generate ${selectedGenerator?.label ?? 'Code'}`}
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
                  className={`code-preview-tab ${i === activeTab ? 'code-preview-tab-active' : ''}`}
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
            <code>{output.files[activeTab]?.content ?? ''}</code>
          </pre>

          <div className="code-preview-meta">
            {output.metadata.generator} v{output.metadata.version} · {output.metadata.provider} ·{' '}
            {new Date(output.metadata.generatedAt).toLocaleTimeString()}
          </div>
        </>
      )}

      {comparisonOutputs && (
        <div className="code-preview-compare-grid">
          {(['azure', 'aws', 'gcp'] as ProviderType[]).map((provider) => {
            const providerOutput = comparisonOutputs[provider];
            const activeFile = providerOutput.files[activeTab] ?? providerOutput.files[0];

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
      )}
    </div>
  );
}

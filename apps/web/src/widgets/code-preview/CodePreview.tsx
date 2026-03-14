import { useState } from 'react';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import { generateTerraform } from '../../features/generate/pipeline';
import { GenerationError } from '../../features/generate/pipeline';
import type { GeneratedOutput, GenerationOptions } from '../../features/generate/types';
import './CodePreview.css';

export function CodePreview() {
  const show = useUIStore((s) => s.showCodePreview);
  const toggleCodePreview = useUIStore((s) => s.toggleCodePreview);
  const architecture = useArchitectureStore((s) => s.workspace.architecture);

  const [activeTab, setActiveTab] = useState(0);
  const [projectName, setProjectName] = useState('myproject');
  const [region, setRegion] = useState('eastus');
  const [output, setOutput] = useState<GeneratedOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!show) return null;

  const handleGenerate = () => {
    setError(null);
    setOutput(null);
    try {
      const options: GenerationOptions = {
        provider: 'azure',
        mode: 'draft',
        projectName,
        region,
      };
      const result = generateTerraform(architecture, options);
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

  return (
    <div className="code-preview">
      <div className="code-preview-header">
        <h3 className="code-preview-title">⚡ Code Generation</h3>
        <button className="code-preview-close" onClick={toggleCodePreview}>
          ✕
        </button>
      </div>

      <div className="code-preview-options">
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
        <button className="code-preview-generate-btn" onClick={handleGenerate}>
          🚀 Generate Terraform
        </button>
      </div>

      {error && <div className="code-preview-error">{error}</div>}

      {output && (
        <>
          <div className="code-preview-tabs">
            {output.files.map((file, i) => (
              <button
                key={file.path}
                className={`code-preview-tab ${i === activeTab ? 'code-preview-tab-active' : ''}`}
                onClick={() => setActiveTab(i)}
              >
                {file.path}
              </button>
            ))}
          </div>

          <div className="code-preview-actions">
            <button className="code-preview-action-btn" onClick={handleCopyFile}>
              📋 Copy
            </button>
            <button className="code-preview-action-btn" onClick={handleDownloadAll}>
              💾 Download All
            </button>
          </div>

          <pre className="code-preview-code">
            <code>{output.files[activeTab]?.content ?? ''}</code>
          </pre>

          <div className="code-preview-meta">
            v{output.metadata.version} · {output.metadata.provider} ·{' '}
            {new Date(output.metadata.generatedAt).toLocaleTimeString()}
          </div>
        </>
      )}
    </div>
  );
}

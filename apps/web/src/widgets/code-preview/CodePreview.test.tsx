import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CodePreview } from './CodePreview';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import type { ArchitectureModel } from '@cloudblocks/schema';

// Mock the pipeline module
vi.mock('../../features/generate/pipeline', () => {
  const GenerationError = class extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'GenerationError';
    }
  };
  return {
    generateCode: vi.fn(),
    GenerationError,
  };
});

import { generateCode } from '../../features/generate/pipeline';
import { GenerationError } from '../../features/generate/pipeline';

const mockArch: ArchitectureModel = {
  id: 'arch-1',
  name: 'Test',
  version: '1.0.0',
  plates: [],
  blocks: [],
  connections: [],
  externalActors: [],
  createdAt: '',
  updatedAt: '',
};

describe('CodePreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.setState({ showCodePreview: false });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1', name: 'Test', architecture: mockArch,
        createdAt: '', updatedAt: '',
      },
    });
  });

  it('returns null when showCodePreview is false', () => {
    const { container } = render(<CodePreview />);
    expect(container.innerHTML).toBe('');
  });

  it('renders code preview with title when visible', () => {
    useUIStore.setState({ showCodePreview: true });
    render(<CodePreview />);
    expect(screen.getByText(/Code Generation/)).toBeInTheDocument();
  });

  it('closes code preview when close button clicked', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ showCodePreview: true });
    render(<CodePreview />);
    await user.click(screen.getByText('✕'));
    expect(useUIStore.getState().showCodePreview).toBe(false);
  });

  it('renders project and region input fields', () => {
    useUIStore.setState({ showCodePreview: true });
    render(<CodePreview />);
    expect(screen.getByDisplayValue('myproject')).toBeInTheDocument();
    expect(screen.getByDisplayValue('eastus')).toBeInTheDocument();
  });

  it('renders generator selector with three options', () => {
    useUIStore.setState({ showCodePreview: true });
    render(<CodePreview />);

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Terraform (HCL)' })).toHaveAttribute('value', 'terraform');
    expect(screen.getByRole('option', { name: 'Bicep (Azure)' })).toHaveAttribute('value', 'bicep');
    expect(screen.getByRole('option', { name: 'Pulumi (TypeScript)' })).toHaveAttribute('value', 'pulumi');
  });

  it('updates project name input', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ showCodePreview: true });
    render(<CodePreview />);
    const input = screen.getByDisplayValue('myproject');
    await user.clear(input);
    await user.type(input, 'newproject');
    expect(screen.getByDisplayValue('newproject')).toBeInTheDocument();
  });

  it('updates region input', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ showCodePreview: true });
    render(<CodePreview />);
    const input = screen.getByDisplayValue('eastus');
    await user.clear(input);
    await user.type(input, 'westus');
    expect(screen.getByDisplayValue('westus')).toBeInTheDocument();
  });

  it('generates terraform and displays output', async () => {
    const user = userEvent.setup();
    const mockOutput = {
      files: [
        { path: 'main.tf', content: 'resource "azurerm_resource_group" "rg" {}', language: 'hcl' as const },
        { path: 'variables.tf', content: 'variable "region" {}', language: 'hcl' as const },
      ],
      metadata: {
        generator: 'terraform',
        version: '0.3.0',
        provider: 'azure' as const,
        generatedAt: '2026-01-01T00:00:00.000Z',
      },
    };
    vi.mocked(generateCode).mockReturnValue(mockOutput);

    useUIStore.setState({ showCodePreview: true });
    render(<CodePreview />);
    await user.click(screen.getByText(/Generate Terraform \(HCL\)/));
    expect(generateCode).toHaveBeenCalledWith(mockArch, {
      provider: 'azure',
      mode: 'draft',
      projectName: 'myproject',
      region: 'eastus',
      generator: 'terraform',
    });
    expect(screen.getByText('main.tf')).toBeInTheDocument();
    expect(screen.getByText('variables.tf')).toBeInTheDocument();
    expect(screen.getByText(/resource "azurerm_resource_group"/)).toBeInTheDocument();
  });

  it('switches tabs to show different file content', async () => {
    const user = userEvent.setup();
    const mockOutput = {
      files: [
        { path: 'main.tf', content: 'main content', language: 'hcl' as const },
        { path: 'variables.tf', content: 'variables content', language: 'hcl' as const },
      ],
      metadata: {
        generator: 'terraform',
        version: '0.3.0',
        provider: 'azure' as const,
        generatedAt: '2026-01-01T00:00:00.000Z',
      },
    };
    vi.mocked(generateCode).mockReturnValue(mockOutput);

    useUIStore.setState({ showCodePreview: true });
    render(<CodePreview />);
    await user.click(screen.getByText(/Generate Terraform \(HCL\)/));
    // Default shows first file
    expect(screen.getByText('main content')).toBeInTheDocument();
    // Switch to second tab
    await user.click(screen.getByText('variables.tf'));
    expect(screen.getByText('variables content')).toBeInTheDocument();
  });

  it('shows error on GenerationError', async () => {
    const user = userEvent.setup();
    vi.mocked(generateCode).mockImplementation(() => {
      throw new GenerationError('Architecture is empty');
    });

    useUIStore.setState({ showCodePreview: true });
    render(<CodePreview />);
    await user.click(screen.getByText(/Generate Terraform \(HCL\)/));
    expect(screen.getByText('Architecture is empty')).toBeInTheDocument();
  });

  it('shows generic error on unexpected error', async () => {
    const user = userEvent.setup();
    vi.mocked(generateCode).mockImplementation(() => {
      throw new Error('something unexpected');
    });

    useUIStore.setState({ showCodePreview: true });
    render(<CodePreview />);
    await user.click(screen.getByText(/Generate Terraform \(HCL\)/));
    expect(screen.getByText('Unexpected error during code generation.')).toBeInTheDocument();
  });

  it('copy button calls clipboard API', async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    const mockOutput = {
      files: [{ path: 'main.tf', content: 'resource content', language: 'hcl' as const }],
      metadata: { generator: 'terraform', version: '0.3.0', provider: 'azure' as const, generatedAt: '2026-01-01T00:00:00.000Z' },
    };
    vi.mocked(generateCode).mockReturnValue(mockOutput);

    useUIStore.setState({ showCodePreview: true });
    render(<CodePreview />);
    await user.click(screen.getByText(/Generate Terraform \(HCL\)/));
    await user.click(screen.getByText(/Copy/));
    expect(writeTextMock).toHaveBeenCalledWith('resource content');
  });

  it('download all creates download links for each file', async () => {
    const user = userEvent.setup();
    const createObjectURLMock = vi.fn().mockReturnValue('blob:test');
    const revokeObjectURLMock = vi.fn();
    URL.createObjectURL = createObjectURLMock;
    URL.revokeObjectURL = revokeObjectURLMock;
    const clickMock = vi.fn();
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        return { href: '', download: '', click: clickMock } as unknown as HTMLElement;
      }
      return origCreate(tag);
    });

    const mockOutput = {
      files: [
        { path: 'main.tf', content: 'main', language: 'hcl' as const },
        { path: 'vars.tf', content: 'vars', language: 'hcl' as const },
      ],
      metadata: { generator: 'terraform', version: '0.3.0', provider: 'azure' as const, generatedAt: '2026-01-01T00:00:00.000Z' },
    };
    vi.mocked(generateCode).mockReturnValue(mockOutput);

    useUIStore.setState({ showCodePreview: true });
    render(<CodePreview />);
    await user.click(screen.getByText(/Generate Terraform \(HCL\)/));
    await user.click(screen.getByText(/Download All/));
    expect(clickMock).toHaveBeenCalledTimes(2);
    expect(revokeObjectURLMock).toHaveBeenCalledTimes(2);

    vi.restoreAllMocks();
  });

  it('renders metadata section with version, provider and time', async () => {
    const user = userEvent.setup();
    const mockOutput = {
      files: [{ path: 'main.tf', content: 'content', language: 'hcl' as const }],
      metadata: { generator: 'terraform', version: '0.3.0', provider: 'azure' as const, generatedAt: '2026-03-15T12:00:00.000Z' },
    };
    vi.mocked(generateCode).mockReturnValue(mockOutput);

    useUIStore.setState({ showCodePreview: true });
    render(<CodePreview />);
    await user.click(screen.getByText(/Generate Terraform \(HCL\)/));
    expect(screen.getByText(/v0\.3\.0/)).toBeInTheDocument();
    expect(screen.getByText(/azure/)).toBeInTheDocument();
  });

  it('clears previous error and output before generating', async () => {
    const user = userEvent.setup();
    // First: cause an error
    vi.mocked(generateCode).mockImplementation(() => {
      throw new GenerationError('First error');
    });
    useUIStore.setState({ showCodePreview: true });
    render(<CodePreview />);
    await user.click(screen.getByText(/Generate Terraform \(HCL\)/));
    expect(screen.getByText('First error')).toBeInTheDocument();

    // Second: succeed
    const mockOutput = {
      files: [{ path: 'main.tf', content: 'ok', language: 'hcl' as const }],
      metadata: { generator: 'terraform', version: '0.3.0', provider: 'azure' as const, generatedAt: '2026-01-01T00:00:00.000Z' },
    };
    vi.mocked(generateCode).mockReturnValue(mockOutput);
    await user.click(screen.getByText(/Generate Terraform \(HCL\)/));
    expect(screen.queryByText('First error')).not.toBeInTheDocument();
    expect(screen.getByText('main.tf')).toBeInTheDocument();
  });

  it('updates generate button label when selecting bicep and pulumi', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ showCodePreview: true });
    render(<CodePreview />);

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'bicep');
    expect(screen.getByText(/Generate Bicep \(Azure\)/)).toBeInTheDocument();

    await user.selectOptions(select, 'pulumi');
    expect(screen.getByText(/Generate Pulumi \(TypeScript\)/)).toBeInTheDocument();
  });

  it('falls back to generic generate label for unknown generator value', () => {
    useUIStore.setState({ showCodePreview: true });
    render(<CodePreview />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'unknown-generator' } });

    expect(screen.getByText('🚀 Generate Code')).toBeInTheDocument();
  });

  it('swallows clipboard write failure when copying generated file', async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn().mockRejectedValue(new Error('clipboard denied'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });
    const mockOutput = {
      files: [{ path: 'main.tf', content: 'resource content', language: 'hcl' as const }],
      metadata: { generator: 'terraform', version: '0.3.0', provider: 'azure' as const, generatedAt: '2026-01-01T00:00:00.000Z' },
    };
    vi.mocked(generateCode).mockReturnValue(mockOutput);

    useUIStore.setState({ showCodePreview: true });
    render(<CodePreview />);

    await user.click(screen.getByText(/Generate Terraform \(HCL\)/));
    await expect(user.click(screen.getByText(/Copy/))).resolves.toBeUndefined();
    expect(writeTextMock).toHaveBeenCalledWith('resource content');
  });

  it('renders empty code fallback when active tab has no file', async () => {
    const user = userEvent.setup();
    const mockOutput = {
      files: [],
      metadata: { generator: 'terraform', version: '0.3.0', provider: 'azure' as const, generatedAt: '2026-01-01T00:00:00.000Z' },
    };
    vi.mocked(generateCode).mockReturnValue(mockOutput);

    useUIStore.setState({ showCodePreview: true });
    const { container } = render(<CodePreview />);

    await user.click(screen.getByText(/Generate Terraform \(HCL\)/));
    const codeElement = container.querySelector('.code-preview-code code');
    expect(codeElement?.textContent).toBe('');
  });

  it('generates comparison outputs for azure, aws, and gcp when compare mode is enabled', async () => {
    const user = userEvent.setup();
    vi.mocked(generateCode).mockImplementation((_, options) => ({
      files: [{ path: 'main.tf', content: `provider=${options.provider}`, language: 'hcl' as const }],
      metadata: {
        generator: 'terraform',
        version: '0.3.0',
        provider: options.provider,
        generatedAt: '2026-01-01T00:00:00.000Z',
      },
    }));

    useUIStore.setState({ showCodePreview: true });
    render(<CodePreview />);

    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByText('🚀 Compare Providers'));

    expect(vi.mocked(generateCode)).toHaveBeenCalledTimes(3);
    expect(screen.getByText('AZURE')).toBeInTheDocument();
    expect(screen.getByText('AWS')).toBeInTheDocument();
    expect(screen.getByText('GCP')).toBeInTheDocument();
    expect(screen.getByText('provider=azure')).toBeInTheDocument();
    expect(screen.getByText('provider=aws')).toBeInTheDocument();
    expect(screen.getByText('provider=gcp')).toBeInTheDocument();
  });

  it('shows compare-mode restriction error for non-terraform generators', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ showCodePreview: true });
    render(<CodePreview />);

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'bicep');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByText('🚀 Compare Providers'));

    expect(screen.getByText('Provider comparison is currently available for Terraform only.')).toBeInTheDocument();
  });

  it('resets local state on reopen after generating code', async () => {
    const user = userEvent.setup();
    const mockOutput = {
      files: [{ path: 'main.tf', content: 'resource content', language: 'hcl' as const }],
      metadata: { generator: 'terraform', version: '0.3.0', provider: 'azure' as const, generatedAt: '2026-01-01T00:00:00.000Z' },
    };
    vi.mocked(generateCode).mockReturnValue(mockOutput);

    useUIStore.setState({ showCodePreview: true });
    const { rerender } = render(<CodePreview />);

    // Change project name and generate
    const input = screen.getByDisplayValue('myproject');
    await user.clear(input);
    await user.type(input, 'changed');
    await user.click(screen.getByText(/Generate Terraform \(HCL\)/));
    expect(screen.getByText('main.tf')).toBeInTheDocument();

    // Close the panel
    useUIStore.setState({ showCodePreview: false });
    rerender(<CodePreview />);

    // Reopen the panel
    useUIStore.setState({ showCodePreview: true });
    rerender(<CodePreview />);

    // Output should be cleared and form reset
    expect(screen.queryByText('main.tf')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('myproject')).toBeInTheDocument();
  });

  it('resets local state when workspace changes', async () => {
    const user = userEvent.setup();
    const mockOutput = {
      files: [{ path: 'main.tf', content: 'resource content', language: 'hcl' as const }],
      metadata: { generator: 'terraform', version: '0.3.0', provider: 'azure' as const, generatedAt: '2026-01-01T00:00:00.000Z' },
    };
    vi.mocked(generateCode).mockReturnValue(mockOutput);

    useUIStore.setState({ showCodePreview: true });
    const { rerender } = render(<CodePreview />);

    await user.click(screen.getByText(/Generate Terraform \(HCL\)/));
    expect(screen.getByText('main.tf')).toBeInTheDocument();

    // Switch workspace
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-2', name: 'Other', architecture: mockArch,
        createdAt: '', updatedAt: '',
      },
    });
    rerender(<CodePreview />);

    // Output should be cleared
    expect(screen.queryByText('main.tf')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('myproject')).toBeInTheDocument();
  });
});

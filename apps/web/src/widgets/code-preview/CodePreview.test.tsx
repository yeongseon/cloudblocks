import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CodePreview } from './CodePreview';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import type { ArchitectureModel } from '@cloudblocks/schema';

const { listGeneratorsMock } = vi.hoisted(() => ({
  listGeneratorsMock: vi.fn(() => [
    { id: 'terraform', displayName: 'Terraform (HCL)', supportedProviders: ['azure', 'aws', 'gcp'] },
    { id: 'bicep', displayName: 'Bicep (Azure)', supportedProviders: ['azure'] },
    { id: 'pulumi', displayName: 'Pulumi (TypeScript)', supportedProviders: ['azure'] },
  ]),
}));

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

vi.mock('../../features/generate/registry', () => ({
  listGenerators: listGeneratorsMock,
}));

import { generateCode } from '../../features/generate/pipeline';
import { GenerationError } from '../../features/generate/pipeline';
import { listGenerators } from '../../features/generate/registry';

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
    useUIStore.setState({ activeProvider: 'azure' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1', name: 'Test', architecture: mockArch,
        createdAt: '', updatedAt: '',
      },
    });
  });

  it('renders code preview with title', () => {
    render(<CodePreview />);
    expect(screen.getByText(/Code Generation/)).toBeInTheDocument();
    expect(listGenerators).toHaveBeenCalled();
  });

  it('closes code preview when close button clicked', async () => {
    const user = userEvent.setup();
    useUIStore.setState({ showCodePreview: true });
    render(<CodePreview />);
    await user.click(screen.getByRole('button', { name: 'Close code preview panel' }));
    expect(useUIStore.getState().showCodePreview).toBe(false);
  });

  it('renders project and region input fields', () => {
    render(<CodePreview />);
    expect(screen.getByDisplayValue('test')).toBeInTheDocument();
    expect(screen.getByDisplayValue('eastus')).toBeInTheDocument();
  });

  it('defaults region to us-east-1 for AWS provider', () => {
    useUIStore.setState({ activeProvider: 'aws' });
    render(<CodePreview />);
    expect(screen.getByDisplayValue('us-east-1')).toBeInTheDocument();
  });

  it('defaults region to us-central1 for GCP provider', () => {
    useUIStore.setState({ activeProvider: 'gcp' });
    render(<CodePreview />);
    expect(screen.getByDisplayValue('us-central1')).toBeInTheDocument();
  });

  it('renders generator selector with three options', () => {
    render(<CodePreview />);

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Terraform (HCL)' })).toHaveAttribute('value', 'terraform');
    expect(screen.getByRole('option', { name: 'Bicep (Azure)' })).toHaveAttribute('value', 'bicep');
    expect(screen.getByRole('option', { name: 'Pulumi (TypeScript)' })).toHaveAttribute('value', 'pulumi');
  });

  it('updates project name input', async () => {
    const user = userEvent.setup();
    render(<CodePreview />);
    const input = screen.getByDisplayValue('test');
    await user.clear(input);
    await user.type(input, 'newproject');
    expect(screen.getByDisplayValue('newproject')).toBeInTheDocument();
  });

  it('updates region input', async () => {
    const user = userEvent.setup();
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

    render(<CodePreview />);
    await user.click(screen.getByText(/Generate Terraform \(HCL\)/));
    expect(generateCode).toHaveBeenCalledWith(mockArch, {
      provider: 'azure',
      mode: 'draft',
      projectName: 'test',
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

    render(<CodePreview />);
    await user.click(screen.getByText(/Generate Terraform \(HCL\)/));
    expect(screen.getByText('Architecture is empty')).toBeInTheDocument();
  });

  it('shows generic error on unexpected error', async () => {
    const user = userEvent.setup();
    vi.mocked(generateCode).mockImplementation(() => {
      throw new Error('something unexpected');
    });

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
    render(<CodePreview />);

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'bicep');
    expect(screen.getByText(/Generate Bicep \(Azure\)/)).toBeInTheDocument();

    await user.selectOptions(select, 'pulumi');
    expect(screen.getByText(/Generate Pulumi \(TypeScript\)/)).toBeInTheDocument();
  });

  it('falls back to generic generate label for unknown generator value', () => {
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

    render(<CodePreview />);

    await user.click(screen.getByText(/Generate Terraform \(HCL\)/));
    await expect(user.click(screen.getByText(/Copy/))).resolves.toBeUndefined();
    expect(writeTextMock).toHaveBeenCalledWith('resource content');
  });

  it('does not throw when clipboard API is unavailable', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    const mockOutput = {
      files: [{ path: 'main.tf', content: 'resource content', language: 'hcl' as const }],
      metadata: { generator: 'terraform', version: '0.3.0', provider: 'azure' as const, generatedAt: '2026-01-01T00:00:00.000Z' },
    };
    vi.mocked(generateCode).mockReturnValue(mockOutput);

    render(<CodePreview />);

    await user.click(screen.getByText(/Generate Terraform \(HCL\)/));
    await expect(user.click(screen.getByText(/Copy/))).resolves.toBeUndefined();
  });

  it('renders empty code fallback when active tab has no file', async () => {
    const user = userEvent.setup();
    const mockOutput = {
      files: [],
      metadata: { generator: 'terraform', version: '0.3.0', provider: 'azure' as const, generatedAt: '2026-01-01T00:00:00.000Z' },
    };
    vi.mocked(generateCode).mockReturnValue(mockOutput);

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

  it('disables compare checkbox for generators without multi-provider support', async () => {
    const user = userEvent.setup();
    render(<CodePreview />);

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'bicep');
    const compareCheckbox = screen.getByRole('checkbox');

    expect(compareCheckbox).toBeDisabled();
  });

  it('resets generated output on remount (simulating panel close and reopen)', async () => {
    const user = userEvent.setup();
    const mockOutput = {
      files: [{ path: 'main.tf', content: 'resource content', language: 'hcl' as const }],
      metadata: { generator: 'terraform', version: '0.3.0', provider: 'azure' as const, generatedAt: '2026-01-01T00:00:00.000Z' },
    };
    vi.mocked(generateCode).mockReturnValue(mockOutput);

    const { unmount } = render(<CodePreview />);
    await user.click(screen.getByText(/Generate Terraform \(HCL\)/));
    expect(screen.getByText('main.tf')).toBeInTheDocument();

    unmount();
    render(<CodePreview />);

    expect(screen.queryByText('main.tf')).not.toBeInTheDocument();
    expect(screen.queryByText('resource content')).not.toBeInTheDocument();
  });

  it('derives default project name from architecture name', () => {
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-2', name: 'Custom', architecture: {
          ...mockArch,
          name: 'My Cool App',
        },
        createdAt: '', updatedAt: '',
      },
    });
    render(<CodePreview />);
    expect(screen.getByDisplayValue('my-cool-app')).toBeInTheDocument();
  });

  it('falls back to myproject when architecture name sanitizes to empty', () => {
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-3', name: 'Empty', architecture: {
          ...mockArch,
          name: '!!!',
        },
        createdAt: '', updatedAt: '',
      },
    });
    render(<CodePreview />);
    expect(screen.getByDisplayValue('myproject')).toBeInTheDocument();
  });

  it('renders file tabs and navigates between files in compare mode', async () => {
    const user = userEvent.setup();
    vi.mocked(generateCode).mockImplementation((_, options) => ({
      files: [
        { path: 'main.tf', content: `main-${options.provider}`, language: 'hcl' as const },
        { path: 'variables.tf', content: `vars-${options.provider}`, language: 'hcl' as const },
      ],
      metadata: {
        generator: 'terraform',
        version: '0.3.0',
        provider: options.provider,
        generatedAt: '2026-01-01T00:00:00.000Z',
      },
    }));

    render(<CodePreview />);

    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByText('🚀 Compare Providers'));

    expect(screen.getByText('main.tf')).toBeInTheDocument();
    expect(screen.getByText('variables.tf')).toBeInTheDocument();

    expect(screen.getByText('main-azure')).toBeInTheDocument();
    expect(screen.getByText('main-aws')).toBeInTheDocument();
    expect(screen.getByText('main-gcp')).toBeInTheDocument();

    await user.click(screen.getByText('variables.tf'));

    expect(screen.getByText('vars-azure')).toBeInTheDocument();
    expect(screen.getByText('vars-aws')).toBeInTheDocument();
    expect(screen.getByText('vars-gcp')).toBeInTheDocument();
  });

  it('copy button copies all provider files with headers when in comparison mode', async () => {
    const user = userEvent.setup();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    vi.mocked(generateCode).mockImplementation((_, options) => ({
      files: [{ path: 'main.tf', content: `provider=${options.provider}`, language: 'hcl' as const }],
      metadata: {
        generator: 'terraform',
        version: '0.3.0',
        provider: options.provider,
        generatedAt: '2026-01-01T00:00:00.000Z',
      },
    }));

    render(<CodePreview />);

    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByText('🚀 Compare Providers'));
    await user.click(screen.getByText(/Copy/));

    expect(writeTextMock).toHaveBeenCalledWith(
      expect.stringContaining('// --- AZURE ---')
    );
    expect(writeTextMock).toHaveBeenCalledWith(
      expect.stringContaining('// --- AWS ---')
    );
    expect(writeTextMock).toHaveBeenCalledWith(
      expect.stringContaining('// --- GCP ---')
    );
    expect(writeTextMock).toHaveBeenCalledWith(
      expect.stringContaining('provider=azure')
    );
    expect(writeTextMock).toHaveBeenCalledWith(
      expect.stringContaining('provider=aws')
    );
    expect(writeTextMock).toHaveBeenCalledWith(
      expect.stringContaining('provider=gcp')
    );
  });

  it('download all creates download links for each provider file when in comparison mode', async () => {
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

    vi.mocked(generateCode).mockImplementation((_, options) => ({
      files: [
        { path: 'main.tf', content: `provider=${options.provider}`, language: 'hcl' as const },
        { path: 'vars.tf', content: `vars=${options.provider}`, language: 'hcl' as const },
      ],
      metadata: {
        generator: 'terraform',
        version: '0.3.0',
        provider: options.provider,
        generatedAt: '2026-01-01T00:00:00.000Z',
      },
    }));

    render(<CodePreview />);

    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByText('🚀 Compare Providers'));
    await user.click(screen.getByText(/Download All/));

    // 3 providers × 2 files each = 6 downloads
    expect(clickMock).toHaveBeenCalledTimes(6);
    expect(revokeObjectURLMock).toHaveBeenCalledTimes(6);

    vi.restoreAllMocks();
  });

  it('shows partial comparison results when some providers fail', async () => {
    const user = userEvent.setup();
    let callCount = 0;
    vi.mocked(generateCode).mockImplementation((_, options) => {
      callCount += 1;
      if (options.provider === 'gcp') {
        throw new GenerationError('GCP not supported');
      }
      return {
        files: [{ path: 'main.tf', content: `provider=${options.provider}`, language: 'hcl' as const }],
        metadata: {
          generator: 'terraform',
          version: '0.3.0',
          provider: options.provider,
          generatedAt: '2026-01-01T00:00:00.000Z',
        },
      };
    });

    render(<CodePreview />);

    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByText('🚀 Compare Providers'));

    expect(callCount).toBe(3);
    expect(screen.getByText('provider=azure')).toBeInTheDocument();
    expect(screen.getByText('provider=aws')).toBeInTheDocument();
    expect(screen.getByText('GCP not supported')).toBeInTheDocument();
    expect(screen.getByText('Some providers failed. Showing partial comparison results.')).toBeInTheDocument();
  });

  it('shows error when all providers fail in comparison mode', async () => {
    const user = userEvent.setup();
    vi.mocked(generateCode).mockImplementation(() => {
      throw new GenerationError('Provider generation failed');
    });

    render(<CodePreview />);

    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByText('🚀 Compare Providers'));

    expect(screen.getByText('All provider generations failed.')).toBeInTheDocument();
  });

  it('shows unexpected error message for non-GenerationError in comparison mode', async () => {
    const user = userEvent.setup();
    let callCount = 0;
    vi.mocked(generateCode).mockImplementation((_, options) => {
      callCount += 1;
      if (options.provider === 'aws') {
        throw new Error('unexpected');
      }
      return {
        files: [{ path: 'main.tf', content: `provider=${options.provider}`, language: 'hcl' as const }],
        metadata: {
          generator: 'terraform',
          version: '0.3.0',
          provider: options.provider,
          generatedAt: '2026-01-01T00:00:00.000Z',
        },
      };
    });

    render(<CodePreview />);

    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByText('🚀 Compare Providers'));

    expect(callCount).toBe(3);
    expect(screen.getByText('Unexpected error during code generation.')).toBeInTheDocument();
  });

  it('copy and download no-op gracefully when no output exists', () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    render(<CodePreview />);

    expect(screen.queryByText(/Copy/)).not.toBeInTheDocument();
    expect(writeTextMock).not.toHaveBeenCalled();
  });

  it('resets region when provider changes', () => {
    const { rerender } = render(<CodePreview />);

    expect(screen.getByDisplayValue('eastus')).toBeInTheDocument();

    useUIStore.setState({ activeProvider: 'aws' });
    rerender(<CodePreview />);

    expect(screen.getByDisplayValue('us-east-1')).toBeInTheDocument();
  });

  it('clears output and errors when generator changes', async () => {
    const user = userEvent.setup();
    vi.mocked(generateCode).mockReturnValue({
      files: [{ path: 'main.tf', content: 'content', language: 'hcl' as const }],
      metadata: { generator: 'terraform', version: '0.3.0', provider: 'azure' as const, generatedAt: '2026-01-01T00:00:00.000Z' },
    });

    render(<CodePreview />);
    await user.click(screen.getByText(/Generate Terraform \(HCL\)/));
    expect(screen.getByText('main.tf')).toBeInTheDocument();

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'bicep');

    expect(screen.queryByText('main.tf')).not.toBeInTheDocument();
  });

  it('clears output and errors when compare mode toggles', async () => {
    const user = userEvent.setup();
    vi.mocked(generateCode).mockReturnValue({
      files: [{ path: 'main.tf', content: 'content', language: 'hcl' as const }],
      metadata: { generator: 'terraform', version: '0.3.0', provider: 'azure' as const, generatedAt: '2026-01-01T00:00:00.000Z' },
    });

    render(<CodePreview />);
    await user.click(screen.getByText(/Generate Terraform \(HCL\)/));
    expect(screen.getByText('main.tf')).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox'));

    expect(screen.queryByText('main.tf')).not.toBeInTheDocument();
  });

});

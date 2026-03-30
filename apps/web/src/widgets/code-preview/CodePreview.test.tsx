import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CodePreview } from './CodePreview';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import type { ArchitectureModel } from '@cloudblocks/schema';

const { listGeneratorsMock } = vi.hoisted(() => ({
  listGeneratorsMock: vi.fn(() => [
    {
      id: 'terraform',
      displayName: 'Terraform (HCL)',
      supportedProviders: ['azure', 'aws', 'gcp'],
    },
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
  nodes: [],
  connections: [],
  endpoints: [],
  externalActors: [],
  createdAt: '',
  updatedAt: '',
};

describe('CodePreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUIStore.setState({ activeProvider: 'azure', showAdvancedGeneration: false });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test',
        provider: 'azure' as const,
        architecture: mockArch,
        createdAt: '',
        updatedAt: '',
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

  it('hides generator selector by default and shows it when Advanced is enabled', async () => {
    const user = userEvent.setup();
    render(<CodePreview />);

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('Expert generator selection'));

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Terraform (HCL)' })).toHaveAttribute(
      'value',
      'terraform',
    );
    expect(screen.getByRole('option', { name: 'Bicep (Azure) (Experimental)' })).toHaveAttribute(
      'value',
      'bicep',
    );
    expect(
      screen.getByRole('option', { name: 'Pulumi (TypeScript) (Experimental)' }),
    ).toHaveAttribute('value', 'pulumi');
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
        {
          path: 'main.tf',
          content: 'resource "azurerm_resource_group" "rg" {}',
          language: 'hcl' as const,
        },
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
    await user.click(screen.getByText(/Generate Code/));
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
    await user.click(screen.getByText(/Generate Code/));
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
    await user.click(screen.getByText(/Generate Code/));
    expect(screen.getByText('Architecture is empty')).toBeInTheDocument();
  });

  it('shows generic error on unexpected error', async () => {
    const user = userEvent.setup();
    vi.mocked(generateCode).mockImplementation(() => {
      throw new Error('something unexpected');
    });

    render(<CodePreview />);
    await user.click(screen.getByText(/Generate Code/));
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
      metadata: {
        generator: 'terraform',
        version: '0.3.0',
        provider: 'azure' as const,
        generatedAt: '2026-01-01T00:00:00.000Z',
      },
    };
    vi.mocked(generateCode).mockReturnValue(mockOutput);

    render(<CodePreview />);
    await user.click(screen.getByText(/Generate Code/));
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
      metadata: {
        generator: 'terraform',
        version: '0.3.0',
        provider: 'azure' as const,
        generatedAt: '2026-01-01T00:00:00.000Z',
      },
    };
    vi.mocked(generateCode).mockReturnValue(mockOutput);

    render(<CodePreview />);
    await user.click(screen.getByText(/Generate Code/));
    await user.click(screen.getByText(/Download All/));
    expect(clickMock).toHaveBeenCalledTimes(2);
    expect(revokeObjectURLMock).toHaveBeenCalledTimes(2);

    vi.restoreAllMocks();
  });

  it('renders metadata section with version, provider and time', async () => {
    const user = userEvent.setup();
    const mockOutput = {
      files: [{ path: 'main.tf', content: 'content', language: 'hcl' as const }],
      metadata: {
        generator: 'terraform',
        version: '0.3.0',
        provider: 'azure' as const,
        generatedAt: '2026-03-15T12:00:00.000Z',
      },
    };
    vi.mocked(generateCode).mockReturnValue(mockOutput);

    render(<CodePreview />);
    await user.click(screen.getByText(/Generate Code/));
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
    await user.click(screen.getByText(/Generate Code/));
    expect(screen.getByText('First error')).toBeInTheDocument();

    // Second: succeed
    const mockOutput = {
      files: [{ path: 'main.tf', content: 'ok', language: 'hcl' as const }],
      metadata: {
        generator: 'terraform',
        version: '0.3.0',
        provider: 'azure' as const,
        generatedAt: '2026-01-01T00:00:00.000Z',
      },
    };
    vi.mocked(generateCode).mockReturnValue(mockOutput);
    await user.click(screen.getByText(/Generate Code/));
    expect(screen.queryByText('First error')).not.toBeInTheDocument();
    expect(screen.getByText('main.tf')).toBeInTheDocument();
  });

  it('keeps a neutral generate button label when selecting advanced generators', async () => {
    const user = userEvent.setup();
    render(<CodePreview />);

    await user.click(screen.getByLabelText('Expert generator selection'));
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'bicep');
    expect(screen.getByText('🚀 Generate Code')).toBeInTheDocument();

    await user.selectOptions(select, 'pulumi');
    expect(screen.getByText('🚀 Generate Code')).toBeInTheDocument();
  });

  it('resets advanced generator selection back to terraform when advanced mode is disabled', async () => {
    const user = userEvent.setup();
    render(<CodePreview />);

    await user.click(screen.getByLabelText('Expert generator selection'));
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'bicep');
    await user.click(screen.getByLabelText('Expert generator selection'));

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();

    await user.click(screen.getByText(/Generate Code/));

    expect(generateCode).toHaveBeenCalledWith(
      mockArch,
      expect.objectContaining({ generator: 'terraform' }),
    );
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
      metadata: {
        generator: 'terraform',
        version: '0.3.0',
        provider: 'azure' as const,
        generatedAt: '2026-01-01T00:00:00.000Z',
      },
    };
    vi.mocked(generateCode).mockReturnValue(mockOutput);

    render(<CodePreview />);

    await user.click(screen.getByText(/Generate Code/));
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
      metadata: {
        generator: 'terraform',
        version: '0.3.0',
        provider: 'azure' as const,
        generatedAt: '2026-01-01T00:00:00.000Z',
      },
    };
    vi.mocked(generateCode).mockReturnValue(mockOutput);

    render(<CodePreview />);

    await user.click(screen.getByText(/Generate Code/));
    await expect(user.click(screen.getByText(/Copy/))).resolves.toBeUndefined();
  });

  it('renders empty code fallback when active tab has no file', async () => {
    const user = userEvent.setup();
    const mockOutput = {
      files: [],
      metadata: {
        generator: 'terraform',
        version: '0.3.0',
        provider: 'azure' as const,
        generatedAt: '2026-01-01T00:00:00.000Z',
      },
    };
    vi.mocked(generateCode).mockReturnValue(mockOutput);

    const { container } = render(<CodePreview />);

    await user.click(screen.getByText(/Generate Code/));
    const codeElement = container.querySelector('.code-preview-code code');
    expect(codeElement?.textContent).toBe('');
  });

  it('hides compare controls from the UI', () => {
    render(<CodePreview />);

    expect(screen.queryByLabelText('Azure / AWS / GCP')).not.toBeInTheDocument();
    expect(screen.queryByText(/Compare Providers/)).not.toBeInTheDocument();
  });

  it('derives default project name from architecture name', () => {
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-2',
        name: 'Custom',
        provider: 'azure' as const,
        architecture: {
          ...mockArch,
          name: 'My Cool App',
        },
        createdAt: '',
        updatedAt: '',
      },
    });
    render(<CodePreview />);
    expect(screen.getByDisplayValue('my-cool-app')).toBeInTheDocument();
  });

  it('falls back to myproject when architecture name sanitizes to empty', () => {
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-3',
        name: 'Empty',
        provider: 'azure' as const,
        architecture: {
          ...mockArch,
          name: '!!!',
        },
        createdAt: '',
        updatedAt: '',
      },
    });
    render(<CodePreview />);
    expect(screen.getByDisplayValue('myproject')).toBeInTheDocument();
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

  it('preserves custom region when switching providers', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<CodePreview />);

    const azureRegionInput = screen.getByDisplayValue('eastus');
    await user.clear(azureRegionInput);
    await user.type(azureRegionInput, 'westus2');

    act(() => {
      useUIStore.setState({ activeProvider: 'aws' });
    });
    rerender(<CodePreview />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('us-east-1')).toBeInTheDocument();
    });

    act(() => {
      useUIStore.setState({ activeProvider: 'azure' });
    });
    rerender(<CodePreview />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('westus2')).toBeInTheDocument();
    });
  });

  it('clears output and errors when generator changes', async () => {
    const user = userEvent.setup();
    vi.mocked(generateCode).mockReturnValue({
      files: [{ path: 'main.tf', content: 'content', language: 'hcl' as const }],
      metadata: {
        generator: 'terraform',
        version: '0.3.0',
        provider: 'azure' as const,
        generatedAt: '2026-01-01T00:00:00.000Z',
      },
    });

    render(<CodePreview />);
    await user.click(screen.getByText(/Generate Code/));
    expect(screen.getByText('main.tf')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Expert generator selection'));
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'bicep');

    expect(screen.queryByText('main.tf')).not.toBeInTheDocument();
  });

  it('shows mismatch warning when blocks have different provider than active', () => {
    useUIStore.setState({ activeProvider: 'azure' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test',
        provider: 'azure' as const,
        architecture: {
          ...mockArch,
          nodes: [
            {
              id: 'b1',
              name: 'B1',
              kind: 'resource',
              layer: 'resource',
              resourceType: 'web_compute',
              category: 'compute',
              provider: 'aws' as const,
              parentId: null,
              position: { x: 0, y: 0, z: 0 },
              metadata: {},
            },
            {
              id: 'b2',
              name: 'B2',
              kind: 'resource',
              layer: 'resource',
              resourceType: 'relational_database',
              category: 'data',
              provider: 'aws' as const,
              parentId: null,
              position: { x: 0, y: 0, z: 0 },
              metadata: {},
            },
          ],
        },
        createdAt: '',
        updatedAt: '',
      },
    });
    render(<CodePreview />);

    const warning = screen.getByRole('alert');
    expect(warning).toBeInTheDocument();
    expect(warning.textContent).toContain('2 AWS');
    expect(warning.textContent).toContain('AZURE');
  });

  it('does not show mismatch warning when all blocks match active provider', () => {
    useUIStore.setState({ activeProvider: 'azure' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test',
        provider: 'azure' as const,
        architecture: {
          ...mockArch,
          nodes: [
            {
              id: 'b1',
              name: 'B1',
              kind: 'resource',
              layer: 'resource',
              resourceType: 'web_compute',
              category: 'compute',
              provider: 'azure' as const,
              parentId: null,
              position: { x: 0, y: 0, z: 0 },
              metadata: {},
            },
          ],
        },
        createdAt: '',
        updatedAt: '',
      },
    });
    render(<CodePreview />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not show mismatch warning when blocks have no provider set', () => {
    useUIStore.setState({ activeProvider: 'azure' });
    useArchitectureStore.setState({
      workspace: {
        id: 'ws-1',
        name: 'Test',
        provider: 'azure' as const,
        architecture: {
          ...mockArch,
          nodes: [
            {
              id: 'b1',
              name: 'B1',
              kind: 'resource',
              layer: 'resource',
              resourceType: 'web_compute',
              category: 'compute',
              provider: 'azure',
              parentId: null,
              position: { x: 0, y: 0, z: 0 },
              metadata: {},
            },
          ],
        },
        createdAt: '',
        updatedAt: '',
      },
    });
    render(<CodePreview />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows empty state when no generators support the active provider', () => {
    listGeneratorsMock.mockReturnValue([
      { id: 'terraform', displayName: 'Terraform (HCL)', supportedProviders: ['azure'] },
    ]);
    useUIStore.setState({ activeProvider: 'aws' });

    render(<CodePreview />);

    expect(screen.getByText(/No code generators currently support/)).toBeInTheDocument();
    expect(screen.getByText('AWS')).toBeInTheDocument();
    expect(screen.queryByText(/Generate Code/)).not.toBeInTheDocument();
  });

  it('shows form when generators support the active provider', () => {
    listGeneratorsMock.mockReturnValue([
      { id: 'terraform', displayName: 'Terraform (HCL)', supportedProviders: ['azure', 'aws'] },
    ]);
    useUIStore.setState({ activeProvider: 'aws' });

    render(<CodePreview />);

    expect(screen.queryByText(/No code generators currently support/)).not.toBeInTheDocument();
    expect(screen.getByText(/Generate Code/)).toBeInTheDocument();
  });

  it('auto-resets generator to terraform when provider switch invalidates selection', async () => {
    const user = userEvent.setup();
    listGeneratorsMock.mockReturnValue([
      { id: 'terraform', displayName: 'Terraform (HCL)', supportedProviders: ['azure', 'aws'] },
      { id: 'bicep', displayName: 'Bicep (Azure)', supportedProviders: ['azure'] },
    ]);
    useUIStore.setState({ activeProvider: 'azure', showAdvancedGeneration: true });

    const { rerender } = render(<CodePreview />);

    // Select bicep
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'bicep');

    // Switch to AWS — bicep doesn't support AWS, should auto-reset
    act(() => {
      useUIStore.setState({ activeProvider: 'aws' });
    });
    rerender(<CodePreview />);

    // Generate and verify it uses terraform (not bicep)
    vi.mocked(generateCode).mockReturnValue({
      files: [{ path: 'main.tf', content: 'aws content', language: 'hcl' as const }],
      metadata: {
        generator: 'terraform',
        version: '1.0.0',
        provider: 'aws' as const,
        generatedAt: '2026-01-01T00:00:00.000Z',
      },
    });

    await user.click(screen.getByText(/Generate Code/));

    expect(generateCode).toHaveBeenCalledWith(
      mockArch,
      expect.objectContaining({ generator: 'terraform', provider: 'aws' }),
    );
  });

  it('keeps generator when provider switch leaves it valid', async () => {
    const user = userEvent.setup();
    listGeneratorsMock.mockReturnValue([
      {
        id: 'terraform',
        displayName: 'Terraform (HCL)',
        supportedProviders: ['azure', 'aws', 'gcp'],
      },
    ]);
    useUIStore.setState({ activeProvider: 'azure' });

    const { rerender } = render(<CodePreview />);

    // Switch to AWS — terraform still supports AWS, should keep selection
    act(() => {
      useUIStore.setState({ activeProvider: 'aws' });
    });
    rerender(<CodePreview />);

    vi.mocked(generateCode).mockReturnValue({
      files: [{ path: 'main.tf', content: 'ok', language: 'hcl' as const }],
      metadata: {
        generator: 'terraform',
        version: '1.0.0',
        provider: 'aws' as const,
        generatedAt: '2026-01-01T00:00:00.000Z',
      },
    });

    await user.click(screen.getByText(/Generate Code/));

    expect(generateCode).toHaveBeenCalledWith(
      mockArch,
      expect.objectContaining({ generator: 'terraform', provider: 'aws' }),
    );
  });

  it('falls back to first compatible generator when terraform is not available', () => {
    listGeneratorsMock.mockReturnValue([
      { id: 'pulumi', displayName: 'Pulumi (TypeScript)', supportedProviders: ['aws'] },
    ]);
    useUIStore.setState({ activeProvider: 'aws' });

    render(<CodePreview />);

    // Should render form (not empty state) since pulumi supports AWS
    expect(screen.getByText(/Generate Code/)).toBeInTheDocument();
  });

  it('clears stale output when switching to a provider where terraform is still valid', async () => {
    const user = userEvent.setup();
    listGeneratorsMock.mockReturnValue([
      {
        id: 'terraform',
        displayName: 'Terraform (HCL)',
        supportedProviders: ['azure', 'aws', 'gcp'],
      },
    ]);
    vi.mocked(generateCode).mockReturnValue({
      files: [{ path: 'main.tf', content: 'azure content', language: 'hcl' as const }],
      metadata: {
        generator: 'terraform',
        version: '1.0.0',
        provider: 'azure' as const,
        generatedAt: '2026-01-01T00:00:00.000Z',
      },
    });

    const { rerender } = render(<CodePreview />);
    await user.click(screen.getByText(/Generate Code/));
    expect(screen.getByText('main.tf')).toBeInTheDocument();

    // Switch to AWS — terraform still valid, but stale Azure output must be cleared
    act(() => {
      useUIStore.setState({ activeProvider: 'aws' });
    });
    rerender(<CodePreview />);

    await waitFor(() => {
      expect(screen.queryByText('main.tf')).not.toBeInTheDocument();
      expect(screen.queryByText('azure content')).not.toBeInTheDocument();
    });
  });

  it('clears stale output when switching to a provider with no generator support', async () => {
    const user = userEvent.setup();
    listGeneratorsMock.mockReturnValue([
      { id: 'terraform', displayName: 'Terraform (HCL)', supportedProviders: ['azure'] },
    ]);
    vi.mocked(generateCode).mockReturnValue({
      files: [{ path: 'main.tf', content: 'azure content', language: 'hcl' as const }],
      metadata: {
        generator: 'terraform',
        version: '1.0.0',
        provider: 'azure' as const,
        generatedAt: '2026-01-01T00:00:00.000Z',
      },
    });

    const { rerender } = render(<CodePreview />);
    await user.click(screen.getByText(/Generate Code/));
    expect(screen.getByText('main.tf')).toBeInTheDocument();

    // Switch to AWS — no generators support AWS, should show empty state with no stale output
    act(() => {
      useUIStore.setState({ activeProvider: 'aws' });
    });
    rerender(<CodePreview />);

    await waitFor(() => {
      expect(screen.queryByText('main.tf')).not.toBeInTheDocument();
      expect(screen.queryByText('azure content')).not.toBeInTheDocument();
      expect(screen.getByText(/No code generators currently support/)).toBeInTheDocument();
    });
  });
});

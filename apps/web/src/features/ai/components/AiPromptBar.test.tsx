import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AiPromptBar } from './AiPromptBar';

const mockIsApiConfigured = vi.fn();

vi.mock('../../../shared/api/client', () => ({
  isApiConfigured: (...args: unknown[]) => mockIsApiConfigured(...args),
}));

beforeEach(() => {
  mockIsApiConfigured.mockReturnValue(true);
});

describe('AiPromptBar', () => {
  it('renders input, provider label, and submit button', () => {
    render(<AiPromptBar onSubmit={vi.fn()} isLoading={false} provider="azure" />);

    expect(screen.getByPlaceholderText('Describe your cloud architecture...')).toBeInTheDocument();
    expect(screen.getByText('AZURE')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('submit button disabled when input is empty', () => {
    render(<AiPromptBar onSubmit={vi.fn()} isLoading={false} provider="aws" />);

    const submitBtn = screen.getByRole('button');
    expect(submitBtn).toBeDisabled();
  });

  it('typing text enables submit button', () => {
    render(<AiPromptBar onSubmit={vi.fn()} isLoading={false} provider="aws" />);

    const input = screen.getByPlaceholderText('Describe your cloud architecture...');
    fireEvent.change(input, { target: { value: 'Create a highly available app' } });

    const submitBtn = screen.getByRole('button');
    expect(submitBtn).not.toBeDisabled();
  });

  it('clicking submit calls onSubmit with prompt and provider prop', () => {
    const handleSubmit = vi.fn();
    render(<AiPromptBar onSubmit={handleSubmit} isLoading={false} provider="aws" />);

    const input = screen.getByPlaceholderText('Describe your cloud architecture...');
    fireEvent.change(input, { target: { value: 'Create a web app' } });

    const submitBtn = screen.getByRole('button');
    fireEvent.click(submitBtn);

    expect(handleSubmit).toHaveBeenCalledWith('Create a web app', 'aws');
  });

  it('pressing Enter calls onSubmit', () => {
    const handleSubmit = vi.fn();
    render(<AiPromptBar onSubmit={handleSubmit} isLoading={false} provider="aws" />);

    const input = screen.getByPlaceholderText('Describe your cloud architecture...');
    fireEvent.change(input, { target: { value: 'Create a web app' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(handleSubmit).toHaveBeenCalledWith('Create a web app', 'aws');
  });

  it('uses provider from prop, not a hardcoded default', () => {
    const handleSubmit = vi.fn();
    render(<AiPromptBar onSubmit={handleSubmit} isLoading={false} provider="gcp" />);

    expect(screen.getByText('GCP')).toBeInTheDocument();

    const input = screen.getByPlaceholderText('Describe your cloud architecture...');
    fireEvent.change(input, { target: { value: 'Create a web app' } });

    const submitBtn = screen.getByRole('button');
    fireEvent.click(submitBtn);

    expect(handleSubmit).toHaveBeenCalledWith('Create a web app', 'gcp');
  });

  it('shows loading indicator and disables input when isLoading is true', () => {
    render(<AiPromptBar onSubmit={vi.fn()} isLoading={true} provider="aws" />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

    const input = screen.getByPlaceholderText('Describe your cloud architecture...');
    expect(input).toBeDisabled();

    const submitBtn = screen.getByRole('button');
    expect(submitBtn).toBeDisabled();
  });

  it('displays error message when error prop is set', () => {
    render(<AiPromptBar onSubmit={vi.fn()} isLoading={false} provider="aws" error="Failed to generate architecture" />);

    expect(screen.getByText('Failed to generate architecture')).toBeInTheDocument();
  });

  it('displays explanation when provided', () => {
    render(<AiPromptBar onSubmit={vi.fn()} isLoading={false} provider="aws" explanation="Created a 3-tier web app" />);

    expect(screen.getByText('Created a 3-tier web app')).toBeInTheDocument();
  });

  it('displays warnings when provided', () => {
    render(
      <AiPromptBar
        onSubmit={vi.fn()}
        isLoading={false}
        provider="aws"
        warnings={['No load balancer added', 'Database has no backup']}
      />
    );

    expect(screen.getByText(/No load balancer added/)).toBeInTheDocument();
    expect(screen.getByText(/Database has no backup/)).toBeInTheDocument();
  });

  it('does not display warnings section when warnings array is empty', () => {
    render(<AiPromptBar onSubmit={vi.fn()} isLoading={false} provider="aws" warnings={[]} />);

    expect(screen.queryByText(/⚠️/)).not.toBeInTheDocument();
  });

  it('shows backend-required message and disables input when backend is not configured', () => {
    mockIsApiConfigured.mockReturnValue(false);
    render(<AiPromptBar onSubmit={vi.fn()} isLoading={false} provider="aws" />);

    expect(screen.getByText('AI features require the backend API - see setup guide.')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Describe your cloud architecture...')).toBeDisabled();
    expect(screen.getByRole('button')).toBeDisabled();
  });
});

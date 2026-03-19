import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AiPromptBar } from './AiPromptBar';

describe('AiPromptBar', () => {
  it('renders input, provider selector, and submit button', () => {
    render(<AiPromptBar onSubmit={vi.fn()} isLoading={false} />);
    
    expect(screen.getByPlaceholderText('Describe your cloud architecture...')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('submit button disabled when input is empty', () => {
    render(<AiPromptBar onSubmit={vi.fn()} isLoading={false} />);
    
    const submitBtn = screen.getByRole('button');
    expect(submitBtn).toBeDisabled();
  });

  it('typing text enables submit button', () => {
    render(<AiPromptBar onSubmit={vi.fn()} isLoading={false} />);
    
    const input = screen.getByPlaceholderText('Describe your cloud architecture...');
    fireEvent.change(input, { target: { value: 'Create a highly available app' } });
    
    const submitBtn = screen.getByRole('button');
    expect(submitBtn).not.toBeDisabled();
  });

  it('clicking submit calls onSubmit with prompt and default provider (aws)', () => {
    const handleSubmit = vi.fn();
    render(<AiPromptBar onSubmit={handleSubmit} isLoading={false} />);
    
    const input = screen.getByPlaceholderText('Describe your cloud architecture...');
    fireEvent.change(input, { target: { value: 'Create a web app' } });
    
    const submitBtn = screen.getByRole('button');
    fireEvent.click(submitBtn);
    
    expect(handleSubmit).toHaveBeenCalledWith('Create a web app', 'aws');
  });

  it('pressing Enter calls onSubmit', () => {
    const handleSubmit = vi.fn();
    render(<AiPromptBar onSubmit={handleSubmit} isLoading={false} />);
    
    const input = screen.getByPlaceholderText('Describe your cloud architecture...');
    fireEvent.change(input, { target: { value: 'Create a web app' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    
    expect(handleSubmit).toHaveBeenCalledWith('Create a web app', 'aws');
  });

  it('changing provider and submitting passes correct provider', () => {
    const handleSubmit = vi.fn();
    render(<AiPromptBar onSubmit={handleSubmit} isLoading={false} />);
    
    const input = screen.getByPlaceholderText('Describe your cloud architecture...');
    fireEvent.change(input, { target: { value: 'Create a web app' } });
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'gcp' } });
    
    const submitBtn = screen.getByRole('button');
    fireEvent.click(submitBtn);
    
    expect(handleSubmit).toHaveBeenCalledWith('Create a web app', 'gcp');
  });

  it('shows loading indicator and disables inputs when isLoading is true', () => {
    render(<AiPromptBar onSubmit={vi.fn()} isLoading={true} />);
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    
    const input = screen.getByPlaceholderText('Describe your cloud architecture...');
    expect(input).toBeDisabled();
    
    const select = screen.getByRole('combobox');
    expect(select).toBeDisabled();
    
    const submitBtn = screen.getByRole('button');
    expect(submitBtn).toBeDisabled();
  });

  it('displays error message when error prop is set', () => {
    render(<AiPromptBar onSubmit={vi.fn()} isLoading={false} error="Failed to generate architecture" />);
    
    expect(screen.getByText('Failed to generate architecture')).toBeInTheDocument();
  });
});

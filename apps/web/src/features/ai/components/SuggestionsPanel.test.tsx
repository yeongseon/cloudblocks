import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useAiStore } from '../store';
import { SuggestionsPanel } from './SuggestionsPanel';

const mockIsApiConfigured = vi.fn();

vi.mock('../../../shared/api/client', () => ({
  isApiConfigured: (...args: unknown[]) => mockIsApiConfigured(...args),
}));

beforeEach(() => {
  mockIsApiConfigured.mockReturnValue(true);
  useAiStore.setState({
    suggestLoading: false,
    suggestError: null,
    suggestResult: null,
  });
});

describe('SuggestionsPanel', () => {
  it('renders empty state when no result', () => {
    render(<SuggestionsPanel />);
    expect(screen.getByText(/Run AI analysis/)).toBeInTheDocument();
  });

  it('renders loading state', () => {
    useAiStore.setState({ suggestLoading: true });
    render(<SuggestionsPanel />);
    expect(screen.getByText(/Analyzing architecture/)).toBeInTheDocument();
  });

  it('renders error message', () => {
    useAiStore.setState({ suggestError: 'Network failure' });
    render(<SuggestionsPanel />);
    expect(screen.getByText('Network failure')).toBeInTheDocument();
  });

  it('renders suggestions list with severity badges', () => {
    useAiStore.setState({
      suggestResult: {
        suggestions: [
          {
            category: 'security',
            severity: 'critical',
            message: 'Enable encryption at rest',
            action_description: 'Add KMS key',
          },
          {
            category: 'reliability',
            severity: 'warning',
            message: 'Add a second AZ',
            action_description: '',
          },
        ],
        score: { security: 60, reliability: 80 },
      },
    });
    render(<SuggestionsPanel />);

    expect(screen.getByText('Enable encryption at rest')).toBeInTheDocument();
    expect(screen.getByText('Add a second AZ')).toBeInTheDocument();
    expect(screen.getByText('Add KMS key')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
    expect(screen.getByText('Reliability')).toBeInTheDocument();
    expect(screen.getByText('Suggestions (2)')).toBeInTheDocument();
  });

  it('renders score bars', () => {
    useAiStore.setState({
      suggestResult: {
        suggestions: [],
        score: { security: 75, cost: 90 },
      },
    });
    render(<SuggestionsPanel />);

    expect(screen.getByText('security')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.getByText('cost')).toBeInTheDocument();
    expect(screen.getByText('90')).toBeInTheDocument();
  });

  it('renders "looking good" when suggestions list is empty', () => {
    useAiStore.setState({
      suggestResult: {
        suggestions: [],
        score: {},
      },
    });
    render(<SuggestionsPanel />);

    expect(screen.getByText(/looking good/)).toBeInTheDocument();
  });

  it('renders backend-required message when backend is not configured', () => {
    mockIsApiConfigured.mockReturnValue(false);

    render(<SuggestionsPanel />);

    expect(
      screen.getByText('AI features require the backend API - see setup guide.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Run AI analysis/)).not.toBeInTheDocument();
  });
});

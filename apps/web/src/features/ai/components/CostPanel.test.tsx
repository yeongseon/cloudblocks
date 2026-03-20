import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useAiStore } from '../store';
import { CostPanel } from './CostPanel';

beforeEach(() => {
  useAiStore.setState({
    costLoading: false,
    costError: null,
    costResult: null,
  });
});

describe('CostPanel', () => {
  it('renders empty state when no result', () => {
    render(<CostPanel />);
    expect(screen.getByText(/Run cost estimation/)).toBeInTheDocument();
  });

  it('renders loading state', () => {
    useAiStore.setState({ costLoading: true });
    render(<CostPanel />);
    expect(screen.getByText(/Estimating costs/)).toBeInTheDocument();
  });

  it('renders error message', () => {
    useAiStore.setState({ costError: 'Infracost unavailable' });
    render(<CostPanel />);
    expect(screen.getByText('Infracost unavailable')).toBeInTheDocument();
  });

  it('renders monthly and hourly cost', () => {
    useAiStore.setState({
      costResult: {
        monthly_cost: 142.5,
        hourly_cost: 0.195,
        currency: 'USD',
        resources: [],
      },
    });
    render(<CostPanel />);

    expect(screen.getByText('$142.50')).toBeInTheDocument();
    expect(screen.getByText('$0.20')).toBeInTheDocument();
  });

  it('renders resource breakdown table', () => {
    useAiStore.setState({
      costResult: {
        monthly_cost: 200,
        hourly_cost: 0.27,
        currency: 'USD',
        resources: [
          { name: 'aws_instance.web', monthly_cost: 120, details: {} },
          { name: 'aws_db_instance.db', monthly_cost: 80, details: {} },
        ],
      },
    });
    render(<CostPanel />);

    expect(screen.getByText('aws_instance.web')).toBeInTheDocument();
    expect(screen.getByText('$120.00')).toBeInTheDocument();
    expect(screen.getByText('aws_db_instance.db')).toBeInTheDocument();
    expect(screen.getByText('$80.00')).toBeInTheDocument();
    expect(screen.getByText('Resource Breakdown')).toBeInTheDocument();
  });

  it('hides resource table when no resources', () => {
    useAiStore.setState({
      costResult: {
        monthly_cost: 0,
        hourly_cost: 0,
        currency: 'USD',
        resources: [],
      },
    });
    render(<CostPanel />);

    expect(screen.queryByText('Resource Breakdown')).not.toBeInTheDocument();
  });
});

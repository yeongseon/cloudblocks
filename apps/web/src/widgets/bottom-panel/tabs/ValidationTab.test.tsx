import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useArchitectureStore } from '../../../entities/store/architectureStore';
import { ValidationTab } from './ValidationTab';

vi.mock('./ValidationTab.css', () => ({}));
vi.mock('../../validation-panel/ValidationPanel.css', () => ({}));

describe('ValidationTab', () => {
  beforeEach(() => {
    useArchitectureStore.setState({ validationResult: null });
  });

  it('shows empty-state text when no validation result exists', () => {
    render(<ValidationTab />);
    expect(screen.getByText('No validation results. Run validation from the menu.')).toBeInTheDocument();
  });

  it('renders invalid status, errors, warnings, and unknown target fallback', () => {
    useArchitectureStore.setState({
      validationResult: {
        valid: false,
        errors: [
          {
            ruleId: 'rule-1',
            severity: 'error',
            message: 'Hard error',
            suggestion: 'Fix this first',
            targetId: '',
          },
          {
            ruleId: 'rule-2',
            severity: 'error',
            message: 'No suggestion error',
            targetId: 'node-2',
          },
        ],
        warnings: [
          {
            ruleId: 'warn-1',
            severity: 'warning',
            message: 'Soft warning',
            suggestion: 'Optional tuning',
            targetId: 'node-3',
          },
          {
            ruleId: 'warn-2',
            severity: 'warning',
            message: 'No suggestion warning',
            targetId: '',
          },
        ],
      },
    });

    render(<ValidationTab />);

    expect(screen.getByText('INVALID')).toBeInTheDocument();
    expect(screen.getByText('Errors (2)')).toBeInTheDocument();
    expect(screen.getByText('Warnings (2)')).toBeInTheDocument();
    expect(screen.getByText('Fix this first')).toBeInTheDocument();
    expect(screen.getByText('Optional tuning')).toBeInTheDocument();
    expect(screen.getAllByText(/Target: Unknown target/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Target: node-2/)).toBeInTheDocument();
    expect(screen.getByText(/Target: node-3/)).toBeInTheDocument();
  });

  it('shows full-success message when valid and no warnings', () => {
    useArchitectureStore.setState({
      validationResult: {
        valid: true,
        errors: [],
        warnings: [],
      },
    });

    render(<ValidationTab />);

    expect(screen.getByText('VALID')).toBeInTheDocument();
    expect(screen.getByText('Architecture is valid! No rule violations detected.')).toBeInTheDocument();
    expect(screen.queryByText('No blocking errors detected.')).not.toBeInTheDocument();
  });

  it('shows non-blocking message when valid with warnings', () => {
    useArchitectureStore.setState({
      validationResult: {
        valid: true,
        errors: [],
        warnings: [
          {
            ruleId: 'warn-3',
            severity: 'warning',
            message: 'Heads up',
            targetId: 'node-5',
          },
        ],
      },
    });

    render(<ValidationTab />);

    expect(screen.getByText('VALID')).toBeInTheDocument();
    expect(screen.getByText('No blocking errors detected.')).toBeInTheDocument();
    expect(screen.queryByText('Architecture is valid! No rule violations detected.')).not.toBeInTheDocument();
  });

  it('handles undefined target IDs in item keys and target labels', () => {
    useArchitectureStore.setState({
      validationResult: {
        valid: false,
        errors: [
          {
            ruleId: 'err-undefined-target',
            severity: 'error',
            message: 'Missing target id',
            targetId: undefined as unknown as string,
          },
        ],
        warnings: [
          {
            ruleId: 'warn-undefined-target',
            severity: 'warning',
            message: 'Missing warning target id',
            targetId: undefined as unknown as string,
          },
        ],
      },
    });

    render(<ValidationTab />);

    expect(screen.getByText(/Rule: err-undefined-target/)).toBeInTheDocument();
    expect(screen.getByText(/Rule: warn-undefined-target/)).toBeInTheDocument();
    expect(screen.getAllByText(/Target: Unknown target/).length).toBeGreaterThan(1);
  });
});

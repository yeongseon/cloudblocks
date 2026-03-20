import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ValidationPanel } from './ValidationPanel';
import { useArchitectureStore } from '../../entities/store/architectureStore';
import { useUIStore } from '../../entities/store/uiStore';
import type { ValidationResult } from '@cloudblocks/domain';

describe('ValidationPanel', () => {
  beforeEach(() => {
    useUIStore.setState({ showValidation: false });
    useArchitectureStore.setState({ validationResult: null });
  });

  it('returns null when showValidation is false', () => {
    useUIStore.setState({ showValidation: false });
    useArchitectureStore.setState({
      validationResult: { valid: true, errors: [], warnings: [] },
    });
    const { container } = render(<ValidationPanel />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null when validationResult is null', () => {
    useUIStore.setState({ showValidation: true });
    useArchitectureStore.setState({ validationResult: null });
    const { container } = render(<ValidationPanel />);
    expect(container.innerHTML).toBe('');
  });

  it('shows VALID status when architecture is valid', () => {
    useUIStore.setState({ showValidation: true });
    useArchitectureStore.setState({
      validationResult: { valid: true, errors: [], warnings: [] },
    });
    render(<ValidationPanel />);
    expect(screen.getByText('✓ VALID')).toBeInTheDocument();
    expect(screen.getByText(/Validation Results/)).toBeInTheDocument();
  });

  it('shows INVALID status when architecture is invalid', () => {
    const result: ValidationResult = {
      valid: false,
      errors: [
        {
          ruleId: 'placement-001',
          severity: 'error',
          message: 'Gateway must be on public subnet',
          suggestion: 'Move gateway to public subnet',
          targetId: 'block-1',
        },
      ],
      warnings: [],
    };
    useUIStore.setState({ showValidation: true });
    useArchitectureStore.setState({ validationResult: result });
    render(<ValidationPanel />);
    expect(screen.getByText('✗ INVALID')).toBeInTheDocument();
  });

  it('renders error items with messages and suggestions', () => {
    const result: ValidationResult = {
      valid: false,
      errors: [
        {
          ruleId: 'placement-001',
          severity: 'error',
          message: 'Gateway must be on public subnet',
          suggestion: 'Move gateway to public subnet',
          targetId: 'block-1',
        },
      ],
      warnings: [],
    };
    useUIStore.setState({ showValidation: true });
    useArchitectureStore.setState({ validationResult: result });
    render(<ValidationPanel />);
    expect(screen.getByText('Errors (1)')).toBeInTheDocument();
    expect(screen.getByText('Gateway must be on public subnet')).toBeInTheDocument();
    expect(screen.getByText(/Move gateway to public subnet/)).toBeInTheDocument();
    expect(screen.getByText(/Rule: placement-001/)).toBeInTheDocument();
    expect(screen.getByText(/Target: block-1/)).toBeInTheDocument();
  });

  it('renders error without suggestion', () => {
    const result: ValidationResult = {
      valid: false,
      errors: [
        {
          ruleId: 'conn-001',
          severity: 'error',
          message: 'Invalid connection',
          targetId: 'conn-x',
        },
      ],
      warnings: [],
    };
    useUIStore.setState({ showValidation: true });
    useArchitectureStore.setState({ validationResult: result });
    render(<ValidationPanel />);
    expect(screen.getByText('Invalid connection')).toBeInTheDocument();
    expect(screen.queryByText(/💡/)).not.toBeInTheDocument();
  });

  it('renders warning items', () => {
    const result: ValidationResult = {
      valid: false,
      errors: [],
      warnings: [
        {
          ruleId: 'warn-001',
          severity: 'warning',
          message: 'Database has no connections',
          suggestion: 'Connect compute to database',
          targetId: 'block-2',
        },
      ],
    };
    useUIStore.setState({ showValidation: true });
    useArchitectureStore.setState({ validationResult: result });
    render(<ValidationPanel />);
    expect(screen.getByText('Warnings (1)')).toBeInTheDocument();
    expect(screen.getByText('Database has no connections')).toBeInTheDocument();
    expect(screen.getByText(/Connect compute to database/)).toBeInTheDocument();
  });

  it('renders warning without suggestion', () => {
    const result: ValidationResult = {
      valid: false,
      errors: [],
      warnings: [
        {
          ruleId: 'warn-002',
          severity: 'warning',
          message: 'Isolated block detected',
          targetId: 'block-3',
        },
      ],
    };
    useUIStore.setState({ showValidation: true });
    useArchitectureStore.setState({ validationResult: result });
    render(<ValidationPanel />);
    expect(screen.getByText('Isolated block detected')).toBeInTheDocument();
  });

  it('shows success message when valid and no errors/warnings', () => {
    useUIStore.setState({ showValidation: true });
    useArchitectureStore.setState({
      validationResult: { valid: true, errors: [], warnings: [] },
    });
    render(<ValidationPanel />);
    expect(
      screen.getByText(/Architecture is valid! No rule violations detected/)
    ).toBeInTheDocument();
  });

  it('does not show errors section when errors array is empty', () => {
    useUIStore.setState({ showValidation: true });
    useArchitectureStore.setState({
      validationResult: { valid: true, errors: [], warnings: [] },
    });
    render(<ValidationPanel />);
    expect(screen.queryByText(/Errors/)).not.toBeInTheDocument();
  });

  it('does not show warnings section when warnings array is empty', () => {
    useUIStore.setState({ showValidation: true });
    useArchitectureStore.setState({
      validationResult: { valid: true, errors: [], warnings: [] },
    });
    render(<ValidationPanel />);
    expect(screen.queryByText(/Warnings/)).not.toBeInTheDocument();
  });

  it('shows "No blocking errors detected" when valid with warnings', () => {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [
        {
          ruleId: 'warn-001',
          severity: 'warning',
          message: 'Database has no connections',
          targetId: 'block-2',
        },
      ],
    };
    useUIStore.setState({ showValidation: true });
    useArchitectureStore.setState({ validationResult: result });
    render(<ValidationPanel />);
    expect(
      screen.getByText(/No blocking errors detected/)
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/No rule violations detected/)
    ).not.toBeInTheDocument();
  });

  it('renders multiple errors', () => {
    const result: ValidationResult = {
      valid: false,
      errors: [
        { ruleId: 'r1', severity: 'error', message: 'Error one', targetId: 'b1' },
        { ruleId: 'r2', severity: 'error', message: 'Error two', targetId: 'b2' },
        { ruleId: 'r3', severity: 'error', message: 'Error three', targetId: 'b3' },
      ],
      warnings: [],
    };
    useUIStore.setState({ showValidation: true });
    useArchitectureStore.setState({ validationResult: result });
    render(<ValidationPanel />);
    expect(screen.getByText('Errors (3)')).toBeInTheDocument();
    expect(screen.getByText('Error one')).toBeInTheDocument();
    expect(screen.getByText('Error two')).toBeInTheDocument();
    expect(screen.getByText('Error three')).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ValidationDrawerPanel } from '../ValidationDrawerPanel';
import { useArchitectureStore } from '../../../../entities/store/architectureStore';
import { useUIStore } from '../../../../entities/store/uiStore';
import type { ValidationResult } from '@cloudblocks/domain';

// Reset stores between tests
beforeEach(() => {
  useArchitectureStore.setState({ validationResult: null });
  useUIStore.setState({
    selectedId: null,
    drawer: { isOpen: false, activePanel: null },
  });
});

describe('ValidationDrawerPanel', () => {
  it('renders empty state when no validation result exists', () => {
    render(<ValidationDrawerPanel />);

    expect(screen.getByTestId('validation-drawer-panel')).toBeInTheDocument();
    expect(screen.getByText(/No validation results yet/)).toBeInTheDocument();
    expect(screen.getByTestId('validation-run-btn')).toHaveTextContent('Run Validation');
  });

  it('renders valid status when architecture is valid', () => {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };
    useArchitectureStore.setState({ validationResult: result });

    render(<ValidationDrawerPanel />);

    const status = screen.getByTestId('validation-status');
    expect(status).toHaveAttribute('data-valid', 'true');
    expect(status).toHaveTextContent('Valid');
    expect(status).toHaveTextContent('No issues');
    expect(screen.getByText(/Architecture is valid/)).toBeInTheDocument();
  });

  it('renders invalid status with error and warning counts', () => {
    const result: ValidationResult = {
      valid: false,
      errors: [
        {
          ruleId: 'placement-001',
          severity: 'error',
          message: 'Resource missing parent',
          targetId: 'block-1',
        },
        {
          ruleId: 'connection-001',
          severity: 'error',
          message: 'Invalid connection type',
          targetId: 'conn-1',
        },
      ],
      warnings: [
        {
          ruleId: 'provider-001',
          severity: 'warning',
          message: 'Deprecated resource',
          suggestion: 'Use newer version',
          targetId: 'block-2',
        },
      ],
    };
    useArchitectureStore.setState({ validationResult: result });

    render(<ValidationDrawerPanel />);

    const status = screen.getByTestId('validation-status');
    expect(status).toHaveAttribute('data-valid', 'false');
    expect(status).toHaveTextContent('Invalid');
    expect(status).toHaveTextContent('2 errors, 1 warning');
  });

  it('renders error items with messages and meta', () => {
    const result: ValidationResult = {
      valid: false,
      errors: [
        {
          ruleId: 'placement-001',
          severity: 'error',
          message: 'Resource missing parent container',
          suggestion: 'Place resource inside a container',
          targetId: 'block-1',
        },
      ],
      warnings: [],
    };
    useArchitectureStore.setState({ validationResult: result });

    render(<ValidationDrawerPanel />);

    const items = screen.getAllByTestId('validation-item');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveAttribute('data-severity', 'error');
    expect(items[0]).toHaveTextContent('Resource missing parent container');
    expect(items[0]).toHaveTextContent('Place resource inside a container');
    expect(items[0]).toHaveTextContent('placement-001');
    expect(items[0]).toHaveTextContent('block-1');
  });

  it('renders warning items', () => {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [
        {
          ruleId: 'provider-001',
          severity: 'warning',
          message: 'Deprecated resource type',
          targetId: 'block-3',
        },
      ],
    };
    useArchitectureStore.setState({ validationResult: result });

    render(<ValidationDrawerPanel />);

    const items = screen.getAllByTestId('validation-item');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveAttribute('data-severity', 'warning');
    expect(items[0]).toHaveTextContent('Deprecated resource type');
  });

  it('click-to-focus: clicking an item with targetId selects it', async () => {
    const user = userEvent.setup();
    const result: ValidationResult = {
      valid: false,
      errors: [
        {
          ruleId: 'placement-001',
          severity: 'error',
          message: 'Missing parent',
          targetId: 'block-42',
        },
      ],
      warnings: [],
    };
    useArchitectureStore.setState({ validationResult: result });

    render(<ValidationDrawerPanel />);

    const item = screen.getByTestId('validation-item');
    expect(item).toHaveAttribute('data-has-target', 'true');

    await user.click(item);

    expect(useUIStore.getState().selectedId).toBe('block-42');
  });

  it('clicking an item without targetId does not change selection', async () => {
    const user = userEvent.setup();
    const result: ValidationResult = {
      valid: false,
      errors: [
        {
          ruleId: 'general-001',
          severity: 'error',
          message: 'General error',
          targetId: '',
        },
      ],
      warnings: [],
    };
    useArchitectureStore.setState({ validationResult: result });

    render(<ValidationDrawerPanel />);

    const item = screen.getByTestId('validation-item');
    expect(item).toHaveAttribute('data-has-target', 'false');

    await user.click(item);

    expect(useUIStore.getState().selectedId).toBeNull();
  });

  it('run validation button calls validate', async () => {
    const user = userEvent.setup();
    const validateSpy = vi.fn();
    useArchitectureStore.setState({ validate: validateSpy });

    render(<ValidationDrawerPanel />);

    const btn = screen.getByTestId('validation-run-btn');
    await user.click(btn);

    expect(validateSpy).toHaveBeenCalledOnce();
  });

  it('re-run button calls validate when results exist', async () => {
    const user = userEvent.setup();
    const validateSpy = vi.fn();
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };
    useArchitectureStore.setState({
      validationResult: result,
      validate: validateSpy,
    });

    render(<ValidationDrawerPanel />);

    const btn = screen.getByTestId('validation-run-btn');
    expect(btn).toHaveTextContent('Re-run Validation');
    await user.click(btn);

    expect(validateSpy).toHaveBeenCalledOnce();
  });

  it('displays suggestion text when present', () => {
    const result: ValidationResult = {
      valid: false,
      errors: [
        {
          ruleId: 'placement-001',
          severity: 'error',
          message: 'Error with suggestion',
          suggestion: 'Try doing X instead',
          targetId: 'block-1',
        },
      ],
      warnings: [],
    };
    useArchitectureStore.setState({ validationResult: result });

    render(<ValidationDrawerPanel />);

    expect(screen.getByText('Try doing X instead')).toBeInTheDocument();
  });

  it('renders errors before warnings', () => {
    const result: ValidationResult = {
      valid: false,
      errors: [
        {
          ruleId: 'err-1',
          severity: 'error',
          message: 'First error',
          targetId: 'a',
        },
      ],
      warnings: [
        {
          ruleId: 'warn-1',
          severity: 'warning',
          message: 'First warning',
          targetId: 'b',
        },
      ],
    };
    useArchitectureStore.setState({ validationResult: result });

    render(<ValidationDrawerPanel />);

    const sections = screen.getAllByRole('heading', { level: 4 });
    expect(sections[0]).toHaveTextContent('Errors');
    expect(sections[1]).toHaveTextContent('Warnings');
  });

  it('singular count text for 1 error, 1 warning', () => {
    const result: ValidationResult = {
      valid: false,
      errors: [
        {
          ruleId: 'e1',
          severity: 'error',
          message: 'err',
          targetId: 'x',
        },
      ],
      warnings: [
        {
          ruleId: 'w1',
          severity: 'warning',
          message: 'warn',
          targetId: 'y',
        },
      ],
    };
    useArchitectureStore.setState({ validationResult: result });

    render(<ValidationDrawerPanel />);

    expect(screen.getByTestId('validation-status')).toHaveTextContent('1 error, 1 warning');
  });
});

import React from 'react';
import { useArchitectureStore } from '../../../entities/store/architectureStore';
import { isApiConfigured } from '../../../shared/api/client';
import type { CostResource } from '../api';
import './CostPanel.css';

const AI_BACKEND_REQUIRED_MESSAGE = 'AI features require the backend API - see setup guide.';

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export const CostPanel: React.FC = () => {
  const loading = useArchitectureStore((s) => s.costLoading);
  const error = useArchitectureStore((s) => s.costError);
  const result = useArchitectureStore((s) => s.costResult);
  const backendConfigured = isApiConfigured();

  if (!backendConfigured) {
    return (
      <div className="cost-panel" data-testid="cost-panel">
        <div className="cost-error">{AI_BACKEND_REQUIRED_MESSAGE}</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="cost-panel" data-testid="cost-panel">
        <div className="cost-loading">Estimating costs…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cost-panel" data-testid="cost-panel">
        <div className="cost-error">{error}</div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="cost-panel" data-testid="cost-panel">
        <div className="cost-empty">Run cost estimation to see infrastructure pricing.</div>
      </div>
    );
  }

  const { monthly_cost, hourly_cost, currency, resources } = result;

  return (
    <div className="cost-panel" data-testid="cost-panel">
      <div className="cost-summary">
        <div className="cost-total">
          <span className="cost-total-label">Monthly</span>
          <span className="cost-total-value">{formatCurrency(monthly_cost, currency)}</span>
        </div>
        <div className="cost-hourly">
          <span className="cost-hourly-label">Hourly</span>
          <span className="cost-hourly-value">{formatCurrency(hourly_cost, currency)}</span>
        </div>
      </div>

      {resources.length > 0 && (
        <div className="cost-resources">
          <h4 className="cost-section-title">Resource Breakdown</h4>
          <table className="cost-table">
            <thead>
              <tr>
                <th>Resource</th>
                <th>Monthly</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((r: CostResource) => (
                <tr key={r.name}>
                  <td className="cost-resource-name">{r.name}</td>
                  <td className="cost-resource-price">
                    {formatCurrency(r.monthly_cost, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

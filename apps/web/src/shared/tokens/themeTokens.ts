export type ThemeVariant = 'blueprint' | 'workshop';

export interface ThemeTokens {
  'bg-app': string;
  'bg-canvas': string;
  'bg-surface': string;
  'bg-surface-raised': string;
  'bg-overlay': string;

  'text-primary': string;
  'text-secondary': string;
  'text-muted': string;
  'text-inverse': string;

  'border-default': string;
  'border-subtle': string;
  'border-strong': string;

  'accent-primary': string;
  'accent-secondary': string;
  'accent-success': string;
  'accent-warning': string;
  'accent-error': string;

  'cat-network': string;
  'cat-security': string;
  'cat-delivery': string;
  'cat-compute': string;
  'cat-data': string;
  'cat-messaging': string;
  'cat-identity': string;
  'cat-operations': string;
}

export const blueprintTheme: ThemeTokens = {
  'bg-app': '#0F172A',
  'bg-canvas': '#0B1220',
  'bg-surface': '#1E293B',
  'bg-surface-raised': '#334155',
  'bg-overlay': 'rgba(0, 0, 0, 0.6)',
  'text-primary': '#F1F5F9',
  'text-secondary': '#9FADBF',
  'text-muted': '#64748B',
  'text-inverse': '#0F172A',
  'border-default': '#334155',
  'border-subtle': '#1E293B',
  'border-strong': '#475569',
  'accent-primary': '#60A5FA',
  'accent-secondary': '#06B6D4',
  'accent-success': '#22C55E',
  'accent-warning': '#EAB308',
  'accent-error': '#F87171',
  'cat-network': '#3B82F6',
  'cat-security': '#EF4444',
  'cat-delivery': '#F97316',
  'cat-compute': '#8B5CF6',
  'cat-data': '#14B8A6',
  'cat-messaging': '#EAB308',
  'cat-identity': '#0078D4',
  'cat-operations': '#64748B',
};

export const workshopTheme: ThemeTokens = {
  'bg-app': '#F8FAFC',
  'bg-canvas': '#FFFFFF',
  'bg-surface': '#F1F5F9',
  'bg-surface-raised': '#FFFFFF',
  'bg-overlay': 'rgba(0, 0, 0, 0.3)',
  'text-primary': '#0F172A',
  'text-secondary': '#475569',
  'text-muted': '#94A3B8',
  'text-inverse': '#F1F5F9',
  'border-default': '#E2E8F0',
  'border-subtle': '#F1F5F9',
  'border-strong': '#CBD5E1',
  'accent-primary': '#2563EB',
  'accent-secondary': '#0891B2',
  'accent-success': '#15803D',
  'accent-warning': '#9A5B05',
  'accent-error': '#B91C1C',
  'cat-network': '#3B82F6',
  'cat-security': '#EF4444',
  'cat-delivery': '#F97316',
  'cat-compute': '#8B5CF6',
  'cat-data': '#14B8A6',
  'cat-messaging': '#EAB308',
  'cat-identity': '#0078D4',
  'cat-operations': '#64748B',
};

export const typography = {
  fontUi: "'Inter', system-ui, -apple-system, sans-serif",
  fontMono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  'text-xs': '11px',
  'text-sm': '12px',
  'text-base': '13px',
  'text-md': '14px',
  'text-lg': '16px',
  'text-xl': '20px',
  'text-2xl': '24px',
  'text-3xl': '32px',
} as const;

export const motion = {
  'duration-fast': '100ms',
  'duration-normal': '200ms',
  'duration-slow': '300ms',
  'easing-default': 'cubic-bezier(0.2, 0, 0, 1)',
  'easing-decelerate': 'cubic-bezier(0, 0, 0, 1)',
  'easing-accelerate': 'cubic-bezier(0.3, 0, 1, 1)',
} as const;

export function getThemeTokens(variant: ThemeVariant): ThemeTokens {
  return variant === 'blueprint' ? blueprintTheme : workshopTheme;
}

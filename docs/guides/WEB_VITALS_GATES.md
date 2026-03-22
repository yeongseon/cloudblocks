# Web Vitals & Lighthouse Threshold Gates

This document defines the Lighthouse and Web Vitals thresholds that must be met before any production release of CloudBlocks.

## Core Web Vitals Thresholds

| Metric | Good | Needs Improvement | Poor | CloudBlocks Gate |
|--------|------|-------------------|------|-----------------|
| **LCP** (Largest Contentful Paint) | ≤ 2.5s | 2.5–4.0s | > 4.0s | ≤ 3.0s |
| **INP** (Interaction to Next Paint) | ≤ 200ms | 200–500ms | > 500ms | ≤ 300ms |
| **CLS** (Cumulative Layout Shift) | ≤ 0.1 | 0.1–0.25 | > 0.25 | ≤ 0.15 |

## Lighthouse Score Thresholds

| Category | Minimum Score | Notes |
|----------|--------------|-------|
| **Performance** | 80 | Canvas-heavy SPA — 80 is realistic target |
| **Accessibility** | 90 | Must meet WCAG 2.1 AA |
| **Best Practices** | 90 | No mixed content, HTTPS, etc. |
| **SEO** | 70 | SPA with client-side rendering — limited SEO surface |

## Test Scenarios

Run Lighthouse against these pages/states:

| Scenario | URL / State | Priority |
|----------|-------------|----------|
| Empty canvas | `/` (no workspaces loaded) | P0 |
| Loaded workspace | `/` with a three-tier template loaded | P0 |
| Code preview open | Canvas + CodePreview panel visible | P1 |
| Learning mode active | Canvas + LearningPanel overlay | P1 |
| Mobile viewport | 375×667 (iPhone SE) | P2 |

## How to Run

### Local (Manual)

```bash
pnpm build
npx serve apps/web/dist -l 4173

npx lighthouse http://localhost:4173 \
  --output json \
  --output html \
  --output-path ./lighthouse-report \
  --chrome-flags="--headless --no-sandbox"
```

### CI (Automated — Future)

When automated Lighthouse CI is added, use this `lighthouserc.js` configuration:

```js
module.exports = {
  ci: {
    collect: {
      staticDistDir: 'apps/web/dist',
      url: ['http://localhost/'],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.7 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 3000 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.15 }],
        'interactive': ['error', { maxNumericValue: 5000 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

## Bundle Size Budgets (Cross-Reference)

Bundle size is enforced separately in CI (see `ci.yml` bundle-size gate):

| Budget | Limit |
|--------|-------|
| Total JS assets | 800 KB |
| Largest single chunk | 350 KB |

## Release Gate Integration

These thresholds are checked as part of the release process defined in `docs/guides/RELEASE_RUNBOOK.md`. A release that fails any P0 threshold check is a blocking defect.

| Gate | Blocking? | Enforcement |
|------|-----------|-------------|
| Core Web Vitals (P0 scenarios) | Yes | Manual until Lighthouse CI is added |
| Lighthouse scores | Yes | Manual until Lighthouse CI is added |
| Bundle size | Yes | Automated in CI |
| P1/P2 scenarios | No | Advisory — tracked for improvement |

## Baseline Measurements

Record baseline measurements after each milestone release. Compare against thresholds to track trends.

| Milestone | LCP | INP | CLS | Perf | A11y | BP | SEO |
|-----------|-----|-----|-----|------|------|----|-----|
| v0.19.0 | — | — | — | — | — | — | — |
| v0.20.0 | TBD | TBD | TBD | TBD | TBD | TBD | TBD |

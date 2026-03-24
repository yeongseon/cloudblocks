# Non-Functional Requirement (NFR) Targets

> Covers issue #27.

This document defines measurable non-functional requirement targets for CloudBlocks. These targets enable objective quality and release readiness decisions.

---

## 1. Bundle Size Budget

| Metric                           | Target           | Measurement                                 |
| -------------------------------- | ---------------- | ------------------------------------------- |
| **Main chunk (gzipped)**         | ≤ 400 KB         | `npx vite build` → inspect `dist/assets/`   |
| **Total initial load (gzipped)** | ≤ 600 KB         | Sum of all chunks loaded on first page view |
| **Largest lazy chunk**           | ≤ 100 KB gzipped | Any single lazy-loaded chunk                |
| **Total bundle (uncompressed)**  | ≤ 2 MB           | `du -sh dist/`                              |

### Current State (Milestone 5)

- Main chunk: ~1,124 KB uncompressed (after code splitting)
- 8 chunks produced via React.lazy (7 optional widgets + main)

### Enforcement

- CI reports bundle size on every PR via `vite build` output
- Regressions > 10% from baseline require justification in PR description
- New dependencies > 50 KB (bundled) require architecture review

---

## 2. Test Coverage

| Metric                  | Target | Tool        |
| ----------------------- | ------ | ----------- |
| **Frontend statements** | ≥ 90%  | Vitest + v8 |
| **Frontend branches**   | ≥ 90%  | Vitest + v8 |
| **Frontend functions**  | ≥ 90%  | Vitest + v8 |
| **Frontend lines**      | ≥ 90%  | Vitest + v8 |
| **Backend coverage**    | ≥ 90%  | pytest-cov  |

### Exclusions (Frontend)

These files are excluded from coverage calculations (documented in `vitest.config.ts`):

- `src/main.tsx` — entry point
- `src/test/**` — test setup
- `src/**/*.test.{ts,tsx}` — test files themselves
- `src/vite-env.d.ts` — type declarations
- `src/features/generate/types.ts` — pure type definitions
- `src/shared/types/template.ts` — pure type definitions
- SVG renderer components (canvas-level integration, not fully testable in jsdom):
  - `BlockSvg.tsx`, `PlateSvg.tsx`, `ConnectionRenderer.tsx`, `SceneCanvas.tsx`

### Enforcement

- Coverage thresholds configured in `vitest.config.ts` → build fails if below 90%
- Backend coverage checked in CI via `pytest --cov --cov-fail-under=90`

---

## 3. Validation Latency

| Architecture Size                       | Target Latency | Measurement                                         |
| --------------------------------------- | -------------- | --------------------------------------------------- |
| Small (≤ 10 blocks, ≤ 10 connections)   | ≤ 5 ms         | `performance.now()` around `validateArchitecture()` |
| Medium (≤ 50 blocks, ≤ 50 connections)  | ≤ 20 ms        | Same                                                |
| Large (≤ 200 blocks, ≤ 200 connections) | ≤ 100 ms       | Same                                                |

### Current Implementation

- Validation runs client-side with 300ms debounce (`AUTO_VALIDATE_DELAY_MS`)
- All validation is synchronous (no async/network calls)
- O(n) complexity for both placement and connection validation

### Enforcement

- Performance regression tests planned for Milestone 6
- If validation exceeds 100ms for any realistic architecture, optimize before release

---

## 4. CI Reliability

| Metric                   | Target                                                   |
| ------------------------ | -------------------------------------------------------- |
| **CI pass rate**         | ≥ 95% on `main` branch (excludes infrastructure flakes)  |
| **CI duration**          | ≤ 5 minutes for full pipeline                            |
| **Flaky test tolerance** | 0 — flaky tests are fixed or quarantined within 48 hours |

### CI Pipeline Jobs

| Job         | What It Checks                         | Max Duration |
| ----------- | -------------------------------------- | ------------ |
| `web-lint`  | ESLint on frontend                     | ≤ 60s        |
| `web-build` | TypeScript + Vite build (Node 20 & 22) | ≤ 120s       |
| `web-test`  | Vitest with coverage                   | ≤ 120s       |
| `api-lint`  | Ruff on backend                        | ≤ 30s        |
| `api-test`  | Pytest with coverage                   | ≤ 120s       |

### Enforcement

- All 5 CI jobs must pass before merge to `main`
- CI configuration: `.github/workflows/ci.yml`

---

## 5. Code Quality

| Metric                     | Target                                                      | Tool                                      |
| -------------------------- | ----------------------------------------------------------- | ----------------------------------------- |
| **TypeScript strict mode** | Zero errors                                                 | `tsc -b`                                  |
| **ESLint**                 | Zero errors, zero warnings                                  | `eslint .`                                |
| **Ruff (Python)**          | Zero errors                                                 | `ruff check .`                            |
| **Unused exports**         | Zero                                                        | Manual review (automated tooling planned) |
| **`any` type usage**       | Zero (`as any`, `@ts-ignore`, `@ts-expect-error` forbidden) | Code review                               |

---

## 6. Accessibility (Planned — Milestone 6+)

| Metric                  | Target                                          |
| ----------------------- | ----------------------------------------------- |
| **Keyboard navigation** | All interactive elements reachable via Tab      |
| **Screen reader**       | ARIA labels on all buttons and panels           |
| **Color contrast**      | WCAG AA (4.5:1 for text, 3:1 for UI components) |
| **Focus indicators**    | Visible on all interactive elements             |

---

## 7. Observability Minimums (Planned — Milestone 6+)

| Metric                  | Target                                                  |
| ----------------------- | ------------------------------------------------------- |
| **API request logging** | All requests logged with method, path, status, duration |
| **Error tracking**      | Unhandled exceptions reported to error service          |
| **Health endpoint**     | `/health` and `/health/ready` with dependency checks    |
| **Metrics**             | Request count, latency p50/p95/p99, error rate          |

### Current State

- `GET /health` and `GET /health/ready` endpoints implemented
- Request logging via FastAPI middleware (basic)
- No external error tracking or metrics service configured

---

## 8. Review Cadence

- NFR targets reviewed at each minor version release
- Bundle size baseline updated after each release
- Coverage thresholds may be raised (never lowered) as codebase matures

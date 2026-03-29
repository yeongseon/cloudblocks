# Analytics Instrumentation Plan

> Covers Gate 6 (Beginner Usability) metrics from [`RELEASE_GATES.md`](RELEASE_GATES.md).

!!! warning "Aspiration vs Implementation"
    This plan describes the **intended** analytics instrumentation. Most events listed here are not yet implemented. Persona-related events (`persona_selected`, `session_started.persona`) reference a feature that has been removed. This document will be updated when analytics instrumentation is prioritized.


## 1. Purpose

Gate 6 defines four usability metrics that determine whether CloudBlocks succeeds as a visual cloud learning tool for beginners. This document specifies the events, code insertion points, tooling, and privacy constraints required to measure those metrics.

---

## 2. Gate 6 Metrics → Events Mapping

### 2.1 D7 Beginner Retention (Blocker — ≥ 15%)

> "≥ 15% of beginner users return within 7 days of first session."

| Event              | Trigger                                           | Payload                                                 | Code Location                                                                          |
| ------------------ | ------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `session_started`  | App mounts for the first time per browser session | `{ anonymousId, isReturning, daysSinceFirst, persona }` | `apps/web/src/app/App.tsx` — inside `useEffect` on mount                               |
| `persona_selected` | User selects a persona during onboarding          | `{ anonymousId, persona }`                              | `apps/web/src/widgets/onboarding-tour/OnboardingTour.tsx` — persona card click handler |

**Derived metric**: Count distinct `anonymousId` values where `isReturning === true` and `daysSinceFirst ≤ 7`, divided by total distinct first-session IDs.

### 2.2 Template → Edit → Export Completion (Blocker — ≥ 30%)

> "≥ 30% of new users who open a template successfully edit it and reach the export step."

| Event                         | Trigger                                              | Payload                                              | Code Location                                                                                                                                       |
| ----------------------------- | ---------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `template_selected`           | User clicks "Use Template" in the template gallery   | `{ anonymousId, templateId, templateName }`          | `apps/web/src/widgets/template-gallery/TemplateGallery.tsx` — `handleUseTemplate()`                                                                 |
| `first_edit_after_template`   | First architecture mutation after loading a template | `{ anonymousId, templateId, editType }`              | `apps/web/src/entities/store/architectureStore.ts` — any mutating action (addNode, removeNode, addConnection, etc.), fire once per template session |
| `terraform_generated`         | User opens code preview and Terraform output renders | `{ anonymousId, templateId, generator, blockCount }` | `apps/web/src/widgets/code-preview/CodePreview.tsx` — when code output is first displayed                                                           |
| `advanced_generator_selected` | User switches to Bicep or Pulumi (Experimental)      | `{ anonymousId, generator }`                         | `apps/web/src/widgets/code-preview/CodePreview.tsx` — generator selector change                                                                     |

**Derived metric**: Users with all three events (`template_selected` → `first_edit_after_template` → `terraform_generated`) for the same `templateId`, divided by users with `template_selected`.

### 2.3 Beginner Scenario Completion Rate (Warning — ≥ 50%)

> "Each built-in guided scenario should have ≥ 50% completion rate among users who start it."

| Event                     | Trigger                                                               | Payload                                                      | Code Location                                                                       |
| ------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `scenario_started`        | User clicks "Start" on a scenario card                                | `{ anonymousId, scenarioId, scenarioName, difficulty }`      | `apps/web/src/widgets/scenario-gallery/ScenarioGallery.tsx` — `handleStart()`       |
| `scenario_step_completed` | Step validation passes                                                | `{ anonymousId, scenarioId, stepId, stepOrder, totalSteps }` | `apps/web/src/features/learning/scenario-engine.ts` — `advanceStep()` or equivalent |
| `scenario_completed`      | User reaches the final step completion                                | `{ anonymousId, scenarioId, totalTimeSeconds }`              | `apps/web/src/features/learning/scenario-engine.ts` — completion handler            |
| `scenario_abandoned`      | User navigates away or starts a different scenario without completing | `{ anonymousId, scenarioId, lastStepOrder, totalSteps }`     | `apps/web/src/features/learning/scenario-engine.ts` — on scenario reset or switch   |

**Derived metric**: Per scenario: `scenario_completed` count ÷ `scenario_started` count.

### 2.4 First Meaningful Action Latency (Warning — ≥ 80% within 60s)

> "≥ 80% of new users perform a meaningful action (place a block or load a template) within 60 seconds of first visit."

| Event                     | Trigger                                                             | Payload                                               | Code Location                                                                                                                                |
| ------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `first_meaningful_action` | First block placement OR first template load, whichever comes first | `{ anonymousId, actionType, secondsSinceFirstVisit }` | `apps/web/src/entities/store/architectureStore.ts` — first `addNode` or `importArchitecture` call                                            |
| `learn_entry_clicked`     | User clicks the Learn button or "Start Learning" CTA                | `{ anonymousId, entryPoint, secondsSinceFirstVisit }` | `apps/web/src/widgets/menu-bar/MenuBar.tsx` — `handleToggleLearningPanel()`, `apps/web/src/widgets/landing-page/LandingPage.tsx` — CTA click |
| `blank_canvas_started`    | User starts with blank canvas instead of a template                 | `{ anonymousId, secondsSinceFirstVisit }`             | `apps/web/src/widgets/empty-canvas-cta/EmptyCanvasCTA.tsx` — blank canvas button click                                                       |

**Derived metric**: Users where `first_meaningful_action.secondsSinceFirstVisit ≤ 60`, divided by total first-session users.

---

## 3. Complete Event Catalog

| Event Name                    | Category   | Description                                    |
| ----------------------------- | ---------- | ---------------------------------------------- |
| `session_started`             | Session    | App loads in browser                           |
| `persona_selected`            | Onboarding | Persona card selected during onboarding        |
| `learn_entry_clicked`         | Navigation | User clicks Learn button or Start Learning CTA |
| `scenario_started`            | Learning   | Scenario started from gallery                  |
| `scenario_step_completed`     | Learning   | Single step validation passed                  |
| `scenario_completed`          | Learning   | All steps completed                            |
| `scenario_abandoned`          | Learning   | Scenario left incomplete                       |
| `template_selected`           | Template   | Template loaded from gallery                   |
| `first_edit_after_template`   | Template   | First edit after loading a template            |
| `first_meaningful_action`     | Engagement | First block or template action                 |
| `terraform_generated`         | Export     | Terraform code preview opened                  |
| `advanced_generator_selected` | Export     | Non-default generator selected                 |
| `blank_canvas_started`        | Engagement | Blank canvas chosen over template              |

---

## 4. Analytics Tool Evaluation

### Recommended: PostHog (Self-Hosted or Cloud)

| Criterion          | PostHog                    | Plausible           | Custom (DIY)              |
| ------------------ | -------------------------- | ------------------- | ------------------------- |
| Event tracking     | ✅ Full custom events      | ✅ Custom events (via JS API) | ✅ Full control           |
| Funnel analysis    | ✅ Built-in funnels        | ❌ No built-in funnels        | ❌ Build from scratch     |
| Retention cohorts  | ✅ Built-in                | ❌ No built-in cohorts        | ❌ Build from scratch     |
| Self-hosted option | ✅ Docker-based            | ✅ Docker-based               | N/A                       |
| GDPR compliance    | ✅ EU hosting + cookieless | ✅ No cookies                 | Depends on implementation |
| Free tier          | ✅ 1M events/mo            | ✅ 10K pageviews/mo           | N/A                       |
| Integration effort | Low (JS SDK)               | Low (script tag)              | High                      |
| Session replay     | ✅ Optional                | ❌ No                         | ❌ Build from scratch     |

**Decision**: PostHog — it covers all four Gate 6 metrics natively (events, funnels, retention, timing). Self-hosted option satisfies privacy requirements.

### Integration Approach

```typescript
// apps/web/src/shared/utils/analytics.ts

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, string | number | boolean>;
}

let posthog: { capture: (event: string, props?: Record<string, unknown>) => void } | null = null;

export function initAnalytics(): void {
  // Only initialize if consent given and PostHog configured
  const consent = localStorage.getItem('cloudblocks:analytics-consent');
  const apiKey = import.meta.env.VITE_POSTHOG_KEY;
  if (consent !== 'granted' || !apiKey) return;

  // Dynamic import to avoid bundling when unused
  import('posthog-js').then((ph) => {
    posthog = ph.default;
    posthog.init(apiKey, {
      api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com',
      persistence: 'localStorage',
      capture_pageview: false, // We track custom events only
      capture_pageleave: false,
      autocapture: false, // Manual instrumentation only
      disable_session_recording: true, // Enable only after user research opt-in
    });
  });
}

export function track(event: AnalyticsEvent): void {
  posthog?.capture(event.name, event.properties);
}

export function identify(anonymousId: string, traits?: Record<string, string>): void {
  posthog?.capture('$identify', { distinct_id: anonymousId, ...traits });
}
```

---

## 5. Privacy Requirements

### 5.1 No PII Collection

| Rule                                     | Implementation                                           |
| ---------------------------------------- | -------------------------------------------------------- |
| No names, emails, or IP addresses stored | PostHog `disable_ip` + no `$set` with PII                |
| Anonymous IDs only                       | Use `crypto.randomUUID()` stored in localStorage         |
| No session recording by default          | `disable_session_recording: true`                        |
| No autocapture                           | `autocapture: false` — all events are explicitly defined |

### 5.2 Consent Model

```
First visit → Banner: "CloudBlocks collects anonymous usage analytics to improve the learning experience. No personal data is collected."
  → [Accept] → localStorage.setItem('cloudblocks:analytics-consent', 'granted')
  → [Decline] → localStorage.setItem('cloudblocks:analytics-consent', 'declined')
  → No analytics SDK loaded until consent === 'granted'
```

### 5.3 GDPR / Data Retention

- **Data retention**: 90 days (aligned with Gate 6 kill-switch timeline)
- **Right to erasure**: Users can clear localStorage (removes anonymous ID) and request server-side deletion via support email
- **Data location**: Self-hosted PostHog in EU region, or PostHog Cloud EU
- **Third-party sharing**: None. Analytics data is internal only.

---

## 6. Manual Measurement Protocol (Until Automated)

Until PostHog integration is deployed, Gate 6 metrics are measured manually via user testing sessions.

### Setup

1. Recruit 10–20 beginner participants (no prior cloud architecture experience)
2. Provide each participant with a fresh browser profile (no localStorage)
3. Record screen sessions (with consent) using any screen recording tool

### Session Script

| Step | Action                                 | What to Record                        |
| ---- | -------------------------------------- | ------------------------------------- |
| 1    | Open CloudBlocks live demo             | Timestamp of first page load          |
| 2    | Observe (no guidance) for 60s          | First action taken + timestamp        |
| 3    | Ask: "Load a template and export code" | Which template chosen, time to export |
| 4    | Ask: "Start a guided scenario"         | Which scenario, steps completed, time |
| 5    | Follow up 7 days later                 | Did they return?                      |

### Metrics Calculation

| Metric                   | Manual Formula                                                                  |
| ------------------------ | ------------------------------------------------------------------------------- |
| D7 retention             | (Participants who returned in 7 days) ÷ (Total participants)                    |
| Template → Edit → Export | (Participants who completed all 3 steps) ÷ (Participants who loaded a template) |
| Scenario completion      | Per scenario: (Completions) ÷ (Starts)                                          |
| First action latency     | (Participants with action ≤ 60s) ÷ (Total participants)                         |

### Recording Template

```markdown
## User Testing Session — [Date]

**Participant ID**: P-001 (anonymous)
**Browser**: Chrome 125 / fresh profile
**Persona selected**: [devops / backend / pm / student]

### First Meaningful Action

- Time to first action: \_\_\_s
- Action type: [template_load / block_place / scenario_start]

### Template → Edit → Export

- Template selected: \_\_\_
- Edit performed: [yes/no]
- Export reached: [yes/no]
- Time: \_\_\_s

### Scenario Completion

- Scenario started: \_\_\_
- Steps completed: **_ / _**
- Completed: [yes/no]
- Time: \_\_\_s
- Abandonment reason (if any): \_\_\_

### D7 Return

- Returned within 7 days: [yes/no]
- Date of return: \_\_\_
```

---

## 7. Dashboard Specification

When PostHog is active, create the following dashboard:

### Gate 6 — Beginner Usability Dashboard

| Panel                | Visualization            | Query                                                                     |
| -------------------- | ------------------------ | ------------------------------------------------------------------------- |
| D7 Retention         | Line chart (weekly)      | Retention cohort where `persona` in ['student', 'pm']                     |
| Template Funnel      | Funnel chart             | `template_selected` → `first_edit_after_template` → `terraform_generated` |
| Scenario Completion  | Bar chart (per scenario) | `scenario_completed` ÷ `scenario_started`, grouped by `scenarioId`        |
| First Action Latency | Histogram                | Distribution of `first_meaningful_action.secondsSinceFirstVisit`          |
| Kill Switch Monitor  | Number card (red/green)  | Retention < 15% OR Funnel < 30% → RED                                     |

### Alert Rules

| Condition                                            | Action                            |
| ---------------------------------------------------- | --------------------------------- |
| D7 retention drops below 15% for 2 consecutive weeks | Email + Slack alert to team       |
| Template funnel drops below 30% for 1 week           | Email alert                       |
| Any scenario completion drops below 25%              | Create GitHub issue automatically |

---

## 8. Implementation Phases

| Phase                 | Scope                                     | Milestone        |
| --------------------- | ----------------------------------------- | ---------------- |
| **Phase 0** (Current) | Manual measurement protocol               | M33              |
| **Phase 1**           | Analytics utility module + consent banner | Future milestone |
| **Phase 2**           | Instrument all 13 events                  | Future milestone |
| **Phase 3**           | PostHog dashboard + alert rules           | Future milestone |

---

## 9. File Inventory

| File                                                        | Purpose                                                               | Phase   |
| ----------------------------------------------------------- | --------------------------------------------------------------------- | ------- |
| `apps/web/src/shared/utils/analytics.ts`                    | Analytics utility (track, identify, init)                             | Phase 1 |
| `apps/web/src/shared/ui/ConsentBanner.tsx`                  | Cookie/analytics consent UI                                           | Phase 1 |
| `apps/web/src/app/App.tsx`                                  | `session_started` event + init                                        | Phase 2 |
| `apps/web/src/widgets/onboarding-tour/OnboardingTour.tsx`   | `persona_selected` event                                              | Phase 2 |
| `apps/web/src/widgets/template-gallery/TemplateGallery.tsx` | `template_selected` event                                             | Phase 2 |
| `apps/web/src/widgets/scenario-gallery/ScenarioGallery.tsx` | `scenario_started` event                                              | Phase 2 |
| `apps/web/src/features/learning/scenario-engine.ts`         | `scenario_step_completed`, `scenario_completed`, `scenario_abandoned` | Phase 2 |
| `apps/web/src/entities/store/architectureStore.ts`          | `first_edit_after_template`, `first_meaningful_action`                | Phase 2 |
| `apps/web/src/widgets/code-preview/CodePreview.tsx`         | `terraform_generated`, `advanced_generator_selected`                  | Phase 2 |
| `apps/web/src/widgets/menu-bar/MenuBar.tsx`                 | `learn_entry_clicked`                                                 | Phase 2 |
| `apps/web/src/widgets/empty-canvas-cta/EmptyCanvasCTA.tsx`  | `blank_canvas_started`                                                | Phase 2 |
| `apps/web/src/widgets/landing-page/LandingPage.tsx`         | `learn_entry_clicked` (CTA)                                           | Phase 2 |

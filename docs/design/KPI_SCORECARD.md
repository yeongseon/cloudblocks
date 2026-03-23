# CloudBlocks KPI Scorecard (Objective Quality & Success Metrics)

## Purpose

Use a single objective scorecard to evaluate product success and engineering quality.

---

## 1) Product Value Metrics

### 1.1 Time to First Value (TTFV)

- Definition: Time from first open to first successful `architecture -> validate -> generate` completion.
- Target: <= 10 minutes (new user median).

### 1.2 Core Task Success Rate

- Definition: Success ratio for key flow:
  1. Create basic architecture
  2. Pass validation
  3. Generate IaC
- Target: >= 90%.

### 1.3 Funnel Drop-off

- Definition: Drop-off by stage (Onboarding / Modeling / Validation / Generation).
- Target: No single stage > 30% drop-off.

---

## 2) Engineering Stability Metrics

### 2.1 Main Branch CI Green Rate

- Definition: Successful CI runs / total CI runs on main.
- Target: >= 95%.

### 2.2 Regression Reopen Rate

- Definition: Reopened bug issues / closed bug issues.
- Target: < 10%.

### 2.3 Deployment Reliability

- Definition: Failed deployments / total deployments.
- Target: < 5%.

### 2.4 MTTR

- Definition: Mean time to recover from production-impacting failures.
- Target: <= 60 minutes.

---

## 3) Architecture & Maintainability Metrics

### 3.1 Doc-Code Consistency Score

- Definition: Percentage of "canonical" documented contracts that match implementation.
- Scope:
  - Architecture schema contract
  - Rule engine contract
  - Generator contract
- Target: >= 95% consistency.

### 3.2 Contract Test Pass Rate

- Definition: Pass rate for schema/rule/generator contract tests.
- Target: 100% on required gates.

### 3.3 Change Blast Radius

- Definition: Number of core modules impacted per PR (median).
- Target: <= 3 modules/PR for normal work.

---

## 4) Open Core Business Metrics

### 4.1 OSS Adoption

- Signals:
  - Weekly stars / forks / external PRs
  - New contributor count
- Target: Positive trend (4-week rolling average).

### 4.2 Platform Demand Signals

- Signals:
  - Requests for RBAC / SSO / audit / policy packs
  - Enterprise inquiry count
- Target: Growing month-over-month.

### 4.3 Retention Signals

- Definition: Teams active across multiple weeks.
- Target: Positive retention trend by cohort.

---

## Weekly Report Format (Required)

## A. Completed This Week

- (short bullet list)

## B. In Progress

- (issue/PR references)

## C. Risks / Blockers

- (technical + product risks)

## D. KPI Snapshot

- TTFV:
- Core Task Success:
- CI Green Rate:
- Regression Reopen Rate:
- Doc-Code Consistency:
- Contract Test Pass:
- OSS Adoption Trend:
- Platform Demand Trend:

## E. Next Week Plan

- Ordered by priority + dependency

---

## Operating Rules

- No implementation milestone starts without:
  1. Documentation update
  2. Document consistency review
  3. Doc-code consistency review
  4. Milestone confirmation
  5. Issue breakdown with priority/dependency
- One issue per PR.
- Merge only after required checks pass.

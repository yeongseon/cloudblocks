# Learning Mode — Technical Design Specification

> **Audience**: Beginners / Contributors | **Status**: Stable — **V1 Core** | **Verified against**: v0.35.0

> **Milestone**: 6C — Learning Mode
> **Last Updated**: 2026-03-28

---

## 1. Overview

CloudBlocks Learning Mode is the **primary product experience** — a guided learning platform for cloud architecture beginners (Duolingo for Cloud Architecture). Learning Mode is a V1 Core feature, not an opt-in advanced feature.

Users start in Build Mode (free-form editor) and access Learn Mode (guided scenario missions) via the Scenario Gallery. The recommended path for beginners is to open a guided scenario from the empty canvas CTA ("Start Learning") or from the **Learn** button in the menu bar.

### Goals

- Teach cloud architecture fundamentals through hands-on building
- Validate learner progress via state-based predicates (not action-tracking)
- Reuse the existing visual builder — no separate "learning UI"
- Progressive difficulty: beginner → intermediate → advanced
- Serve as the primary entry point for bootcamp students, career changers, and junior developers

### Non-Goals

- AI-powered tutoring (future milestone)
- User accounts / cloud persistence (uses localStorage)
- Multiplayer/social features
- Branching narrative (linear missions only in MVP)

---

## 2. Architecture

### Mode Switch

- `EditorMode = 'build' | 'learn'` in `uiStore.ts`
- Learn Mode: guided scenarios with LearningPanel (recommended for beginners)
- Build Mode: full editor for free-form building (after completing guided scenarios)

### Store Architecture

```
uiStore.ts          — editorMode, showLearningPanel, showScenarioGallery
learningStore.ts    — activeScenario, progress, hints, step completion
architectureStore   — unchanged (source of truth for architecture state)
```

The learning store SUBSCRIBES to architecture changes via `architectureStore.subscribe()` to evaluate step validation rules reactively.

### Key Principle: State-Based Validation

Step completion is determined by examining the CURRENT architecture state against typed validation predicates — NOT by tracking user actions. This makes the system compatible with undo/redo, reset, and any method of arriving at the correct state.

---

## 3. Type System

### Core Types (from `shared/types/learning.ts`)

```typescript
export type EditorMode = 'build' | 'learn';
export type ScenarioDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type ArchitectureSnapshot = Omit<ArchitectureModel, 'id' | 'createdAt' | 'updatedAt'>;

// Typed validation rule union — NO unknown/any
export type StepValidationRule =
  | { type: 'container-exists'; containerLayer: ContainerLayer }
  | {
      type: 'block-exists';
      category: ResourceCategory;
      onContainerLayer?: ContainerLayer;
    }
  | { type: 'connection-exists'; sourceCategory: EndpointType; targetCategory: EndpointType }
  | {
      type: 'entity-on-container';
      entityCategory: ResourceCategory;
      containerLayer: ContainerLayer;
    }
  | { type: 'architecture-valid' }
  | { type: 'min-block-count'; category: ResourceCategory; count: number }
  | { type: 'min-container-count'; containerLayer: ContainerLayer; count: number };
```

Each rule type maps directly to an existing domain concept:

- `container-exists` → check `model.containers` for matching layer
- `block-exists` → check `model.resources` for matching category, optionally on a specific container layer
- `connection-exists` → check `model.connections` + resolve endpoint types
- `entity-on-container` → check resource exists AND its placement container matches the specified layer
- `architecture-valid` → delegate to `validateArchitecture()` engine
- `min-block-count` → count resources of category ≥ threshold
- `min-container-count` → count containers of layer ≥ threshold

### Scenario & Step

```typescript
interface ScenarioStep {
  id: string;
  order: number;
  title: string;
  instruction: string;
  hints: string[];
  validationRules: StepValidationRule[];
  checkpoint?: ArchitectureSnapshot;
}

interface Scenario {
  id: string;
  name: string;
  description: string;
  difficulty: ScenarioDifficulty;
  category: TemplateCategory;
  tags: string[];
  estimatedMinutes: number;
  steps: ScenarioStep[];
  initialArchitecture: ArchitectureSnapshot;
}
```

---

## 4. Core Modules

### 4.1 Step Validator (`features/learning/step-validator.ts`)

Pure function: `evaluateRules(rules: StepValidationRule[], model: ArchitectureModel) => { passed: boolean; results: RuleResult[] }`

- Each rule evaluator is a pure function that reads the ArchitectureModel
- Returns per-rule pass/fail for UI feedback
- Reuses `validateArchitecture()` from the validation engine for the `architecture-valid` rule; all other rule types are self-contained evaluators

### 4.2 Scenario Engine (`features/learning/scenario-engine.ts`)

Orchestration layer that:

1. Loads a scenario and seeds `architectureStore` with `replaceArchitecture(initialArchitecture)`
2. Subscribes to `architectureStore` state changes
3. On each change, runs step-validator against current step's rules and sets `isCurrentStepComplete`
4. When step is complete, the user clicks "Next Step" to advance (`advanceToNextStep()`)
5. When all steps complete → marks scenario complete

### 4.3 Hint Engine (`features/learning/hint-engine.ts`)

- Tracks idle time since last architecture change
- After configurable delay (default: 30s), shows first hint
- Progressive reveal: each subsequent delay shows next hint
- Resets timer on any architecture change

### 4.4 Scenario Registry (`features/learning/scenarios/registry.ts`)

Mirrors the template registry pattern:

```typescript
registerScenario(scenario: Scenario): void
getScenario(id: string): Scenario | undefined
listScenarios(): Scenario[]
listScenariosByDifficulty(difficulty: ScenarioDifficulty): Scenario[]
searchScenarios(query: string): Scenario[]
clearScenarioRegistry(): void
```

### 4.5 Learning Store (`entities/store/learningStore.ts`)

Zustand store managing learning session state:

```typescript
interface LearningStoreState {
  activeScenario: Scenario | null;
  progress: LearningProgress | null;
  currentHintIndex: number;
  isCurrentStepComplete: boolean;

  startScenario: (scenario: Scenario) => void;
  advanceStep: () => void;
  completeScenario: () => void;
  resetToCheckpoint: () => void;
  showNextHint: () => void;
  resetHints: () => void;
  setStepComplete: (complete: boolean) => void;
  abandonScenario: () => void;
}
```

---

## 5. UI Components

### 5.1 LearningPanel (right side, replaces Properties in Learn mode)

- Current step title + instruction
- Step progress indicator (1/N)
- Hint display area
- "Reset Step" button → `replaceArchitecture(checkpoint)`
- "Next Step" button (enabled when step complete)

### 5.2 StepProgress

- Visual step indicators (locked/active/completed)
- Current step highlighted

### 5.3 HintPopup

- Progressive hint reveal
- "Show Hint" button with count (e.g., "Hint 1/3")

### 5.4 CompletionScreen

- Congratulations display
- Stats: time taken, hints used
- "Try Another" → ScenarioGallery
- "Back to Build" → switch to Build mode

### 5.5 ScenarioGallery

- Grid of scenario cards
- Filter by difficulty
- Shows: name, description, difficulty badge, estimated time, step count
- Click → starts scenario

---

## 6. App Integration

### Mode Switch in Toolbar

- Toggle button: "Build" ↔ "Learn"
- Switching to Learn shows ScenarioGallery (if no active scenario) or LearningPanel
- Switching to Build returns to normal editor

### Conditional UI (Learn Mode)

| Element           | Build Mode  | Learn Mode  |
| ----------------- | ----------- | ----------- |
| Block Palette     | Visible     | Visible     |
| Properties Panel  | Visible     | Hidden      |
| Validation Panel  | Visible     | Hidden      |
| Code Preview      | Visible     | Hidden      |
| GitHub buttons    | Visible     | Hidden      |
| Workspace Manager | Visible     | Hidden      |
| Template Gallery  | Visible     | Hidden      |
| Learning Panel    | Hidden      | Visible     |
| Canvas            | Full editor | Full editor |

---

## 7. Built-in Scenarios (6)

> **Container terminology**: The user-facing term "Network" maps to `containerLayer: 'region'` in code. "Subnet" maps to `containerLayer: 'subnet'`. The scenario validation rules use the code-level container layer names.

### 7.1 Three-Tier Web App (Beginner, ~10 min)

Steps:

1. Create a Region container (VNet) — `{ type: 'container-exists', containerLayer: 'region' }`
2. Add a Public Subnet and a Private Subnet — `container-exists` for each subnet access level
3. Place a Gateway on the Public Subnet, a Compute block, and a Database on the Private Subnet — `block-exists` with placement constraints
4. Connect Internet → Gateway → Compute → Database — `connection-exists` rules
5. Validate the architecture — `architecture-valid`

### 7.2 Serverless HTTP API (Intermediate, ~8 min)

Starts with a pre-built Region container block and Internet external actor.
Steps:

1. Set up network zones — add Public and Private Subnets
2. Deploy serverless components — Gateway on public subnet, Function on Region container (`onContainerLayer: 'region'`), Database on private subnet
3. Wire the API flow — Internet → Gateway → Function → Database
4. Validate the architecture

### 7.3 Event-Driven Data Pipeline (Advanced, ~12 min)

Starts with a pre-built Region container block and Private Subnet.
Steps:

1. Add Event and Queue blocks on the Region container — `block-exists` with `onContainerLayer: 'region'`
2. Add two Function blocks on the Region container block — `min-block-count: function ≥ 2`
3. Add a second Event trigger on the Region container block and a Storage block on the Private Subnet — uses `event` category (not `timer`; `timer` is not a valid `BlockCategory`)
4. Connect Event → Function, Queue → Function, Function → Storage — `connection-exists` rules
5. Final validation — `architecture-valid` + `min-block-count: function ≥ 2` + `min-container-count: region ≥ 1`

### 7.4 Simple Compute Setup (Beginner, ~6 min)

Starts with an empty canvas.
Steps:

1. Create the Network — create a VNet container — `{ type: 'container-exists', containerLayer: 'region' }`
2. Add a Subnet — add one subnet inside the VNet — `min-container-count: subnet ≥ 1`
3. Place Gateway and Compute — place an Application Gateway and an App Service on the subnet — `block-exists` with `onContainerLayer: 'subnet'`
4. Connect the Traffic Flow — Internet → Application Gateway → App Service — `connection-exists` rules

### 7.5 Data Storage Backend (Intermediate, ~10 min)

Starts with an empty canvas.
Steps:

1. Create the Network — create a VNet container — `{ type: 'container-exists', containerLayer: 'region' }`
2. Add Application and Data Subnets — two subnets for tier isolation — `min-container-count: subnet ≥ 2`
3. Deploy the Application Tier — place an Application Gateway and a VM on the first subnet — `block-exists` with `onContainerLayer: 'subnet'`
4. Add Data Services — place a SQL Database and Blob Storage on the second subnet — `block-exists: data` + `min-block-count: data ≥ 2`
5. Wire the Data Flow — Internet → Gateway → VM → SQL Database, VM → Blob Storage — `connection-exists` rules

### 7.6 Full-Stack Web App with Event Processing (Advanced, ~15 min)

Starts with an empty canvas.
Steps:

1. Build the Network Foundation — create one VNet and two subnets — `container-exists: region` + `min-container-count: subnet ≥ 2`
2. Deploy the Web Tier — place an Application Gateway and a VM on Subnet 1, connect Internet → Gateway → VM — `block-exists` + `connection-exists`
3. Add Data Services — place PostgreSQL and Blob Storage on Subnet 2, connect VM → Database and VM → Storage — `block-exists: data` + `min-block-count: data ≥ 2` + `connection-exists`
4. Build the Serverless Layer — place 3 Functions, Service Bus, Event Grid, and a Timer Trigger on the VNet — `min-block-count: compute ≥ 4` + `block-exists: messaging` + `connection-exists: messaging → compute`
5. Final Validation — validate the complete architecture — `architecture-valid` + `min-block-count: compute ≥ 4` + `min-container-count: subnet ≥ 2`

---

## 8. State Machine

```
IDLE → (select scenario) → RUNNING → (all steps complete) → COMPLETED → (back to build) → IDLE
                              ↑                                    |
                              └──── (try another) ─────────────────┘

RUNNING: step[0] → step[1] → ... → step[N-1] → COMPLETED
         Each step: evaluating → (rules pass) → advance
```

---

## 9. Dependencies

### New Files

- `shared/types/learning.ts`
- `entities/store/learningStore.ts`
- `features/learning/step-validator.ts`
- `features/learning/scenario-engine.ts`
- `features/learning/hint-engine.ts`
- `features/learning/scenarios/registry.ts`
- `features/learning/scenarios/builtin.ts`
- `features/learning/scenarios/index.ts`
- `widgets/learning-panel/LearningPanel.tsx` + CSS
- `widgets/learning-panel/StepProgress.tsx`
- `widgets/learning-panel/HintPopup.tsx`
- `widgets/learning-panel/CompletionScreen.tsx`
- `widgets/scenario-gallery/ScenarioGallery.tsx` + CSS

### Modified Files

- `entities/store/uiStore.ts` — add `editorMode`, panel toggles
- `entities/store/architectureStore.ts` (slices) — add `replaceArchitecture`
- `widgets/toolbar/Toolbar.tsx` — Learn mode switch
- `app/App.tsx` — integrate Learning Mode components

### Reused Modules (unchanged)

- `entities/validation/engine.ts` — `validateArchitecture()`
- `entities/validation/placement.ts` — `validatePlacement()`, `canPlaceBlock()`
- `entities/validation/connection.ts` — `validateConnection()`, `canConnect()`
- `features/templates/registry.ts` — pattern reference for scenario registry

---

## 10. Testing Strategy

- **Unit tests**: step-validator (all 7 rule types), learningStore, scenario-engine, hint-engine
- **Component tests**: LearningPanel, ScenarioGallery, StepProgress
- **Integration test**: Full scenario flow (start → step through → complete)
- **Target**: 90%+ coverage on learning module

---

## 11. Future Extensions (Out of Scope for MVP)

- XState for branching narrative
- Achievement/badge system
- Scenario authoring UI
- Community-contributed scenarios (marketplace)
- AI-powered adaptive hints
- Progress persistence across sessions

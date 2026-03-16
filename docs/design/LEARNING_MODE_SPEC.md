# Learning Mode — Technical Design Specification

> **Status**: Canonical  
> **Milestone**: 6C — Learning Mode  
> **Last Updated**: 2026-03-17

---

## 1. Overview

CloudBlocks Learning Mode transforms the builder into a guided learning platform (Duolingo for Cloud Architecture). Users switch between Build Mode (free-form editor) and Learn Mode (guided scenario missions).

### Goals
- Teach cloud architecture fundamentals through hands-on building
- Validate learner progress via state-based predicates (not action-tracking)
- Reuse the existing visual builder — no separate "learning UI"
- Progressive difficulty: beginner → intermediate → advanced

### Non-Goals
- AI-powered tutoring (future milestone)
- User accounts / cloud persistence (uses localStorage)
- Multiplayer/social features
- Branching narrative (linear missions only in MVP)

---

## 2. Architecture

### Mode Switch
- `EditorMode = 'build' | 'learn'` in `uiStore.ts`
- Build Mode: full editor (default)
- Learn Mode: hides noise (GitHub, import/export, templates), shows LearningPanel

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
  | { type: 'plate-exists'; plateType: PlateType; subnetAccess?: SubnetAccess }
  | { type: 'block-exists'; category: BlockCategory; onPlateType?: PlateType; onSubnetAccess?: SubnetAccess }
  | { type: 'connection-exists'; sourceCategory: EndpointType; targetCategory: EndpointType }
  | { type: 'entity-on-plate'; entityCategory: BlockCategory; plateType: PlateType; subnetAccess?: SubnetAccess }
  | { type: 'architecture-valid' }
  | { type: 'min-block-count'; category: BlockCategory; count: number }
  | { type: 'min-plate-count'; plateType: PlateType; count: number };
```

Each rule type maps directly to an existing domain concept:
- `plate-exists` → check `model.plates` for matching type/access
- `block-exists` → check `model.blocks` for matching category, optionally on a specific plate type
- `connection-exists` → check `model.connections` + resolve endpoint types
- `entity-on-plate` → check block exists AND its placement plate matches
- `architecture-valid` → delegate to `validateArchitecture()` engine
- `min-block-count` → count blocks of category ≥ threshold
- `min-plate-count` → count plates of type ≥ threshold

### Scenario & Step
```typescript
interface ScenarioStep {
  id: string; order: number; title: string; instruction: string;
  hints: string[]; validationRules: StepValidationRule[];
  checkpoint?: ArchitectureSnapshot;
}

interface Scenario {
  id: string; name: string; description: string;
  difficulty: ScenarioDifficulty; category: TemplateCategory;
  tags: string[]; estimatedMinutes: number;
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
- Reuses existing validators: `validateArchitecture()`, `validatePlacement()`, `canPlaceBlock()`, `canConnect()`

### 4.2 Scenario Engine (`features/learning/scenario-engine.ts`)

Orchestration layer that:
1. Loads a scenario and seeds `architectureStore` with `replaceArchitecture(initialArchitecture)`
2. Subscribes to `architectureStore` state changes
3. On each change, runs step-validator against current step's rules
4. When all rules pass → advances to next step (auto-advance)
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
| Element | Build Mode | Learn Mode |
|---------|-----------|------------|
| Block Palette | Visible | Visible |
| Properties Panel | Visible | Hidden |
| Validation Panel | Visible | Hidden |
| Code Preview | Visible | Hidden |
| GitHub buttons | Visible | Hidden |
| Workspace Manager | Visible | Hidden |
| Template Gallery | Visible | Hidden |
| Learning Panel | Hidden | Visible |
| Canvas | Full editor | Full editor |

---

## 7. Built-in Scenarios

### 7.1 Three-Tier Web App (Beginner, ~10 min)
Steps:
1. Create a Network Plate (VNet)
2. Add a Public Subnet to the VNet
3. Add a Private Subnet to the VNet
4. Place a Gateway on the Public Subnet
5. Place a Compute block on the Public Subnet
6. Place a Database on the Private Subnet
7. Connect Internet → Gateway
8. Connect Gateway → Compute
9. Connect Compute → Database
10. Validate the architecture

### 7.2 Serverless HTTP API (Intermediate, ~15 min)
Steps:
1. Create network infrastructure (VNet + subnets)
2. Place a Gateway on the Public Subnet
3. Place a Function block on the Network Plate
4. Place Storage and Database on the Private Subnet
5. Connect Internet → Gateway → Function
6. Connect Function → Storage and Function → Database
7. Validate the architecture

### 7.3 Event-Driven Pipeline (Advanced, ~20 min)
Steps:
1. Create network infrastructure
2. Place Event, Queue, and Timer blocks on the Network Plate
3. Place two Function blocks (Event Processor, Batch Processor)
4. Place Storage on the Private Subnet
5. Wire Event → Function, Queue → Function, Timer → Function
6. Connect Functions → Storage and Function → Queue (feedback loop)
7. Validate the complete architecture

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

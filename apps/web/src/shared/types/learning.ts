import type { ArchitectureModel, BlockCategory, PlateType } from './index';
import type { EndpointType } from '../../entities/validation/connection';
import type { TemplateCategory } from './template';

// ─── Editor Mode ───────────────────────────────────────────

export type EditorMode = 'build' | 'learn';

// ─── Scenario Difficulty ───────────────────────────────────

export type ScenarioDifficulty = 'beginner' | 'intermediate' | 'advanced';

// ─── Step Validation Rules (Typed Union) ───────────────────

export type StepValidationRule =
  | { type: 'plate-exists'; plateType: PlateType }
  | { type: 'block-exists'; category: BlockCategory; onPlateType?: PlateType }
  | { type: 'connection-exists'; sourceCategory: EndpointType; targetCategory: EndpointType }
  | { type: 'entity-on-plate'; entityCategory: BlockCategory; plateType: PlateType }
  | { type: 'architecture-valid' }
  | { type: 'min-block-count'; category: BlockCategory; count: number }
  | { type: 'min-plate-count'; plateType: PlateType; count: number };

// ─── Architecture Snapshot ─────────────────────────────────

/** Reusable architecture snapshot type (without generated fields) */
export type ArchitectureSnapshot = Omit<ArchitectureModel, 'id' | 'createdAt' | 'updatedAt'>;

// ─── Scenario Step ─────────────────────────────────────────

export interface ScenarioStep {
  id: string;
  order: number;
  title: string;
  instruction: string;
  hints: string[];
  validationRules: StepValidationRule[];
  /** Optional architecture snapshot to restore when resetting this step */
  checkpoint?: ArchitectureSnapshot;
}

// ─── Scenario ──────────────────────────────────────────────

export interface Scenario {
  id: string;
  name: string;
  description: string;
  difficulty: ScenarioDifficulty;
  category: TemplateCategory;
  tags: string[];
  estimatedMinutes: number;
  steps: ScenarioStep[];
  /** The initial architecture state when starting this scenario */
  initialArchitecture: ArchitectureSnapshot;
}

// ─── Learning Progress ─────────────────────────────────────

export type StepStatus = 'locked' | 'active' | 'completed';

export interface StepProgress {
  stepId: string;
  status: StepStatus;
  hintsUsed: number;
  completedAt?: string; // ISO 8601
}

export interface LearningProgress {
  scenarioId: string;
  currentStepIndex: number;
  steps: StepProgress[];
  startedAt: string; // ISO 8601
  completedAt?: string; // ISO 8601
}

// ─── Learning Session State ────────────────────────────────

export interface LearningSessionState {
  /** Currently active scenario (null if no scenario is running) */
  activeScenario: Scenario | null;
  /** Progress for the current scenario */
  progress: LearningProgress | null;
  /** Currently displayed hint index (-1 = no hint shown) */
  currentHintIndex: number;
  /** Whether the current step's validation rules are all satisfied */
  isCurrentStepComplete: boolean;
}

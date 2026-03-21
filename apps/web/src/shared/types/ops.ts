// CloudBlocks Platform - DevOps Promotion & Rollback Types
// Milestone 18 - Promote/Rollback UX (Area C)

export type EnvironmentName = 'local' | 'staging' | 'production';

export interface PromotionRecord {
  id: string;
  fromEnvironment: EnvironmentName;
  toEnvironment: EnvironmentName;
  imageTag: string;
  commitSha: string;
  commitMessage: string;
  promotedBy: string;
  promotedAt: string;
  status: 'pending' | 'in_progress' | 'success' | 'failed';
}

export interface RollbackRecord {
  id: string;
  environment: EnvironmentName;
  fromImageTag: string;
  toImageTag: string;
  reason: string;
  rolledBackBy: string;
  rolledBackAt: string;
  status: 'pending' | 'in_progress' | 'success' | 'failed';
}

export interface PromotionChecklist {
  stagingHealthy: boolean;
  ciPassed: boolean;
  noActiveIncidents: boolean;
  manualApproval: boolean;
}

export interface DeploymentVersion {
  imageTag: string;
  commitSha: string;
  commitMessage: string;
  deployedAt: string;
  environment: EnvironmentName;
}

export interface MigrationPlan {
  id: string;
  name: string;
  description: string;
  sourceSystem: string;
  targetSystem: string;
  steps: MigrationStep[];
  estimatedDuration: number;
  status: MigrationStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface MigrationStep {
  id: string;
  name: string;
  description: string;
  type: MigrationStepType;
  order: number;
  status: MigrationStepStatus;
  data?: any;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface MigrationResult {
  id: string;
  planId: string;
  status: MigrationStatus;
  totalRecords: number;
  processedRecords: number;
  failedRecords: number;
  errors: MigrationError[];
  startedAt: Date;
  completedAt?: Date;
}

export interface MigrationError {
  recordId: string;
  error: string;
  step: string;
  timestamp: Date;
}

export interface MigrationTemplate {
  id: string;
  name: string;
  description: string;
  sourceSystem: string;
  targetSystem: string;
  estimatedDuration: number;
  steps: Omit<MigrationStep, "id" | "status" | "startedAt" | "completedAt">[];
}

export enum MigrationStatus {
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED"
}

export enum MigrationStepType {
  DATA_EXPORT = "DATA_EXPORT",
  DATA_TRANSFORM = "DATA_TRANSFORM",
  DATA_IMPORT = "DATA_IMPORT",
  VALIDATION = "VALIDATION",
  CLEANUP = "CLEANUP"
}

export enum MigrationStepStatus {
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  SKIPPED = "SKIPPED"
}

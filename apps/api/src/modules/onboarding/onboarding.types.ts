export interface OnboardingFlow {
  id: string;
  name: string;
  description: string;
  steps: OnboardingStep[];
  estimatedDuration: number; // in minutes
  version: string;
  progress?: UserProgress;
  currentStep?: OnboardingStep | null;
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  type: OnboardingStepType;
  order: number;
  required: boolean;
  estimatedTime: number; // in minutes
  data?: any;
}

export interface UserProgress {
  userId: string;
  completedSteps: number;
  skippedSteps: number;
  totalSteps: number;
  completionRate: number;
  lastUpdated: Date;
  steps: OnboardingProgress[];
}

export interface OnboardingProgress {
  userId: string;
  stepId: string;
  completed: boolean;
  skipped: boolean;
  completedAt?: Date;
  skippedAt?: Date;
  skipReason?: string;
  data?: any;
}

export interface TourStep {
  id: string;
  title: string;
  description: string;
  target: string; // CSS selector
  position: "top" | "bottom" | "left" | "right";
  content: string;
  order?: number;
}

export interface TourProgress {
  userId: string;
  tourId: string;
  startedAt: Date;
  completed: boolean;
  completedAt?: Date;
  currentStep: number;
  lastStepCompletedAt?: Date;
}

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

export interface PilotProgram {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  maxParticipants: number;
  currentParticipants: number;
  status: PilotStatus;
  features: string[];
  successCriteria: string[];
  metrics: PilotMetrics;
  createdAt: Date;
}

export interface PilotMetrics {
  totalParticipants: number;
  activeParticipants: number;
  completionRate: number;
  satisfactionScore: number;
  featureUsage: Record<string, number>;
  feedback: PilotFeedback[];
}

export interface PilotFeedback {
  participantId: string;
  rating: number;
  comments: string;
  suggestions: string[];
  submittedAt: Date;
}

export interface Runbook {
  id: string;
  name: string;
  description: string;
  category: RunbookCategory;
  severity: RunbookSeverity;
  steps: RunbookStep[];
  estimatedTime: number;
  lastUpdated: Date;
  version: string;
}

export interface RunbookStep {
  id: string;
  title: string;
  description: string;
  type: RunbookStepType;
  order: number;
  commands?: string[];
  checks?: string[];
  rollback?: string[];
}

export enum OnboardingStepType {
  WELCOME = "WELCOME",
  PROFILE_SETUP = "PROFILE_SETUP",
  TEAM_SETUP = "TEAM_SETUP",
  FIRST_REQUIREMENT = "FIRST_REQUIREMENT",
  INTEGRATIONS = "INTEGRATIONS",
  BILLING_SETUP = "BILLING_SETUP",
  COMPLETION = "COMPLETION"
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

export enum PilotStatus {
  PLANNING = "PLANNING",
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED"
}

export enum RunbookCategory {
  INCIDENT_RESPONSE = "INCIDENT_RESPONSE",
  DEPLOYMENT = "DEPLOYMENT",
  MAINTENANCE = "MAINTENANCE",
  TROUBLESHOOTING = "TROUBLESHOOTING",
  ONBOARDING = "ONBOARDING"
}

export enum RunbookSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL"
}

export enum RunbookStepType {
  COMMAND = "COMMAND",
  CHECK = "CHECK",
  MANUAL = "MANUAL",
  AUTOMATED = "AUTOMATED"
}

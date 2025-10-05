import { DocumentAssetType } from "@prisma/client";

export interface ResumeIngestionJob {
  tenantId: string;
  documentId: string;
  storageKey: string;
  fileName: string;
  contentType: string;
  source: "email" | "manual" | "upload";
  consultantId?: string;
  requirementId?: string;
  ingestionId?: string;
}

export interface RequirementIngestionJob {
  tenantId: string;
  ingestionId: string;
}

export interface IngestionQueuesConfig {
  resumeQueueName: string;
  requirementQueueName: string;
  webhookQueueName: string;
  syncQueueName: string;
  dlqSuffix: string;
  resumeConcurrency: number;
  requirementConcurrency: number;
  webhookConcurrency: number;
  syncConcurrency: number;
  defaultAttempts: number;
  backoffMs: number;
}

export interface EmailIngestionConfig {
  enabled: boolean;
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  password?: string;
  mailbox: string;
  pollIntervalMs: number;
  attachmentMimeWhitelist: string[];
  defaultTenantId?: string;
}

export interface SmtpConfig {
  enabled: boolean;
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  password?: string;
  from?: string;
}

export interface IngestionSloConfig {
  resumeMinutes: number;
  requirementMinutes: number;
}

export interface IngestionConfig {
  queues: IngestionQueuesConfig;
  email: EmailIngestionConfig;
  smtp: SmtpConfig;
  slo: IngestionSloConfig;
}

export interface NamedEntity {
  text: string;
  label: string;
  start: number;
  end: number;
}

export interface PiiFinding {
  token: string;
  value: string;
  type: string;
  start: number;
  end: number;
}

export interface PiiRedactionResult {
  redactedText: string;
  findings: PiiFinding[];
  vault: Array<{ token: string; ciphertext: string; type: string }>;
  counts: Record<string, number>;
}

export interface NormalizedResumeData {
  candidate: {
    firstName?: string;
    lastName?: string;
    fullName?: string;
    emails: string[];
    phones: string[];
    location?: string | null;
    headline?: string | null;
  };
  skills: string[];
  summary: string;
  matchedSkillIds: string[];
}

export interface ResumeProcessingOutcome {
  documentId: string;
  consultantId: string;
  requirementId?: string;
  duplicate: boolean;
  ingestionMillis?: number;
  piiFindingCount: number;
  normalized?: NormalizedResumeData;
}

export interface RequirementProcessingOutcome {
  ingestionId: string;
  requirementId: string;
  latencyMs?: number;
  created: boolean;
  updated: boolean;
}

export interface PiiTokenConfig {
  secret: string;
  tokenPrefix: string;
  tokenTtlHours: number;
}

export interface ResumeIngestionRequest {
  fileName: string;
  contentType: string;
  data: string;
  kind?: DocumentAssetType;
  consultantId?: string;
  requirementId?: string;
}

export interface RequirementIngestionRequest {
  content: string;
  source?: string;
}

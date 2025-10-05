export interface ComplianceRequest {
  id: string;
  tenantId: string;
  type: "DATA_EXPORT" | "DATA_ERASURE" | "DATA_RECTIFICATION" | "DATA_PORTABILITY";
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  requestedAt: Date;
  requestedBy: string;
  completedAt?: Date;
  processingTimeMs?: number;
  dataHash?: string;
  errorMessage?: string;
  metadata?: any;
  data?: any;
}

export interface DataRetentionPolicy {
  retentionDays: number;
  deleteAuditLogs: boolean;
  deleteAiActivities: boolean;
  deleteUsageRecords: boolean;
  archiveDocuments: boolean;
  anonymizePersonalData: boolean;
  complianceFramework: "GDPR" | "CCPA" | "SOC2" | "HIPAA";
}

export interface PrivacySettings {
  dataProcessingConsent: boolean;
  marketingConsent: boolean;
  analyticsConsent: boolean;
  dataSharingConsent: boolean;
  retentionPeriod: number; // days
  rightToErasure: boolean;
  dataPortability: boolean;
  automatedDecisionMaking: boolean;
  profilingConsent: boolean;
  thirdPartySharing: boolean;
  dataMinimization: boolean;
  purposeLimitation: boolean;
}

export interface SecurityAudit {
  tenantId: string;
  auditDate: Date;
  status: "PASSED" | "FAILED" | "WARNING";
  issues: SecurityIssue[];
  recommendations: string[];
  score: number; // 0-100
  nextAuditDate: Date;
}

export interface SecurityIssue {
  id: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  category: "ACCESS_CONTROL" | "DATA_PROTECTION" | "NETWORK_SECURITY" | "APPLICATION_SECURITY" | "COMPLIANCE";
  title: string;
  description: string;
  remediation: string;
  discoveredAt: Date;
  resolvedAt?: Date;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "ACCEPTED_RISK";
}

export interface SOC2ComplianceReport {
  tenantId: string;
  reportDate: Date;
  soc2Type: "Type I" | "Type II";
  overallCompliance: boolean;
  trustServiceCriteria: {
    security: ComplianceCheck;
    availability: ComplianceCheck;
    processingIntegrity: ComplianceCheck;
    confidentiality: ComplianceCheck;
    privacy: ComplianceCheck;
  };
  auditor: string;
  nextAuditDate: Date;
}

export interface ComplianceCheck {
  compliant: boolean;
  score: number;
  details: string;
  evidence: string[];
  gaps: string[];
  recommendations: string[];
}

export interface VulnerabilityScan {
  scanDate: Date;
  vulnerabilities: Vulnerability[];
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  totalVulnerabilities: number;
  recommendations: string[];
}

export interface Vulnerability {
  id: string;
  name: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  cvssScore: number;
  description: string;
  affectedComponents: string[];
  remediation: string;
  references: string[];
  discoveredAt: Date;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "ACCEPTED_RISK";
}

export interface DataClassification {
  level: "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";
  category: "PERSONAL_DATA" | "BUSINESS_DATA" | "TECHNICAL_DATA" | "FINANCIAL_DATA";
  retentionPeriod: number; // days
  encryptionRequired: boolean;
  accessControls: string[];
  handlingInstructions: string[];
}

export interface ConsentRecord {
  id: string;
  tenantId: string;
  userId: string;
  consentType: "DATA_PROCESSING" | "MARKETING" | "ANALYTICS" | "THIRD_PARTY_SHARING";
  granted: boolean;
  grantedAt: Date;
  withdrawnAt?: Date;
  legalBasis: "CONSENT" | "CONTRACT" | "LEGAL_OBLIGATION" | "VITAL_INTERESTS" | "PUBLIC_TASK" | "LEGITIMATE_INTERESTS";
  purpose: string;
  dataCategories: string[];
  retentionPeriod: number;
  version: string;
}

export interface DataProcessingActivity {
  id: string;
  tenantId: string;
  name: string;
  purpose: string;
  legalBasis: string;
  dataCategories: string[];
  dataSubjects: string[];
  recipients: string[];
  thirdCountryTransfers: boolean;
  retentionPeriod: number;
  securityMeasures: string[];
  dpoContact?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BreachNotification {
  id: string;
  tenantId: string;
  incidentDate: Date;
  discoveredDate: Date;
  reportedDate: Date;
  type: "DATA_BREACH" | "SECURITY_INCIDENT" | "UNAUTHORIZED_ACCESS" | "DATA_LOSS";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  affectedDataSubjects: number;
  affectedDataCategories: string[];
  cause: string;
  impact: string;
  containment: string;
  remediation: string;
  notificationRequired: boolean;
  authoritiesNotified: boolean;
  dataSubjectsNotified: boolean;
  status: "INVESTIGATING" | "CONTAINED" | "RESOLVED" | "CLOSED";
}

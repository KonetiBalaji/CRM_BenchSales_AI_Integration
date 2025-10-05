export interface WebhookEvent {
  id: string;
  tenantId: string;
  provider: string;
  type: string;
  payload: unknown;
  timestamp: Date;
  retryCount: number;
}

export interface SyncJob {
  id: string;
  tenantId: string;
  provider: string;
  direction: "inbound" | "outbound";
  entityType: string;
  entityId: string;
  status: "pending" | "processing" | "completed" | "failed";
  payload?: unknown;
  createdAt: Date;
  retryCount: number;
  errorMessage?: string;
}

export interface ConflictResolution {
  strategy: "local_wins" | "remote_wins" | "merge" | "manual";
  mergeData?: unknown;
  notes?: string;
  resolvedBy?: string;
}

export interface SyncConflict {
  id: string;
  tenantId: string;
  provider: string;
  entityType: string;
  entityId: string;
  localData: unknown;
  remoteData: unknown;
  conflictFields: string[];
  status: "pending" | "resolved" | "escalated";
  resolution?: ConflictResolution;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface ExternalSystemConfig {
  provider: string;
  tenantId: string;
  credentials: {
    apiKey?: string;
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    baseUrl: string;
  };
  syncSettings: {
    enabled: boolean;
    syncInterval: number; // minutes
    conflictResolution: "local_wins" | "remote_wins" | "manual";
    retryAttempts: number;
    batchSize: number;
  };
  fieldMappings: Record<string, string>;
  webhookSettings: {
    enabled: boolean;
    secret: string;
    events: string[];
  };
}

export interface SyncMetrics {
  tenantId: string;
  provider: string;
  period: string;
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  conflictsDetected: number;
  conflictsResolved: number;
  averageLatency: number;
  lastSyncAt: Date;
}

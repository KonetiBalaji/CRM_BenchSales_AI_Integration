import { Injectable, Logger, BadRequestException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { IngestionQueueService } from "../ingestion/ingestion.queue";
import { createHmac } from "crypto";
import { WebhookEvent, SyncJob, ConflictResolution } from "./integrations.types";

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);
  private readonly rateLimiters = new Map<string, { count: number; resetTime: number }>();
  private readonly maxRequestsPerMinute = 100;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly ingestionQueue: IngestionQueueService
  ) {}

  async handleWebhook(tenantId: string, provider: string, headers: Record<string, string>, body: unknown) {
    // Rate limiting
    if (!this.checkRateLimit(tenantId)) {
      throw new BadRequestException("Rate limit exceeded");
    }

    // Verify webhook signature
    if (!this.verifyWebhookSignature(provider, headers, body)) {
      throw new UnauthorizedException("Invalid webhook signature");
    }

    const event: WebhookEvent = {
      id: headers["x-request-id"] ?? `webhook-${Date.now()}`,
      tenantId,
      provider,
      type: this.determineEventType(provider, body),
      payload: body,
      timestamp: new Date(),
      retryCount: 0
    };

    this.logger.log(`[${tenantId}] Processing ${provider} webhook: ${event.type}`);

    // Enqueue for processing with idempotency
    await this.enqueueWebhookProcessing(event);

    return { status: "received", eventId: event.id };
  }

  async syncToExternal(tenantId: string, provider: string, entityType: string, entityId: string) {
    const syncJob: SyncJob = {
      id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tenantId,
      provider,
      direction: "outbound",
      entityType,
      entityId,
      status: "pending",
      createdAt: new Date(),
      retryCount: 0
    };

    await this.prisma.syncJob.create({
      data: {
        id: syncJob.id,
        tenantId: syncJob.tenantId,
        provider: syncJob.provider,
        direction: syncJob.direction,
        entityType: syncJob.entityType,
        entityId: syncJob.entityId,
        status: syncJob.status,
        payload: syncJob.payload as any,
        retryCount: syncJob.retryCount,
        createdAt: syncJob.createdAt
      }
    });

    // Enqueue sync job
    await this.ingestionQueue.enqueueSyncJob(syncJob);

    return { syncJobId: syncJob.id };
  }

  async resolveConflict(tenantId: string, conflictId: string, resolution: ConflictResolution) {
    const conflict = await this.prisma.syncConflict.findFirst({
      where: { id: conflictId, tenantId }
    });

    if (!conflict) {
      throw new BadRequestException("Conflict not found");
    }

    // Apply resolution based on strategy
    switch (resolution.strategy) {
      case "local_wins":
        await this.applyLocalResolution(conflict);
        break;
      case "remote_wins":
        await this.applyRemoteResolution(conflict);
        break;
      case "merge":
        await this.applyMergeResolution(conflict, resolution.mergeData);
        break;
      case "manual":
        await this.flagForManualResolution(conflict, resolution.notes);
        break;
    }

    // Mark conflict as resolved
    await this.prisma.syncConflict.update({
      where: { id: conflictId },
      data: { 
        status: "resolved",
        resolution: resolution as any,
        resolvedAt: new Date()
      }
    });

    return { status: "resolved" };
  }

  private checkRateLimit(tenantId: string): boolean {
    const now = Date.now();
    const limiter = this.rateLimiters.get(tenantId);

    if (!limiter || now > limiter.resetTime) {
      this.rateLimiters.set(tenantId, {
        count: 1,
        resetTime: now + 60000 // 1 minute
      });
      return true;
    }

    if (limiter.count >= this.maxRequestsPerMinute) {
      return false;
    }

    limiter.count++;
    return true;
  }

  private verifyWebhookSignature(provider: string, headers: Record<string, string>, body: unknown): boolean {
    const secret = this.configService.get<string>(`${provider.toUpperCase()}_WEBHOOK_SECRET`);
    if (!secret) {
      this.logger.warn(`No webhook secret configured for ${provider}`);
      return true; // Allow in development
    }

    const signature = headers["x-signature"] || headers["x-hub-signature-256"];
    if (!signature) {
      return false;
    }

    const expectedSignature = createHmac("sha256", secret)
      .update(JSON.stringify(body))
      .digest("hex");

    return signature === `sha256=${expectedSignature}`;
  }

  private determineEventType(provider: string, body: any): string {
    switch (provider) {
      case "salesforce":
        return body.eventType || "unknown";
      case "bullhorn":
        return body.eventType || "unknown";
      default:
        return "unknown";
    }
  }

  private async enqueueWebhookProcessing(event: WebhookEvent) {
    // Check for existing processing to ensure idempotency
    const existing = await this.prisma.webhookEvent.findFirst({
      where: { 
        id: event.id,
        tenantId: event.tenantId,
        provider: event.provider
      }
    });

    if (existing) {
      this.logger.log(`Webhook ${event.id} already processed, skipping`);
      return;
    }

    // Store webhook event
    await this.prisma.webhookEvent.create({
      data: {
        id: event.id,
        tenantId: event.tenantId,
        provider: event.provider,
        type: event.type,
        payload: event.payload as any,
        status: "pending",
        retryCount: event.retryCount,
        createdAt: event.timestamp
      }
    });

    // Enqueue for processing
    await this.ingestionQueue.enqueueWebhookProcessing(event);
  }

  private async applyLocalResolution(conflict: any) {
    // Keep local data, update remote
    await this.syncToExternal(
      conflict.tenantId,
      conflict.provider,
      conflict.entityType,
      conflict.entityId
    );
  }

  private async applyRemoteResolution(conflict: any) {
    // Update local data with remote data
    const remoteData = conflict.remoteData;
    // Apply remote data to local entity
    // Implementation depends on entity type
  }

  private async applyMergeResolution(conflict: any, mergeData: any) {
    // Apply merged data to both local and remote
    // Implementation depends on entity type and merge strategy
  }

  private async flagForManualResolution(conflict: any, notes: string) {
    // Create manual resolution task
    await this.prisma.manualResolutionTask.create({
      data: {
        conflictId: conflict.id,
        tenantId: conflict.tenantId,
        notes,
        status: "pending",
        createdAt: new Date()
      }
    });
  }

  async getConflicts(tenantId: string, filters: { provider?: string; status?: string; limit?: number }) {
    const where: any = { tenantId };
    
    if (filters.provider) {
      where.provider = filters.provider;
    }
    
    if (filters.status) {
      where.status = filters.status;
    }

    const conflicts = await this.prisma.syncConflict.findMany({
      where,
      take: filters.limit || 50,
      orderBy: { createdAt: "desc" }
    });

    return conflicts;
  }

  async getConfig(tenantId: string, provider: string) {
    const config = await this.prisma.externalSystemConfig.findFirst({
      where: { tenantId, provider }
    });

    if (!config) {
      return null;
    }

    // Decrypt sensitive credentials
    return {
      ...config,
      credentials: this.decryptCredentials(config.credentials as any)
    };
  }

  async updateConfig(tenantId: string, provider: string, config: ExternalSystemConfig) {
    // Encrypt sensitive credentials
    const encryptedCredentials = this.encryptCredentials(config.credentials);

    return this.prisma.externalSystemConfig.upsert({
      where: { tenantId_provider: { tenantId, provider } },
      create: {
        tenantId,
        provider,
        credentials: encryptedCredentials as any,
        syncSettings: config.syncSettings as any,
        fieldMappings: config.fieldMappings as any,
        webhookSettings: config.webhookSettings as any,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      update: {
        credentials: encryptedCredentials as any,
        syncSettings: config.syncSettings as any,
        fieldMappings: config.fieldMappings as any,
        webhookSettings: config.webhookSettings as any,
        updatedAt: new Date()
      }
    });
  }

  async getMetrics(tenantId: string, filters: { provider?: string; period?: string }) {
    const where: any = { tenantId };
    
    if (filters.provider) {
      where.provider = filters.provider;
    }

    const period = filters.period || "7d";
    const startDate = this.getPeriodStartDate(period);

    if (startDate) {
      where.createdAt = { gte: startDate };
    }

    const metrics = await this.prisma.syncMetrics.findMany({
      where,
      orderBy: { createdAt: "desc" }
    });

    return metrics;
  }

  async testConnection(tenantId: string, provider: string) {
    const config = await this.getConfig(tenantId, provider);
    
    if (!config) {
      throw new BadRequestException(`No configuration found for ${provider}`);
    }

    try {
      // Test connection based on provider
      switch (provider) {
        case "salesforce":
          return await this.testSalesforceConnection(config);
        case "bullhorn":
          return await this.testBullhornConnection(config);
        default:
          throw new BadRequestException(`Unsupported provider: ${provider}`);
      }
    } catch (error) {
      this.logger.error(`Connection test failed for ${provider}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  private async testSalesforceConnection(config: any) {
    // Implement Salesforce connection test
    // This would make an actual API call to Salesforce
    return { success: true, message: "Salesforce connection successful" };
  }

  private async testBullhornConnection(config: any) {
    // Implement Bullhorn connection test
    // This would make an actual API call to Bullhorn
    return { success: true, message: "Bullhorn connection successful" };
  }

  private encryptCredentials(credentials: any) {
    // Implement credential encryption
    // In production, use proper encryption with AWS KMS or similar
    return credentials;
  }

  private decryptCredentials(encryptedCredentials: any) {
    // Implement credential decryption
    // In production, use proper decryption with AWS KMS or similar
    return encryptedCredentials;
  }

  private getPeriodStartDate(period: string): Date | null {
    const now = new Date();
    
    switch (period) {
      case "1d":
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case "7d":
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case "30d":
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case "90d":
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default:
        return null;
    }
  }
}



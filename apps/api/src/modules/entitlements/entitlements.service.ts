import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { UsageMetrics, CostGuardrail } from "../billing/billing.types";

export type Plan = "FREE" | "TEAM" | "ENTERPRISE";

@Injectable()
export class EntitlementsService {
  private readonly logger = new Logger(EntitlementsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {}

  async getTenantPlan(tenantId: string): Promise<Plan> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { tenantId }
    });

    if (!subscription) {
      return tenantId.startsWith("demo") ? "TEAM" : "FREE";
    }

    return subscription.plan as Plan;
  }

  async isAllowed(tenantId: string, feature: string): Promise<boolean> {
    const plan = await this.getTenantPlan(tenantId);
    
    // Enterprise has access to everything
    if (plan === "ENTERPRISE") return true;
    
    // Check feature-specific restrictions
    const featureRestrictions = {
      FREE: new Set(["llm_rerank", "advanced_export", "custom_integrations", "priority_support"]),
      TEAM: new Set(["custom_integrations", "priority_support"]),
      ENTERPRISE: new Set()
    };

    return !featureRestrictions[plan].has(feature);
  }

  async checkUsageLimits(tenantId: string, usage: UsageMetrics): Promise<{ allowed: boolean; reason?: string }> {
    const plan = await this.getTenantPlan(tenantId);
    const currentUsage = await this.getCurrentUsage(tenantId);
    
    const limits = this.getPlanLimits(plan);
    
    // Check each usage type
    const totalUsage = {
      embeddings: currentUsage.embeddings + usage.embeddings,
      llmTokens: currentUsage.llmTokens + usage.llmTokens,
      apiCalls: currentUsage.apiCalls + usage.apiCalls,
      storageBytes: currentUsage.storageBytes + usage.storageBytes
    };

    if (totalUsage.embeddings > limits.embeddings) {
      return { allowed: false, reason: `Embedding limit exceeded: ${totalUsage.embeddings}/${limits.embeddings}` };
    }

    if (totalUsage.llmTokens > limits.llmTokens) {
      return { allowed: false, reason: `LLM token limit exceeded: ${totalUsage.llmTokens}/${limits.llmTokens}` };
    }

    if (totalUsage.apiCalls > limits.apiCalls) {
      return { allowed: false, reason: `API call limit exceeded: ${totalUsage.apiCalls}/${limits.apiCalls}` };
    }

    if (totalUsage.storageBytes > limits.storageBytes) {
      return { allowed: false, reason: `Storage limit exceeded: ${totalUsage.storageBytes}/${limits.storageBytes}` };
    }

    return { allowed: true };
  }

  async checkCostGuardrails(tenantId: string, estimatedCost: number): Promise<{ allowed: boolean; reason?: string }> {
    const guardrail = await this.getCostGuardrail(tenantId);
    
    if (!guardrail || guardrail.status === "disabled") {
      return { allowed: true };
    }

    const currentSpend = await this.getCurrentMonthSpend(tenantId);
    const projectedSpend = currentSpend + estimatedCost;

    if (projectedSpend > guardrail.monthlyBudget) {
      return { 
        allowed: false, 
        reason: `Monthly budget exceeded: $${projectedSpend.toFixed(2)}/${guardrail.monthlyBudget}` 
      };
    }

    // Check alert threshold
    const threshold = guardrail.monthlyBudget * (guardrail.alertThreshold / 100);
    if (projectedSpend > threshold && (!guardrail.lastAlertSent || this.shouldSendAlert(guardrail.lastAlertSent))) {
      await this.sendCostAlert(tenantId, projectedSpend, guardrail.monthlyBudget);
    }

    return { allowed: true };
  }

  async setCostGuardrail(tenantId: string, guardrail: Partial<CostGuardrail>) {
    await this.prisma.costGuardrail.upsert({
      where: { tenantId },
      create: {
        tenantId,
        monthlyBudget: guardrail.monthlyBudget || 1000,
        alertThreshold: guardrail.alertThreshold || 80,
        currentSpend: 0,
        status: guardrail.status || "active",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      update: {
        monthlyBudget: guardrail.monthlyBudget,
        alertThreshold: guardrail.alertThreshold,
        status: guardrail.status,
        updatedAt: new Date()
      }
    });
  }

  async getCostGuardrail(tenantId: string): Promise<CostGuardrail | null> {
    const guardrail = await this.prisma.costGuardrail.findFirst({
      where: { tenantId }
    });

    return guardrail;
  }

  private async getCurrentUsage(tenantId: string): Promise<UsageMetrics> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const usage = await this.prisma.usageRecord.aggregate({
      where: {
        tenantId,
        period: { gte: startOfMonth }
      },
      _sum: {
        embeddings: true,
        llmTokens: true,
        apiCalls: true,
        storageBytes: true
      }
    });

    return {
      embeddings: usage._sum.embeddings || 0,
      llmTokens: usage._sum.llmTokens || 0,
      apiCalls: usage._sum.apiCalls || 0,
      storageBytes: usage._sum.storageBytes || 0
    };
  }

  private async getCurrentMonthSpend(tenantId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const usage = await this.getCurrentUsage(tenantId);
    const plan = await this.getTenantPlan(tenantId);
    const planDetails = this.getPlanDetails(plan);
    
    return this.calculateUsageCosts(usage, planDetails);
  }

  private getPlanLimits(plan: Plan) {
    const limits = {
      FREE: {
        embeddings: 1000,
        llmTokens: 10000,
        apiCalls: 1000,
        storageBytes: 100 * 1024 * 1024 // 100MB
      },
      TEAM: {
        embeddings: 100000,
        llmTokens: 1000000,
        apiCalls: 100000,
        storageBytes: 10 * 1024 * 1024 * 1024 // 10GB
      },
      ENTERPRISE: {
        embeddings: 1000000,
        llmTokens: 10000000,
        apiCalls: 1000000,
        storageBytes: 100 * 1024 * 1024 * 1024 // 100GB
      }
    };

    return limits[plan];
  }

  private getPlanDetails(plan: Plan) {
    const plans = {
      FREE: { basePrice: 0, usageLimits: this.getPlanLimits(plan) },
      TEAM: { basePrice: 99, usageLimits: this.getPlanLimits(plan) },
      ENTERPRISE: { basePrice: 499, usageLimits: this.getPlanLimits(plan) }
    };

    return plans[plan];
  }

  private calculateUsageCosts(usage: UsageMetrics, plan: any): number {
    const costs = {
      embeddings: Math.max(0, usage.embeddings - plan.usageLimits.embeddings) * 0.0001,
      llmTokens: Math.max(0, usage.llmTokens - plan.usageLimits.llmTokens) * 0.00001,
      apiCalls: Math.max(0, usage.apiCalls - plan.usageLimits.apiCalls) * 0.001,
      storageBytes: Math.max(0, usage.storageBytes - plan.usageLimits.storageBytes) * 0.0000001
    };

    return costs.embeddings + costs.llmTokens + costs.apiCalls + costs.storageBytes;
  }

  private shouldSendAlert(lastAlertSent: Date): boolean {
    const now = new Date();
    const hoursSinceLastAlert = (now.getTime() - lastAlertSent.getTime()) / (1000 * 60 * 60);
    return hoursSinceLastAlert >= 24; // Send alert at most once per day
  }

  private async sendCostAlert(tenantId: string, currentSpend: number, budget: number) {
    // Update last alert sent timestamp
    await this.prisma.costGuardrail.updateMany({
      where: { tenantId },
      data: { lastAlertSent: new Date() }
    });

    // Create notification (this would integrate with the notifications service)
    this.logger.warn(`Cost alert for tenant ${tenantId}: $${currentSpend.toFixed(2)} spent of $${budget} budget`);
    
    // In a real implementation, this would send an email/Slack notification
  }
}




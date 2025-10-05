import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import Stripe from "stripe";
import { BillingPlan, UsageMetrics, BillingReport, SubscriptionStatus } from "./billing.types";

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {
    const stripeSecretKey = this.configService.get<string>("stripeSecretKey");
    this.webhookSecret = this.configService.get<string>("stripeWebhookSecret") ?? "";
    
    if (!stripeSecretKey) {
      this.logger.warn("Stripe secret key not configured - billing features disabled");
    } else {
      this.stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });
    }
  }

  async createSubscription(tenantId: string, plan: BillingPlan, customerEmail: string) {
    if (!this.stripe) {
      throw new BadRequestException("Billing service not configured");
    }

    try {
      // Create or retrieve Stripe customer
      const customers = await this.stripe.customers.list({ email: customerEmail, limit: 1 });
      let customer = customers.data[0];
      
      if (!customer) {
        customer = await this.stripe.customers.create({
          email: customerEmail,
          metadata: { tenantId }
        });
      }

      // Create subscription
      const subscription = await this.stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: plan.priceId }],
        metadata: { tenantId },
        trial_period_days: plan.trialDays || 0
      });

      // Store subscription in database
      await this.prisma.subscription.create({
        data: {
          tenantId,
          stripeCustomerId: customer.id,
          stripeSubscriptionId: subscription.id,
          plan: plan.name,
          status: subscription.status as SubscriptionStatus,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      return {
        subscriptionId: subscription.id,
        customerId: customer.id,
        status: subscription.status
      };
    } catch (error) {
      this.logger.error(`Failed to create subscription for tenant ${tenantId}:`, error);
      throw new BadRequestException("Failed to create subscription");
    }
  }

  async updateSubscription(tenantId: string, newPlan: BillingPlan) {
    if (!this.stripe) {
      throw new BadRequestException("Billing service not configured");
    }

    const subscription = await this.prisma.subscription.findFirst({
      where: { tenantId }
    });

    if (!subscription) {
      throw new BadRequestException("No active subscription found");
    }

    try {
      const stripeSubscription = await this.stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
      
      await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        items: [{
          id: stripeSubscription.items.data[0].id,
          price: newPlan.priceId
        }],
        proration_behavior: "create_prorations"
      });

      // Update local subscription
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          plan: newPlan.name,
          updatedAt: new Date()
        }
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to update subscription for tenant ${tenantId}:`, error);
      throw new BadRequestException("Failed to update subscription");
    }
  }

  async cancelSubscription(tenantId: string, immediately = false) {
    if (!this.stripe) {
      throw new BadRequestException("Billing service not configured");
    }

    const subscription = await this.prisma.subscription.findFirst({
      where: { tenantId }
    });

    if (!subscription) {
      throw new BadRequestException("No active subscription found");
    }

    try {
      if (immediately) {
        await this.stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
      } else {
        await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          cancel_at_period_end: true
        });
      }

      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: immediately ? "canceled" : "cancel_at_period_end",
          updatedAt: new Date()
        }
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to cancel subscription for tenant ${tenantId}:`, error);
      throw new BadRequestException("Failed to cancel subscription");
    }
  }

  async recordUsage(tenantId: string, usage: UsageMetrics) {
    await this.prisma.usageRecord.create({
      data: {
        tenantId,
        embeddings: usage.embeddings,
        llmTokens: usage.llmTokens,
        apiCalls: usage.apiCalls,
        storageBytes: usage.storageBytes,
        period: new Date(),
        createdAt: new Date()
      }
    });

    // Check if usage exceeds plan limits and trigger alerts
    await this.checkUsageLimits(tenantId, usage);
  }

  async getUsageMetrics(tenantId: string, period: string = "current"): Promise<UsageMetrics> {
    const startDate = this.getPeriodStartDate(period);
    
    const usage = await this.prisma.usageRecord.aggregate({
      where: {
        tenantId,
        period: { gte: startDate }
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

  async generateInvoice(tenantId: string, period: string = "current"): Promise<BillingReport> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { tenantId }
    });

    if (!subscription) {
      throw new BadRequestException("No active subscription found");
    }

    const usage = await this.getUsageMetrics(tenantId, period);
    const plan = this.getPlanDetails(subscription.plan);
    
    // Calculate costs
    const baseCost = plan.basePrice;
    const usageCosts = this.calculateUsageCosts(usage, plan);
    const totalCost = baseCost + usageCosts.total;

    return {
      tenantId,
      period,
      subscription: {
        plan: subscription.plan,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd
      },
      usage,
      costs: {
        base: baseCost,
        usage: usageCosts,
        total: totalCost
      },
      generatedAt: new Date()
    };
  }

  async handleWebhook(payload: any, signature: string) {
    if (!this.stripe || !this.webhookSecret) {
      throw new BadRequestException("Webhook handling not configured");
    }

    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);
      
      switch (event.type) {
        case "invoice.payment_succeeded":
          await this.handlePaymentSucceeded(event.data.object);
          break;
        case "invoice.payment_failed":
          await this.handlePaymentFailed(event.data.object);
          break;
        case "customer.subscription.updated":
          await this.handleSubscriptionUpdated(event.data.object);
          break;
        case "customer.subscription.deleted":
          await this.handleSubscriptionDeleted(event.data.object);
          break;
      }

      return { received: true };
    } catch (error) {
      this.logger.error("Webhook signature verification failed:", error);
      throw new BadRequestException("Invalid webhook signature");
    }
  }

  private async checkUsageLimits(tenantId: string, usage: UsageMetrics) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { tenantId }
    });

    if (!subscription) return;

    const plan = this.getPlanDetails(subscription.plan);
    const currentUsage = await this.getUsageMetrics(tenantId, "current");

    // Check if usage exceeds limits
    const limits = plan.usageLimits;
    const alerts = [];

    if (currentUsage.embeddings > limits.embeddings * 0.9) {
      alerts.push({ type: "embeddings", usage: currentUsage.embeddings, limit: limits.embeddings });
    }

    if (currentUsage.llmTokens > limits.llmTokens * 0.9) {
      alerts.push({ type: "llmTokens", usage: currentUsage.llmTokens, limit: limits.llmTokens });
    }

    if (alerts.length > 0) {
      await this.createUsageAlert(tenantId, alerts);
    }
  }

  private async createUsageAlert(tenantId: string, alerts: any[]) {
    await this.prisma.usageAlert.create({
      data: {
        tenantId,
        alerts: alerts as any,
        status: "active",
        createdAt: new Date()
      }
    });
  }

  private getPlanDetails(planName: string) {
    const plans = {
      FREE: {
        name: "FREE",
        basePrice: 0,
        priceId: null,
        trialDays: 0,
        usageLimits: {
          embeddings: 1000,
          llmTokens: 10000,
          apiCalls: 1000,
          storageBytes: 100 * 1024 * 1024 // 100MB
        }
      },
      TEAM: {
        name: "TEAM",
        basePrice: 99,
        priceId: "price_team_monthly",
        trialDays: 14,
        usageLimits: {
          embeddings: 100000,
          llmTokens: 1000000,
          apiCalls: 100000,
          storageBytes: 10 * 1024 * 1024 * 1024 // 10GB
        }
      },
      ENTERPRISE: {
        name: "ENTERPRISE",
        basePrice: 499,
        priceId: "price_enterprise_monthly",
        trialDays: 30,
        usageLimits: {
          embeddings: 1000000,
          llmTokens: 10000000,
          apiCalls: 1000000,
          storageBytes: 100 * 1024 * 1024 * 1024 // 100GB
        }
      }
    };

    return plans[planName as keyof typeof plans] || plans.FREE;
  }

  private calculateUsageCosts(usage: UsageMetrics, plan: any) {
    const costs = {
      embeddings: Math.max(0, usage.embeddings - plan.usageLimits.embeddings) * 0.0001,
      llmTokens: Math.max(0, usage.llmTokens - plan.usageLimits.llmTokens) * 0.00001,
      apiCalls: Math.max(0, usage.apiCalls - plan.usageLimits.apiCalls) * 0.001,
      storageBytes: Math.max(0, usage.storageBytes - plan.usageLimits.storageBytes) * 0.0000001,
      total: 0
    };

    costs.total = costs.embeddings + costs.llmTokens + costs.apiCalls + costs.storageBytes;
    return costs;
  }

  private getPeriodStartDate(period: string): Date {
    const now = new Date();
    
    switch (period) {
      case "current":
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case "previous":
        return new Date(now.getFullYear(), now.getMonth() - 1, 1);
      case "year":
        return new Date(now.getFullYear(), 0, 1);
      default:
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }
  }

  private async handlePaymentSucceeded(invoice: any) {
    // Update subscription status
    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: invoice.subscription },
      data: { status: "active", updatedAt: new Date() }
    });
  }

  private async handlePaymentFailed(invoice: any) {
    // Update subscription status and create alert
    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: invoice.subscription },
      data: { status: "past_due", updatedAt: new Date() }
    });
  }

  private async handleSubscriptionUpdated(subscription: any) {
    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        updatedAt: new Date()
      }
    });
  }

  private async handleSubscriptionDeleted(subscription: any) {
    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: { status: "canceled", updatedAt: new Date() }
    });
  }
}



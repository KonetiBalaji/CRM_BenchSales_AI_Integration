/**
 * @fileoverview Billing Types and Interfaces
 * 
 * This file contains type definitions and interfaces for billing and subscription management
 * in the CRM BenchSales AI Integration application. It defines the structure for billing plans,
 * usage metrics, subscription management, and cost tracking functionality.
 * 
 * Key types:
 * - BillingPlan: Subscription plan configuration
 * - UsageMetrics: Usage tracking data
 * - BillingReport: Comprehensive billing reports
 * - SubscriptionStatus: Stripe subscription states
 * - CostGuardrail: Budget and spending controls
 * 
 * @author Balaji Koneti
 * @email balaji.koneti08@gmail.com
 * @linkedin linkedin.com/in/balaji-koneti
 * @version 1.0.0
 * @since 2024
 */

/**
 * Interface defining a billing plan configuration.
 * 
 * This interface represents a subscription plan with pricing, usage limits,
 * and Stripe integration details.
 * 
 * @example
 * ```typescript
 * const teamPlan: BillingPlan = {
 *   name: "TEAM",
 *   basePrice: 99,
 *   priceId: "price_team_monthly",
 *   trialDays: 14,
 *   usageLimits: {
 *     embeddings: 100000,
 *     llmTokens: 1000000,
 *     apiCalls: 100000,
 *     storageBytes: 10737418240 // 10GB
 *   }
 * };
 * ```
 */
export interface BillingPlan {
  /** Plan name identifier (e.g., "FREE", "TEAM", "ENTERPRISE") */
  name: string;
  /** Base monthly price in USD */
  basePrice: number;
  /** Stripe price ID for subscription creation */
  priceId: string | null;
  /** Number of trial days for new subscriptions */
  trialDays?: number;
  /** Usage limits for the plan */
  usageLimits: {
    /** Maximum embeddings per month */
    embeddings: number;
    /** Maximum LLM tokens per month */
    llmTokens: number;
    /** Maximum API calls per month */
    apiCalls: number;
    /** Maximum storage in bytes per month */
    storageBytes: number;
  };
}

/**
 * Interface defining usage metrics for billing and monitoring.
 * 
 * This interface tracks various usage metrics that are used for billing
 * calculations and usage limit enforcement.
 * 
 * @example
 * ```typescript
 * const usage: UsageMetrics = {
 *   embeddings: 50000,
 *   llmTokens: 200000,
 *   apiCalls: 15000,
 *   storageBytes: 5368709120 // 5GB
 * };
 * ```
 */
export interface UsageMetrics {
  /** Number of embeddings generated */
  embeddings: number;
  /** Number of LLM tokens consumed */
  llmTokens: number;
  /** Number of API calls made */
  apiCalls: number;
  /** Storage usage in bytes */
  storageBytes: number;
}

/**
 * Interface defining usage-based cost calculations.
 * 
 * This interface represents the cost breakdown for usage that exceeds
 * plan limits, calculated based on overage rates.
 * 
 * @example
 * ```typescript
 * const costs: UsageCosts = {
 *   embeddings: 5.00,
 *   llmTokens: 2.50,
 *   apiCalls: 1.00,
 *   storageBytes: 0.50,
 *   total: 9.00
 * };
 * ```
 */
export interface UsageCosts {
  /** Cost for embedding overages */
  embeddings: number;
  /** Cost for LLM token overages */
  llmTokens: number;
  /** Cost for API call overages */
  apiCalls: number;
  /** Cost for storage overages */
  storageBytes: number;
  /** Total overage cost */
  total: number;
}

/**
 * Interface defining a comprehensive billing report.
 * 
 * This interface represents a complete billing report including subscription
 * details, usage metrics, cost breakdown, and billing period information.
 * 
 * @example
 * ```typescript
 * const report: BillingReport = {
 *   tenantId: "tenant-123",
 *   period: "current",
 *   subscription: {
 *     plan: "TEAM",
 *     status: "active",
 *     currentPeriodStart: new Date("2024-01-01"),
 *     currentPeriodEnd: new Date("2024-01-31")
 *   },
 *   usage: { embeddings: 50000, llmTokens: 200000, apiCalls: 15000, storageBytes: 5368709120 },
 *   costs: { base: 99, usage: { embeddings: 0, llmTokens: 0, apiCalls: 0, storageBytes: 0, total: 0 }, total: 99 },
 *   generatedAt: new Date()
 * };
 * ```
 */
export interface BillingReport {
  /** Tenant identifier */
  tenantId: string;
  /** Billing period identifier */
  period: string;
  /** Subscription details */
  subscription: {
    /** Plan name */
    plan: string;
    /** Current subscription status */
    status: SubscriptionStatus;
    /** Current period start date */
    currentPeriodStart: Date;
    /** Current period end date */
    currentPeriodEnd: Date;
  };
  /** Usage metrics for the period */
  usage: UsageMetrics;
  /** Cost breakdown */
  costs: {
    /** Base plan cost */
    base: number;
    /** Usage-based costs */
    usage: UsageCosts;
    /** Total cost */
    total: number;
  };
  /** Report generation timestamp */
  generatedAt: Date;
}

/**
 * Union type defining possible Stripe subscription statuses.
 * 
 * This type represents all possible subscription states from Stripe,
 * used for tracking subscription lifecycle and billing status.
 */
export type SubscriptionStatus = 
  | "active"           // Subscription is active and payments are current
  | "canceled"         // Subscription has been canceled
  | "incomplete"       // Subscription is incomplete (payment method needed)
  | "incomplete_expired" // Incomplete subscription has expired
  | "past_due"         // Payment failed, subscription is past due
  | "trialing"         // Subscription is in trial period
  | "unpaid"           // Subscription is unpaid
  | "cancel_at_period_end"; // Subscription will cancel at period end

/**
 * Interface defining usage alerts for limit monitoring.
 * 
 * This interface represents alerts generated when usage approaches
 * or exceeds plan limits.
 * 
 * @example
 * ```typescript
 * const alert: UsageAlert = {
 *   id: "alert-123",
 *   tenantId: "tenant-123",
 *   alerts: [
 *     { type: "embeddings", usage: 95000, limit: 100000 },
 *     { type: "llmTokens", usage: 900000, limit: 1000000 }
 *   ],
 *   status: "active",
 *   createdAt: new Date()
 * };
 * ```
 */
export interface UsageAlert {
  /** Alert identifier */
  id: string;
  /** Tenant identifier */
  tenantId: string;
  /** Array of usage alerts */
  alerts: Array<{
    /** Type of usage (embeddings, llmTokens, etc.) */
    type: string;
    /** Current usage amount */
    usage: number;
    /** Usage limit */
    limit: number;
  }>;
  /** Alert status */
  status: "active" | "resolved";
  /** Alert creation timestamp */
  createdAt: Date;
  /** Alert resolution timestamp (optional) */
  resolvedAt?: Date;
}

/**
 * Interface defining subscription database record.
 * 
 * This interface represents a subscription record stored in the database,
 * linking tenant information with Stripe subscription details.
 * 
 * @example
 * ```typescript
 * const subscription: Subscription = {
 *   id: "sub-123",
 *   tenantId: "tenant-123",
 *   stripeCustomerId: "cus_1234567890",
 *   stripeSubscriptionId: "sub_1234567890",
 *   plan: "TEAM",
 *   status: "active",
 *   currentPeriodStart: new Date("2024-01-01"),
 *   currentPeriodEnd: new Date("2024-01-31"),
 *   createdAt: new Date("2024-01-01"),
 *   updatedAt: new Date("2024-01-15")
 * };
 * ```
 */
export interface Subscription {
  /** Database record ID */
  id: string;
  /** Tenant identifier */
  tenantId: string;
  /** Stripe customer ID */
  stripeCustomerId: string;
  /** Stripe subscription ID */
  stripeSubscriptionId: string;
  /** Plan name */
  plan: string;
  /** Current subscription status */
  status: SubscriptionStatus;
  /** Current period start date */
  currentPeriodStart: Date;
  /** Current period end date */
  currentPeriodEnd: Date;
  /** Record creation timestamp */
  createdAt: Date;
  /** Record last update timestamp */
  updatedAt: Date;
}

/**
 * Interface defining usage record database entry.
 * 
 * This interface represents a usage record stored in the database
 * for tracking and billing purposes.
 * 
 * @example
 * ```typescript
 * const usageRecord: UsageRecord = {
 *   id: "usage-123",
 *   tenantId: "tenant-123",
 *   embeddings: 1000,
 *   llmTokens: 5000,
 *   apiCalls: 100,
 *   storageBytes: 1048576,
 *   period: new Date("2024-01-15"),
 *   createdAt: new Date("2024-01-15T10:30:00")
 * };
 * ```
 */
export interface UsageRecord {
  /** Database record ID */
  id: string;
  /** Tenant identifier */
  tenantId: string;
  /** Embeddings used */
  embeddings: number;
  /** LLM tokens consumed */
  llmTokens: number;
  /** API calls made */
  apiCalls: number;
  /** Storage used in bytes */
  storageBytes: number;
  /** Usage period date */
  period: Date;
  /** Record creation timestamp */
  createdAt: Date;
}

/**
 * Interface defining cost guardrails for budget control.
 * 
 * This interface represents budget controls and spending limits
 * to prevent unexpected costs and provide spending alerts.
 * 
 * @example
 * ```typescript
 * const guardrail: CostGuardrail = {
 *   tenantId: "tenant-123",
 *   monthlyBudget: 500,
 *   alertThreshold: 80,
 *   currentSpend: 350,
 *   lastAlertSent: new Date("2024-01-10"),
 *   status: "active"
 * };
 * ```
 */
export interface CostGuardrail {
  /** Tenant identifier */
  tenantId: string;
  /** Monthly budget limit in USD */
  monthlyBudget: number;
  /** Alert threshold percentage (0-100) */
  alertThreshold: number;
  /** Current spending amount */
  currentSpend: number;
  /** Last alert sent timestamp (optional) */
  lastAlertSent?: Date;
  /** Guardrail status */
  status: "active" | "exceeded" | "disabled";
}

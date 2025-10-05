/**
 * @fileoverview Billing Controller
 * 
 * This controller provides billing and subscription management endpoints for the CRM BenchSales AI Integration application.
 * It handles subscription lifecycle management, usage tracking, billing reports, and Stripe webhook integration
 * for comprehensive billing functionality with role-based access control.
 * 
 * Key features:
 * - Subscription creation, updates, and cancellation
 * - Usage metrics tracking and reporting
 * - Billing report generation
 * - Stripe webhook handling for payment events
 * - Role-based access control for billing operations
 * - Tenant-scoped billing management
 * 
 * @author Balaji Koneti
 * @email balaji.koneti08@gmail.com
 * @linkedin linkedin.com/in/balaji-koneti
 * @version 1.0.0
 * @since 2024
 */

import { Body, Controller, Get, Headers, Param, Post, Put, Query } from "@nestjs/common";
import { UserRole } from "@prisma/client";

import { Roles } from "../auth/decorators/roles.decorator";
import { BillingService } from "./billing.service";
import { BillingPlan, UsageMetrics } from "./billing.types";

/**
 * Controller for billing and subscription management functionality.
 * 
 * This controller provides comprehensive billing capabilities including subscription
 * management, usage tracking, billing reports, and Stripe webhook integration.
 * All endpoints are tenant-scoped and protected by role-based access control.
 * 
 * @example
 * ```typescript
 * // Create a new subscription
 * POST /tenants/{tenantId}/billing/subscription
 * {
 *   "plan": { "name": "TEAM", "basePrice": 99, "priceId": "price_team_monthly" },
 *   "customerEmail": "customer@example.com"
 * }
 * 
 * // Get usage metrics
 * GET /tenants/{tenantId}/billing/usage?period=current
 * 
 * // Generate billing report
 * GET /tenants/{tenantId}/billing/report?period=current
 * ```
 */
@Controller("tenants/:tenantId/billing")
export class BillingController {
  /**
   * Initializes the billing controller with the service dependency.
   * 
   * @param billing - The billing service for business logic
   */
  constructor(private readonly billing: BillingService) {}

  /**
   * Generates a comprehensive billing report for the tenant.
   * 
   * This endpoint creates a detailed billing report including subscription details,
   * usage metrics, cost breakdown, and billing period information.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param period - Billing period (current, previous, year)
   * @returns Comprehensive billing report with costs and usage
   * 
   * @example
   * ```typescript
   * // Response format
   * {
   *   "tenantId": "tenant-123",
   *   "period": "current",
   *   "subscription": {
   *     "plan": "TEAM",
   *     "status": "active",
   *     "currentPeriodStart": "2024-01-01T00:00:00.000Z",
   *     "currentPeriodEnd": "2024-01-31T23:59:59.999Z"
   *   },
   *   "usage": {
   *     "embeddings": 50000,
   *     "llmTokens": 200000,
   *     "apiCalls": 15000,
   *     "storageBytes": 5368709120
   *   },
   *   "costs": {
   *     "base": 99,
   *     "usage": { "embeddings": 0, "llmTokens": 0, "apiCalls": 0, "storageBytes": 0, "total": 0 },
   *     "total": 99
   *   },
   *   "generatedAt": "2024-01-15T10:30:00.000Z"
   * }
   * ```
   */
  @Get("report")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  report(@Param("tenantId") tenantId: string, @Query("period") period?: string) {
    return this.billing.generateInvoice(tenantId, period);
  }

  /**
   * Creates a new subscription for the tenant.
   * 
   * This endpoint creates a new Stripe subscription with the specified plan
   * and customer email. It handles customer creation if needed and sets up
   * the subscription with trial periods if applicable.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param body - Request body containing subscription details
   * @param body.plan - Billing plan configuration
   * @param body.customerEmail - Customer email for Stripe customer creation
   * @returns Subscription creation result with Stripe IDs
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "plan": {
   *     "name": "TEAM",
   *     "basePrice": 99,
   *     "priceId": "price_team_monthly",
   *     "trialDays": 14,
   *     "usageLimits": {
   *       "embeddings": 100000,
   *       "llmTokens": 1000000,
   *       "apiCalls": 100000,
   *       "storageBytes": 10737418240
   *     }
   *   },
   *   "customerEmail": "customer@example.com"
   * }
   * 
   * // Response format
   * {
   *   "subscriptionId": "sub_1234567890",
   *   "customerId": "cus_1234567890",
   *   "status": "trialing"
   * }
   * ```
   */
  @Post("subscription")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  createSubscription(
    @Param("tenantId") tenantId: string,
    @Body() body: { plan: BillingPlan; customerEmail: string }
  ) {
    return this.billing.createSubscription(tenantId, body.plan, body.customerEmail);
  }

  /**
   * Updates an existing subscription to a new plan.
   * 
   * This endpoint updates the tenant's subscription to a different plan,
   * handling prorations and plan changes through Stripe.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param body - Request body containing new plan details
   * @param body.plan - New billing plan configuration
   * @returns Success status of the subscription update
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "plan": {
   *     "name": "ENTERPRISE",
   *     "basePrice": 499,
   *     "priceId": "price_enterprise_monthly",
   *     "usageLimits": {
   *       "embeddings": 1000000,
   *       "llmTokens": 10000000,
   *       "apiCalls": 1000000,
   *       "storageBytes": 107374182400
   *     }
   *   }
   * }
   * 
   * // Response format
   * {
   *   "success": true
   * }
   * ```
   */
  @Put("subscription")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  updateSubscription(
    @Param("tenantId") tenantId: string,
    @Body() body: { plan: BillingPlan }
  ) {
    return this.billing.updateSubscription(tenantId, body.plan);
  }

  /**
   * Cancels the tenant's subscription.
   * 
   * This endpoint cancels the subscription either immediately or at the end
   * of the current billing period, depending on the specified option.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param body - Request body containing cancellation options
   * @param body.immediately - Whether to cancel immediately or at period end
   * @returns Success status of the subscription cancellation
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "immediately": false
   * }
   * 
   * // Response format
   * {
   *   "success": true
   * }
   * ```
   */
  @Post("subscription/cancel")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  cancelSubscription(
    @Param("tenantId") tenantId: string,
    @Body() body: { immediately?: boolean }
  ) {
    return this.billing.cancelSubscription(tenantId, body.immediately);
  }

  /**
   * Retrieves usage metrics for the tenant.
   * 
   * This endpoint provides aggregated usage metrics for the specified period,
   * including embeddings, LLM tokens, API calls, and storage usage.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param period - Usage period (current, previous, year)
   * @returns Aggregated usage metrics for the period
   * 
   * @example
   * ```typescript
   * // Response format
   * {
   *   "embeddings": 50000,
   *   "llmTokens": 200000,
   *   "apiCalls": 15000,
   *   "storageBytes": 5368709120
   * }
   * ```
   */
  @Get("usage")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  getUsage(@Param("tenantId") tenantId: string, @Query("period") period?: string) {
    return this.billing.getUsageMetrics(tenantId, period);
  }

  /**
   * Records usage metrics for the tenant.
   * 
   * This endpoint records usage data for billing and monitoring purposes.
   * It also triggers usage limit checks and alerts if thresholds are exceeded.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @param usage - Usage metrics to record
   * @returns Success status of the usage recording
   * 
   * @example
   * ```typescript
   * // Request body
   * {
   *   "embeddings": 1000,
   *   "llmTokens": 5000,
   *   "apiCalls": 100,
   *   "storageBytes": 1048576
   * }
   * ```
   */
  @Post("usage")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  recordUsage(
    @Param("tenantId") tenantId: string,
    @Body() usage: UsageMetrics
  ) {
    return this.billing.recordUsage(tenantId, usage);
  }

  /**
   * Handles Stripe webhook events for subscription and payment updates.
   * 
   * This endpoint processes Stripe webhook events to keep subscription status
   * and payment information synchronized. It verifies webhook signatures
   * and handles various payment and subscription events.
   * 
   * @param tenantId - The tenant identifier (from URL path)
   * @param payload - Raw webhook payload from Stripe
   * @param signature - Stripe signature for webhook verification
   * @returns Webhook processing result
   * 
   * @example
   * ```typescript
   * // Stripe webhook events handled:
   * // - invoice.payment_succeeded
   * // - invoice.payment_failed
   * // - customer.subscription.updated
   * // - customer.subscription.deleted
   * 
   * // Response format
   * {
   *   "received": true
   * }
   * ```
   */
  @Post("webhook")
  @Roles() // No auth required for Stripe webhooks
  handleWebhook(
    @Param("tenantId") tenantId: string,
    @Body() payload: any,
    @Headers("stripe-signature") signature: string
  ) {
    return this.billing.handleWebhook(payload, signature);
  }
}



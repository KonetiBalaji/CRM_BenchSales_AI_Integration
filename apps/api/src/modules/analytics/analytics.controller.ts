/**
 * @fileoverview Analytics Controller
 * 
 * This controller provides analytics and reporting endpoints for the CRM BenchSales AI Integration application.
 * It offers insights into business metrics, performance indicators, and operational statistics for
 * tenant-scoped data analysis and reporting.
 * 
 * Key features:
 * - Business metrics and KPI reporting
 * - Consultant and requirement analytics
 * - Submission and match tracking
 * - Role-based access control for different user types
 * - Tenant-scoped data aggregation and reporting
 * 
 * @author Balaji Koneti
 * @email balaji.koneti08@gmail.com
 * @linkedin linkedin.com/in/balaji-koneti
 * @version 1.0.0
 * @since 2024
 */

import { Controller, Get, Param } from "@nestjs/common";
import { UserRole } from "@prisma/client";

import { Roles } from "../auth/decorators/roles.decorator";
import { AnalyticsService } from "./analytics.service";

/**
 * Controller for analytics and reporting functionality.
 * 
 * This controller provides endpoints for accessing business analytics,
 * performance metrics, and operational insights. All endpoints are
 * tenant-scoped and protected by role-based access control.
 * 
 * @example
 * ```typescript
 * // Get analytics summary for a tenant
 * GET /tenants/{tenantId}/analytics/summary
 * 
 * // Response format
 * {
 *   "consultantCount": 150,
 *   "openRequirements": 25,
 *   "activeSubmissions": 45,
 *   "matchCounts": {
 *     "MATCHED": 30,
 *     "PENDING": 15,
 *     "REJECTED": 5
 *   }
 * }
 * ```
 */
@Controller("tenants/:tenantId/analytics")
export class AnalyticsController {
  /**
   * Initializes the analytics controller with the service dependency.
   * 
   * @param analyticsService - The analytics service for business logic
   */
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Retrieves a comprehensive analytics summary for the tenant.
   * 
   * This endpoint provides key business metrics including consultant counts,
   * open requirements, active submissions, and match statistics. The data
   * is aggregated in real-time from the database for accurate reporting.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @returns Object containing key business metrics and statistics
   * 
   * @example
   * ```typescript
   * // Response format
   * {
   *   "consultantCount": 150,        // Total number of consultants
   *   "openRequirements": 25,        // Number of open job requirements
   *   "activeSubmissions": 45,       // Number of active submissions
   *   "matchCounts": {               // Match statistics by status
   *     "MATCHED": 30,
   *     "PENDING": 15,
   *     "REJECTED": 5,
   *     "INTERVIEW": 8
   *   }
   * }
   * ```
   */
  @Get("summary")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.REP, UserRole.VIEWER)
  summary(@Param("tenantId") tenantId: string) {
    return this.analyticsService.summary(tenantId);
  }
}

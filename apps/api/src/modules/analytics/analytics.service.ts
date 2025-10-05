/**
 * @fileoverview Analytics Service
 * 
 * This service provides analytics and reporting functionality for the CRM BenchSales AI Integration application.
 * It aggregates business metrics, performance indicators, and operational statistics from the database
 * to provide comprehensive insights for tenant-scoped data analysis and reporting.
 * 
 * Key features:
 * - Real-time business metrics aggregation
 * - Consultant and requirement analytics
 * - Submission and match tracking
 * - Performance indicator calculation
 * - Tenant-scoped data analysis
 * 
 * @author Balaji Koneti
 * @email balaji.koneti08@gmail.com
 * @linkedin linkedin.com/in/balaji-koneti
 * @version 1.0.0
 * @since 2024
 */

import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../infrastructure/prisma/prisma.service";

/**
 * Service for analytics and reporting functionality.
 * 
 * This service provides business intelligence and analytics capabilities
 * by aggregating data from various entities in the CRM system. It offers
 * real-time insights into business performance and operational metrics.
 * 
 * @example
 * ```typescript
 * // Get analytics summary
 * const summary = await this.analytics.summary(tenantId);
 * console.log(`Total consultants: ${summary.consultantCount}`);
 * console.log(`Open requirements: ${summary.openRequirements}`);
 * ```
 */
@Injectable()
export class AnalyticsService {
  /**
   * Initializes the analytics service with the Prisma database service.
   * 
   * @param prisma - Prisma service for database operations
   */
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a comprehensive analytics summary for the specified tenant.
   * 
   * This method aggregates key business metrics from multiple database entities
   * in parallel for optimal performance. It provides insights into consultant
   * counts, open requirements, active submissions, and match statistics.
   * 
   * @param tenantId - The tenant identifier for data isolation
   * @returns Object containing aggregated business metrics and statistics
   * 
   * @example
   * ```typescript
   * const summary = await this.analytics.summary("tenant-123");
   * 
   * // Access individual metrics
   * console.log(`Consultants: ${summary.consultantCount}`);
   * console.log(`Open Requirements: ${summary.openRequirements}`);
   * console.log(`Active Submissions: ${summary.activeSubmissions}`);
   * console.log(`Match Statistics:`, summary.matchCounts);
   * ```
   */
  async summary(tenantId: string) {
    // Execute all database queries in parallel for optimal performance
    const [consultantCount, openRequirements, activeSubmissions, matches] = await Promise.all([
      // Count total consultants for the tenant
      this.prisma.consultant.count({ where: { tenantId } }),
      
      // Count open requirements for the tenant
      this.prisma.requirement.count({ where: { tenantId, status: "OPEN" } }),
      
      // Count active submissions (submitted, in interview, or with offers)
      this.prisma.submission.count({
        where: {
          tenantId,
          status: { in: ["SUBMITTED", "INTERVIEW", "OFFER"] }
        }
      }),
      
      // Group matches by status to get counts for each status
      this.prisma.match.groupBy({
        by: ["status"],
        where: { tenantId },
        _count: { _all: true }
      })
    ]);

    // Transform match group results into a key-value object
    const matchCounts = matches.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = item._count._all;
      return acc;
    }, {});

    return {
      consultantCount,      // Total number of consultants
      openRequirements,     // Number of open job requirements
      activeSubmissions,    // Number of active submissions
      matchCounts          // Match statistics grouped by status
    };
  }
}

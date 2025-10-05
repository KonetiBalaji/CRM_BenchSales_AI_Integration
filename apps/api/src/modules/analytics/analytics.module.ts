/**
 * @fileoverview Analytics Module
 * 
 * This module provides analytics and reporting functionality for the CRM BenchSales AI Integration application.
 * It offers business intelligence capabilities, performance metrics, and operational insights for
 * tenant-scoped data analysis and reporting.
 * 
 * The module provides:
 * - Business metrics and KPI reporting
 * - Consultant and requirement analytics
 * - Submission and match tracking
 * - Performance indicator calculation
 * - Real-time data aggregation and reporting
 * 
 * @author Balaji Koneti
 * @email balaji.koneti08@gmail.com
 * @linkedin linkedin.com/in/balaji-koneti
 * @version 1.0.0
 * @since 2024
 */

import { Module } from "@nestjs/common";

import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";

/**
 * Module for analytics and reporting functionality.
 * 
 * This module provides business intelligence and analytics capabilities
 * for the CRM system. It aggregates data from various entities to provide
 * comprehensive insights into business performance and operational metrics.
 * 
 * The module includes:
 * - AnalyticsController: REST endpoints for analytics data
 * - AnalyticsService: Business logic for data aggregation and analysis
 * 
 * @example
 * ```typescript
 * // Import the module in your application
 * @Module({
 *   imports: [AnalyticsModule],
 *   // ... other module configuration
 * })
 * export class AppModule {}
 * ```
 * 
 * @example
 * ```typescript
 * // Use the service in other modules
 * @Injectable()
 * export class SomeService {
 *   constructor(private readonly analytics: AnalyticsService) {}
 *   
 *   async getBusinessMetrics(tenantId: string) {
 *     const summary = await this.analytics.summary(tenantId);
 *     return summary;
 *   }
 * }
 * ```
 */
@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService]
})
export class AnalyticsModule {}

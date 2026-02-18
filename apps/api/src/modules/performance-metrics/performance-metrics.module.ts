/**
 * @fileoverview Performance Metrics Module
 * 
 * This module provides performance metrics and KPI tracking functionality for the CRM BenchSales AI Integration application.
 * It includes SLA monitoring, conversion rate tracking, and productivity analytics.
 * 
 * Key features:
 * - SLA monitoring and alerting
 * - Conversion rate tracking
 * - Recruiter productivity metrics
 * - Client satisfaction scoring
 * - Performance benchmarking
 * - Role-based access control
 * 
 * @author Balaji Koneti
 * @email balaji.koneti08@gmail.com
 * @linkedin linkedin.com/in/balaji-koneti
 * @version 1.0.0
 * @since 2024
 */

import { Module } from "@nestjs/common";

import { PrismaModule } from "../../infrastructure/prisma/prisma.module";
import { PerformanceMetricsController } from "./performance-metrics.controller";
import { PerformanceMetricsService } from "./performance-metrics.service";

@Module({
  imports: [PrismaModule],
  controllers: [PerformanceMetricsController],
  providers: [PerformanceMetricsService],
  exports: [PerformanceMetricsService]
})
export class PerformanceMetricsModule {}

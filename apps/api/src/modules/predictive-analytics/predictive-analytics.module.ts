/**
 * @fileoverview Predictive Analytics Module
 * 
 * This module provides predictive analytics functionality for the CRM BenchSales AI Integration application.
 * It includes forecasting, trend analysis, and predictive modeling capabilities.
 * 
 * Key features:
 * - Sales forecasting and prediction
 * - Trend analysis and pattern recognition
 * - Predictive modeling and machine learning
 * - Risk assessment and mitigation
 * - Performance prediction
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
import { PredictiveAnalyticsController } from "./predictive-analytics.controller";
import { PredictiveAnalyticsService } from "./predictive-analytics.service";

@Module({
  imports: [PrismaModule],
  controllers: [PredictiveAnalyticsController],
  providers: [PredictiveAnalyticsService],
  exports: [PredictiveAnalyticsService]
})
export class PredictiveAnalyticsModule {}

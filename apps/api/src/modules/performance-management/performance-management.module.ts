/**
 * @fileoverview Performance Management Module
 * 
 * This module provides performance management functionality for the CRM BenchSales AI Integration application.
 * It includes performance reviews, goal setting, and feedback management capabilities.
 * 
 * Key features:
 * - Performance review cycles
 * - Goal setting and tracking
 * - 360-degree feedback
 * - Performance analytics
 * - Career development planning
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
import { PerformanceManagementController } from "./performance-management.controller";
import { PerformanceManagementService } from "./performance-management.service";

@Module({
  imports: [PrismaModule],
  controllers: [PerformanceManagementController],
  providers: [PerformanceManagementService],
  exports: [PerformanceManagementService]
})
export class PerformanceManagementModule {}

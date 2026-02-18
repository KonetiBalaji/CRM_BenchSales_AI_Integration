/**
 * @fileoverview Vendor Performance Management Module
 * 
 * This module provides vendor performance management functionality for the CRM BenchSales AI Integration application.
 * It includes performance tracking, evaluation, and vendor relationship management.
 * 
 * Key features:
 * - Vendor performance tracking
 * - Performance evaluation and scoring
 * - Vendor relationship management
 * - Performance analytics and reporting
 * - Vendor improvement recommendations
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
import { VendorPerformanceManagementController } from "./vendor-performance-management.controller";
import { VendorPerformanceManagementService } from "./vendor-performance-management.service";

@Module({
  imports: [PrismaModule],
  controllers: [VendorPerformanceManagementController],
  providers: [VendorPerformanceManagementService],
  exports: [VendorPerformanceManagementService]
})
export class VendorPerformanceManagementModule {}

/**
 * @fileoverview Custom Reports Module
 * 
 * This module provides custom reporting functionality for the CRM BenchSales AI Integration application.
 * It includes report builder, data visualization, and export capabilities.
 * 
 * Key features:
 * - Drag-and-drop report builder
 * - Custom data filters and grouping
 * - Multiple export formats (PDF, Excel, CSV)
 * - Scheduled report delivery
 * - Report templates and sharing
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
import { CustomReportsController } from "./custom-reports.controller";
import { CustomReportsService } from "./custom-reports.service";

@Module({
  imports: [PrismaModule],
  controllers: [CustomReportsController],
  providers: [CustomReportsService],
  exports: [CustomReportsService]
})
export class CustomReportsModule {}

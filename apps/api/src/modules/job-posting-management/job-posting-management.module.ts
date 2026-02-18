/**
 * @fileoverview Job Posting Management Module
 * 
 * This module provides job posting management functionality for the CRM BenchSales AI Integration application.
 * It includes job creation, distribution, tracking, and optimization capabilities.
 * 
 * Key features:
 * - Multi-platform job posting
 * - Job board integration
 * - Application tracking
 * - Performance analytics
 * - ATS integration
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
import { JobPostingManagementController } from "./job-posting-management.controller";
import { JobPostingManagementService } from "./job-posting-management.service";

@Module({
  imports: [PrismaModule],
  controllers: [JobPostingManagementController],
  providers: [JobPostingManagementService],
  exports: [JobPostingManagementService]
})
export class JobPostingManagementModule {}

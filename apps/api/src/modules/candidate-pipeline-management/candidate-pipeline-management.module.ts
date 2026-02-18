/**
 * @fileoverview Candidate Pipeline Management Module
 * 
 * This module provides candidate pipeline management functionality for the CRM BenchSales AI Integration application.
 * It includes pipeline stages, workflow automation, and candidate progression tracking.
 * 
 * Key features:
 * - Pipeline stage management
 * - Workflow automation
 * - Candidate progression tracking
 * - Stage transition rules
 * - Pipeline analytics
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
import { CandidatePipelineManagementController } from "./candidate-pipeline-management.controller";
import { CandidatePipelineManagementService } from "./candidate-pipeline-management.service";

@Module({
  imports: [PrismaModule],
  controllers: [CandidatePipelineManagementController],
  providers: [CandidatePipelineManagementService],
  exports: [CandidatePipelineManagementService]
})
export class CandidatePipelineManagementModule {}

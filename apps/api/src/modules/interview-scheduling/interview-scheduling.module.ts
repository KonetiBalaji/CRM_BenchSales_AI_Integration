/**
 * @fileoverview Interview Scheduling Module
 * 
 * This module provides interview scheduling functionality for the CRM BenchSales AI Integration application.
 * It includes calendar integration, automated scheduling, and interview management capabilities.
 * 
 * Key features:
 * - Calendar integration and availability management
 * - Automated interview scheduling
 * - Interview type management
 * - Reminder and notification system
 * - Interview feedback collection
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
import { InterviewSchedulingController } from "./interview-scheduling.controller";
import { InterviewSchedulingService } from "./interview-scheduling.service";

@Module({
  imports: [PrismaModule],
  controllers: [InterviewSchedulingController],
  providers: [InterviewSchedulingService],
  exports: [InterviewSchedulingService]
})
export class InterviewSchedulingModule {}

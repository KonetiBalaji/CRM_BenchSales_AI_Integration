/**
 * @fileoverview Employee Onboarding Module
 * 
 * This module provides employee onboarding functionality for the CRM BenchSales AI Integration application.
 * It includes onboarding workflows, document management, and progress tracking capabilities.
 * 
 * Key features:
 * - Automated onboarding workflows
 * - Document collection and verification
 * - Progress tracking and notifications
 * - Compliance and legal requirements
 * - Integration with HR systems
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
import { EmployeeOnboardingController } from "./employee-onboarding.controller";
import { EmployeeOnboardingService } from "./employee-onboarding.service";

@Module({
  imports: [PrismaModule],
  controllers: [EmployeeOnboardingController],
  providers: [EmployeeOnboardingService],
  exports: [EmployeeOnboardingService]
})
export class EmployeeOnboardingModule {}

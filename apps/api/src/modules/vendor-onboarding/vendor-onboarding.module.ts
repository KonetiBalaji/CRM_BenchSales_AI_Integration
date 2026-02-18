/**
 * @fileoverview Vendor Onboarding Module
 * 
 * This module provides vendor onboarding functionality for the CRM BenchSales AI Integration application.
 * It includes vendor registration, compliance verification, and onboarding workflows.
 * 
 * Key features:
 * - Vendor registration and verification
 * - Compliance and legal document management
 * - Vendor qualification process
 * - Onboarding workflow automation
 * - Vendor portal integration
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
import { VendorOnboardingController } from "./vendor-onboarding.controller";
import { VendorOnboardingService } from "./vendor-onboarding.service";

@Module({
  imports: [PrismaModule],
  controllers: [VendorOnboardingController],
  providers: [VendorOnboardingService],
  exports: [VendorOnboardingService]
})
export class VendorOnboardingModule {}

/**
 * @fileoverview AI Talent Sourcing Module
 * 
 * This module provides AI-powered talent sourcing functionality for the CRM BenchSales AI Integration application.
 * It includes intelligent candidate discovery, enrichment, and matching capabilities.
 * 
 * Key features:
 * - AI-powered candidate discovery
 * - Profile enrichment and data enhancement
 * - Intelligent matching algorithms
 * - Source tracking and attribution
 * - Performance analytics
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
import { AiTalentSourcingController } from "./ai-talent-sourcing.controller";
import { AiTalentSourcingService } from "./ai-talent-sourcing.service";

@Module({
  imports: [PrismaModule],
  controllers: [AiTalentSourcingController],
  providers: [AiTalentSourcingService],
  exports: [AiTalentSourcingService]
})
export class AiTalentSourcingModule {}

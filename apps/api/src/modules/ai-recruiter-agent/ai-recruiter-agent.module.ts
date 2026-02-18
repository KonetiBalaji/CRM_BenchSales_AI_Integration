/**
 * @fileoverview AI Recruiter Agent Module
 * 
 * This module provides AI-powered recruiter agent functionality for the CRM BenchSales AI Integration application.
 * It includes automated sourcing, screening, and outreach capabilities with intelligent conversation management.
 * 
 * Key features:
 * - Automated candidate sourcing and screening
 * - Intelligent conversation management
 * - AI-powered outreach and follow-up
 * - Performance tracking and optimization
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
import { AiRecruiterAgentController } from "./ai-recruiter-agent.controller";
import { AiRecruiterAgentService } from "./ai-recruiter-agent.service";

@Module({
  imports: [PrismaModule],
  controllers: [AiRecruiterAgentController],
  providers: [AiRecruiterAgentService],
  exports: [AiRecruiterAgentService]
})
export class AiRecruiterAgentModule {}

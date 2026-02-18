/**
 * @fileoverview Learning and Development Module
 * 
 * This module provides learning and development functionality for the CRM BenchSales AI Integration application.
 * It includes training programs, skill assessments, and career development capabilities.
 * 
 * Key features:
 * - Training program management
 * - Skill assessment and tracking
 * - Career development planning
 * - Learning path recommendations
 * - Certification management
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
import { LearningDevelopmentController } from "./learning-development.controller";
import { LearningDevelopmentService } from "./learning-development.service";

@Module({
  imports: [PrismaModule],
  controllers: [LearningDevelopmentController],
  providers: [LearningDevelopmentService],
  exports: [LearningDevelopmentService]
})
export class LearningDevelopmentModule {}

/**
 * @fileoverview Communications Center Module
 * 
 * This module provides unified communications functionality for the CRM BenchSales AI Integration application.
 * It includes email management, message drafting, and communication tracking capabilities.
 * 
 * Key features:
 * - Unified inbox for emails and messages
 * - AI-powered message drafting
 * - Communication tracking and analytics
 * - Template management
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
import { CommunicationsCenterController } from "./communications-center.controller";
import { CommunicationsCenterService } from "./communications-center.service";

@Module({
  imports: [PrismaModule],
  controllers: [CommunicationsCenterController],
  providers: [CommunicationsCenterService],
  exports: [CommunicationsCenterService]
})
export class CommunicationsCenterModule {}

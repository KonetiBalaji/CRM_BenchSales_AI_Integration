/**
 * @fileoverview Email Campaigns Module
 * 
 * This module provides email campaign management functionality for the CRM BenchSales AI Integration application.
 * It includes campaign creation, segmentation, sending, and analytics capabilities.
 * 
 * Key features:
 * - Campaign creation and management
 * - Audience segmentation
 * - Email template management
 * - Send scheduling and automation
 * - Deliverability insights and analytics
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
import { EmailCampaignsController } from "./email-campaigns.controller";
import { EmailCampaignsService } from "./email-campaigns.service";

@Module({
  imports: [PrismaModule],
  controllers: [EmailCampaignsController],
  providers: [EmailCampaignsService],
  exports: [EmailCampaignsService]
})
export class EmailCampaignsModule {}

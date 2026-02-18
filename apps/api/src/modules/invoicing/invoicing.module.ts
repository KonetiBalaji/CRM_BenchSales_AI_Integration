/**
 * @fileoverview Invoicing Module
 * 
 * This module provides invoicing and payment management functionality for the CRM BenchSales AI Integration application.
 * It includes invoice generation, payment tracking, and financial reporting capabilities.
 * 
 * Key features:
 * - Automated invoice generation
 * - Payment tracking and reconciliation
 * - Financial reporting and analytics
 * - Tax calculation and compliance
 * - Multi-currency support
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
import { InvoicingController } from "./invoicing.controller";
import { InvoicingService } from "./invoicing.service";

@Module({
  imports: [PrismaModule],
  controllers: [InvoicingController],
  providers: [InvoicingService],
  exports: [InvoicingService]
})
export class InvoicingModule {}

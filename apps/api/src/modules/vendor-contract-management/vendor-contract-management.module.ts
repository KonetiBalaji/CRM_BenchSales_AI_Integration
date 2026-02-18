/**
 * @fileoverview Vendor Contract Management Module
 * 
 * This module provides vendor contract management functionality for the CRM BenchSales AI Integration application.
 * It includes contract creation, negotiation, and lifecycle management.
 * 
 * Key features:
 * - Contract creation and templates
 * - Contract negotiation workflow
 * - Contract lifecycle management
 * - Compliance and legal tracking
 * - Renewal and termination management
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
import { VendorContractManagementController } from "./vendor-contract-management.controller";
import { VendorContractManagementService } from "./vendor-contract-management.service";

@Module({
  imports: [PrismaModule],
  controllers: [VendorContractManagementController],
  providers: [VendorContractManagementService],
  exports: [VendorContractManagementService]
})
export class VendorContractManagementModule {}

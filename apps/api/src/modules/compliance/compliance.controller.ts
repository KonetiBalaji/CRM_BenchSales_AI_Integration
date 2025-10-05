import { Body, Controller, Get, Param, Post, Put, Query } from "@nestjs/common";
import { UserRole } from "@prisma/client";

import { Roles } from "../auth/decorators/roles.decorator";
import { ComplianceService } from "./compliance.service";
import { DataRetentionPolicy, PrivacySettings } from "./compliance.types";

@Controller("tenants/:tenantId/compliance")
export class ComplianceController {
  constructor(private readonly compliance: ComplianceService) {}

  @Get("export")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  exportTenantData(@Param("tenantId") tenantId: string, @Query("requestId") requestId?: string) {
    const id = requestId || `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return this.compliance.exportTenantData(tenantId, id);
  }

  @Post("erase")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  eraseTenantData(@Param("tenantId") tenantId: string, @Body() body: { requestId?: string }) {
    const id = body.requestId || `erase-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return this.compliance.eraseTenantData(tenantId, id);
  }

  @Post("retention-policy")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  applyDataRetentionPolicy(
    @Param("tenantId") tenantId: string,
    @Body() policy: DataRetentionPolicy
  ) {
    return this.compliance.applyDataRetentionPolicy(tenantId, policy);
  }

  @Get("privacy-settings")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  getPrivacySettings(@Param("tenantId") tenantId: string) {
    return this.compliance.getPrivacySettings(tenantId);
  }

  @Put("privacy-settings")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  updatePrivacySettings(
    @Param("tenantId") tenantId: string,
    @Body() settings: PrivacySettings
  ) {
    return this.compliance.updatePrivacySettings(tenantId, settings);
  }

  @Post("security-audit")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  performSecurityAudit(@Param("tenantId") tenantId: string) {
    return this.compliance.performSecurityAudit(tenantId);
  }

  @Post("soc2-compliance")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  performSOC2ComplianceCheck(@Param("tenantId") tenantId: string) {
    return this.compliance.performSOC2ComplianceCheck(tenantId);
  }

  @Post("vulnerability-scan")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  scanForVulnerabilities() {
    return this.compliance.scanForVulnerabilities();
  }
}




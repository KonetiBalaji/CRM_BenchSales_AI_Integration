import { Body, Controller, Get, Headers, Param, Post, Put, Query } from "@nestjs/common";
import { UserRole } from "@prisma/client";

import { Roles } from "../auth/decorators/roles.decorator";
import { IntegrationsService } from "./integrations.service";
import { ConflictResolution, ExternalSystemConfig, SyncMetrics } from "./integrations.types";

@Controller("tenants/:tenantId/integrations")
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  @Post("salesforce/webhook")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  salesforceWebhook(@Param("tenantId") tenantId: string, @Headers() headers: Record<string, string>, @Body() body: unknown) {
    return this.integrations.handleWebhook(tenantId, "salesforce", headers, body);
  }

  @Post("bullhorn/webhook")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  bullhornWebhook(@Param("tenantId") tenantId: string, @Headers() headers: Record<string, string>, @Body() body: unknown) {
    return this.integrations.handleWebhook(tenantId, "bullhorn", headers, body);
  }

  @Post("sync/:provider/:entityType/:entityId")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  syncToExternal(
    @Param("tenantId") tenantId: string,
    @Param("provider") provider: string,
    @Param("entityType") entityType: string,
    @Param("entityId") entityId: string
  ) {
    return this.integrations.syncToExternal(tenantId, provider, entityType, entityId);
  }

  @Get("conflicts")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  getConflicts(
    @Param("tenantId") tenantId: string,
    @Query("provider") provider?: string,
    @Query("status") status?: string,
    @Query("limit") limit?: number
  ) {
    return this.integrations.getConflicts(tenantId, { provider, status, limit });
  }

  @Put("conflicts/:conflictId/resolve")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  resolveConflict(
    @Param("tenantId") tenantId: string,
    @Param("conflictId") conflictId: string,
    @Body() resolution: ConflictResolution
  ) {
    return this.integrations.resolveConflict(tenantId, conflictId, resolution);
  }

  @Get("config/:provider")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  getConfig(@Param("tenantId") tenantId: string, @Param("provider") provider: string) {
    return this.integrations.getConfig(tenantId, provider);
  }

  @Put("config/:provider")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  updateConfig(
    @Param("tenantId") tenantId: string,
    @Param("provider") provider: string,
    @Body() config: ExternalSystemConfig
  ) {
    return this.integrations.updateConfig(tenantId, provider, config);
  }

  @Get("metrics")
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  getMetrics(
    @Param("tenantId") tenantId: string,
    @Query("provider") provider?: string,
    @Query("period") period?: string
  ) {
    return this.integrations.getMetrics(tenantId, { provider, period });
  }

  @Post("test-connection/:provider")
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  testConnection(@Param("tenantId") tenantId: string, @Param("provider") provider: string) {
    return this.integrations.testConnection(tenantId, provider);
  }
}



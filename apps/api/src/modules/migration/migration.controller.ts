import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from "@nestjs/common";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { MigrationService } from "./migration.service";
import { MigrationPlan, MigrationResult } from "./migration.types";

@Controller("migration")
@UseGuards(JwtAuthGuard)
export class MigrationController {
  constructor(private readonly migrationService: MigrationService) {}

  // Get migration templates
  @Get("templates")
  async getMigrationTemplates(): Promise<any[]> {
    return this.migrationService.getMigrationTemplates();
  }

  // Create migration plan
  @Post("plans")
  async createMigrationPlan(
    @Request() req: any,
    @Body() planData: {
      name: string;
      description: string;
      sourceSystem: string;
      targetSystem: string;
      estimatedDuration: number;
      steps: any[];
    }
  ): Promise<MigrationPlan> {
    return this.migrationService.createMigrationPlan(req.user.tenantId, planData);
  }

  // Get migration plans
  @Get("plans")
  async getMigrationPlans(@Request() req: any): Promise<MigrationPlan[]> {
    return this.migrationService.getMigrationPlans(req.user.tenantId);
  }

  // Get migration plan by ID
  @Get("plans/:planId")
  async getMigrationPlan(
    @Request() req: any,
    @Param("planId") planId: string
  ): Promise<MigrationPlan | null> {
    return this.migrationService.getMigrationPlan(planId, req.user.tenantId);
  }

  // Start migration
  @Post("plans/:planId/start")
  async startMigration(
    @Request() req: any,
    @Param("planId") planId: string
  ): Promise<MigrationResult> {
    return this.migrationService.startMigration(planId, req.user.tenantId);
  }

  // Get migration result
  @Get("plans/:planId/result")
  async getMigrationResult(
    @Request() req: any,
    @Param("planId") planId: string
  ): Promise<MigrationResult | null> {
    return this.migrationService.getMigrationResult(planId, req.user.tenantId);
  }

  // Cancel migration
  @Post("plans/:planId/cancel")
  async cancelMigration(
    @Request() req: any,
    @Param("planId") planId: string
  ): Promise<{ success: boolean }> {
    await this.migrationService.cancelMigration(planId, req.user.tenantId);
    return { success: true };
  }
}

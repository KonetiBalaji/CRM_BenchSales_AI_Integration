import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { MigrationPlan, MigrationStep, MigrationResult, MigrationError } from "./migration.types";

@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {}

  // Create migration plan
  async createMigrationPlan(
    tenantId: string,
    plan: Omit<MigrationPlan, "id" | "status" | "createdAt">
  ): Promise<MigrationPlan> {
    const migrationPlan = await this.prisma.migrationPlan.create({
      data: {
        tenantId,
        name: plan.name,
        description: plan.description,
        sourceSystem: plan.sourceSystem,
        targetSystem: plan.targetSystem,
        estimatedDuration: plan.estimatedDuration,
        status: "PENDING",
        steps: {
          create: plan.steps.map(step => ({
            name: step.name,
            description: step.description,
            type: step.type,
            order: step.order,
            status: "PENDING",
            data: step.data as any
          }))
        }
      },
      include: {
        steps: true
      }
    });

    this.logger.log(`Created migration plan ${migrationPlan.id} for tenant ${tenantId}`);
    return this.mapToMigrationPlan(migrationPlan);
  }

  // Get migration plans for tenant
  async getMigrationPlans(tenantId: string): Promise<MigrationPlan[]> {
    const plans = await this.prisma.migrationPlan.findMany({
      where: { tenantId },
      include: {
        steps: true,
        results: true
      },
      orderBy: { createdAt: "desc" }
    });

    return plans.map(plan => this.mapToMigrationPlan(plan));
  }

  // Get migration plan by ID
  async getMigrationPlan(planId: string, tenantId: string): Promise<MigrationPlan | null> {
    const plan = await this.prisma.migrationPlan.findFirst({
      where: { id: planId, tenantId },
      include: {
        steps: true,
        results: true
      }
    });

    return plan ? this.mapToMigrationPlan(plan) : null;
  }

  // Start migration
  async startMigration(planId: string, tenantId: string): Promise<MigrationResult> {
    const plan = await this.getMigrationPlan(planId, tenantId);
    if (!plan) {
      throw new Error("Migration plan not found");
    }

    if (plan.status !== "PENDING") {
      throw new Error("Migration plan is not in pending status");
    }

    // Update plan status
    await this.prisma.migrationPlan.update({
      where: { id: planId },
      data: {
        status: "IN_PROGRESS",
        startedAt: new Date()
      }
    });

    // Create migration result
    const result = await this.prisma.migrationResult.create({
      data: {
        planId,
        status: "IN_PROGRESS",
        totalRecords: 0,
        processedRecords: 0,
        failedRecords: 0,
        startedAt: new Date()
      }
    });

    // Start migration process (async)
    this.executeMigration(planId, tenantId).catch(error => {
      this.logger.error(`Migration ${planId} failed:`, error);
    });

    return this.mapToMigrationResult(result);
  }

  // Get migration result
  async getMigrationResult(planId: string, tenantId: string): Promise<MigrationResult | null> {
    const plan = await this.prisma.migrationPlan.findFirst({
      where: { id: planId, tenantId }
    });

    if (!plan) {
      return null;
    }

    const result = await this.prisma.migrationResult.findFirst({
      where: { planId },
      include: {
        errors: true
      }
    });

    return result ? this.mapToMigrationResult(result) : null;
  }

  // Cancel migration
  async cancelMigration(planId: string, tenantId: string): Promise<void> {
    const plan = await this.prisma.migrationPlan.findFirst({
      where: { id: planId, tenantId }
    });

    if (!plan) {
      throw new Error("Migration plan not found");
    }

    await this.prisma.migrationPlan.update({
      where: { id: planId },
      data: {
        status: "CANCELLED",
        completedAt: new Date()
      }
    });

    await this.prisma.migrationResult.updateMany({
      where: { planId },
      data: {
        status: "CANCELLED",
        completedAt: new Date()
      }
    });

    this.logger.log(`Cancelled migration ${planId}`);
  }

  // Get migration templates
  async getMigrationTemplates(): Promise<any[]> {
    return [
      {
        id: "salesforce-to-benchcrm",
        name: "Salesforce to BenchCRM",
        description: "Migrate consultants and requirements from Salesforce",
        sourceSystem: "Salesforce",
        targetSystem: "BenchCRM",
        estimatedDuration: 30,
        steps: [
          {
            name: "Export Salesforce Data",
            description: "Export consultant and requirement data from Salesforce",
            type: "DATA_EXPORT",
            order: 1
          },
          {
            name: "Transform Data",
            description: "Transform Salesforce data to BenchCRM format",
            type: "DATA_TRANSFORM",
            order: 2
          },
          {
            name: "Import Consultants",
            description: "Import consultant profiles to BenchCRM",
            type: "DATA_IMPORT",
            order: 3
          },
          {
            name: "Import Requirements",
            description: "Import job requirements to BenchCRM",
            type: "DATA_IMPORT",
            order: 4
          },
          {
            name: "Validate Data",
            description: "Validate imported data integrity",
            type: "VALIDATION",
            order: 5
          }
        ]
      },
      {
        id: "bullhorn-to-benchcrm",
        name: "Bullhorn to BenchCRM",
        description: "Migrate consultants and requirements from Bullhorn",
        sourceSystem: "Bullhorn",
        targetSystem: "BenchCRM",
        estimatedDuration: 25,
        steps: [
          {
            name: "Export Bullhorn Data",
            description: "Export consultant and requirement data from Bullhorn",
            type: "DATA_EXPORT",
            order: 1
          },
          {
            name: "Transform Data",
            description: "Transform Bullhorn data to BenchCRM format",
            type: "DATA_TRANSFORM",
            order: 2
          },
          {
            name: "Import Consultants",
            description: "Import consultant profiles to BenchCRM",
            type: "DATA_IMPORT",
            order: 3
          },
          {
            name: "Import Requirements",
            description: "Import job requirements to BenchCRM",
            type: "DATA_IMPORT",
            order: 4
          },
          {
            name: "Validate Data",
            description: "Validate imported data integrity",
            type: "VALIDATION",
            order: 5
          }
        ]
      },
      {
        id: "csv-import",
        name: "CSV Import",
        description: "Import consultants and requirements from CSV files",
        sourceSystem: "CSV",
        targetSystem: "BenchCRM",
        estimatedDuration: 15,
        steps: [
          {
            name: "Upload CSV Files",
            description: "Upload consultant and requirement CSV files",
            type: "DATA_EXPORT",
            order: 1
          },
          {
            name: "Validate CSV Format",
            description: "Validate CSV file format and required fields",
            type: "VALIDATION",
            order: 2
          },
          {
            name: "Transform Data",
            description: "Transform CSV data to BenchCRM format",
            type: "DATA_TRANSFORM",
            order: 3
          },
          {
            name: "Import Data",
            description: "Import transformed data to BenchCRM",
            type: "DATA_IMPORT",
            order: 4
          },
          {
            name: "Validate Import",
            description: "Validate imported data integrity",
            type: "VALIDATION",
            order: 5
          }
        ]
      }
    ];
  }

  // Private helper methods
  private async executeMigration(planId: string, tenantId: string): Promise<void> {
    try {
      const plan = await this.getMigrationPlan(planId, tenantId);
      if (!plan) {
        throw new Error("Migration plan not found");
      }

      // Execute each step
      for (const step of plan.steps) {
        await this.executeMigrationStep(planId, step);
      }

      // Mark migration as completed
      await this.prisma.migrationPlan.update({
        where: { id: planId },
        data: {
          status: "COMPLETED",
          completedAt: new Date()
        }
      });

      await this.prisma.migrationResult.updateMany({
        where: { planId },
        data: {
          status: "COMPLETED",
          completedAt: new Date()
        }
      });

      this.logger.log(`Migration ${planId} completed successfully`);
    } catch (error) {
      this.logger.error(`Migration ${planId} failed:`, error);

      // Mark migration as failed
      await this.prisma.migrationPlan.update({
        where: { id: planId },
        data: {
          status: "FAILED",
          completedAt: new Date()
        }
      });

      await this.prisma.migrationResult.updateMany({
        where: { planId },
        data: {
          status: "FAILED",
          completedAt: new Date()
        }
      });
    }
  }

  private async executeMigrationStep(planId: string, step: MigrationStep): Promise<void> {
    try {
      // Update step status
      await this.prisma.migrationStep.update({
        where: { id: step.id },
        data: {
          status: "IN_PROGRESS",
          startedAt: new Date()
        }
      });

      // Execute step based on type
      switch (step.type) {
        case "DATA_EXPORT":
          await this.executeDataExport(planId, step);
          break;
        case "DATA_TRANSFORM":
          await this.executeDataTransform(planId, step);
          break;
        case "DATA_IMPORT":
          await this.executeDataImport(planId, step);
          break;
        case "VALIDATION":
          await this.executeValidation(planId, step);
          break;
        case "CLEANUP":
          await this.executeCleanup(planId, step);
          break;
      }

      // Mark step as completed
      await this.prisma.migrationStep.update({
        where: { id: step.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date()
        }
      });
    } catch (error) {
      this.logger.error(`Migration step ${step.id} failed:`, error);

      // Mark step as failed
      await this.prisma.migrationStep.update({
        where: { id: step.id },
        data: {
          status: "FAILED",
          error: error.message
        }
      });

      // Record error
      await this.prisma.migrationError.create({
        data: {
          resultId: planId, // This should be the actual result ID
          recordId: step.id,
          error: error.message,
          step: step.name,
          timestamp: new Date()
        }
      });
    }
  }

  private async executeDataExport(planId: string, step: MigrationStep): Promise<void> {
    // Simulate data export
    this.logger.log(`Executing data export for step ${step.id}`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  private async executeDataTransform(planId: string, step: MigrationStep): Promise<void> {
    // Simulate data transformation
    this.logger.log(`Executing data transform for step ${step.id}`);
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  private async executeDataImport(planId: string, step: MigrationStep): Promise<void> {
    // Simulate data import
    this.logger.log(`Executing data import for step ${step.id}`);
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  private async executeValidation(planId: string, step: MigrationStep): Promise<void> {
    // Simulate validation
    this.logger.log(`Executing validation for step ${step.id}`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  private async executeCleanup(planId: string, step: MigrationStep): Promise<void> {
    // Simulate cleanup
    this.logger.log(`Executing cleanup for step ${step.id}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private mapToMigrationPlan(plan: any): MigrationPlan {
    return {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      sourceSystem: plan.sourceSystem,
      targetSystem: plan.targetSystem,
      steps: plan.steps.map((step: any) => ({
        id: step.id,
        name: step.name,
        description: step.description,
        type: step.type,
        order: step.order,
        status: step.status,
        data: step.data,
        error: step.error,
        startedAt: step.startedAt,
        completedAt: step.completedAt
      })),
      estimatedDuration: plan.estimatedDuration,
      status: plan.status,
      createdAt: plan.createdAt,
      startedAt: plan.startedAt,
      completedAt: plan.completedAt
    };
  }

  private mapToMigrationResult(result: any): MigrationResult {
    return {
      id: result.id,
      planId: result.planId,
      status: result.status,
      totalRecords: result.totalRecords,
      processedRecords: result.processedRecords,
      failedRecords: result.failedRecords,
      errors: result.errors?.map((error: any) => ({
        recordId: error.recordId,
        error: error.error,
        step: error.step,
        timestamp: error.timestamp
      })) || [],
      startedAt: result.startedAt,
      completedAt: result.completedAt
    };
  }
}

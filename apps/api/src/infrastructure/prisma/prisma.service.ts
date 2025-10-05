/**
 * @fileoverview Prisma Database Service
 * 
 * This service provides database access for the CRM BenchSales AI Integration application
 * with automatic tenant isolation and multi-tenant data security. It extends the standard
 * PrismaClient with middleware that automatically filters all database operations by tenant,
 * ensuring complete data isolation between tenants.
 * 
 * Key features:
 * - Automatic tenant isolation for all database operations
 * - Multi-tenant data security and isolation
 * - Connection lifecycle management
 * - Prisma middleware for automatic tenant filtering
 * - Support for both scalar and relation-based tenant filtering
 * - Integration with request context for tenant resolution
 * 
 * @author Balaji Koneti
 * @email balaji.koneti08@gmail.com
 * @linkedin linkedin.com/in/balaji-koneti
 * @version 1.0.0
 * @since 2024
 */

import { INestApplication, Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";

import { RequestContextService } from "../context";

/**
 * Set of Prisma model names that require tenant isolation.
 * 
 * These models are automatically filtered by tenant ID in all database operations
 * to ensure complete data isolation between tenants in the multi-tenant architecture.
 * 
 * Models included:
 * - User management and authentication
 * - Consultant and requirement data
 * - Matching and submission workflows
 * - Audit logs and analytics
 * - Document and asset management
 * - AI activity tracking
 * - Feature flags and configuration
 */
const TENANT_SCOPED_MODELS = new Set<string>([
  "User",                    // User accounts and profiles
  "Consultant",             // Consultant profiles and data
  "Requirement",            // Job requirements and specifications
  "Match",                  // Consultant-requirement matches
  "Submission",             // Application submissions
  "Interview",              // Interview scheduling and data
  "ConsultantSkill",        // Consultant skill mappings
  "RequirementSkill",       // Required skills for positions
  "ConsultantTag",          // Consultant categorization tags
  "AuditLog",               // Audit trail and logging
  "AiActivity",             // AI service usage tracking
  "RequirementIngestion",   // Requirement data ingestion
  "Resume",                 // Resume documents and metadata
  "AnalyticsSnapshot",      // Analytics and reporting data
  "FeatureFlag",            // Feature flag configuration
  "DocumentAsset",          // Document storage and management
  "DocumentMetadata",       // Document metadata and indexing
  "SearchDocument",         // Search index documents
  "MatchFeatureSnapshot",   // Matching algorithm features
  "MatchFeedback",          // User feedback on matches
  "IdentitySignature",      // Identity verification signatures
  "IdentityCluster"         // Identity clustering data
]);

/**
 * Prisma database service with automatic tenant isolation.
 * 
 * This service extends the standard PrismaClient with middleware that automatically
 * filters all database operations by tenant ID, ensuring complete data isolation
 * between tenants. It integrates with the request context to determine the current
 * tenant and applies appropriate filters to all database operations.
 * 
 * @example
 * ```typescript
 * // In any service, inject the Prisma service
 * @Injectable()
 * export class UserService {
 *   constructor(private readonly prisma: PrismaService) {}
 *   
 *   async getUsers() {
 *     // This query is automatically filtered by tenant
 *     return this.prisma.user.findMany();
 *   }
 *   
 *   async createUser(userData: CreateUserDto) {
 *     // Tenant ID is automatically attached to new records
 *     return this.prisma.user.create({ data: userData });
 *   }
 * }
 * ```
 */
@Injectable()
export class PrismaService extends PrismaClient<Prisma.PrismaClientOptions, "beforeExit"> implements OnModuleInit, OnModuleDestroy {
  /**
   * Initializes the Prisma service with tenant isolation middleware.
   * 
   * Sets up Prisma middleware that automatically filters all database operations
   * by tenant ID for models in the TENANT_SCOPED_MODELS set. The middleware:
   * - Extracts tenant ID from request context
   * - Applies tenant filters to all read operations
   * - Attaches tenant ID to all write operations
   * - Handles both scalar and relation-based tenant filtering
   * 
   * @param context - Request context service for accessing current tenant
   */
  constructor(private readonly context: RequestContextService) {
    super();

    // Set up Prisma middleware for automatic tenant isolation
    this.$use(async (params, next) => {
      // Skip tenant filtering for models not in the tenant-scoped set
      if (!params.model || !TENANT_SCOPED_MODELS.has(params.model)) {
        return next(params);
      }

      // Get tenant ID from request context (either directly or from user)
      const tenantId = this.context.getTenantId() ?? this.context.getUser()?.tenantId;
      if (!tenantId) {
        return next(params);
      }

      // Apply tenant filtering based on operation type
      switch (params.action) {
        case "findUnique":
          // Convert findUnique to findFirst with tenant filter
          params.action = "findFirst";
          params.args.where = this.mergeTenantFilter(params.args.where, tenantId);
          break;
        case "findFirst":
        case "findMany":
        case "count":
        case "aggregate":
          // Add tenant filter to where clause
          params.args = {
            ...params.args,
            where: this.mergeTenantFilter(params.args?.where, tenantId)
          };
          break;
        case "update":
        case "delete":
        case "upsert":
          // Filter by tenant and attach tenant to data
          params.args.where = this.mergeTenantFilter(params.args.where, tenantId);
          if (params.action === "upsert") {
            params.args.create = this.attachTenant(params.args.create, tenantId, true);
            params.args.update = this.attachTenant(params.args.update, tenantId, false);
          } else if (params.action === "update") {
            params.args.data = this.attachTenant(params.args.data, tenantId, false);
          }
          break;
        case "updateMany":
        case "deleteMany":
          // Filter by tenant and attach tenant to update data
          params.args = {
            ...params.args,
            where: this.mergeTenantFilter(params.args?.where, tenantId)
          };
          if (params.action === "updateMany") {
            params.args.data = this.attachTenant(params.args.data, tenantId, false);
          }
          break;
        case "create":
          // Attach tenant ID to new records
          params.args.data = this.attachTenant(params.args.data, tenantId, true);
          break;
        case "createMany":
          // Attach tenant ID to all records in batch create
          if (Array.isArray(params.args?.data)) {
            params.args.data = params.args.data.map((item: Record<string, unknown>) => this.attachTenant(item, tenantId, false));
          } else if (params.args?.data) {
            params.args.data = this.attachTenant(params.args.data, tenantId, false);
          }
          break;
        default:
          // No tenant filtering needed for other operations
          break;
      }

      return next(params);
    });
  }

  /**
   * Initializes the database connection when the module starts.
   * 
   * This method is called automatically by NestJS when the module is initialized.
   * It establishes the connection to the database using the Prisma client.
   */
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  /**
   * Closes the database connection when the module is destroyed.
   * 
   * This method is called automatically by NestJS when the module is being destroyed.
   * It properly closes the database connection to prevent connection leaks.
   */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Enables shutdown hooks to gracefully close the application when Prisma disconnects.
   * 
   * This method should be called in the main.ts file to ensure the application
   * shuts down gracefully when the database connection is lost or the application
   * is being terminated.
   * 
   * @param app - The NestJS application instance
   * 
   * @example
   * ```typescript
   * // In main.ts
   * const prismaService = app.get(PrismaService);
   * await prismaService.enableShutdownHooks(app);
   * ```
   */
  async enableShutdownHooks(app: INestApplication): Promise<void> {
    this.$on("beforeExit", async () => {
      await app.close();
    });
  }

  /**
   * Merges tenant ID filter with existing where clause conditions.
   * 
   * This private method ensures that tenant filtering is properly combined with
   * any existing where conditions using Prisma's AND operator. It handles both
   * simple where clauses and complex nested conditions.
   * 
   * @param where - Existing where clause conditions
   * @param tenantId - Tenant ID to filter by
   * @returns Merged where clause with tenant filter
   */
  private mergeTenantFilter(where: Record<string, unknown> | undefined, tenantId: string) {
    if (!where || Object.keys(where).length === 0) {
      return { tenantId };
    }
    if (Array.isArray(where.AND)) {
      return { ...where, AND: [...where.AND, { tenantId }] };
    }
    return { ...where, tenantId };
  }

  /**
   * Attaches tenant ID to data objects for create and update operations.
   * 
   * This private method ensures that tenant ID is properly attached to data
   * objects when creating or updating records. It supports both scalar
   * tenantId fields and relation-based tenant connections.
   * 
   * @template T - The type of the data object
   * @param data - The data object to attach tenant ID to
   * @param tenantId - The tenant ID to attach
   * @param allowRelation - Whether to allow relation-based tenant connection
   * @returns The data object with tenant ID attached
   */
  private attachTenant<T extends Record<string, unknown> | undefined>(data: T, tenantId: string, allowRelation = false): T {
    if (!data) {
      return data;
    }

    const hasRelationObject = Object.prototype.hasOwnProperty.call(data as Record<string, unknown>, "tenant");
    const hasTenantIdScalar = Object.prototype.hasOwnProperty.call(data as Record<string, unknown>, "tenantId");

    // If the caller provided a nested relation, do not force the scalar foreign key
    if (!hasRelationObject && !hasTenantIdScalar) {
      (data as Record<string, unknown>).tenantId = tenantId;
    }

    if (allowRelation && !hasRelationObject) {
      (data as Record<string, unknown>).tenant = { connect: { id: tenantId } };
    }

    return data;
  }
}

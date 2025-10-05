/**
 * @fileoverview Prisma Database Module
 * 
 * This module provides database access functionality for the CRM BenchSales AI Integration application.
 * It exports a global PrismaService that includes automatic tenant isolation, connection management,
 * and lifecycle hooks for proper database connection handling.
 * 
 * The Prisma service provides:
 * - Automatic tenant isolation for multi-tenant data access
 * - Connection lifecycle management (connect/disconnect)
 * - Prisma middleware for automatic tenant filtering
 * - Integration with request context for tenant resolution
 * - Global availability for dependency injection
 * 
 * @author Balaji Koneti
 * @email balaji.koneti08@gmail.com
 * @linkedin linkedin.com/in/balaji-koneti
 * @version 1.0.0
 * @since 2024
 */

import { Global, Module } from "@nestjs/common";

import { RequestContextModule } from "../context";
import { PrismaService } from "./prisma.service";

/**
 * Global module that provides database access through Prisma with tenant isolation.
 * 
 * This module is marked as @Global() to make the PrismaService available throughout
 * the entire application without needing to import it in every module that needs
 * database access. It includes automatic tenant isolation middleware that ensures
 * all database operations are properly scoped to the current tenant.
 * 
 * The module depends on:
 * - RequestContextModule: For accessing current tenant information
 * 
 * @example
 * ```typescript
 * // In any service, inject the Prisma service
 * @Injectable()
 * export class UserService {
 *   constructor(private readonly prisma: PrismaService) {}
 *   
 *   async getUser(id: string) {
 *     // This query is automatically filtered by tenant
 *     return this.prisma.user.findUnique({ where: { id } });
 *   }
 * }
 * ```
 * 
 * @example
 * ```typescript
 * // In main.ts, enable shutdown hooks
 * const prismaService = app.get(PrismaService);
 * await prismaService.enableShutdownHooks(app);
 * ```
 */
@Global()
@Module({
  imports: [RequestContextModule],
  providers: [PrismaService],
  exports: [PrismaService]
})
export class PrismaModule {}

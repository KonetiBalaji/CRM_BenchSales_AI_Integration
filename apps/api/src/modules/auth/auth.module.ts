/**
 * @fileoverview Authentication Module
 * 
 * This module provides authentication and authorization functionality for the CRM BenchSales AI Integration application.
 * It implements JWT-based authentication with Auth0 integration, role-based access control, and multi-tenant
 * security features for secure API access and user management.
 * 
 * Key features:
 * - JWT token validation with Auth0 integration
 * - Role-based access control (RBAC)
 * - Multi-tenant security and isolation
 * - Public endpoint support
 * - Mock authentication for development
 * - Comprehensive guard system for authorization
 * 
 * @author Balaji Koneti
 * @email balaji.koneti08@gmail.com
 * @linkedin linkedin.com/in/balaji-koneti
 * @version 1.0.0
 * @since 2024
 */

import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PassportModule } from "@nestjs/passport";

import { JwtStrategy } from "./jwt.strategy";

/**
 * Module for authentication and authorization functionality.
 * 
 * This module provides comprehensive authentication and authorization capabilities
 * for the CRM system, including JWT validation, role-based access control, and
 * multi-tenant security features.
 * 
 * The module includes:
 * - JwtStrategy: JWT token validation and user extraction
 * - Guards: JwtAuthGuard, RolesGuard, TenantAccessGuard
 * - Decorators: @Public(), @Roles()
 * - Interfaces: AuthUser
 * 
 * @example
 * ```typescript
 * // Import the module in your application
 * @Module({
 *   imports: [AuthModule],
 *   // ... other module configuration
 * })
 * export class AppModule {}
 * ```
 * 
 * @example
 * ```typescript
 * // Use authentication in controllers
 * @Controller('tenants/:tenantId/consultants')
 * @UseGuards(JwtAuthGuard, RolesGuard, TenantAccessGuard)
 * export class ConsultantsController {
 *   @Get()
 *   @Roles(UserRole.ADMIN, UserRole.MANAGER)
 *   async getConsultants() {
 *     // Only accessible to ADMIN and MANAGER roles
 *   }
 * 
 *   @Get('public')
 *   @Public()
 *   async getPublicData() {
 *     // Accessible without authentication
 *   }
 * }
 * ```
 */
@Module({
  imports: [ConfigModule, PassportModule.register({ defaultStrategy: "jwt" })],
  providers: [JwtStrategy],
  exports: [PassportModule]
})
export class AuthModule {}

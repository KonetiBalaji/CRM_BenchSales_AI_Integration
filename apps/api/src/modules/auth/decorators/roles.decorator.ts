/**
 * @fileoverview Roles Decorator
 * 
 * This decorator defines role-based access control for endpoints in the CRM BenchSales AI Integration application.
 * It specifies which user roles are required to access specific endpoints, working with the RolesGuard
 * to enforce authorization based on user roles.
 * 
 * @author Balaji Koneti
 * @email balaji.koneti08@gmail.com
 * @linkedin linkedin.com/in/balaji-koneti
 * @version 1.0.0
 * @since 2024
 */

import { SetMetadata } from "@nestjs/common";
import { UserRole } from "@prisma/client";

/** Metadata key used to identify role requirements for endpoints */
export const ROLES_KEY = "roles";

/**
 * Decorator that specifies required user roles for endpoint access.
 * 
 * This decorator defines which user roles are allowed to access a specific endpoint.
 * It works in conjunction with the RolesGuard to enforce role-based access control.
 * Users must have at least one of the specified roles to access the endpoint.
 * 
 * @param roles - Array of user roles that are allowed to access the endpoint
 * @returns Metadata decorator that specifies the required roles
 * 
 * @example
 * ```typescript
 * @Controller('tenants/:tenantId/consultants')
 * export class ConsultantsController {
 *   @Get()
 *   @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.REP)
 *   async getConsultants() {
 *     // Only ADMIN, MANAGER, or REP roles can access this endpoint
 *     return this.consultantsService.findAll();
 *   }
 * 
 *   @Post()
 *   @Roles(UserRole.ADMIN, UserRole.MANAGER)
 *   async createConsultant(@Body() data: CreateConsultantDto) {
 *     // Only ADMIN or MANAGER roles can create consultants
 *     return this.consultantsService.create(data);
 *   }
 * 
 *   @Delete(':id')
 *   @Roles(UserRole.ADMIN)
 *   async deleteConsultant(@Param('id') id: string) {
 *     // Only ADMIN role can delete consultants
 *     return this.consultantsService.remove(id);
 *   }
 * }
 * ```
 * 
 * @example
 * ```typescript
 * // Apply to entire controller
 * @Controller('admin')
 * @Roles(UserRole.ADMIN)
 * export class AdminController {
 *   @Get('settings')
 *   async getSettings() {
 *     // All endpoints in this controller require ADMIN role
 *     return this.settingsService.getSettings();
 *   }
 * 
 *   @Post('settings')
 *   async updateSettings(@Body() data: UpdateSettingsDto) {
 *     // Also requires ADMIN role
 *     return this.settingsService.updateSettings(data);
 *   }
 * }
 * ```
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

/**
 * @fileoverview Public Decorator
 * 
 * This decorator marks endpoints as public, allowing access without authentication
 * for the CRM BenchSales AI Integration application. It works with the authentication
 * guards to bypass JWT validation for specific routes.
 * 
 * @author Balaji Koneti
 * @email balaji.koneti08@gmail.com
 * @linkedin linkedin.com/in/balaji-koneti
 * @version 1.0.0
 * @since 2024
 */

import { SetMetadata } from "@nestjs/common";

/** Metadata key used to identify public endpoints */
export const IS_PUBLIC_KEY = "isPublic";

/**
 * Decorator that marks an endpoint as public, bypassing authentication.
 * 
 * This decorator allows endpoints to be accessed without JWT authentication.
 * It works in conjunction with the authentication guards to skip security
 * checks for specific routes that need to be publicly accessible.
 * 
 * @returns Metadata decorator that marks the endpoint as public
 * 
 * @example
 * ```typescript
 * @Controller('health')
 * export class HealthController {
 *   @Get()
 *   @Public()
 *   async getHealth() {
 *     // This endpoint is accessible without authentication
 *     return { status: 'ok' };
 *   }
 * 
 *   @Get('private')
 *   async getPrivateHealth() {
 *     // This endpoint requires authentication
 *     return { status: 'ok', user: this.getCurrentUser() };
 *   }
 * }
 * ```
 * 
 * @example
 * ```typescript
 * // Apply to entire controller
 * @Controller('public')
 * @Public()
 * export class PublicController {
 *   @Get('info')
 *   async getInfo() {
 *     // All endpoints in this controller are public
 *     return { version: '1.0.0' };
 *   }
 * }
 * ```
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

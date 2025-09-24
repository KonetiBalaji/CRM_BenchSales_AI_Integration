/**
 * @fileoverview Request Context Module
 * 
 * This module provides request context management functionality for the CRM BenchSales AI Integration application.
 * It exports both the RequestContextService and RequestContextMiddleware as global providers,
 * making them available throughout the entire application without requiring explicit imports.
 * 
 * The module provides:
 * - RequestContextService: Core service for managing request-scoped data
 * - RequestContextMiddleware: Express middleware for automatic context setup
 * - Global availability for dependency injection
 * - Type-safe context access throughout the application
 * 
 * @author Balaji Koneti
 * @email balaji.koneti08@gmail.com
 * @linkedin linkedin.com/in/balaji-koneti
 * @version 1.0.0
 * @since 2024
 */

import { Global, Module } from "@nestjs/common";

import { RequestContextMiddleware } from "./request-context.middleware";
import { RequestContextService } from "./request-context.service";

/**
 * Global module that provides request context management services.
 * 
 * This module is marked as @Global() to make the RequestContextService and
 * RequestContextMiddleware available throughout the entire application without
 * needing to import this module in every other module that needs context access.
 * 
 * The module provides:
 * - RequestContextService: For accessing and managing request context data
 * - RequestContextMiddleware: For automatic context initialization on each request
 * 
 * @example
 * ```typescript
 * // In any service or controller, inject the context service
 * @Injectable()
 * export class SomeService {
 *   constructor(private readonly context: RequestContextService) {}
 *   
 *   someMethod() {
 *     const requestId = this.context.getRequestId();
 *     const user = this.context.getUser();
 *     const tenantId = this.context.getTenantId();
 *   }
 * }
 * ```
 * 
 * @example
 * ```typescript
 * // In main.ts, apply the middleware globally
 * app.use(RequestContextMiddleware);
 * ```
 */
@Global()
@Module({
  providers: [RequestContextService, RequestContextMiddleware],
  exports: [RequestContextService, RequestContextMiddleware]
})
export class RequestContextModule {}

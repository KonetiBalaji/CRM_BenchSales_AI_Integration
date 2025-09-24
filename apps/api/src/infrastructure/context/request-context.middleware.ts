/**
 * @fileoverview Request Context Middleware
 * 
 * This middleware automatically sets up request context for each incoming HTTP request
 * in the CRM BenchSales AI Integration application. It initializes the AsyncLocalStorage
 * context with a unique request ID and ensures that all subsequent operations within
 * the request lifecycle have access to the request context.
 * 
 * Key features:
 * - Automatic request ID generation for tracing
 * - Request-scoped context initialization
 * - Integration with Express.js middleware pipeline
 * - Support for nested async operations
 * 
 * @author Balaji Koneti
 * @email balaji.koneti08@gmail.com
 * @linkedin linkedin.com/in/balaji-koneti
 * @version 1.0.0
 * @since 2024
 */

import { Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";

import { RequestContextService } from "./request-context.service";

/**
 * Express middleware that initializes request context for each HTTP request.
 * 
 * This middleware must be registered early in the middleware pipeline to ensure
 * that all subsequent middleware and route handlers have access to the request
 * context. It creates a new AsyncLocalStorage context for each request and
 * automatically generates a unique request ID for tracing purposes.
 * 
 * The middleware should be applied globally to capture all requests:
 * 
 * @example
 * ```typescript
 * // In main.ts or app.module.ts
 * app.use(RequestContextMiddleware);
 * 
 * // Or in a module
 * @Module({
 *   providers: [RequestContextMiddleware],
 * })
 * export class AppModule implements NestModule {
 *   configure(consumer: MiddlewareConsumer) {
 *     consumer.apply(RequestContextMiddleware).forRoutes('*');
 *   }
 * }
 * ```
 * 
 * @example
 * ```typescript
 * // Accessing context in any service or controller
 * constructor(private readonly context: RequestContextService) {}
 * 
 * someMethod() {
 *   const requestId = this.context.getRequestId();
 *   const user = this.context.getUser();
 *   const tenantId = this.context.getTenantId();
 * }
 * ```
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  /**
   * Initializes the request context middleware with the context service.
   * 
   * @param contextService - The request context service for managing context state
   */
  constructor(private readonly contextService: RequestContextService) {}

  /**
   * Middleware function that sets up request context and continues the request pipeline.
   * 
   * This method is called for each incoming request and:
   * 1. Creates a new AsyncLocalStorage context with a unique request ID
   * 2. Executes the rest of the middleware pipeline within that context
   * 3. Ensures all operations within the request have access to the context
   * 
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function to continue the middleware pipeline
   */
  use(req: Request, res: Response, next: NextFunction): void {
    // Initialize request context with unique request ID and execute the rest of the pipeline
    this.contextService.run(() => next());
  }
}

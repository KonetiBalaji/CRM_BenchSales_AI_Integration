/**
 * @fileoverview Request Context Infrastructure
 * 
 * This module provides request context management for the CRM BenchSales AI Integration application.
 * It enables tracking of request-specific information throughout the request lifecycle, including
 * user authentication, tenant isolation, and request tracing.
 * 
 * The request context system provides:
 * - Request-scoped data storage using AsyncLocalStorage
 * - Automatic request ID generation for tracing
 * - User and tenant context management
 * - Middleware integration for automatic context setup
 * - Type-safe context access throughout the application
 * 
 * @author Balaji Koneti
 * @email balaji.koneti08@gmail.com
 * @linkedin linkedin.com/in/balaji-koneti
 * @version 1.0.0
 * @since 2024
 */

/**
 * Re-exports all request context related modules and services.
 * 
 * This barrel export provides a clean interface for importing request context
 * functionality throughout the application. It includes:
 * 
 * - RequestContextMiddleware: Express middleware for setting up request context
 * - RequestContextModule: NestJS module for dependency injection
 * - RequestContextService: Core service for context management
 * 
 * @example
 * ```typescript
 * import { RequestContextService, RequestContextMiddleware } from '@/infrastructure/context';
 * 
 * // Use in a service
 * constructor(private readonly context: RequestContextService) {}
 * 
 * // Use in middleware configuration
 * app.use(RequestContextMiddleware);
 * ```
 */
export * from "./request-context.middleware";
export * from "./request-context.module";
export * from "./request-context.service";

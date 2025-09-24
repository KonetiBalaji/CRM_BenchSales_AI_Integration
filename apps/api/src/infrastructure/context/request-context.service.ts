/**
 * @fileoverview Request Context Service
 * 
 * This service provides request-scoped context management for the CRM BenchSales AI Integration application.
 * It uses Node.js AsyncLocalStorage to maintain request-specific data throughout the entire request lifecycle,
 * enabling features like request tracing, user authentication context, and tenant isolation.
 * 
 * Key features:
 * - Request-scoped data storage using AsyncLocalStorage
 * - Automatic request ID generation for tracing
 * - User authentication context management
 * - Tenant isolation support
 * - Type-safe context access
 * - Support for nested async operations
 * 
 * @author Balaji Koneti
 * @email balaji.koneti08@gmail.com
 * @linkedin linkedin.com/in/balaji-koneti
 * @version 1.0.0
 * @since 2024
 */

import { AsyncLocalStorage } from "async_hooks";
import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";

import { AuthUser } from "../../modules/auth/interfaces/auth-user.interface";

/**
 * Interface defining the structure of request context data.
 * 
 * Contains all request-scoped information that needs to be available
 * throughout the request lifecycle, including tracing, authentication,
 * and tenant isolation data.
 */
export interface RequestContext {
  /** Unique identifier for the current request, used for tracing and logging */
  requestId: string;
  /** Authenticated user information, populated after authentication */
  user?: AuthUser;
  /** Tenant identifier for multi-tenant data isolation */
  tenantId?: string;
}

/**
 * Service for managing request-scoped context using AsyncLocalStorage.
 * 
 * This service provides a way to store and access request-specific data
 * throughout the entire request lifecycle, including nested async operations.
 * It's essential for features like request tracing, user context, and tenant isolation.
 * 
 * @example
 * ```typescript
 * // In a service or controller
 * constructor(private readonly context: RequestContextService) {}
 * 
 * async someMethod() {
 *   const requestId = this.context.getRequestId();
 *   const user = this.context.getUser();
 *   const tenantId = this.context.getTenantId();
 *   
 *   // All nested async operations will have access to this context
 *   await this.doSomethingAsync();
 * }
 * 
 * private async doSomethingAsync() {
 *   // This method can still access the request context
 *   const requestId = this.context.getRequestId();
 *   console.log(`Processing request: ${requestId}`);
 * }
 * ```
 */
@Injectable()
export class RequestContextService {
  /** AsyncLocalStorage instance for maintaining request context */
  private readonly storage = new AsyncLocalStorage<RequestContext>();

  /**
   * Executes a callback function within a new request context.
   * 
   * This method creates a new request context with a unique request ID and
   * executes the provided callback within that context. All nested async
   * operations will have access to this context.
   * 
   * @template T - The return type of the callback function
   * @param callback - Function to execute within the request context
   * @returns The result of the callback function
   * 
   * @example
   * ```typescript
   * // This is typically called by the RequestContextMiddleware
   * const result = this.contextService.run(() => {
   *   // All operations here have access to the request context
   *   return this.processRequest();
   * });
   * ```
   */
  run<T>(callback: () => T): T {
    const context: RequestContext = { requestId: randomUUID() };
    return this.storage.run(context, callback);
  }

  /**
   * Retrieves the current request context.
   * 
   * @returns The current request context or undefined if not in a request context
   */
  getContext(): RequestContext | undefined {
    return this.storage.getStore();
  }

  /**
   * Sets the authenticated user in the current request context.
   * 
   * This method should be called after successful authentication to make
   * user information available throughout the request lifecycle.
   * 
   * @param user - The authenticated user information
   * 
   * @example
   * ```typescript
   * // In authentication middleware or guard
   * this.contextService.setUser(authenticatedUser);
   * ```
   */
  setUser(user: AuthUser): void {
    const store = this.storage.getStore();
    if (store) {
      store.user = user;
    }
  }

  /**
   * Sets the tenant ID in the current request context.
   * 
   * This method is used for multi-tenant applications to ensure
   * proper data isolation throughout the request lifecycle.
   * 
   * @param tenantId - The tenant identifier
   * 
   * @example
   * ```typescript
   * // In tenant resolution middleware
   * this.contextService.setTenant(tenantId);
   * ```
   */
  setTenant(tenantId: string): void {
    const store = this.storage.getStore();
    if (store) {
      store.tenantId = tenantId;
    }
  }

  /**
   * Retrieves the authenticated user from the current request context.
   * 
   * @returns The authenticated user or undefined if not authenticated
   * 
   * @example
   * ```typescript
   * const user = this.contextService.getUser();
   * if (user) {
   *   console.log(`Current user: ${user.email}`);
   * }
   * ```
   */
  getUser(): AuthUser | undefined {
    return this.storage.getStore()?.user;
  }

  /**
   * Retrieves the tenant ID from the current request context.
   * 
   * @returns The tenant ID or undefined if not set
   * 
   * @example
   * ```typescript
   * const tenantId = this.contextService.getTenantId();
   * if (tenantId) {
   *   // Apply tenant-specific logic
   *   return this.getTenantData(tenantId);
   * }
   * ```
   */
  getTenantId(): string | undefined {
    return this.storage.getStore()?.tenantId;
  }

  /**
   * Retrieves the request ID from the current request context.
   * 
   * The request ID is useful for tracing, logging, and debugging purposes.
   * It's automatically generated when the request context is created.
   * 
   * @returns The request ID or undefined if not in a request context
   * 
   * @example
   * ```typescript
   * const requestId = this.contextService.getRequestId();
   * this.logger.log(`Processing request: ${requestId}`);
   * ```
   */
  getRequestId(): string | undefined {
    return this.storage.getStore()?.requestId;
  }
}

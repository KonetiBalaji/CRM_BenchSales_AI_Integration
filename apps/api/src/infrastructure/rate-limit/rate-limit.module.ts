/**
 * @fileoverview Rate Limiting Module
 * 
 * This module provides rate limiting functionality for the CRM BenchSales AI Integration application.
 * It implements both fixed-window and sliding-window rate limiting algorithms to protect the
 * application from abuse and ensure fair resource usage across different user types and tenants.
 * 
 * The rate limiting service supports:
 * - Multiple rate limiting strategies (fixed window, sliding window)
 * - Different limits for different user types (tenant, user, global, API key)
 * - Redis-based distributed rate limiting
 * - Configurable time windows and request limits
 * - Rate limit status monitoring and reporting
 * 
 * @author Balaji Koneti
 * @email balaji.koneti08@gmail.com
 * @linkedin linkedin.com/in/balaji-koneti
 * @version 1.0.0
 * @since 2024
 */

import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { CacheModule } from "../cache/cache.module";
import { RateLimitService } from "./rate-limit.service";

/**
 * Global rate limiting module that provides distributed rate limiting services.
 * 
 * This module implements rate limiting to protect the application from abuse and
 * ensure fair resource usage. It supports multiple rate limiting strategies and
 * different limits for different user types and access patterns.
 * 
 * The module depends on:
 * - ConfigModule: For accessing rate limiting configuration
 * - CacheModule: For Redis-based distributed rate limiting storage
 * 
 * @example
 * ```typescript
 * // In any service or controller
 * constructor(private readonly rateLimit: RateLimitService) {}
 * 
 * async someEndpoint() {
 *   const result = await this.rateLimit.checkUserLimit(userId, 'api-endpoint');
 *   if (!result.allowed) {
 *     throw new TooManyRequestsException('Rate limit exceeded');
 *   }
 *   // Process request
 * }
 * ```
 * 
 * @example
 * ```typescript
 * // In middleware or guard
 * async canActivate(context: ExecutionContext): Promise<boolean> {
 *   const request = context.switchToHttp().getRequest();
 *   const result = await this.rateLimit.checkTenantLimit(tenantId, request.path);
 *   return result.allowed;
 * }
 * ```
 */
@Global()
@Module({
  imports: [ConfigModule, CacheModule],
  providers: [RateLimitService],
  exports: [RateLimitService]
})
export class RateLimitModule {}

/**
 * @fileoverview Rate Limiting Service
 * 
 * This service provides comprehensive rate limiting functionality for the CRM BenchSales AI Integration application.
 * It implements both fixed-window and sliding-window rate limiting algorithms using Redis for distributed
 * rate limiting across multiple application instances.
 * 
 * Key features:
 * - Fixed-window rate limiting for simple use cases
 * - Sliding-window rate limiting for more accurate limits
 * - Multiple rate limiting tiers (tenant, user, global, API key)
 * - Redis-based distributed rate limiting
 * - Configurable time windows and request limits
 * - Rate limit status monitoring and reporting
 * - Automatic key generation and management
 * 
 * @author Balaji Koneti
 * @email balaji.koneti08@gmail.com
 * @linkedin linkedin.com/in/balaji-koneti
 * @version 1.0.0
 * @since 2024
 */

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CacheService } from "../cache/cache.service";

/**
 * Configuration interface for rate limiting behavior.
 * 
 * Defines the parameters that control rate limiting, including time windows,
 * request limits, and optional behavior modifications.
 */
export interface RateLimitConfig {
  /** Time window in milliseconds for rate limiting */
  windowMs: number;
  /** Maximum number of requests allowed per window */
  maxRequests: number;
  /** Whether to skip counting successful requests (optional) */
  skipSuccessfulRequests?: boolean;
  /** Whether to skip counting failed requests (optional) */
  skipFailedRequests?: boolean;
  /** Custom key generator function for request identification (optional) */
  keyGenerator?: (req: any) => string;
}

/**
 * Result interface for rate limiting operations.
 * 
 * Contains information about whether the request is allowed and
 * current rate limit status for the client.
 */
export interface RateLimitResult {
  /** Whether the request is allowed under current rate limits */
  allowed: boolean;
  /** Number of requests remaining in the current window */
  remaining: number;
  /** Timestamp when the rate limit window resets */
  resetTime: number;
  /** Total number of requests made in the current window */
  totalHits: number;
}

/**
 * Service for implementing distributed rate limiting using Redis.
 * 
 * This service provides both fixed-window and sliding-window rate limiting
 * algorithms to protect the application from abuse and ensure fair resource
 * usage. It supports multiple rate limiting tiers and configurations for
 * different user types and access patterns.
 * 
 * @example
 * ```typescript
 * // Basic rate limiting
 * const result = await this.rateLimit.checkLimit('user:123', {
 *   windowMs: 60000,  // 1 minute
 *   maxRequests: 10   // 10 requests per minute
 * });
 * 
 * if (!result.allowed) {
 *   throw new TooManyRequestsException('Rate limit exceeded');
 * }
 * ```
 * 
 * @example
 * ```typescript
 * // Tenant-specific rate limiting
 * const result = await this.rateLimit.checkTenantLimit(tenantId, 'api-endpoint');
 * 
 * // User-specific rate limiting
 * const result = await this.rateLimit.checkUserLimit(userId, 'api-endpoint');
 * ```
 */
@Injectable()
export class RateLimitService {
  /** Logger instance for rate limiting operations and monitoring */
  private readonly logger = new Logger(RateLimitService.name);
  
  /** Default rate limiting configuration */
  private readonly defaultConfig: RateLimitConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100           // 100 requests per 15 minutes
  };

  /**
   * Initializes the rate limiting service with required dependencies.
   * 
   * @param cache - Cache service for Redis-based rate limiting storage
   * @param configService - Configuration service for accessing settings
   */
  constructor(
    private readonly cache: CacheService,
    private readonly configService: ConfigService
  ) {}

  /**
   * Checks if a request is allowed under the current rate limit using fixed-window algorithm.
   * 
   * This method implements fixed-window rate limiting, which is simpler and more
   * performant than sliding-window but may allow bursts at window boundaries.
   * 
   * @param key - Unique identifier for the rate limit (e.g., user ID, IP address)
   * @param config - Optional configuration override for this check
   * @returns Rate limit result with allowance status and current usage information
   * 
   * @example
   * ```typescript
   * const result = await this.rateLimit.checkLimit('user:123', {
   *   windowMs: 60000,  // 1 minute window
   *   maxRequests: 10   // 10 requests per minute
   * });
   * 
   * if (!result.allowed) {
   *   throw new TooManyRequestsException(`Rate limit exceeded. Try again at ${new Date(result.resetTime)}`);
   * }
   * 
   * console.log(`Requests remaining: ${result.remaining}`);
   * ```
   */
  async checkLimit(
    key: string, 
    config: Partial<RateLimitConfig> = {}
  ): Promise<RateLimitResult> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const now = Date.now();
    const windowStart = now - finalConfig.windowMs;
    
    // Get current window data using fixed-window approach
    const windowKey = `rate_limit:${key}:${Math.floor(now / finalConfig.windowMs)}`;
    const currentHits = await this.cache.get<number>(windowKey) || 0;
    
    // Check if limit exceeded
    const allowed = currentHits < finalConfig.maxRequests;
    
    if (allowed) {
      // Increment counter for this window
      await this.cache.increment(windowKey, 1);
      await this.cache.expire(windowKey, Math.ceil(finalConfig.windowMs / 1000));
    }
    
    const remaining = Math.max(0, finalConfig.maxRequests - currentHits - (allowed ? 1 : 0));
    const resetTime = Math.ceil(now / finalConfig.windowMs) * finalConfig.windowMs;
    
    return {
      allowed,
      remaining,
      resetTime,
      totalHits: currentHits + (allowed ? 1 : 0)
    };
  }

  /**
   * Checks rate limit for tenant-specific operations.
   * 
   * Applies higher rate limits for tenant-level operations since they typically
   * represent organizational usage rather than individual user usage.
   * 
   * @param tenantId - The tenant identifier
   * @param endpoint - The API endpoint being accessed
   * @returns Rate limit result for the tenant
   * 
   * @example
   * ```typescript
   * const result = await this.rateLimit.checkTenantLimit(tenantId, '/api/consultants');
   * if (!result.allowed) {
   *   throw new TooManyRequestsException('Tenant rate limit exceeded');
   * }
   * ```
   */
  async checkTenantLimit(tenantId: string, endpoint: string): Promise<RateLimitResult> {
    const key = `tenant:${tenantId}:${endpoint}`;
    const config = this.getTenantRateLimitConfig();
    return this.checkLimit(key, config);
  }

  /**
   * Checks rate limit for user-specific operations.
   * 
   * Applies standard rate limits for individual user operations to prevent
   * abuse while allowing normal usage patterns.
   * 
   * @param userId - The user identifier
   * @param endpoint - The API endpoint being accessed
   * @returns Rate limit result for the user
   * 
   * @example
   * ```typescript
   * const result = await this.rateLimit.checkUserLimit(userId, '/api/profile');
   * if (!result.allowed) {
   *   throw new TooManyRequestsException('User rate limit exceeded');
   * }
   * ```
   */
  async checkUserLimit(userId: string, endpoint: string): Promise<RateLimitResult> {
    const key = `user:${userId}:${endpoint}`;
    const config = this.getUserRateLimitConfig();
    return this.checkLimit(key, config);
  }

  /**
   * Checks rate limit for global operations.
   * 
   * Applies very high rate limits for global operations that affect the
   * entire system rather than specific tenants or users.
   * 
   * @param endpoint - The API endpoint being accessed
   * @returns Rate limit result for global operations
   * 
   * @example
   * ```typescript
   * const result = await this.rateLimit.checkGlobalLimit('/api/health');
   * if (!result.allowed) {
   *   throw new TooManyRequestsException('Global rate limit exceeded');
   * }
   * ```
   */
  async checkGlobalLimit(endpoint: string): Promise<RateLimitResult> {
    const key = `global:${endpoint}`;
    const config = this.getGlobalRateLimitConfig();
    return this.checkLimit(key, config);
  }

  /**
   * Checks rate limit for API key-based operations.
   * 
   * Applies moderate rate limits for API key operations, which are typically
   * used for system-to-system integration and automated processes.
   * 
   * @param apiKey - The API key identifier
   * @returns Rate limit result for the API key
   * 
   * @example
   * ```typescript
   * const result = await this.rateLimit.checkApiKeyLimit(apiKey);
   * if (!result.allowed) {
   *   throw new TooManyRequestsException('API key rate limit exceeded');
   * }
   * ```
   */
  async checkApiKeyLimit(apiKey: string): Promise<RateLimitResult> {
    const key = `api_key:${apiKey}`;
    const config = this.getApiKeyRateLimitConfig();
    return this.checkLimit(key, config);
  }

  /**
   * Resets rate limit for a specific key.
   * 
   * This method clears all rate limiting data for the specified key,
   * effectively resetting their rate limit status.
   * 
   * @param key - The rate limit key to reset
   * @note This is a placeholder implementation. In production, this would
   * use Redis SCAN to find and delete all matching keys.
   */
  async resetLimit(key: string): Promise<void> {
    const pattern = `rate_limit:${key}:*`;
    // This would need to be implemented with Redis SCAN for production
    this.logger.log(`Resetting rate limit for key: ${key}`);
  }

  /**
   * Retrieves current rate limit status for a specific key.
   * 
   * @param key - The rate limit key to check
   * @returns Current rate limit status including usage and limits
   * 
   * @example
   * ```typescript
   * const status = await this.rateLimit.getLimitStatus('user:123');
   * console.log(`Current usage: ${status.current}/${status.limit}`);
   * console.log(`Remaining: ${status.remaining}`);
   * console.log(`Resets at: ${new Date(status.resetTime)}`);
   * ```
   */
  async getLimitStatus(key: string): Promise<{
    current: number;
    limit: number;
    resetTime: number;
    remaining: number;
  }> {
    const now = Date.now();
    const windowKey = `rate_limit:${key}:${Math.floor(now / this.defaultConfig.windowMs)}`;
    const currentHits = await this.cache.get<number>(windowKey) || 0;
    const resetTime = Math.ceil(now / this.defaultConfig.windowMs) * this.defaultConfig.windowMs;
    
    return {
      current: currentHits,
      limit: this.defaultConfig.maxRequests,
      resetTime,
      remaining: Math.max(0, this.defaultConfig.maxRequests - currentHits)
    };
  }

  /**
   * Gets rate limiting configuration for tenant-level operations.
   * 
   * Tenant operations typically have higher limits since they represent
   * organizational usage rather than individual user usage.
   * 
   * @returns Rate limit configuration for tenant operations
   */
  private getTenantRateLimitConfig(): RateLimitConfig {
    return {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 1000          // Higher limit for tenant-level requests
    };
  }

  /**
   * Gets rate limiting configuration for user-level operations.
   * 
   * User operations have standard limits to prevent abuse while
   * allowing normal usage patterns.
   * 
   * @returns Rate limit configuration for user operations
   */
  private getUserRateLimitConfig(): RateLimitConfig {
    return {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100           // Standard user limit
    };
  }

  /**
   * Gets rate limiting configuration for global operations.
   * 
   * Global operations have very high limits since they typically
   * represent system-wide operations rather than user-specific actions.
   * 
   * @returns Rate limit configuration for global operations
   */
  private getGlobalRateLimitConfig(): RateLimitConfig {
    return {
      windowMs: 60 * 1000,  // 1 minute
      maxRequests: 10000    // High limit for global endpoints
    };
  }

  /**
   * Gets rate limiting configuration for API key operations.
   * 
   * API key operations have moderate limits since they're typically
   * used for system-to-system integration and automated processes.
   * 
   * @returns Rate limit configuration for API key operations
   */
  private getApiKeyRateLimitConfig(): RateLimitConfig {
    return {
      windowMs: 60 * 1000,  // 1 minute
      maxRequests: 1000     // API key specific limit
    };
  }

  /**
   * Checks rate limit using sliding window algorithm for more accurate limiting.
   * 
   * The sliding window algorithm provides more accurate rate limiting by tracking
   * requests over a rolling time window rather than fixed time buckets. This
   * prevents burst traffic at window boundaries but is more computationally expensive.
   * 
   * @param key - Unique identifier for the rate limit
   * @param config - Optional configuration override for this check
   * @returns Rate limit result with allowance status and current usage information
   * 
   * @example
   * ```typescript
   * // Use sliding window for more accurate rate limiting
   * const result = await this.rateLimit.checkSlidingWindowLimit('user:123', {
   *   windowMs: 60000,  // 1 minute sliding window
   *   maxRequests: 10   // 10 requests per minute
   * });
   * 
   * if (!result.allowed) {
   *   throw new TooManyRequestsException('Rate limit exceeded');
   * }
   * ```
   * 
   * @note This method uses Redis sorted sets and is more expensive than fixed-window
   * rate limiting. Use it when accuracy is more important than performance.
   */
  async checkSlidingWindowLimit(
    key: string,
    config: Partial<RateLimitConfig> = {}
  ): Promise<RateLimitResult> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const now = Date.now();
    const windowStart = now - finalConfig.windowMs;
    
    // Use Redis sorted set for sliding window implementation
    const sortedSetKey = `rate_limit_sliding:${key}`;
    
    // Remove expired entries from the sliding window
    await this.cache.redis?.zremrangebyscore(sortedSetKey, 0, windowStart);
    
    // Count current requests in the sliding window
    const currentHits = await this.cache.redis?.zcard(sortedSetKey) || 0;
    
    const allowed = currentHits < finalConfig.maxRequests;
    
    if (allowed) {
      // Add current request to the sliding window with unique identifier
      await this.cache.redis?.zadd(sortedSetKey, now, `${now}-${Math.random()}`);
      await this.cache.redis?.expire(sortedSetKey, Math.ceil(finalConfig.windowMs / 1000));
    }
    
    const remaining = Math.max(0, finalConfig.maxRequests - currentHits - (allowed ? 1 : 0));
    const resetTime = now + finalConfig.windowMs;
    
    return {
      allowed,
      remaining,
      resetTime,
      totalHits: currentHits + (allowed ? 1 : 0)
    };
  }
}

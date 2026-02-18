/**
 * Enhanced Rate Limiting Service
 * Implements sliding window rate limiting per tenant and user
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { HttpExceptionFactory } from '../error-handling/http-exception.factory';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

@Injectable()
export class EnhancedRateLimitService {
  private readonly logger = new Logger(EnhancedRateLimitService.name);
  private readonly redis: Redis;

  // Default rate limits by plan
  private readonly planLimits: Record<string, RateLimitConfig> = {
    FREE: { windowMs: 60000, maxRequests: 60 }, // 60 req/min
    TEAM: { windowMs: 60000, maxRequests: 300 }, // 300 req/min
    ENTERPRISE: { windowMs: 60000, maxRequests: 1000 }, // 1000 req/min
  };

  // Endpoint-specific rate limits
  private readonly endpointLimits: Record<string, RateLimitConfig> = {
    '/api/v1/ai-gateway': { windowMs: 60000, maxRequests: 10 },
    '/api/v1/matching': { windowMs: 60000, maxRequests: 30 },
    '/api/v1/vector-search': { windowMs: 60000, maxRequests: 50 },
  };

  constructor(private readonly config: ConfigService) {
    this.redis = new Redis({
      host: config.get('redis.host', 'localhost'),
      port: config.get('redis.port', 6379),
      password: config.get('redis.password'),
      db: config.get('redis.db', 1), // Use different DB for rate limiting
    });
  }

  /**
   * Check rate limit for a tenant
   */
  async checkTenantRateLimit(
    tenantId: string,
    plan: string = 'FREE'
  ): Promise<RateLimitResult> {
    const config = this.planLimits[plan] || this.planLimits.FREE;
    const key = `ratelimit:tenant:${tenantId}`;
    return this.checkRateLimit(key, config);
  }

  /**
   * Check rate limit for a user
   */
  async checkUserRateLimit(
    userId: string,
    config?: RateLimitConfig
  ): Promise<RateLimitResult> {
    const limitConfig = config || this.planLimits.FREE;
    const key = `ratelimit:user:${userId}`;
    return this.checkRateLimit(key, limitConfig);
  }

  /**
   * Check rate limit for an endpoint
   */
  async checkEndpointRateLimit(
    tenantId: string,
    endpoint: string
  ): Promise<RateLimitResult> {
    const config = this.endpointLimits[endpoint];
    if (!config) {
      return { allowed: true, remaining: Infinity, resetTime: new Date() };
    }

    const key = `ratelimit:endpoint:${tenantId}:${endpoint}`;
    return this.checkRateLimit(key, config);
  }

  /**
   * Check rate limit for AI token usage
   */
  async checkAITokenRateLimit(
    tenantId: string,
    tokensToConsume: number
  ): Promise<RateLimitResult> {
    const key = `ratelimit:ai-tokens:${tenantId}`;
    const config: RateLimitConfig = {
      windowMs: 3600000, // 1 hour
      maxRequests: 100000, // 100k tokens per hour for basic plan
    };

    return this.checkRateLimit(key, config, tokensToConsume);
  }

  /**
   * Core rate limiting logic using sliding window
   */
  private async checkRateLimit(
    key: string,
    config: RateLimitConfig,
    weight: number = 1
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      // Use Redis sorted set for sliding window
      const pipeline = this.redis.pipeline();
      
      // Remove old entries
      pipeline.zremrangebyscore(key, 0, windowStart);
      
      // Count requests in current window
      pipeline.zcard(key);
      
      // Add current request
      pipeline.zadd(key, now, `${now}-${Math.random()}`);
      
      // Set expiry
      pipeline.expire(key, Math.ceil(config.windowMs / 1000));

      const results = await pipeline.exec();
      const count = (results?.[1]?.[1] as number) || 0;

      const allowed = count + weight <= config.maxRequests;
      const remaining = Math.max(0, config.maxRequests - count - weight);
      const resetTime = new Date(now + config.windowMs);
      const retryAfter = allowed ? undefined : Math.ceil(config.windowMs / 1000);

      if (!allowed) {
        this.logger.warn(`Rate limit exceeded for key: ${key}`);
      }

      return {
        allowed,
        remaining,
        resetTime,
        retryAfter,
      };
    } catch (error) {
      this.logger.error(`Rate limit check failed for ${key}:`, error);
      // Fail open - allow request if Redis is down
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetTime: new Date(now + config.windowMs),
      };
    }
  }

  /**
   * Reset rate limit for a key
   */
  async resetRateLimit(key: string): Promise<void> {
    await this.redis.del(key);
    this.logger.log(`Reset rate limit for key: ${key}`);
  }

  /**
   * Get current rate limit status
   */
  async getRateLimitStatus(key: string, config: RateLimitConfig): Promise<any> {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    const count = await this.redis.zcount(key, windowStart, now);

    return {
      current: count,
      limit: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - count),
      resetTime: new Date(now + config.windowMs),
    };
  }
}

/**
 * @fileoverview Cache Service
 * 
 * This service provides a comprehensive Redis-based caching layer for the CRM BenchSales AI Integration application.
 * It offers high-performance key-value storage with automatic JSON serialization, TTL management,
 * and robust error handling for distributed caching scenarios.
 * 
 * Key features:
 * - Automatic JSON serialization/deserialization
 * - Configurable TTL (Time To Live) for cache entries
 * - Bulk operations for improved performance
 * - Atomic increment/decrement operations
 * - Pattern-based cache invalidation
 * - Connection resilience with retry logic
 * - Comprehensive logging and monitoring
 * 
 * @author Balaji Koneti
 * @email balaji.koneti08@gmail.com
 * @linkedin linkedin.com/in/balaji-koneti
 * @version 1.0.0
 * @since 2024
 */

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

/**
 * Redis-based cache service providing high-performance distributed caching capabilities.
 * 
 * This service wraps the ioredis client with additional features like automatic JSON
 * serialization, error handling, and connection management. It's designed to be
 * resilient to Redis connection issues and provides fallback behavior when cache
 * operations fail.
 * 
 * @example
 * ```typescript
 * // Basic usage
 * await this.cache.set('user:123', userData, 3600); // Cache for 1 hour
 * const user = await this.cache.get<User>('user:123');
 * 
 * // Bulk operations
 * await this.cache.mset({
 *   'key1': value1,
 *   'key2': value2
 * }, 1800); // Cache for 30 minutes
 * 
 * const values = await this.cache.mget(['key1', 'key2']);
 * ```
 */
@Injectable()
export class CacheService {
  /** Logger instance for cache operations and error tracking */
  private readonly logger = new Logger(CacheService.name);
  
  /** Redis client instance for cache operations */
  private readonly redis: Redis;
  
  /** Default TTL (Time To Live) in seconds for cache entries (1 hour) */
  private readonly defaultTtl = 3600;

  /**
   * Initializes the cache service with Redis connection configuration.
   * 
   * Sets up a Redis client with optimized connection settings for production use,
   * including retry logic, connection timeouts, and event handlers for monitoring
   * connection status.
   * 
   * @param configService - NestJS configuration service for accessing Redis URL
   */
  constructor(private readonly configService: ConfigService) {
    // Get Redis connection URL from configuration with localhost fallback
    const redisUrl = this.configService.get<string>("redisUrl") ?? "redis://localhost:6379";
    
    // Initialize Redis client with production-optimized settings
    this.redis = new Redis(redisUrl, {
      retryDelayOnFailover: 100,    // 100ms delay between retry attempts
      maxRetriesPerRequest: 3,      // Maximum 3 retries per request
      lazyConnect: true,            // Connect only when first command is issued
      keepAlive: 30000,            // Keep connection alive for 30 seconds
      connectTimeout: 10000,       // 10 second connection timeout
      commandTimeout: 5000         // 5 second command timeout
    });

    // Handle Redis connection errors gracefully
    this.redis.on("error", (error) => {
      this.logger.error("Redis connection error:", error);
    });

    // Log successful Redis connections
    this.redis.on("connect", () => {
      this.logger.log("Connected to Redis");
    });
  }

  /**
   * Retrieves a value from the cache by key with automatic JSON deserialization.
   * 
   * @template T - The expected type of the cached value
   * @param key - The cache key to retrieve
   * @returns The cached value or null if not found or on error
   * 
   * @example
   * ```typescript
   * const user = await this.cache.get<User>('user:123');
   * if (user) {
   *   console.log('Found cached user:', user.name);
   * }
   * ```
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.logger.error(`Failed to get cache key ${key}:`, error);
      return null;
    }
  }

  /**
   * Stores a value in the cache with automatic JSON serialization and TTL.
   * 
   * @param key - The cache key to store the value under
   * @param value - The value to cache (will be JSON serialized)
   * @param ttl - Time to live in seconds (optional, defaults to 1 hour)
   * 
   * @example
   * ```typescript
   * await this.cache.set('user:123', userData, 3600); // Cache for 1 hour
   * await this.cache.set('temp:data', tempData); // Use default TTL
   * ```
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await this.redis.setex(key, ttl ?? this.defaultTtl, serialized);
    } catch (error) {
      this.logger.error(`Failed to set cache key ${key}:`, error);
    }
  }

  /**
   * Deletes a key from the cache.
   * 
   * @param key - The cache key to delete
   * 
   * @example
   * ```typescript
   * await this.cache.del('user:123'); // Remove user from cache
   * ```
   */
  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Failed to delete cache key ${key}:`, error);
    }
  }

  /**
   * Checks if a key exists in the cache.
   * 
   * @param key - The cache key to check
   * @returns True if the key exists, false otherwise
   * 
   * @example
   * ```typescript
   * if (await this.cache.exists('user:123')) {
   *   console.log('User is cached');
   * }
   * ```
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to check cache key existence ${key}:`, error);
      return false;
    }
  }

  /**
   * Retrieves multiple values from the cache in a single operation.
   * 
   * @template T - The expected type of the cached values
   * @param keys - Array of cache keys to retrieve
   * @returns Array of cached values (null for missing keys)
   * 
   * @example
   * ```typescript
   * const users = await this.cache.mget<User>(['user:1', 'user:2', 'user:3']);
   * users.forEach((user, index) => {
   *   if (user) console.log(`User ${index + 1}:`, user.name);
   * });
   * ```
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const values = await this.redis.mget(...keys);
      return values.map(value => value ? JSON.parse(value) : null);
    } catch (error) {
      this.logger.error(`Failed to get multiple cache keys:`, error);
      return keys.map(() => null);
    }
  }

  /**
   * Stores multiple key-value pairs in the cache atomically.
   * 
   * @param keyValuePairs - Object containing key-value pairs to store
   * @param ttl - Time to live in seconds for all keys (optional)
   * 
   * @example
   * ```typescript
   * await this.cache.mset({
   *   'user:1': user1Data,
   *   'user:2': user2Data,
   *   'user:3': user3Data
   * }, 1800); // Cache all for 30 minutes
   * ```
   */
  async mset(keyValuePairs: Record<string, any>, ttl?: number): Promise<void> {
    try {
      const serializedPairs: string[] = [];
      for (const [key, value] of Object.entries(keyValuePairs)) {
        serializedPairs.push(key, JSON.stringify(value));
      }
      
      await this.redis.mset(...serializedPairs);
      
      if (ttl) {
        const pipeline = this.redis.pipeline();
        for (const key of Object.keys(keyValuePairs)) {
          pipeline.expire(key, ttl);
        }
        await pipeline.exec();
      }
    } catch (error) {
      this.logger.error(`Failed to set multiple cache keys:`, error);
    }
  }

  /**
   * Atomically increments a numeric value in the cache.
   * 
   * @param key - The cache key to increment
   * @param amount - Amount to increment by (default: 1)
   * @returns The new value after increment
   * 
   * @example
   * ```typescript
   * const newCount = await this.cache.increment('page:views', 1);
   * console.log(`Page views: ${newCount}`);
   * ```
   */
  async increment(key: string, amount = 1): Promise<number> {
    try {
      return await this.redis.incrby(key, amount);
    } catch (error) {
      this.logger.error(`Failed to increment cache key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Atomically decrements a numeric value in the cache.
   * 
   * @param key - The cache key to decrement
   * @param amount - Amount to decrement by (default: 1)
   * @returns The new value after decrement
   * 
   * @example
   * ```typescript
   * const remaining = await this.cache.decrement('api:quota', 1);
   * console.log(`Remaining quota: ${remaining}`);
   * ```
   */
  async decrement(key: string, amount = 1): Promise<number> {
    try {
      return await this.redis.decrby(key, amount);
    } catch (error) {
      this.logger.error(`Failed to decrement cache key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Sets the expiration time for an existing cache key.
   * 
   * @param key - The cache key to set expiration for
   * @param ttl - Time to live in seconds
   * 
   * @example
   * ```typescript
   * await this.cache.expire('user:123', 7200); // Extend to 2 hours
   * ```
   */
  async expire(key: string, ttl: number): Promise<void> {
    try {
      await this.redis.expire(key, ttl);
    } catch (error) {
      this.logger.error(`Failed to set expiration for cache key ${key}:`, error);
    }
  }

  /**
   * Flushes all keys from the current Redis database.
   * 
   * ⚠️ WARNING: This operation removes ALL cached data and should be used with caution.
   * 
   * @example
   * ```typescript
   * await this.cache.flush(); // Clear all cache data
   * ```
   */
  async flush(): Promise<void> {
    try {
      await this.redis.flushdb();
    } catch (error) {
      this.logger.error("Failed to flush cache:", error);
    }
  }

  /**
   * Retrieves cache statistics and health information.
   * 
   * @returns Object containing cache connection status, memory usage, and key count
   * 
   * @example
   * ```typescript
   * const stats = await this.cache.getStats();
   * console.log(`Cache connected: ${stats.connected}`);
   * console.log(`Memory used: ${stats.memory}`);
   * console.log(`Keys stored: ${stats.keys}`);
   * ```
   */
  async getStats(): Promise<{
    connected: boolean;
    memory: string;
    keys: number;
    uptime: number;
  }> {
    try {
      const info = await this.redis.info("memory");
      const dbSize = await this.redis.dbsize();
      
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memory = memoryMatch ? memoryMatch[1] : "unknown";
      
      return {
        connected: this.redis.status === "ready",
        memory,
        keys: dbSize,
        uptime: 0 // Would need to parse from info
      };
    } catch (error) {
      this.logger.error("Failed to get cache stats:", error);
      return {
        connected: false,
        memory: "unknown",
        keys: 0,
        uptime: 0
      };
    }
  }

  /**
   * Generates a standardized cache key for tenant-scoped resources.
   * 
   * @param tenantId - The tenant identifier
   * @param resource - The resource type (e.g., 'users', 'consultants')
   * @param id - Optional specific resource ID
   * @returns Formatted cache key for tenant-scoped data
   * 
   * @example
   * ```typescript
   * const key = CacheService.tenantKey('tenant-123', 'users', 'user-456');
   * // Returns: 'tenant:tenant-123:users:user-456'
   * ```
   */
  static tenantKey(tenantId: string, resource: string, id?: string): string {
    return `tenant:${tenantId}:${resource}${id ? `:${id}` : ""}`;
  }

  /**
   * Generates a standardized cache key for user-scoped resources.
   * 
   * @param userId - The user identifier
   * @param resource - The resource type (e.g., 'preferences', 'sessions')
   * @returns Formatted cache key for user-scoped data
   * 
   * @example
   * ```typescript
   * const key = CacheService.userKey('user-123', 'preferences');
   * // Returns: 'user:user-123:preferences'
   * ```
   */
  static userKey(userId: string, resource: string): string {
    return `user:${userId}:${resource}`;
  }

  /**
   * Generates a standardized cache key for global resources.
   * 
   * @param resource - The resource type (e.g., 'config', 'stats')
   * @param parts - Additional key parts to append
   * @returns Formatted cache key for global data
   * 
   * @example
   * ```typescript
   * const key = CacheService.globalKey('config', 'features', 'enabled');
   * // Returns: 'global:config:features:enabled'
   * ```
   */
  static globalKey(resource: string, ...parts: string[]): string {
    return `global:${resource}:${parts.join(":")}`;
  }

  /**
   * Invalidates all cache keys matching a given pattern.
   * 
   * ⚠️ WARNING: This operation can be expensive for large key sets and should be used carefully.
   * Consider using more specific key patterns to avoid performance issues.
   * 
   * @param redis - Redis client instance
   * @param pattern - Redis key pattern (supports wildcards like * and ?)
   * 
   * @example
   * ```typescript
   * // Invalidate all user cache entries for a specific tenant
   * await CacheService.invalidatePattern(redis, 'tenant:tenant-123:users:*');
   * 
   * // Invalidate all cache entries for a specific user
   * await CacheService.invalidatePattern(redis, 'user:user-123:*');
   * ```
   */
  static async invalidatePattern(redis: Redis, pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

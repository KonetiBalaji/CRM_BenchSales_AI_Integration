/**
 * Multi-Level Cache Service
 * Implements L1 (in-memory) and L2 (Redis) caching with smart invalidation
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { LRUCache } from 'lru-cache';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  useL1?: boolean; // Use in-memory cache
  useL2?: boolean; // Use Redis cache
  compress?: boolean; // Compress large values
}

@Injectable()
export class MultiLevelCacheService {
  private readonly logger = new Logger(MultiLevelCacheService.name);
  private readonly redis: Redis;
  private readonly l1Cache: LRUCache<string, any>;

  constructor(private readonly config: ConfigService) {
    // Initialize Redis (L2 cache)
    this.redis = new Redis({
      host: config.get('redis.host', 'localhost'),
      port: config.get('redis.port', 6379),
      password: config.get('redis.password'),
      db: config.get('redis.cacheDb', 2),
      keyPrefix: 'cache:',
    });

    // Initialize in-memory LRU cache (L1 cache)
    this.l1Cache = new LRUCache({
      max: config.get('cache.l1MaxItems', 1000),
      maxSize: config.get('cache.l1MaxSizeMB', 100) * 1024 * 1024,
      sizeCalculation: (value) => JSON.stringify(value).length,
      ttl: config.get('cache.l1DefaultTTL', 60) * 1000, // 60 seconds default
    });
  }

  /**
   * Get value from cache (L1 -> L2)
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const useL1 = options.useL1 !== false;
    const useL2 = options.useL2 !== false;

    try {
      // Try L1 cache first
      if (useL1) {
        const l1Value = this.l1Cache.get(key);
        if (l1Value !== undefined) {
          this.logger.debug(`L1 cache hit: ${key}`);
          return l1Value as T;
        }
      }

      // Try L2 cache (Redis)
      if (useL2) {
        const l2Value = await this.redis.get(key);
        if (l2Value) {
          this.logger.debug(`L2 cache hit: ${key}`);
          const parsed = JSON.parse(l2Value);
          
          // Populate L1 cache
          if (useL1) {
            this.l1Cache.set(key, parsed, { ttl: (options.ttl || 60) * 1000 });
          }
          
          return parsed as T;
        }
      }

      this.logger.debug(`Cache miss: ${key}`);
      return null;
    } catch (error) {
      this.logger.error(`Cache get error for ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache (both L1 and L2)
   */
  async set(key: string, value: any, options: CacheOptions = {}): Promise<void> {
    const useL1 = options.useL1 !== false;
    const useL2 = options.useL2 !== false;
    const ttl = options.ttl || 300; // 5 minutes default

    try {
      const serialized = JSON.stringify(value);

      // Set in L1 cache
      if (useL1) {
        this.l1Cache.set(key, value, { ttl: ttl * 1000 });
      }

      // Set in L2 cache (Redis)
      if (useL2) {
        await this.redis.setex(key, ttl, serialized);
      }

      this.logger.debug(`Cached: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      this.logger.error(`Cache set error for ${key}:`, error);
    }
  }

  /**
   * Delete from cache
   */
  async del(key: string): Promise<void> {
    try {
      this.l1Cache.delete(key);
      await this.redis.del(key);
      this.logger.debug(`Deleted from cache: ${key}`);
    } catch (error) {
      this.logger.error(`Cache delete error for ${key}:`, error);
    }
  }

  /**
   * Delete by pattern (L2 only)
   */
  async delPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.debug(`Deleted ${keys.length} keys matching pattern: ${pattern}`);
        return keys.length;
      }
      return 0;
    } catch (error) {
      this.logger.error(`Cache delete pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Get or set pattern (cache-aside)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    // Generate value
    const value = await factory();

    // Store in cache
    await this.set(key, value, options);

    return value;
  }

  /**
   * Invalidate tenant cache
   */
  async invalidateTenant(tenantId: string): Promise<void> {
    const pattern = `tenant:${tenantId}:*`;
    const count = await this.delPattern(pattern);
    this.logger.log(`Invalidated ${count} cache entries for tenant ${tenantId}`);
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUp(entries: Array<{ key: string; value: any; ttl?: number }>): Promise<void> {
    this.logger.log(`Warming up cache with ${entries.length} entries`);
    
    for (const entry of entries) {
      await this.set(entry.key, entry.value, { ttl: entry.ttl });
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      l1: {
        size: this.l1Cache.size,
        maxSize: this.l1Cache.max,
        calculatedSize: this.l1Cache.calculatedSize,
      },
      l2: {
        connected: this.redis.status === 'ready',
      },
    };
  }

  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    this.l1Cache.clear();
    await this.redis.flushdb();
    this.logger.warn('Cleared all cache levels');
  }

  /**
   * Tenant-scoped cache key
   */
  static tenantKey(tenantId: string, resource: string, id?: string): string {
    return `tenant:${tenantId}:${resource}${id ? `:${id}` : ''}`;
  }

  /**
   * User-scoped cache key
   */
  static userKey(userId: string, resource: string, id?: string): string {
    return `user:${userId}:${resource}${id ? `:${id}` : ''}`;
  }
}

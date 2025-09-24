/**
 * @fileoverview Cache Module
 * 
 * This module provides Redis-based caching functionality for the CRM BenchSales AI Integration application.
 * It exports a global CacheService that can be used throughout the application for storing and retrieving
 * cached data, session management, and performance optimization.
 * 
 * The cache service supports:
 * - Key-value storage with TTL (Time To Live)
 * - JSON serialization/deserialization
 * - Bulk operations (mget/mset)
 * - Atomic increment/decrement operations
 * - Pattern-based key invalidation
 * - Cache statistics and monitoring
 * 
 * @author Balaji Koneti
 * @email balaji.koneti08@gmail.com
 * @linkedin linkedin.com/in/balaji-koneti
 * @version 1.0.0
 * @since 2024
 */

import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { CacheService } from "./cache.service";

/**
 * Global cache module that provides Redis-based caching services.
 * 
 * This module is marked as @Global() to make the CacheService available
 * throughout the entire application without needing to import it in every module.
 * It depends on the ConfigModule to access Redis connection configuration.
 * 
 * @example
 * ```typescript
 * // In any service or controller
 * constructor(private readonly cache: CacheService) {}
 * 
 * async getData() {
 *   const cached = await this.cache.get('my-key');
 *   if (!cached) {
 *     const data = await this.fetchData();
 *     await this.cache.set('my-key', data, 3600); // Cache for 1 hour
 *     return data;
 *   }
 *   return cached;
 * }
 * ```
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [CacheService],
  exports: [CacheService]
})
export class CacheModule {}

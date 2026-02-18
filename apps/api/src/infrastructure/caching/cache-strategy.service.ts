import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
  namespace?: string;
}

@Injectable()
export class CacheStrategyService {
  private readonly logger = new Logger(CacheStrategyService.name);
  private readonly defaultTTL: number;

  constructor(
    private readonly cache: CacheService,
    private readonly config: ConfigService,
  ) {
    this.defaultTTL = this.config.get<number>('CACHE_TTL', 300);
  }

  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    try {
      const fullKey = this.buildKey(key, options?.namespace);
      return await this.cache.get<T>(fullKey);
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}: ${error.message}`);
      return null;
    }
  }

  async set<T>(
    key: string,
    value: T,
    options?: CacheOptions,
  ): Promise<void> {
    try {
      const fullKey = this.buildKey(key, options?.namespace);
      const ttl = options?.ttl ?? this.defaultTTL;
      await this.cache.set(fullKey, value, ttl);
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}: ${error.message}`);
    }
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions,
  ): Promise<T> {
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  async invalidate(key: string, namespace?: string): Promise<void> {
    try {
      const fullKey = this.buildKey(key, namespace);
      await this.cache.del(fullKey);
    } catch (error) {
      this.logger.error(`Cache invalidate error for key ${key}: ${error.message}`);
    }
  }

  async invalidateByPattern(pattern: string, namespace?: string): Promise<void> {
    try {
      const fullPattern = this.buildKey(pattern, namespace);
      const keys = await this.cache.keys(fullPattern);
      if (keys.length > 0) {
        await Promise.all(keys.map(key => this.cache.del(key)));
      }
    } catch (error) {
      this.logger.error(`Cache invalidate pattern error: ${error.message}`);
    }
  }

  async invalidateByTags(tags: string[]): Promise<void> {
    for (const tag of tags) {
      await this.invalidateByPattern(`*:tag:${tag}:*`);
    }
  }

  private buildKey(key: string, namespace?: string): string {
    const parts = ['benchcrm'];
    if (namespace) {
      parts.push(namespace);
    }
    parts.push(key);
    return parts.join(':');
  }

  buildTenantKey(tenantId: string, resource: string, id?: string): string {
    const parts = [tenantId, resource];
    if (id) {
      parts.push(id);
    }
    return parts.join(':');
  }

  async warmCache<T>(
    keys: string[],
    factory: (key: string) => Promise<T>,
    options?: CacheOptions,
  ): Promise<void> {
    this.logger.log(`Warming cache for ${keys.length} keys`);
    await Promise.all(
      keys.map(async (key) => {
        try {
          const value = await factory(key);
          await this.set(key, value, options);
        } catch (error) {
          this.logger.error(`Failed to warm cache for key ${key}: ${error.message}`);
        }
      }),
    );
  }
}

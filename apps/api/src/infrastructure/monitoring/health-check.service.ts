/**
 * Health Check Service
 * Monitors system health and dependencies
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
    queues: ServiceHealth;
    storage: ServiceHealth;
  };
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}

interface ServiceHealth {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  error?: string;
  details?: any;
}

@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);
  private readonly startTime = Date.now();
  private readonly redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService
  ) {
    this.redis = new Redis({
      host: config.get('redis.host', 'localhost'),
      port: config.get('redis.port', 6379),
      password: config.get('redis.password'),
    });
  }

  async check(): Promise<HealthCheckResult> {
    const [database, redis, queues, storage] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkQueues(),
      this.checkStorage(),
    ]);

    const services = { database, redis, queues, storage };
    const status = this.calculateOverallStatus(services);

    return {
      status,
      timestamp: new Date(),
      services,
      uptime: Date.now() - this.startTime,
      memory: this.getMemoryStats(),
    };
  }

  private async checkDatabase(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'up',
        responseTime: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'down',
        error: error.message,
      };
    }
  }

  private async checkRedis(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      await this.redis.ping();
      return {
        status: 'up',
        responseTime: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'down',
        error: error.message,
      };
    }
  }

  private async checkQueues(): Promise<ServiceHealth> {
    // BullMQ queue health check - implement when queues are configured
    return { status: 'up' };
  }

  private async checkStorage(): Promise<ServiceHealth> {
    // S3 connectivity check - implement when S3 is configured
    return { status: 'up' };
  }

  private calculateOverallStatus(services: any): 'healthy' | 'degraded' | 'unhealthy' {
    const statuses = Object.values(services).map((s: any) => s.status);
    
    if (statuses.every(s => s === 'up')) {
      return 'healthy';
    }
    if (statuses.some(s => s === 'down')) {
      return 'unhealthy';
    }
    return 'degraded';
  }

  private getMemoryStats() {
    const used = process.memoryUsage().heapUsed;
    const total = process.memoryUsage().heapTotal;
    return {
      used,
      total,
      percentage: (used / total) * 100,
    };
  }
}

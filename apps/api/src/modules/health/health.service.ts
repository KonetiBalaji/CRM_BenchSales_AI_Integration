import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { CacheService } from "../../infrastructure/cache/cache.service";
import { CircuitBreakerService } from "../../infrastructure/circuit-breaker/circuit-breaker.service";

export interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: HealthCheck;
    cache: HealthCheck;
    external_apis: HealthCheck;
    memory: HealthCheck;
    disk: HealthCheck;
  };
  metrics: {
    memory: NodeJS.MemoryUsage;
    cpu: {
      usage: number;
      loadAverage: number[];
    };
  };
}

export interface HealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  responseTime?: number;
  error?: string;
  details?: any;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly circuitBreaker: CircuitBreakerService
  ) {}

  async getHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    // Run all health checks in parallel
    const [
      databaseCheck,
      cacheCheck,
      externalApisCheck,
      memoryCheck,
      diskCheck
    ] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkCache(),
      this.checkExternalApis(),
      this.checkMemory(),
      this.checkDisk()
    ]);

    const checks = {
      database: this.getCheckResult(databaseCheck),
      cache: this.getCheckResult(cacheCheck),
      external_apis: this.getCheckResult(externalApisCheck),
      memory: this.getCheckResult(memoryCheck),
      disk: this.getCheckResult(diskCheck)
    };

    // Determine overall status
    const overallStatus = this.determineOverallStatus(checks);
    
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || "unknown",
      environment: this.configService.get<string>("NODE_ENV") || "development",
      checks,
      metrics: {
        memory: process.memoryUsage(),
        cpu: {
          usage: await this.getCpuUsage(),
          loadAverage: require("os").loadavg()
        }
      }
    };
  }

  async checkDatabase(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      await this.circuitBreaker.executeDatabase(async () => {
        await this.prisma.$queryRaw`SELECT 1`;
      });
      
      return {
        status: "healthy",
        responseTime: Date.now() - startTime,
        details: {
          connected: true,
          connectionPool: "active"
        }
      };
    } catch (error) {
      this.logger.error("Database health check failed:", error);
      return {
        status: "unhealthy",
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  async checkCache(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      const stats = await this.cache.getStats();
      
      return {
        status: stats.connected ? "healthy" : "unhealthy",
        responseTime: Date.now() - startTime,
        details: {
          connected: stats.connected,
          memory: stats.memory,
          keys: stats.keys
        }
      };
    } catch (error) {
      this.logger.error("Cache health check failed:", error);
      return {
        status: "unhealthy",
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  async checkExternalApis(): Promise<HealthCheck> {
    const startTime = Date.now();
    const apiChecks = [];
    
    // Check OpenAI API
    try {
      await this.circuitBreaker.executeAiService(async () => {
        // This would make a simple API call to OpenAI
        // For now, just check if the API key is configured
        const apiKey = this.configService.get<string>("openaiApiKey");
        if (!apiKey) {
          throw new Error("OpenAI API key not configured");
        }
      });
      apiChecks.push({ service: "openai", status: "healthy" });
    } catch (error) {
      apiChecks.push({ 
        service: "openai", 
        status: "unhealthy", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }

    // Check Stripe API
    try {
      const stripeKey = this.configService.get<string>("stripeSecretKey");
      if (!stripeKey) {
        throw new Error("Stripe API key not configured");
      }
      apiChecks.push({ service: "stripe", status: "healthy" });
    } catch (error) {
      apiChecks.push({ 
        service: "stripe", 
        status: "unhealthy", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }

    const healthyCount = apiChecks.filter(check => check.status === "healthy").length;
    const overallStatus = healthyCount === apiChecks.length ? "healthy" : 
                         healthyCount > 0 ? "degraded" : "unhealthy";

    return {
      status: overallStatus,
      responseTime: Date.now() - startTime,
      details: {
        services: apiChecks,
        healthy: healthyCount,
        total: apiChecks.length
      }
    };
  }

  async checkMemory(): Promise<HealthCheck> {
    const memoryUsage = process.memoryUsage();
    const totalMemory = require("os").totalmem();
    const freeMemory = require("os").freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;

    let status: "healthy" | "degraded" | "unhealthy" = "healthy";
    
    if (memoryUsagePercent > 90) {
      status = "unhealthy";
    } else if (memoryUsagePercent > 80) {
      status = "degraded";
    }

    return {
      status,
      details: {
        usage: {
          rss: memoryUsage.rss,
          heapTotal: memoryUsage.heapTotal,
          heapUsed: memoryUsage.heapUsed,
          external: memoryUsage.external
        },
        system: {
          total: totalMemory,
          free: freeMemory,
          used: usedMemory,
          usagePercent: memoryUsagePercent
        }
      }
    };
  }

  async checkDisk(): Promise<HealthCheck> {
    try {
      const fs = require("fs");
      const path = require("path");
      
      // Check disk space (simplified - would use proper disk usage library in production)
      const tempDir = require("os").tmpdir();
      const stats = fs.statSync(tempDir);
      
      return {
        status: "healthy",
        details: {
          tempDir: tempDir,
          accessible: true
        }
      };
    } catch (error) {
      return {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  private getCheckResult(result: PromiseSettledResult<HealthCheck>): HealthCheck {
    if (result.status === "fulfilled") {
      return result.value;
    } else {
      return {
        status: "unhealthy",
        error: result.reason instanceof Error ? result.reason.message : "Unknown error"
      };
    }
  }

  private determineOverallStatus(checks: Record<string, HealthCheck>): "healthy" | "degraded" | "unhealthy" {
    const statuses = Object.values(checks).map(check => check.status);
    
    if (statuses.includes("unhealthy")) {
      return "unhealthy";
    } else if (statuses.includes("degraded")) {
      return "degraded";
    } else {
      return "healthy";
    }
  }

  private async getCpuUsage(): Promise<number> {
    // Simplified CPU usage calculation
    // In production, would use proper CPU monitoring library
    return 0;
  }

  // Liveness probe - simple check that the service is running
  async liveness(): Promise<{ status: "alive"; timestamp: string }> {
    return {
      status: "alive",
      timestamp: new Date().toISOString()
    };
  }

  // Readiness probe - check if service is ready to accept traffic
  async readiness(): Promise<{ status: "ready" | "not_ready"; timestamp: string; checks: any }> {
    const databaseCheck = await this.checkDatabase();
    const cacheCheck = await this.checkCache();
    
    const isReady = databaseCheck.status === "healthy" && cacheCheck.status === "healthy";
    
    return {
      status: isReady ? "ready" : "not_ready",
      timestamp: new Date().toISOString(),
      checks: {
        database: databaseCheck.status,
        cache: cacheCheck.status
      }
    };
  }
}

import { Injectable, OnModuleInit } from '@nestjs/common';
import { register, Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class PrometheusService implements OnModuleInit {
  private httpRequestsTotal: Counter;
  private httpRequestDuration: Histogram;
  private databaseQueryDuration: Histogram;
  private cacheHitRate: Gauge;
  private activeConnections: Gauge;

  onModuleInit() {
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code', 'tenant_id'],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    });

    this.databaseQueryDuration = new Histogram({
      name: 'database_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'model'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
    });

    this.cacheHitRate = new Gauge({
      name: 'cache_hit_rate',
      help: 'Cache hit rate percentage',
      labelNames: ['cache_type'],
    });

    this.activeConnections = new Gauge({
      name: 'active_database_connections',
      help: 'Number of active database connections',
    });
  }

  incrementHttpRequests(method: string, route: string, statusCode: number, tenantId?: string) {
    this.httpRequestsTotal.inc({
      method,
      route,
      status_code: statusCode.toString(),
      tenant_id: tenantId || 'unknown',
    });
  }

  observeHttpDuration(method: string, route: string, statusCode: number, durationSeconds: number) {
    this.httpRequestDuration.observe(
      {
        method,
        route,
        status_code: statusCode.toString(),
      },
      durationSeconds,
    );
  }

  observeDatabaseQuery(operation: string, model: string, durationSeconds: number) {
    this.databaseQueryDuration.observe(
      {
        operation,
        model,
      },
      durationSeconds,
    );
  }

  setCacheHitRate(cacheType: string, rate: number) {
    this.cacheHitRate.set({ cache_type: cacheType }, rate);
  }

  setActiveConnections(count: number) {
    this.activeConnections.set(count);
  }

  getMetrics(): Promise<string> {
    return register.metrics();
  }
}

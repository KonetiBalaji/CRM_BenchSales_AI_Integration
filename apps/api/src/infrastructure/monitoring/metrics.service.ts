/**
 * Metrics Service
 * Collects and exports application metrics for monitoring
 */

import { Injectable, Logger } from '@nestjs/common';
import { Counter, Histogram, Gauge, register } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  // HTTP metrics
  private readonly httpRequestsTotal: Counter;
  private readonly httpRequestDuration: Histogram;
  private readonly httpRequestSize: Histogram;
  private readonly httpResponseSize: Histogram;

  // Database metrics
  private readonly dbQueryDuration: Histogram;
  private readonly dbConnectionsActive: Gauge;
  private readonly dbQueriesTotal: Counter;

  // Business metrics
  private readonly consultantsActive: Gauge;
  private readonly requirementsOpen: Gauge;
  private readonly matchesGenerated: Counter;
  private readonly submissionsCreated: Counter;

  // Cache metrics
  private readonly cacheHits: Counter;
  private readonly cacheMisses: Counter;
  private readonly cacheSize: Gauge;

  // Queue metrics
  private readonly queueJobsProcessed: Counter;
  private readonly queueJobsFailed: Counter;
  private readonly queueJobDuration: Histogram;
  private readonly queueDepth: Gauge;

  // AI metrics
  private readonly aiTokensConsumed: Counter;
  private readonly aiRequestDuration: Histogram;
  private readonly aiRequestsTotal: Counter;

  constructor() {
    // Initialize HTTP metrics
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status', 'tenant_id'],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    });

    this.httpRequestSize = new Histogram({
      name: 'http_request_size_bytes',
      help: 'HTTP request size in bytes',
      labelNames: ['method', 'route'],
      buckets: [100, 1000, 10000, 100000, 1000000],
    });

    this.httpResponseSize = new Histogram({
      name: 'http_response_size_bytes',
      help: 'HTTP response size in bytes',
      labelNames: ['method', 'route'],
      buckets: [100, 1000, 10000, 100000, 1000000],
    });

    // Initialize database metrics
    this.dbQueryDuration = new Histogram({
      name: 'db_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['operation', 'model'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
    });

    this.dbConnectionsActive = new Gauge({
      name: 'db_connections_active',
      help: 'Number of active database connections',
    });

    this.dbQueriesTotal = new Counter({
      name: 'db_queries_total',
      help: 'Total number of database queries',
      labelNames: ['operation', 'model', 'status'],
    });

    // Initialize business metrics
    this.consultantsActive = new Gauge({
      name: 'consultants_active_total',
      help: 'Number of active consultants',
      labelNames: ['tenant_id'],
    });

    this.requirementsOpen = new Gauge({
      name: 'requirements_open_total',
      help: 'Number of open requirements',
      labelNames: ['tenant_id'],
    });

    this.matchesGenerated = new Counter({
      name: 'matches_generated_total',
      help: 'Total number of matches generated',
      labelNames: ['tenant_id'],
    });

    this.submissionsCreated = new Counter({
      name: 'submissions_created_total',
      help: 'Total number of submissions created',
      labelNames: ['tenant_id', 'status'],
    });

    // Initialize cache metrics
    this.cacheHits = new Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache_level'],
    });

    this.cacheMisses = new Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache_level'],
    });

    this.cacheSize = new Gauge({
      name: 'cache_size_bytes',
      help: 'Cache size in bytes',
      labelNames: ['cache_level'],
    });

    // Initialize queue metrics
    this.queueJobsProcessed = new Counter({
      name: 'queue_jobs_processed_total',
      help: 'Total number of queue jobs processed',
      labelNames: ['queue_name', 'status'],
    });

    this.queueJobsFailed = new Counter({
      name: 'queue_jobs_failed_total',
      help: 'Total number of queue jobs failed',
      labelNames: ['queue_name', 'error_type'],
    });

    this.queueJobDuration = new Histogram({
      name: 'queue_job_duration_seconds',
      help: 'Queue job processing duration in seconds',
      labelNames: ['queue_name'],
      buckets: [1, 5, 10, 30, 60, 300, 600],
    });

    this.queueDepth = new Gauge({
      name: 'queue_depth',
      help: 'Number of jobs waiting in queue',
      labelNames: ['queue_name'],
    });

    // Initialize AI metrics
    this.aiTokensConsumed = new Counter({
      name: 'ai_tokens_consumed_total',
      help: 'Total number of AI tokens consumed',
      labelNames: ['tenant_id', 'model', 'operation'],
    });

    this.aiRequestDuration = new Histogram({
      name: 'ai_request_duration_seconds',
      help: 'AI request duration in seconds',
      labelNames: ['model', 'operation'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
    });

    this.aiRequestsTotal = new Counter({
      name: 'ai_requests_total',
      help: 'Total number of AI requests',
      labelNames: ['tenant_id', 'model', 'operation', 'status'],
    });
  }

  // HTTP metric methods
  recordHttpRequest(method: string, route: string, status: number, tenantId?: string) {
    this.httpRequestsTotal.inc({ method, route, status, tenant_id: tenantId || 'unknown' });
  }

  recordHttpDuration(method: string, route: string, status: number, duration: number) {
    this.httpRequestDuration.observe({ method, route, status }, duration);
  }

  recordHttpRequestSize(method: string, route: string, size: number) {
    this.httpRequestSize.observe({ method, route }, size);
  }

  recordHttpResponseSize(method: string, route: string, size: number) {
    this.httpResponseSize.observe({ method, route }, size);
  }

  // Database metric methods
  recordDbQuery(operation: string, model: string, duration: number, status: string = 'success') {
    this.dbQueryDuration.observe({ operation, model }, duration);
    this.dbQueriesTotal.inc({ operation, model, status });
  }

  setDbConnections(count: number) {
    this.dbConnectionsActive.set(count);
  }

  // Business metric methods
  setConsultantsActive(tenantId: string, count: number) {
    this.consultantsActive.set({ tenant_id: tenantId }, count);
  }

  setRequirementsOpen(tenantId: string, count: number) {
    this.requirementsOpen.set({ tenant_id: tenantId }, count);
  }

  recordMatchGenerated(tenantId: string) {
    this.matchesGenerated.inc({ tenant_id: tenantId });
  }

  recordSubmissionCreated(tenantId: string, status: string) {
    this.submissionsCreated.inc({ tenant_id: tenantId, status });
  }

  // Cache metric methods
  recordCacheHit(level: string) {
    this.cacheHits.inc({ cache_level: level });
  }

  recordCacheMiss(level: string) {
    this.cacheMisses.inc({ cache_level: level });
  }

  setCacheSize(level: string, size: number) {
    this.cacheSize.set({ cache_level: level }, size);
  }

  // Queue metric methods
  recordQueueJob(queueName: string, status: string, duration?: number) {
    this.queueJobsProcessed.inc({ queue_name: queueName, status });
    if (duration) {
      this.queueJobDuration.observe({ queue_name: queueName }, duration);
    }
  }

  recordQueueJobFailed(queueName: string, errorType: string) {
    this.queueJobsFailed.inc({ queue_name: queueName, error_type: errorType });
  }

  setQueueDepth(queueName: string, depth: number) {
    this.queueDepth.set({ queue_name: queueName }, depth);
  }

  // AI metric methods
  recordAITokens(tenantId: string, model: string, operation: string, tokens: number) {
    this.aiTokensConsumed.inc({ tenant_id: tenantId, model, operation }, tokens);
  }

  recordAIRequest(tenantId: string, model: string, operation: string, status: string, duration: number) {
    this.aiRequestsTotal.inc({ tenant_id: tenantId, model, operation, status });
    this.aiRequestDuration.observe({ model, operation }, duration);
  }

  /**
   * Get all metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  /**
   * Reset all metrics
   */
  reset() {
    register.resetMetrics();
  }
}

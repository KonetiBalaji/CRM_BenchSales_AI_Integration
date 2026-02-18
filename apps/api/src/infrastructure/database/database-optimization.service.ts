/**
 * Database Optimization Service
 * Manages database performance, indexing, and query optimization
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DatabaseOptimizationService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseOptimizationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService
  ) {}

  async onModuleInit() {
    if (this.config.get('database.autoCreateIndexes', false)) {
      await this.ensurePerformanceIndexes();
    }
  }

  /**
   * Create performance-critical indexes
   */
  async ensurePerformanceIndexes(): Promise<void> {
    this.logger.log('Ensuring performance indexes exist...');

    const indexes = [
      // Consultant indexes
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_consultants_tenant_status 
       ON "Consultant"(tenant_id, status) 
       WHERE status = 'ACTIVE'`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_consultants_tenant_availability 
       ON "Consultant"(tenant_id, availability) 
       WHERE availability = 'AVAILABLE'`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_consultants_search 
       ON "Consultant" USING gin(to_tsvector('english', 
         coalesce(first_name, '') || ' ' || 
         coalesce(last_name, '') || ' ' || 
         coalesce(email, '')))`,

      // Requirement indexes
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_requirements_tenant_status 
       ON "Requirement"(tenant_id, status) 
       WHERE status IN ('OPEN', 'IN_PROGRESS')`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_requirements_tenant_priority 
       ON "Requirement"(tenant_id, priority, created_at DESC)`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_requirements_tenant_created 
       ON "Requirement"(tenant_id, created_at DESC)`,

      // Match indexes
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_tenant_score 
       ON "Match"(tenant_id, score DESC) 
       WHERE score > 0.7`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_requirement 
       ON "Match"(requirement_id, score DESC)`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_consultant 
       ON "Match"(consultant_id, score DESC)`,

      // Submission indexes
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_tenant_status 
       ON "Submission"(tenant_id, status, created_at DESC)`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_consultant 
       ON "Submission"(consultant_id, status)`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_requirement 
       ON "Submission"(requirement_id, status)`,

      // Audit log indexes
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_tenant_timestamp 
       ON "AuditLog"(tenant_id, timestamp DESC)`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_entity 
       ON "AuditLog"(tenant_id, entity_type, entity_id)`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_actor 
       ON "AuditLog"(tenant_id, actor_id, timestamp DESC)`,

      // Search document indexes (for vector search)
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_docs_tenant_entity 
       ON "SearchDocument"(tenant_id, entity_type, entity_id)`,

      // Skills indexes
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_consultant_skills_tenant 
       ON "ConsultantSkill"(tenant_id, consultant_id)`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_requirement_skills_tenant 
       ON "RequirementSkill"(tenant_id, requirement_id)`,

      // Usage records for billing
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_records_tenant_period 
       ON "UsageRecord"(tenant_id, period_start, period_end)`,
    ];

    for (const indexSql of indexes) {
      try {
        await this.prisma.$executeRawUnsafe(indexSql);
        this.logger.log(`Created/verified index: ${indexSql.split('\n')[0].trim()}`);
      } catch (error: any) {
        if (error.code === '42P07') {
          // Index already exists, skip
          continue;
        }
        this.logger.error(`Failed to create index: ${error.message}`);
      }
    }

    this.logger.log('Performance indexes verified');
  }

  /**
   * Analyze slow queries and suggest optimizations
   */
  async analyzeSlowQueries(thresholdMs: number = 1000): Promise<any[]> {
    // Enable pg_stat_statements extension if not already enabled
    try {
      await this.prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS pg_stat_statements`;
    } catch (error) {
      this.logger.warn('Could not enable pg_stat_statements extension');
      return [];
    }

    const slowQueries = await this.prisma.$queryRaw<any[]>`
      SELECT 
        query,
        calls,
        total_exec_time,
        mean_exec_time,
        max_exec_time,
        stddev_exec_time
      FROM pg_stat_statements
      WHERE mean_exec_time > ${thresholdMs}
      ORDER BY mean_exec_time DESC
      LIMIT 20
    `;

    this.logger.warn(`Found ${slowQueries.length} slow queries (>${thresholdMs}ms average)`);
    return slowQueries;
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<any> {
    const [
      dbSize,
      tableStats,
      indexUsage,
      connectionStats,
    ] = await Promise.all([
      this.getDatabaseSize(),
      this.getTableStatistics(),
      this.getIndexUsage(),
      this.getConnectionStatistics(),
    ]);

    return {
      dbSize,
      tableStats,
      indexUsage,
      connectionStats,
    };
  }

  private async getDatabaseSize(): Promise<any> {
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT 
        pg_size_pretty(pg_database_size(current_database())) as size,
        pg_database_size(current_database()) as bytes
    `;
    return result[0];
  }

  private async getTableStatistics(): Promise<any[]> {
    return this.prisma.$queryRaw<any[]>`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_total_relation_size(schemaname||'.'||tablename) as bytes,
        n_live_tup as row_count,
        n_dead_tup as dead_rows
      FROM pg_stat_user_tables
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      LIMIT 20
    `;
  }

  private async getIndexUsage(): Promise<any[]> {
    return this.prisma.$queryRaw<any[]>`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan as index_scans,
        pg_size_pretty(pg_relation_size(indexrelid)) as size
      FROM pg_stat_user_indexes
      WHERE idx_scan = 0
      AND indexrelid IS NOT NULL
      ORDER BY pg_relation_size(indexrelid) DESC
      LIMIT 20
    `;
  }

  private async getConnectionStatistics(): Promise<any> {
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections,
        count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
      FROM pg_stat_activity
      WHERE datname = current_database()
    `;
    return result[0];
  }

  /**
   * Vacuum and analyze tables for better query planning
   */
  async vacuumAnalyze(tableName?: string): Promise<void> {
    if (tableName) {
      this.logger.log(`Running VACUUM ANALYZE on table: ${tableName}`);
      await this.prisma.$executeRawUnsafe(`VACUUM ANALYZE "${tableName}"`);
    } else {
      this.logger.log('Running VACUUM ANALYZE on all tables');
      await this.prisma.$executeRaw`VACUUM ANALYZE`;
    }
  }

  /**
   * Get table bloat information
   */
  async getTableBloat(): Promise<any[]> {
    return this.prisma.$queryRaw<any[]>`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
        round((n_dead_tup::float / NULLIF(n_live_tup + n_dead_tup, 0)) * 100, 2) as bloat_pct
      FROM pg_stat_user_tables
      WHERE n_dead_tup > 1000
      ORDER BY n_dead_tup DESC
      LIMIT 20
    `;
  }
}

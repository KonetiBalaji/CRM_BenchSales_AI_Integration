/**
 * Queue Module
 * Manages BullMQ job queues for async processing
 */

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { QueueService } from './queue.service';
import { ResumeIngestionProcessor } from './processors/resume-ingestion.processor';
import { EmailNotificationProcessor } from './processors/email-notification.processor';
import { AnalyticsAggregationProcessor } from './processors/analytics-aggregation.processor';
import { ComplianceReportProcessor } from './processors/compliance-report.processor';
import { VectorEmbeddingProcessor } from './processors/vector-embedding.processor';
import { PrismaModule } from '../prisma/prisma.module';

export const QUEUE_NAMES = {
  RESUME_INGESTION: 'resume-ingestion',
  EMAIL_NOTIFICATION: 'email-notification',
  ANALYTICS_AGGREGATION: 'analytics-aggregation',
  COMPLIANCE_REPORT: 'compliance-report',
  VECTOR_EMBEDDING: 'vector-embedding',
  WEBHOOK_DELIVERY: 'webhook-delivery',
  DATA_EXPORT: 'data-export',
} as const;

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('redis.host', 'localhost'),
          port: config.get('redis.port', 6379),
          password: config.get('redis.password'),
          db: config.get('redis.db', 0),
          maxRetriesPerRequest: null, // Required for BullMQ
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: {
            age: 24 * 3600, // Keep completed jobs for 24 hours
            count: 1000,
          },
          removeOnFail: {
            age: 7 * 24 * 3600, // Keep failed jobs for 7 days
          },
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.RESUME_INGESTION },
      { name: QUEUE_NAMES.EMAIL_NOTIFICATION },
      { name: QUEUE_NAMES.ANALYTICS_AGGREGATION },
      { name: QUEUE_NAMES.COMPLIANCE_REPORT },
      { name: QUEUE_NAMES.VECTOR_EMBEDDING },
      { name: QUEUE_NAMES.WEBHOOK_DELIVERY },
      { name: QUEUE_NAMES.DATA_EXPORT }
    ),
    PrismaModule,
  ],
  providers: [
    QueueService,
    ResumeIngestionProcessor,
    EmailNotificationProcessor,
    AnalyticsAggregationProcessor,
    ComplianceReportProcessor,
    VectorEmbeddingProcessor,
  ],
  exports: [QueueService, BullModule],
})
export class QueueModule {}

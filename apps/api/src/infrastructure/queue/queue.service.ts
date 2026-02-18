/**
 * Queue Service
 * Provides high-level interface for job queue operations
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job, JobsOptions } from 'bullmq';
import { QUEUE_NAMES } from './queue.module';

export interface QueueJobData {
  tenantId: string;
  userId?: string;
  metadata?: Record<string, any>;
  [key: string]: any;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.RESUME_INGESTION)
    private readonly resumeQueue: Queue,
    @InjectQueue(QUEUE_NAMES.EMAIL_NOTIFICATION)
    private readonly emailQueue: Queue,
    @InjectQueue(QUEUE_NAMES.ANALYTICS_AGGREGATION)
    private readonly analyticsQueue: Queue,
    @InjectQueue(QUEUE_NAMES.COMPLIANCE_REPORT)
    private readonly complianceQueue: Queue,
    @InjectQueue(QUEUE_NAMES.VECTOR_EMBEDDING)
    private readonly vectorQueue: Queue,
    @InjectQueue(QUEUE_NAMES.WEBHOOK_DELIVERY)
    private readonly webhookQueue: Queue,
    @InjectQueue(QUEUE_NAMES.DATA_EXPORT)
    private readonly dataExportQueue: Queue
  ) {}

  /**
   * Add resume ingestion job
   */
  async addResumeIngestionJob(
    data: QueueJobData & { documentId: string; fileUrl: string },
    options?: JobsOptions
  ): Promise<Job> {
    this.logger.log(`Adding resume ingestion job for tenant ${data.tenantId}`);
    return this.resumeQueue.add('process-resume', data, {
      ...options,
      jobId: `resume-${data.documentId}`,
    });
  }

  /**
   * Add email notification job
   */
  async addEmailNotificationJob(
    data: QueueJobData & {
      to: string;
      subject: string;
      template: string;
      context: Record<string, any>;
    },
    options?: JobsOptions
  ): Promise<Job> {
    this.logger.log(`Adding email notification job for ${data.to}`);
    return this.emailQueue.add('send-email', data, options);
  }

  /**
   * Add analytics aggregation job
   */
  async addAnalyticsAggregationJob(
    data: QueueJobData & { period: string; metrics: string[] },
    options?: JobsOptions
  ): Promise<Job> {
    this.logger.log(`Adding analytics aggregation job for tenant ${data.tenantId}`);
    return this.analyticsQueue.add('aggregate-analytics', data, {
      ...options,
      jobId: `analytics-${data.tenantId}-${data.period}`,
    });
  }

  /**
   * Add compliance report job
   */
  async addComplianceReportJob(
    data: QueueJobData & { reportType: string; parameters: Record<string, any> },
    options?: JobsOptions
  ): Promise<Job> {
    this.logger.log(`Adding compliance report job for tenant ${data.tenantId}`);
    return this.complianceQueue.add('generate-report', data, options);
  }

  /**
   * Add vector embedding job
   */
  async addVectorEmbeddingJob(
    data: QueueJobData & { entityType: string; entityId: string; text: string },
    options?: JobsOptions
  ): Promise<Job> {
    this.logger.log(`Adding vector embedding job for ${data.entityType} ${data.entityId}`);
    return this.vectorQueue.add('generate-embedding', data, {
      ...options,
      jobId: `embedding-${data.entityType}-${data.entityId}`,
    });
  }

  /**
   * Add webhook delivery job
   */
  async addWebhookDeliveryJob(
    data: QueueJobData & { url: string; event: string; payload: any },
    options?: JobsOptions
  ): Promise<Job> {
    this.logger.log(`Adding webhook delivery job for ${data.event}`);
    return this.webhookQueue.add('deliver-webhook', data, options);
  }

  /**
   * Add data export job
   */
  async addDataExportJob(
    data: QueueJobData & { exportType: string; filters: Record<string, any> },
    options?: JobsOptions
  ): Promise<Job> {
    this.logger.log(`Adding data export job for tenant ${data.tenantId}`);
    return this.dataExportQueue.add('export-data', data, {
      ...options,
      jobId: `export-${data.tenantId}-${Date.now()}`,
    });
  }

  /**
   * Schedule recurring job
   */
  async scheduleRecurringJob(
    queueName: string,
    jobName: string,
    data: QueueJobData,
    cronExpression: string
  ): Promise<Job> {
    const queue = this.getQueue(queueName);
    this.logger.log(`Scheduling recurring job ${jobName} with cron: ${cronExpression}`);
    
    return queue.add(jobName, data, {
      repeat: {
        pattern: cronExpression,
      },
      jobId: `recurring-${jobName}`,
    });
  }

  /**
   * Get job status
   */
  async getJobStatus(queueName: string, jobId: string): Promise<any> {
    const queue = this.getQueue(queueName);
    const job = await queue.getJob(jobId);
    
    if (!job) {
      return null;
    }

    return {
      id: job.id,
      name: job.name,
      data: job.data,
      progress: await job.progress(),
      state: await job.getState(),
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
      finishedOn: job.finishedOn,
      processedOn: job.processedOn,
    };
  }

  /**
   * Cancel job
   */
  async cancelJob(queueName: string, jobId: string): Promise<void> {
    const queue = this.getQueue(queueName);
    const job = await queue.getJob(jobId);
    
    if (job) {
      await job.remove();
      this.logger.log(`Cancelled job ${jobId} from queue ${queueName}`);
    }
  }

  /**
   * Get queue metrics
   */
  async getQueueMetrics(queueName: string) {
    const queue = this.getQueue(queueName);
    
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      queueName,
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }

  /**
   * Pause queue
   */
  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.pause();
    this.logger.log(`Paused queue ${queueName}`);
  }

  /**
   * Resume queue
   */
  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.resume();
    this.logger.log(`Resumed queue ${queueName}`);
  }

  /**
   * Clean old jobs from queue
   */
  async cleanQueue(queueName: string, grace: number = 24 * 3600 * 1000): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.clean(grace, 100, 'completed');
    await queue.clean(grace, 100, 'failed');
    this.logger.log(`Cleaned queue ${queueName}`);
  }

  private getQueue(queueName: string): Queue {
    const queues: Record<string, Queue> = {
      [QUEUE_NAMES.RESUME_INGESTION]: this.resumeQueue,
      [QUEUE_NAMES.EMAIL_NOTIFICATION]: this.emailQueue,
      [QUEUE_NAMES.ANALYTICS_AGGREGATION]: this.analyticsQueue,
      [QUEUE_NAMES.COMPLIANCE_REPORT]: this.complianceQueue,
      [QUEUE_NAMES.VECTOR_EMBEDDING]: this.vectorQueue,
      [QUEUE_NAMES.WEBHOOK_DELIVERY]: this.webhookQueue,
      [QUEUE_NAMES.DATA_EXPORT]: this.dataExportQueue,
    };

    const queue = queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    return queue;
  }
}

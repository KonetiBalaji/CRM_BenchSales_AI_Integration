/**
 * Analytics Aggregation Processor
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';

@Processor('analytics-aggregation')
export class AnalyticsAggregationProcessor extends WorkerHost {
  private readonly logger = new Logger(AnalyticsAggregationProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job): Promise<any> {
    this.logger.log(`Processing analytics aggregation job ${job.id}`);
    
    const { tenantId, period, metrics } = job.data;

    try {
      // Aggregate analytics data
      const snapshot = await this.prisma.analyticsSnapshot.create({
        data: {
          tenantId,
          period,
          data: {
            // Metric calculation - implement using AnalyticsService
            totalConsultants: 0,
            totalRequirements: 0,
            totalSubmissions: 0,
          },
        },
      });

      this.logger.log(`Completed analytics aggregation for tenant ${tenantId}`);
      return { success: true, snapshotId: snapshot.id };
    } catch (error) {
      this.logger.error(`Failed to aggregate analytics:`, error);
      throw error;
    }
  }
}

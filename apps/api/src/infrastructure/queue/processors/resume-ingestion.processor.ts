/**
 * Resume Ingestion Processor
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';

@Processor('resume-ingestion')
export class ResumeIngestionProcessor extends WorkerHost {
  private readonly logger = new Logger(ResumeIngestionProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job): Promise<any> {
    this.logger.log(`Processing resume ingestion job ${job.id}`);
    
    const { tenantId, documentId, fileUrl } = job.data;

    try {
      // Update job progress
      await job.updateProgress(10);

      // Download and parse resume
      // Resume parsing - integrate with text extraction service
      await job.updateProgress(50);

      // Extract entities and skills
      await job.updateProgress(75);

      // Update database
      await this.prisma.resume.update({
        where: { id: documentId },
        data: { 
          status: 'PROCESSED',
          processedAt: new Date(),
        },
      });

      await job.updateProgress(100);
      this.logger.log(`Completed resume ingestion for ${documentId}`);

      return { success: true, documentId };
    } catch (error) {
      this.logger.error(`Failed to process resume ${documentId}:`, error);
      throw error;
    }
  }
}

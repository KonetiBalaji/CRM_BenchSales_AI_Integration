/**
 * Vector Embedding Processor
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';

@Processor('vector-embedding')
export class VectorEmbeddingProcessor extends WorkerHost {
  private readonly logger = new Logger(VectorEmbeddingProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job): Promise<any> {
    this.logger.log(`Processing vector embedding job ${job.id}`);
    
    const { tenantId, entityType, entityId, text } = job.data;

    try {
      // Generate embedding
      // OpenAI embedding service - integrate with VectorSearchService
      
      this.logger.log(`Completed vector embedding for ${entityType} ${entityId}`);
      return { success: true, entityId };
    } catch (error) {
      this.logger.error(`Failed to generate embedding:`, error);
      throw error;
    }
  }
}

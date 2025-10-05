import { Injectable } from "@nestjs/common";
import { DocumentIngestionStatus, IngestionStatus } from "@prisma/client";

import { PrismaService } from "../../infrastructure/prisma/prisma.service";

@Injectable()
export class IngestionMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async resumeSlo(tenantId: string, thresholdMinutes: number) {
    const thresholdMs = thresholdMinutes * 60 * 1000;
    const records = await this.prisma.documentMetadata.findMany({
      where: {
        tenantId,
        ingestionStatus: DocumentIngestionStatus.COMPLETE,
        extractedAt: { not: null }
      },
      select: {
        createdAt: true,
        extractedAt: true,
        ingestionLatencyMs: true
      }
    });

    return this.computeSlo(records.map((record) => this.resolveLatency(record.createdAt, record.extractedAt, record.ingestionLatencyMs)), thresholdMs);
  }

  async requirementSlo(tenantId: string, thresholdMinutes: number) {
    const thresholdMs = thresholdMinutes * 60 * 1000;
    const records = await this.prisma.requirementIngestion.findMany({
      where: {
        tenantId,
        status: IngestionStatus.PROCESSED,
        processedAt: { not: null }
      },
      select: {
        createdAt: true,
        processedAt: true,
        latencyMs: true
      }
    });

    return this.computeSlo(records.map((record) => this.resolveLatency(record.createdAt, record.processedAt, record.latencyMs)), thresholdMs);
  }

  private resolveLatency(createdAt: Date, processedAt: Date | null, storedLatency?: number | null): number {
    if (typeof storedLatency === "number" && storedLatency >= 0) {
      return storedLatency;
    }
    if (!processedAt) {
      return Number.POSITIVE_INFINITY;
    }
    return Math.max(0, processedAt.getTime() - createdAt.getTime());
  }

  private computeSlo(latencies: number[], thresholdMs: number) {
    if (latencies.length === 0) {
      return {
        sampleSize: 0,
        percentile99: null,
        withinThreshold: null
      };
    }
    const sorted = [...latencies].sort((a, b) => a - b);
    const index99 = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99));
    const percentile99 = sorted[index99];
    const within = latencies.filter((latency) => latency <= thresholdMs).length / latencies.length;
    return {
      sampleSize: latencies.length,
      percentile99,
      withinThreshold: within
    };
  }
}

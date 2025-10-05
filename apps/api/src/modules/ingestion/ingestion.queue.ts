import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Job, JobsOptions, Queue, QueueEvents, Worker, WorkerOptions } from "bullmq";
import IORedis from "ioredis";

import { IngestionConfig, IngestionQueuesConfig, RequirementIngestionJob, ResumeIngestionJob } from "./ingestion.types";
import { WebhookEvent, SyncJob } from "../integrations/integrations.types";

@Injectable()
export class IngestionQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(IngestionQueueService.name);
  private readonly redisUrl: string;
  private readonly queuesConfig: IngestionQueuesConfig;
  private readonly resumeQueue: Queue<ResumeIngestionJob>;
  private readonly requirementQueue: Queue<RequirementIngestionJob>;
  private readonly webhookQueue: Queue<WebhookEvent>;
  private readonly syncQueue: Queue<SyncJob>;
  private readonly resumeDlq: Queue<ResumeIngestionJob>;
  private readonly requirementDlq: Queue<RequirementIngestionJob>;
  private readonly webhookDlq: Queue<WebhookEvent>;
  private readonly syncDlq: Queue<SyncJob>;
  private readonly events: QueueEvents[] = [];
  private readonly defaultJobOptions: JobsOptions;

  constructor(private readonly configService: ConfigService) {
    const ingestion = (this.configService.get<IngestionConfig>("ingestion") ?? {}) as IngestionConfig;
    this.redisUrl = this.configService.get<string>("redisUrl") ?? process.env.REDIS_URL ?? "redis://localhost:6379";
    this.queuesConfig = ingestion.queues ?? {
      resumeQueueName: "resume.ingestion",
      requirementQueueName: "requirement.ingestion",
      webhookQueueName: "webhook.processing",
      syncQueueName: "sync.processing",
      dlqSuffix: ".dlq",
      resumeConcurrency: 4,
      requirementConcurrency: 2,
      webhookConcurrency: 8,
      syncConcurrency: 4,
      defaultAttempts: 5,
      backoffMs: 60_000
    };

    const connection = { url: this.redisUrl };
    this.resumeQueue = new Queue<ResumeIngestionJob>(this.queuesConfig.resumeQueueName, { connection });
    this.requirementQueue = new Queue<RequirementIngestionJob>(this.queuesConfig.requirementQueueName, { connection });
    this.webhookQueue = new Queue<WebhookEvent>(this.queuesConfig.webhookQueueName, { connection });
    this.syncQueue = new Queue<SyncJob>(this.queuesConfig.syncQueueName, { connection });
    
    this.resumeDlq = new Queue<ResumeIngestionJob>(`${this.queuesConfig.resumeQueueName}${this.queuesConfig.dlqSuffix}`, {
      connection
    });
    this.requirementDlq = new Queue<RequirementIngestionJob>(
      `${this.queuesConfig.requirementQueueName}${this.queuesConfig.dlqSuffix}`,
      { connection }
    );
    this.webhookDlq = new Queue<WebhookEvent>(`${this.queuesConfig.webhookQueueName}${this.queuesConfig.dlqSuffix}`, {
      connection
    });
    this.syncDlq = new Queue<SyncJob>(`${this.queuesConfig.syncQueueName}${this.queuesConfig.dlqSuffix}`, {
      connection
    });

    this.events.push(new QueueEvents(this.queuesConfig.resumeQueueName, { connection }));
    this.events.push(new QueueEvents(this.queuesConfig.requirementQueueName, { connection }));
    this.events.push(new QueueEvents(this.queuesConfig.webhookQueueName, { connection }));
    this.events.push(new QueueEvents(this.queuesConfig.syncQueueName, { connection }));

    this.defaultJobOptions = {
      removeOnComplete: { age: 3600, count: 1000 },
      removeOnFail: false,
      attempts: this.queuesConfig.defaultAttempts,
      backoff: {
        type: "exponential",
        delay: this.queuesConfig.backoffMs
      }
    };

    void Promise.allSettled(this.events.map((event) => event.waitUntilReady()));
  }

  async enqueueResume(job: ResumeIngestionJob, options: JobsOptions = {}) {
    await this.resumeQueue.add("resume.ingest", job, { ...this.defaultJobOptions, ...options });
  }

  async enqueueRequirement(job: RequirementIngestionJob, options: JobsOptions = {}) {
    await this.requirementQueue.add("requirement.ingest", job, { ...this.defaultJobOptions, ...options });
  }

  createResumeWorker(
    processor: (job: Job<ResumeIngestionJob>) => Promise<unknown>,
    overrides: Partial<WorkerOptions> = {}
  ): Worker<ResumeIngestionJob> {
    return this.createWorker(this.queuesConfig.resumeQueueName, processor, overrides, this.resumeDlq);
  }

  createRequirementWorker(
    processor: (job: Job<RequirementIngestionJob>) => Promise<unknown>,
    overrides: Partial<WorkerOptions> = {}
  ): Worker<RequirementIngestionJob> {
    return this.createWorker(this.queuesConfig.requirementQueueName, processor, overrides, this.requirementDlq);
  }

  async moveDlqJobsToQueue(queue: "resume" | "requirement", limit = 50) {
    const dlq = queue === "resume" ? this.resumeDlq : this.requirementDlq;
    const target = queue === "resume" ? this.resumeQueue : this.requirementQueue;
    const jobs = await dlq.getJobs(["waiting", "delayed", "failed"], 0, limit);
    for (const job of jobs) {
      await target.add(job.name, job.data as any, this.defaultJobOptions);
      await job.remove();
    }
  }

  async getDlqCounts() {
    const [resumeWaiting, requirementWaiting] = await Promise.all([
      this.resumeDlq.getJobCountByTypes("waiting", "delayed", "failed"),
      this.requirementDlq.getJobCountByTypes("waiting", "delayed", "failed")
    ]);

    return {
      resume: resumeWaiting,
      requirement: requirementWaiting
    };
  }

  private createWorker<TJobData>(
    queueName: string,
    processor: (job: Job<TJobData>) => Promise<unknown>,
    overrides: Partial<WorkerOptions>,
    dlq: Queue<TJobData>
  ): Worker<TJobData> {
    const worker = new Worker<TJobData>(
      queueName,
      processor,
      {
        connection: new IORedis(this.redisUrl, { maxRetriesPerRequest: null }),
        concurrency:
          queueName === this.queuesConfig.resumeQueueName
            ? this.queuesConfig.resumeConcurrency
            : this.queuesConfig.requirementConcurrency,
        autorun: true,
        ...overrides
      }
    );

    worker.on("failed", async (job, error) => {
      try {
        if (!job) {
          return;
        }
        const attempts = job.opts.attempts ?? 1;
        if ((job as any).attemptsMade < attempts) {
          return;
        }
        this.logger.warn(
          `Job ${job.id} on ${queueName} exhausted retries: ${error?.message ?? "unknown"}`
        );
        await (dlq as unknown as any).add(job.name, {
          ...(job.data as any),
          failedAt: new Date().toISOString(),
          reason: error?.message ?? "unknown"
        }, this.defaultJobOptions);
      } catch (e) {
        this.logger.error(`Failed to move job to DLQ on ${queueName}: ${(e as Error).message}`);
      }
    });

    worker.on("error", (err) => this.logger.error(`Worker error on ${queueName}: ${err.message}`));
    return worker;
  }

  async enqueueWebhookProcessing(event: WebhookEvent, overrides?: JobsOptions): Promise<Job<WebhookEvent>> {
    return this.webhookQueue.add("webhook.processing", event, {
      ...this.defaultJobOptions,
      delay: 1000, // 1 second delay for webhook processing
      ...overrides
    });
  }

  async enqueueSyncJob(job: SyncJob, overrides?: JobsOptions): Promise<Job<SyncJob>> {
    return this.syncQueue.add("sync.processing", job, {
      ...this.defaultJobOptions,
      delay: 5000, // 5 second delay for sync jobs
      ...overrides
    });
  }

  async onModuleDestroy() {
    await Promise.allSettled(this.events.map((event) => event.close()));
    await Promise.allSettled([
      this.resumeQueue.close(),
      this.requirementQueue.close(),
      this.webhookQueue.close(),
      this.syncQueue.close(),
      this.resumeDlq.close(),
      this.requirementDlq.close(),
      this.webhookDlq.close(),
      this.syncDlq.close()
    ]);
  }
}

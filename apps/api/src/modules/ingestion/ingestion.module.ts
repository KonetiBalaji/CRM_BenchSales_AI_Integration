import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { PrismaModule } from "../../infrastructure/prisma/prisma.module";
import { AiGatewayModule } from "../ai-gateway/ai-gateway.module";
import { DocumentsModule } from "../documents/documents.module";
import { DedupeModule } from "../dedupe/dedupe.module";
import { RequirementsModule } from "../requirements/requirements.module";
import { IngestionController } from "./ingestion.controller";
import { EmailIngestionService } from "./email-ingestion.service";
import { IngestionMetricsService } from "./ingestion.metrics.service";
import { IngestionQueueService } from "./ingestion.queue";
import { RequirementIngestionService } from "./requirement-ingestion.service";
import { ResumeIngestionWorker } from "./resume-ingestion.worker";
import { SchemaNormalizerService } from "./schema-normalizer.service";
import { SpacyService } from "./spacy.service";
import { TextExtractionService } from "./text-extraction.service";
import { PiiRedactionService } from "./pii-redaction.service";

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    DocumentsModule,
    DedupeModule,
    RequirementsModule,
    AiGatewayModule
  ],
  controllers: [IngestionController],
  providers: [
    IngestionQueueService,
    ResumeIngestionWorker,
    EmailIngestionService,
    RequirementIngestionService,
    TextExtractionService,
    PiiRedactionService,
    SchemaNormalizerService,
    SpacyService,
    IngestionMetricsService
  ]
})
export class IngestionModule {}

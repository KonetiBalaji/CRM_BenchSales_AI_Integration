-- Add ingestion telemetry columns and unique dedupe hashing
ALTER TABLE "DocumentMetadata"
  ADD COLUMN "ingestionLatencyMs" INTEGER;

ALTER TABLE "RequirementIngestion"
  ADD COLUMN "contentHash" TEXT,
  ADD COLUMN "processedAt" TIMESTAMP(3),
  ADD COLUMN "latencyMs" INTEGER,
  ADD COLUMN "retryCount" INTEGER NOT NULL DEFAULT 0;

UPDATE "RequirementIngestion"
SET "contentHash" = md5("rawContent")
WHERE "contentHash" IS NULL;

ALTER TABLE "RequirementIngestion"
  ALTER COLUMN "contentHash" SET NOT NULL;

ALTER TABLE "RequirementIngestion"
  ADD CONSTRAINT "RequirementIngestion_tenantId_contentHash_key"
    UNIQUE ("tenantId", "contentHash");

CREATE INDEX IF NOT EXISTS "RequirementIngestion_tenant_status_idx"
  ON "RequirementIngestion" ("tenantId", "status");

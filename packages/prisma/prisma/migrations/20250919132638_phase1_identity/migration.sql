-- Phase 1 Identity, Tenancy, & Data Isolation

-- Update user roles to enterprise RBAC set
CREATE TYPE "UserRole_new" AS ENUM ('OWNER','ADMIN','MANAGER','REP','VIEWER');

ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" USING (
  CASE "role"::text
    WHEN 'ADMIN' THEN 'ADMIN'
    WHEN 'SALES_LEAD' THEN 'MANAGER'
    WHEN 'DELIVERY_MANAGER' THEN 'MANAGER'
    WHEN 'CONSULTANT_MANAGER' THEN 'MANAGER'
    WHEN 'ANALYST' THEN 'VIEWER'
    ELSE 'VIEWER'
  END::"UserRole_new"
);

ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'VIEWER';

ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole" USING ("role"::text::"UserRole");
DROP TYPE "UserRole_old";

ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_email_key" UNIQUE ("tenantId","email");

-- Harden audit log for tamper evidence
ALTER TABLE "AuditLog"
  ADD COLUMN "actorRole" "UserRole",
  ADD COLUMN "ipAddress" TEXT,
  ADD COLUMN "userAgent" TEXT,
  ADD COLUMN "resultCode" TEXT,
  ADD COLUMN "prevHash" TEXT,
  ADD COLUMN "hash" TEXT;

UPDATE "AuditLog" SET "hash" = md5("id"::text);
ALTER TABLE "AuditLog" ALTER COLUMN "hash" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "AuditLog_tenantId_createdAt_idx" ON "AuditLog" ("tenantId","createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_tenant_entity_idx" ON "AuditLog" ("tenantId","entityType","entityId");

-- Normalize bridge tables with tenant ownership
ALTER TABLE "ConsultantSkill" ADD COLUMN "tenantId" TEXT;
UPDATE "ConsultantSkill" cs
SET "tenantId" = c."tenantId"
FROM "Consultant" c
WHERE cs."consultantId" = c."id";
ALTER TABLE "ConsultantSkill" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "ConsultantSkill" DROP CONSTRAINT "ConsultantSkill_pkey";
ALTER TABLE "ConsultantSkill" ADD CONSTRAINT "ConsultantSkill_pkey" PRIMARY KEY ("tenantId","consultantId","skillId");
ALTER TABLE "ConsultantSkill" ADD CONSTRAINT "ConsultantSkill_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RequirementSkill" ADD COLUMN "tenantId" TEXT;
UPDATE "RequirementSkill" rs
SET "tenantId" = r."tenantId"
FROM "Requirement" r
WHERE rs."requirementId" = r."id";
ALTER TABLE "RequirementSkill" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "RequirementSkill" DROP CONSTRAINT "RequirementSkill_pkey";
ALTER TABLE "RequirementSkill" ADD CONSTRAINT "RequirementSkill_pkey" PRIMARY KEY ("tenantId","requirementId","skillId");
ALTER TABLE "RequirementSkill" ADD CONSTRAINT "RequirementSkill_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConsultantTag" ADD COLUMN "tenantId" TEXT;
UPDATE "ConsultantTag" ct
SET "tenantId" = c."tenantId"
FROM "Consultant" c
WHERE ct."consultantId" = c."id";
ALTER TABLE "ConsultantTag" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "ConsultantTag" DROP CONSTRAINT "ConsultantTag_pkey";
ALTER TABLE "ConsultantTag" ADD CONSTRAINT "ConsultantTag_pkey" PRIMARY KEY ("tenantId","consultantId","value");
ALTER TABLE "ConsultantTag" ADD CONSTRAINT "ConsultantTag_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Interview" ADD COLUMN "tenantId" TEXT;
UPDATE "Interview" i
SET "tenantId" = s."tenantId"
FROM "Submission" s
WHERE i."submissionId" = s."id";
ALTER TABLE "Interview" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "Interview_tenantId_scheduledAt_idx" ON "Interview" ("tenantId","scheduledAt");

ALTER TABLE "Match" DROP CONSTRAINT "consultantId_requirementId";
ALTER TABLE "Match" ADD CONSTRAINT "tenant_consultant_requirement" UNIQUE ("tenantId","consultantId","requirementId");

-- Tenant-aware row level security helpers
CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.current_tenant() RETURNS text AS $$
  SELECT NULLIF(current_setting('app.current_tenant', true), '')
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app.is_system_actor() RETURNS boolean AS $$
  SELECT current_setting('app.current_tenant', true) = 'system'
$$ LANGUAGE sql STABLE;

DO $$
DECLARE
  table_name text;
  policy_name text;
  filter_expr text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'User',
    'Consultant',
    'Requirement',
    'Match',
    'Submission',
    'Interview',
    'ConsultantSkill',
    'RequirementSkill',
    'ConsultantTag',
    'AuditLog',
    'AiActivity',
    'RequirementIngestion',
    'Resume',
    'AnalyticsSnapshot',
    'FeatureFlag'
  ]
  LOOP
    policy_name := 'tenant_isolation_' || table_name;
    filter_expr := format('app.is_system_actor() OR %I.%I = app.current_tenant()', table_name, 'tenantId');

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I USING (%s) WITH CHECK (%s)', policy_name, table_name, filter_expr, filter_expr);
  END LOOP;
END
$$;

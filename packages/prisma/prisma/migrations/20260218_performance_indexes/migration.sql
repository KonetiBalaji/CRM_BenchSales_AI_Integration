-- Performance Indexes Migration
-- Industry Best Practice: Add indexes for frequently queried columns

-- Consultant indexes
CREATE INDEX IF NOT EXISTS "idx_consultant_tenant_email" ON "Consultant"("tenantId", "email");
CREATE INDEX IF NOT EXISTS "idx_consultant_tenant_availability" ON "Consultant"("tenantId", "availability");
CREATE INDEX IF NOT EXISTS "idx_consultant_tenant_updated" ON "Consultant"("tenantId", "updatedAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_consultant_first_name" ON "Consultant"("firstName");
CREATE INDEX IF NOT EXISTS "idx_consultant_last_name" ON "Consultant"("lastName");

-- Requirement indexes
CREATE INDEX IF NOT EXISTS "idx_requirement_tenant_status" ON "Requirement"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "idx_requirement_tenant_created" ON "Requirement"("tenantId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_requirement_client" ON "Requirement"("clientName");
CREATE INDEX IF NOT EXISTS "idx_requirement_closes_at" ON "Requirement"("closesAt") WHERE "closesAt" IS NOT NULL;

-- Match indexes
CREATE INDEX IF NOT EXISTS "idx_match_requirement" ON "Match"("requirementId", "score" DESC);
CREATE INDEX IF NOT EXISTS "idx_match_consultant" ON "Match"("consultantId", "score" DESC);
CREATE INDEX IF NOT EXISTS "idx_match_tenant_status" ON "Match"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "idx_match_created" ON "Match"("createdAt" DESC);

-- Skill relationship indexes
CREATE INDEX IF NOT EXISTS "idx_consultant_skill_tenant" ON "ConsultantSkill"("tenantId", "skillId");
CREATE INDEX IF NOT EXISTS "idx_consultant_skill_weight" ON "ConsultantSkill"("weight" DESC);
CREATE INDEX IF NOT EXISTS "idx_requirement_skill_tenant" ON "RequirementSkill"("tenantId", "skillId");
CREATE INDEX IF NOT EXISTS "idx_requirement_skill_weight" ON "RequirementSkill"("weight" DESC);

-- Submission indexes
CREATE INDEX IF NOT EXISTS "idx_submission_tenant_status" ON "Submission"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "idx_submission_consultant" ON "Submission"("consultantId");
CREATE INDEX IF NOT EXISTS "idx_submission_requirement" ON "Submission"("requirementId");
CREATE INDEX IF NOT EXISTS "idx_submission_created" ON "Submission"("createdAt" DESC);

-- Document indexes
CREATE INDEX IF NOT EXISTS "idx_document_tenant_type" ON "DocumentAsset"("tenantId", "assetType");
CREATE INDEX IF NOT EXISTS "idx_document_consultant" ON "DocumentAsset"("consultantId") WHERE "consultantId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_document_requirement" ON "DocumentAsset"("requirementId") WHERE "requirementId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_document_uploaded" ON "DocumentAsset"("uploadedAt" DESC);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS "idx_audit_tenant_timestamp" ON "AuditLog"("tenantId", "timestamp" DESC);
CREATE INDEX IF NOT EXISTS "idx_audit_entity" ON "AuditLog"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "idx_audit_actor" ON "AuditLog"("actorId");
CREATE INDEX IF NOT EXISTS "idx_audit_action" ON "AuditLog"("action");

-- Vector search indexes (if using pgvector)
CREATE INDEX IF NOT EXISTS "idx_search_entity_tenant_type" ON "SearchEntity"("tenantId", "entityType");
CREATE INDEX IF NOT EXISTS "idx_search_entity_updated" ON "SearchEntity"("lastIndexedAt" DESC);

-- MatchFeedback indexes
CREATE INDEX IF NOT EXISTS "idx_match_feedback_match" ON "MatchFeedback"("matchId", "outcome");
CREATE INDEX IF NOT EXISTS "idx_match_feedback_tenant" ON "MatchFeedback"("tenantId", "createdAt" DESC);

-- User activity indexes
CREATE INDEX IF NOT EXISTS "idx_user_tenant" ON "User"("tenantId", "role");
CREATE INDEX IF NOT EXISTS "idx_user_email" ON "User"("email");

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS "idx_consultant_search" ON "Consultant"("tenantId", "availability", "updatedAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_requirement_active" ON "Requirement"("tenantId", "status", "createdAt" DESC) WHERE "status" IN ('OPEN', 'IN_PROGRESS');

-- Add statistics for query planner
ANALYZE "Consultant";
ANALYZE "Requirement";
ANALYZE "Match";
ANALYZE "ConsultantSkill";
ANALYZE "RequirementSkill";
ANALYZE "Submission";
ANALYZE "DocumentAsset";
ANALYZE "AuditLog";

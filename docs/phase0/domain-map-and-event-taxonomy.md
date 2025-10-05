# Domain Map & Event Taxonomy

## Core Entities & Relationships

- **Tenant**: Logical boundary for all data; owns consultants, requirements, users, configs.
- **Consultant**: Candidate profile with resume metadata, skills, rate, availability, compliance flags.
- **Requirement (Req)**: Job requirement or client need; includes role, location, bill rate, must-have skills.
- **Submission**: Link between consultant and requirement; tracks status (draft ? submitted ? interview ? offer ? placed ? closed) and outcomes.
- **Client**: Enterprise customer; may have multiple contacts, agreements, SLAs.
- **Skill**: Canonical skill entry from ontology; synonyms resolved via `skill_synonyms`.
- **Interaction Log**: Communications, outreach emails, meeting notes; references consultant, requirement, user.
- **Document**: Resume, intake forms, offer letters stored in S3 with metadata (hash, PII tags, redaction state).
- **Audit Event**: Immutable log entry capturing action, actor, target, tenant, trace_id.

```text
Tenant 1---n User
Tenant 1---n Consultant 1---n Document
Tenant 1---n Requirement 1---n Submission n---1 Consultant
Requirement n---1 Client
Consultant n---n Skill (via ConsultantSkill)
Requirement n---n Skill (via RequirementSkill)
Submission 1---n InteractionLog
AuditEvent tracks any change with trace + tenant scope
```

Supporting tables: `ConsultantAvailability`, `RateCard`, `Feedback`, `Attachment`, `FeatureFlag`, `DatasetVersion`.

## Domain Capabilities

| Capability | Primary Owners | Key Data Objects | Notes |
| --- | --- | --- | --- |
| Talent Supply | Consultant, Skill, Document, InteractionLog | LLM-based summaries, dedup identities. |
| Demand Intake | Requirement, Client, Document | JD parsing, normalization, SLA enforcement. |
| Matching & Ranking | Submission, FeatureStore, EvalMetrics | Hybrid retrieval, explainability payloads. |
| Operations & Compliance | AuditEvent, Tenant, FeatureFlag | RBAC, data residency, policy enforcement. |
| Analytics | SnapshotFact, Metric | Pipeline health, rep productivity, trust metrics. |

## Event Taxonomy (Chronological Lifecycle)

### Consultant Lifecycle Events
- `consultant.created`
- `consultant.profile.updated`
- `consultant.resume.ingested`
- `consultant.skill.normalized`
- `consultant.availability.changed`
- `consultant.offboarded`

### Requirement Lifecycle Events
- `requirement.intake.received`
- `requirement.normalized`
- `requirement.priority.changed`
- `requirement.closed`

### Matching & Submission Events
- `matching.search.executed`
- `submission.draft.created`
- `submission.review.requested`
- `submission.sent`
- `submission.feedback.recorded`
- `submission.outcome.finalized`

### Copilot & AI Events
- `ai.prompt.issued`
- `ai.response.generated`
- `ai.response.flagged`
- `ai.feedback.collected`
- `ai.cost.budget.decremented`

### Governance & Compliance Events
- `audit.event.logged`
- `policy.violation.detected`
- `tenant.config.updated`
- `data.export.requested`
- `privacy.request.fulfilled`

### Observability Events
- `trace.span.exported`
- `log.batch.shipped`
- `alert.triggered`

Each event includes metadata: `tenant_id`, `actor_type`, `sensitivity`, `trace_id`, `source` (web/api/worker), `schema_version`.

## Event Versioning & Contracts
- Event schemas stored in `docs/contracts/events` (to be created) with JSON Schema.
- Backward-compatible changes allowed; breaking changes require version bump and feature flag.
- Producer services own event emission; consumers subscribe through Kafka/Redpanda when scale dictates (Phase 3+). Phase 0: events stored in Postgres + emitted as structured logs for analytics.

## Data Lineage & Catalog Hooks
- Every ingestion pipeline writes `ingestion_run` rows with dataset source, checksum, redaction status.
- Golden datasets versioned in S3 with metadata referencing `DatasetVersion`.
- Lineage visualized via OpenMetadata (candidate) or DataHub; decision tracked in ADR-0004.


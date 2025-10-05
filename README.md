# BenchCRM - MVP Demo

BenchCRM is a proof-of-concept bench sales CRM that demonstrates a minimal workflow for managing consultants, requirements, and basic AI-style matching. This repository currently implements a lightweight demo (seed data + simple UI) and does **not** include the full enterprise feature set described in the original plan.

---

## Current State Snapshot

### Implemented in this Repo
- **Backend (NestJS + Prisma)**
  - Multi-tenant aware CRUD APIs for tenants, consultants, requirements, submissions, and analytics summaries (`apps/api`).
  - Heuristic matching service that scores consultant/requirement overlap using skill weights and availability (`matching.service.ts`).
  - AI activity logging stub that stores structured metadata (no external LLM call).
  - Phase 2 data platform services: S3-backed document assets with signed URLs/PII metadata, skill ontology versioning APIs, and consultant dedup identity graph endpoints powering the data platform overview.
  - Phase 4 vector retrieval layer: OpenAI embeddings + pgvector hybrid search with lex/vector weighting and reindex/search APIs.
  - Prisma schema covering core entities with demo seed data (`packages/prisma`), now extended with document metadata, skill ontology versions, and identity signatures for dedup.
- **Frontend (Next.js 14 App Router)**
  - Dashboard showing analytics counters for the demo tenant.
  - Consultants list with search powered by TanStack Query.
  - Requirements view that triggers the backend matching API and renders the ranked results.
  - Data Platform dashboard surfaces document pipeline status, ontology coverage, and dedup suggestions for the demo tenant.
- **Observability & Logging**
  - OpenTelemetry instrumentation on the NestJS API (auto-instrumented HTTP + Prisma) with trace-aware `pino` logs.
  - Browser-side OpenTelemetry bootstrap for Next.js to propagate trace context across fetch calls.
  - Local OpenTelemetry Collector (OTLP gRPC/HTTP) with file exporters for centralized traces/logs (`docker-compose` service `otel-collector`).
- **Identity & Security**
  - Auth0 / OIDC JWT authentication with role-based guards (Owner/Admin/Manager/Rep/Viewer) applied across the API.
  - Prisma middleware + Postgres row-level security enforcing tenant isolation on every query.
  - Audit interceptor producing tamper-evident records with hashed chains per tenant.
- **Tooling & Local Dev**
  - Docker Compose for Postgres + Redis + OpenTelemetry Collector.
  - Seed script that loads demo tenant, skills, consultants, and requirements.
  - Shared `.env` template covering API + web + observability settings.

### Not Yet Implemented (From Original Vision)
The following items are **not present** and will require fresh implementation:
- **Authentication & RBAC**: Auth0/OIDC integration, session management, roles/permissions, audit trails.
- **Email/Resume Ingestion**: IMAP/SMTP ingestion, parsing pipelines, resume storage, enrichment jobs (document metadata + signed URL infrastructure now in place, but ingestion workers are still absent).
- **AI Integrations**: OpenAI API calls, embedding/vector storage & semantic search, explainability tooling.
- **Background Processing**: BullMQ queues, workers, retry/dead-letter handling, Redis-backed scheduling.
- **Advanced Analytics & Dashboards**: KPI visualisations, exports, alerts.
- **Infrastructure & DevOps**: AWS provisioning (RDS, S3, ElastiCache, CloudFront), Terraform, CI/CD pipelines, monitoring (Sentry), secrets management.
- **Security Hardening**: Row-level security, tenant isolation guarantees, compliance logging.
- **Testing Strategy**: Unit/integration/E2E/load tests, Playwright suites, automated QA gates.
- **UI Polish**: Auth flows, data entry forms, shadcn/ui components, Framer Motion interactions, accessibility review.

### Suggested Roadmap
1. **Authentication & Tenant Isolation** - Wire Auth0, implement role-based guards, enforce tenant scoping.
2. **Real AI Matching** - Add OpenAI embedding workflows, store vectors in Postgres pgvector, expose semantic search endpoints.
3. **Ingestion Pipelines** - Build BullMQ workers for email ingestion and resume parsing, integrate file storage (e.g., S3).
4. **Productisation** - Implement analytics dashboards, auditing, notifications, and comprehensive tests.
5. **Operations** - Add Terraform/AWS infrastructure, CI/CD pipelines, monitoring & alerting.

---

## Getting Started (Current Demo)

> Prerequisites: Node.js 18+, pnpm, Docker Desktop. Set `DATABASE_URL` and copy `.env` to `packages/prisma/prisma/.env` for Prisma CLI commands.

```bash
# install dependencies
pnpm install

# launch infrastructure (Postgres, Redis, OpenTelemetry Collector)
docker compose up -d postgres redis otel-collector

# apply migrations and seed demo data
pnpm --filter prisma migrate
pnpm --filter prisma migrate:dev # optional when editing schema
pnpm --filter prisma seed

# run services
pnpm dev:api    # NestJS backend on http://localhost:4000
pnpm dev:web    # Next.js frontend on http://localhost:3000
```

**Demo login:** none - APIs are open and assume the `demo-tenant` seed data.

---

## Observability Quickstart
- Ensure `.env` contains OTLP endpoints (defaults point to `http://localhost:4318`).
- When the API and web app run, traces flow through the OpenTelemetry Collector and are written to `otel-data` volume (`docker volume inspect otel-data`).
- Structured logs emitted by the API include `trace_id`/`span_id`, enabling correlation in downstream aggregators.
- To inspect traces/logs locally, tail the collector files:
  ```bash
  docker exec -it $(docker ps --filter name=otel-collector -q) sh -c "tail -f /var/lib/otelcol/traces.jsonl"
  ```
  Similar for `logs.jsonl` or integrate the collector with your preferred backend (Honeycomb, Loki, etc.).

---

## Repository Structure

```
apps/
  api/        # NestJS modular backend (controllers, services, Prisma integration)
  web/        # Next.js frontend (App Router, TanStack Query)
docs/
  adr/        # Architecture decision records
  phase0/     # Phase 0 foundational documentation
observability/
  otel-collector-config.yaml
packages/
  prisma/     # Prisma schema, migrations, seed script
```

---

## Contributing & Next Steps

- Decide which missing capability to implement first (see roadmap).
- Track real vs. planned behaviour in this README as features land.
- Add tests and CI/CD as functionality grows to enterprise scope.
- Wire the OpenTelemetry Collector to your production-grade observability backend before going beyond local usage.

Feel free to open issues or proposals for individual roadmap items so the work can be planned and delivered incrementally.

### Vector Retrieval APIs
- `POST /api/tenants/:tenantId/search/index` – index a single consultant or requirement into the hybrid search store.
- `POST /api/tenants/:tenantId/search/index/all` – bulk re-index consultants and/or requirements for a tenant.
- `POST /api/tenants/:tenantId/search/hybrid` – run BM25 + pgvector cosine retrieval with optional filters; returns ordered hybrid scores.

> Requires `OPENAI_API_KEY` (and optionally `OPENAI_EMBEDDING_MODEL`, `OPENAI_EMBEDDING_DIMENSIONS`) plus pgvector enabled in Postgres.

# BenchCRM — Refined Enterprise Project Plan (v2)

**AI‑Powered Bench Sales CRM**
**Owner:** Balaji Koneti
**Target team:** 20 senior engineers (avg 20+ YOE)
**Delivery model:** 3 releases over \~24 weeks (see Roadmap)

---

## 0) Executive Summary

BenchCRM is an AI‑first CRM tailored for bench sales operations: importing job reqs, enriching consultant profiles, matching intelligently, and driving outcomes with explainable predictions. This document upgrades your original plan to an enterprise‑grade blueprint across architecture, security, data, ML, UX, SRE, and delivery. It assumes a highly experienced team and optimizes for **robustness, maintainability, and beauty**.

**Primary goals:**

* **Speed to value:** ship a delightful MVP in 8 weeks that already beats manual matching.
* **Trustworthy AI:** explainable scoring, auditability, human‑in‑the‑loop review.
* **Enterprise‑ready:** multi‑tenancy, SSO, RBAC, PII/PHI safe handling, observability, SLOs.
* **Scale:** thousands of consultants & reqs, millions of events, predictable costs.

**Key product themes:**

* Natural‑language command bar + conversational AI over your CRM data.
* Smart ingestion from emails/ATS/job boards with dedupe, normalization, and skill taxonomy.
* Matching that blends embeddings (semantic) + features (rules, history) + calibrated ML.
* Beautiful, accessible, responsive UI with motion that respects performance budgets.

---

## 1) What Changes vs. Original Plan (Delta)

1. **Multi‑tenancy & RBAC (Enterprise‑grade):** tenant\_id on all domain rows + Postgres RLS policies; role‑based and resource‑scoped permissions.
2. **Identity & SSO:** OAuth/OIDC (Auth0/Keycloak/Entra) with MFA, SCIM provisioning, and service tokens for integrations.
3. **AI Gateway (Provider‑agnostic):** an internal adapter layer for LLMs/embedding providers with routing, retries, cost caps, and structured outputs.
4. **Explainable Matching:** expose factor contributions (skills/geo/rate/history) and a reason string; add human approval steps.
5. **Offline ML Pipeline:** Python training jobs, model registry, drift checks, calibration (Platt/Isotonic), and A/B evaluation.
6. **Event‑Driven Backbone:** all writes emit domain events -> analytics, notifications, search updates; idempotent consumers.
7. **Observability & SRE:** SLOs (p95 latencies), RED/USE dashboards, error budgets, runbooks, on‑call.
8. **Data Governance:** PII tagging, field‑level encryption, retention schedules, access logs, DSR workflows (GDPR/CCPA‑style).
9. **Cost & Performance:** caching tiers (Redis), background jobs (BullMQ), vector index compaction, batched inference, rate limiting.
10. **Design System:** consistent tokens, components (shadcn/ui), motion guidelines, a11y AA+.
11. **Quality Gates:** contract tests, e2e (Playwright), load tests (k6), security scans (SAST/DAST), schema drift checks.
12. **Integration Layer:** inbox/IMAP parsers for job reqs, adapter framework for job boards/ATS/CRM (pluggable, rate‑limited).

---

## 2) Non‑Functional Requirements (NFRs)

* **Availability:** 99.9% (monthly) for core read paths; 99.5% for heavy analytics.
* **Latency targets (p95):** List views ≤ 300ms; search ≤ 600ms; recommendations ≤ 1.2s.
* **Throughput:** 50 RPS steady, burst 200 RPS; queue absorbs spikes.
* **Data durability:** PITR backups (≤15‑min RPO), 99.999% object storage durability.
* **Security:** OWASP ASVS L2, CIS Benchmarks for infra, SOC2‑ready controls.
* **Accessibility:** WCAG 2.2 AA.
* **Internationalization:** i18n‑ready (en‑US first), number/date/locale formatting.

---

## 3) High‑Level Architecture

```
┌───────────── Web (Next.js) ─────────────┐
│  App Router | shadcn/ui | Framer Motion │
│  Graph‑ish data hooks over REST         │
└──────────────▲───────────┬──────────────┘
               │ REST/WS   │ SSE
        ┌──────┴───────────▼──────┐
        │  API (NestJS) Modular   │
        │  - Auth/RBAC            │
        │  - Consultants          │
        │  - Requirements         │
        │  - Matching/AI Gateway  │
        │  - Search/Embeddings    │
        │  - Activities/Email     │
        │  - Analytics            │
        └───▲───────────┬─────────┘
            │           │ emits Domain Events
            │           ▼
      ┌─────┴─────┐   ┌───────────┐
      │ Redis     │   │ NATS/Kafka│  <- async comms
      │ (Cache/Q) │   │  (Bus)    │
      └─────▲─────┘   └────▲──────┘
            │              │
     ┌──────┴──────┐  ┌────┴───────────┐
     │ Workers     │  │ AI Gateway     │
     │ BullMQ jobs │  │ (LLMs/Embed)   │
     │ - Ingestion │  │ - Routing       │
     │ - Embedding │  │ - Guardrails    │
     │ - Training  │  │ - Telemetry     │
     └──────▲──────┘  └────▲───────────┘
            │              │
  ┌─────────┴──────────┐   │
  │ PostgreSQL (+RLS)  │   │
  │  + pgvector        │   │
  │  + audit & CDC     │   │
  └─────────▲──────────┘   │
            │              │
      ┌─────┴─────┐   ┌────┴───────┐
      │ Object    │   │ Vector DB* │ (*optional: Qdrant/Weaviate)
      │ Storage S3│   └────────────┘
      └───────────┘
```

**Style:** start as a **modular monolith** (clear module boundaries) with an event bus; split into microservices only when scaling dictates.

---

## 4) Tenancy, Auth, RBAC

* **Tenancy model:** single DB, **tenant\_id** on every row; **Postgres RLS** enforces isolation.
* **RBAC:** roles (Owner, Admin, Recruiter, Sales, Analyst, ReadOnly) + fine‑grained permissions (resource, action, scope).
* **Sessions & API:** OAuth/OIDC login; short‑lived JWT access tokens + refresh; service accounts for integrations.
* **Audit trails:** all data mutations & AI recommendations recorded with actor, hash, model version, prompt fingerprint.

**Sample RLS (sketch):**

```sql
ALTER TABLE consultant ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON consultant
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

---

## 5) Domain Model (Core Entities)

* **Tenant, User, Role, Permission, AuditLog**
* **Consultant, Skill, ConsultantSkill, Availability, RateCard**
* **Company, Contact, Requirement, RequirementSkill**
* **Submission, Interview, Offer, Placement**
* **Activity (email/call/note), Attachment, Tag**
* **Embedding (entity\_type, entity\_id, vector, model, dims)**
* **Recommendation (inputs, scores, reasons, model\_version)**
* **MatchRun (batch context), FeatureSnapshot (for explainability)**
* **IntegrationAccount (provider, creds), ImportJob, WebhookEvent**

**Data integrity:** composite unique keys for dedupe (e.g., \[tenant\_id, external\_id]).

---

## 6) Data & Search

* **Relational store:** Postgres 15+ with **pgvector**; JSONB for schemaless enrichments.
* **Search index:** hybrid — SQL filters + vector similarity + BM25 text (tsvector) for speed/quality.
* **ETL pipeline:** inbox → parser → normalizer → skill extractor → embedding generator → upsert.
* **PII tagging:** columns classified; secrets encrypted at rest; masked in logs.

---

## 7) AI/ML System

### 7.1 Components

* **AI Gateway:** adapters for LLM chat, extraction, embeddings; timeouts, retries, token accounting, structured output via JSON schema.
* **Feature Store (lightweight):** compute & persist features per (consultant, requirement) pair for reuse & explainability.
* **Models:**

  * **Baseline:** logistic regression (fast, explainable).
  * **Boosted Trees:** XGBoost/LightGBM for non‑linear interactions.
  * **Ranking:** Learning‑to‑Rank (LambdaMART) for top‑K suggestions.
* **Calibration:** isotonic/Platt → **successProbability** that is well‑calibrated.
* **Evaluation:** AUC, PR‑AUC, Brier, MRR\@K, Recall\@K; offline CV + shadow online.
* **Monitoring:** prediction drift (PSI), data quality checks, win‑rate over time; alert on degradation.

### 7.2 Matching v2 (Explainable)

**Score = 0.40·Skills + 0.20·Location + 0.15·RateFitness + 0.10·Seniority + 0.10·History + 0.05·Availability**

* **Skills:** weighted Jaccard of normalized skill taxonomy + embedding cosine for semantic alignment.
* **Location:** geo distance (haversine) or time zone compatibility for remote.
* **RateFitness:** sigmoid of (budget − rate)/budget; penalize large gaps.
* **Seniority:** years vs required; penalize under/over by band.
* **History:** consultant/company success rates, recency boosts.
* **Availability:** next‑available date vs start window.

**Output:** `{matchScore: 0..1, successProbability: 0..1, reasons: ["Skill overlap 86%", "Within budget"], factors: {...}}`.

### 7.3 Structured Extraction (Requirements/Resumes)

* Prompt LLM with JSON Schema to extract: title, skills\[], years, location, work auth, rate, seniority, domains, remote\_ok, notes.
* Reject/repair with deterministic validators; retry with few‑shot examples.

---

## 8) APIs

* **Style:** REST v1 with OpenAPI; pagination (cursor), idempotency keys, ETags; **webhooks** for events.
* **Security:** JWT (aud, iss) checked; per‑tenant rate limits (sliding window).
* **Notable endpoints (additions):**

  * `POST /v1/integrations/inbox/import` (IMAP/forwarded email → Requirement)
  * `POST /v1/requirements/:id/recommendations?topK=10&explain=true`
  * `POST /v1/ai/extract` (schema\_name, text) → structured JSON
  * `GET /v1/audit/logs` (filters)
  * `GET /v1/analytics/kpis` (tenant dashboard aggregates)

**OpenAPI sketch:**

```yaml
openapi: 3.1.0
info: {title: BenchCRM API, version: 1.0.0}
paths:
  /v1/requirements/{id}/recommendations:
    post:
      parameters:
        - in: path
          name: id
          schema: {type: string, format: uuid}
        - in: query
          name: topK
          schema: {type: integer, default: 5, minimum: 1, maximum: 50}
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                explain: {type: boolean, default: true}
      responses:
        '200': {description: Recommendations returned}
```

---

## 9) Frontend (Beautiful by Design)

**Principles:** clarity > cleverness, speed > flourish, accessible by default.

* **Design System:** tokens (spacing/typography/colors), shadcn/ui + Tailwind; dark/light themes; motion using Framer with 150–250ms durations.
* **Layout:** 3‑pane (filters | list | detail) on desktop; single‑column with sticky actions on mobile.
* **Key screens:** Dashboard, Consultants, Requirements, Matches (HITL review), Submissions, Analytics, AI Chat, Audit.
* **Patterns:**

  * Command‑K for quick actions / natural queries.
  * Explainers: inline chips showing factor contributions; hover reveals details.
  * Empty‑state coaching with sample prompts.
  * Batch actions with optimistic UI; toasts for background jobs.
* **Performance budgets:** JS ≤ 220KB gz initial, TTI ≤ 2.5s on mid‑range laptop, avoid layout thrash.
* **Accessibility:** focus rings, keyboard nav, ARIA labels, color contrast AA+.

---

## 10) DevOps, Environments, IaC

* **Envs:** local → dev → staging → prod; feature flags per env.
* **CI/CD:** lint/typecheck/tests → build → vuln scan → migration dry‑run → deploy (blue/green) → smoke tests.
* **IaC:** Terraform for VPC, Postgres, Redis, S3, NAT, secrets manager, CDN; GitOps for app deploys.
* **Secrets:** external secrets operator/SM; no secrets in env files for prod.
* **Backups:** daily full + WAL; quarterly DR test; RPO 15m, RTO 2h.
* **Runbooks:** incident templates, rollback steps, rate‑limit escalation, hotfix policy.

---

## 11) Observability & SRE

* **Metrics:** RED (Rate/Errors/Duration), DB saturation, queue depth, token usage, vector index size.
* **Tracing:** distributed traces API→worker→external.
* **Logging:** structured JSON, PII‑safe, correlation IDs.
* **SLOs:** defined in §2; error budget governance with blameless postmortems.

---

## 12) Quality Engineering

* **Unit tests:** >70% critical modules; factories, seed data.
* **Integration tests:** Prisma + test containers; contract tests (Pact) for API consumers.
* **E2E:** Playwright flows for CRUD, matching, submissions, chat.
* **Load:** k6 scenarios for search and recommend.
* **Security:** SAST (dependency & code), DAST (ZAP), secrets scan, SBOM.
* **Data tests:** Great Expectations (or SQL checks) for ETL sanity.

---

## 13) Security & Compliance

* **PII:** classify fields; encrypt at rest (KMS) & in transit; field‑level encryption for sensitive docs.
* **Access:** least privilege IAM; admin actions require re‑auth; session/device management.
* **Compliance posture:** SOC2‑friendly controls, DPIA template, DSR (export/delete) tooling, audit exports.
* **AI safety:** prompt/response logging with redaction; model version pinning; jailbreak/PII output filters.

---

## 14) Roadmap & Team Plan (20 Sr Engineers)

**Squads (5 engineers each):**

1. **Web UX** (Lead FE, FE x3, UX Eng): design system, pages, a11y, Command‑K, chat UI.
2. **Core API** (Staff BE, BE x3, QA Eng): domain modules, RBAC, audit, webhooks.
3. **Data/ML** (Staff MLE, MLE x2, DE, QA Eng): extraction, embeddings, features, models, eval.
4. **Platform/SRE** (Staff Platform, SRE x2, BE, Sec Eng): CI/CD, IaC, observability, security.

**Milestones:**

* **R0 (Weeks 0‑2):** Inception, designs, infra bootstrap, schema v1, auth skeleton, CI green.
* **R1 (Weeks 3‑8) MVP:** Consultants/Requirements CRUD, email ingestion alpha, embeddings, baseline matching, dashboard v1, observability.
* **R2 (Weeks 9‑16):** Explainable recommendations, submissions pipeline, analytics v1, multi‑tenant RLS, SSO, audits, load test ≥ 50 RPS.
* **R3 (Weeks 17‑24):** Offline training + calibrated probabilities, alerts/notifications, integrations v1, DR drill, a11y AA, hardening.

**Definition of Done (per feature):** UX spec + API schema approved → tests green → a11y checks → perf budget met → docs/runbook updated → tracked behind a flag → staged sign‑off.

---

## 15) KPIs & Success Metrics

* **Time‑to‑first recommendation:** ≤ 5 min after import.
* **Top‑5 hit rate:** ≥ 65% (a chosen consultant in top‑5).
* **Calibration:** Brier score ≤ 0.16 on successProbability.
* **Manual time saved:** ≥ 50% for recruiters by month 3.
* **System health:** SLO adherence ≥ 99% periods.

---

## 16) Risk Register (Sample)

| Risk                              | Impact        | Likelihood | Mitigation                                                |
| --------------------------------- | ------------- | ---------- | --------------------------------------------------------- |
| LLM cost spikes                   | \$\$          | Med        | Caching, batch, token caps, cheaper fallback routes       |
| Data quality (dirty resumes/reqs) | Match quality | High       | Validators, human review, schema‑first extraction         |
| Tenant data leakage               | Critical      | Low        | RLS, integration tests, audits, pen test                  |
| Vendor lock‑in                    | Med           | Med        | AI Gateway abstraction, export tools                      |
| Scaling pgvector                  | Perf          | Med        | HNSW index tuning, IVF, or external vector DB when needed |

---

## 17) Example Schemas & Code Sketches

### 17.1 Prisma (extract)

```prisma
model Tenant { id String @id @default(uuid()); name String; createdAt DateTime @default(now()) }
model User   { id String @id @default(uuid()); tenantId String; email String @unique; role String; /* ... */ }

model Consultant {
  id String @id @default(uuid())
  tenantId String
  name String
  location String?
  rate   Decimal?
  skills Json? // normalized taxonomy list
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([tenantId])
}

model Requirement {
  id String @id @default(uuid())
  tenantId String
  title String
  description String
  skills Json?
  budget Decimal?
  remoteOk Boolean @default(true)
  embeddings   Float[] @db.Vector(768)
  aiComplexity Float?
  createdAt DateTime @default(now())
  @@index([tenantId])
  @@index([tenantId, aiComplexity])
}

model Submission {
  id String @id @default(uuid())
  tenantId String
  consultantId String
  requirementId String
  matchScore Float
  successProbability Float?
  status String @default("draft")
  createdAt DateTime @default(now())
  @@unique([tenantId, consultantId, requirementId])
}

model Embedding {
  id String @id @default(uuid())
  tenantId String
  entityType String // 'consultant' | 'requirement'
  entityId String
  model String
  dims  Int
  vector Float[] @db.Vector(768)
  createdAt DateTime @default(now())
  @@index([tenantId, entityType])
}

model AuditLog {
  id String @id @default(uuid())
  tenantId String
  actorId String?
  action  String
  entity  String
  entityId String
  payload Json?
  createdAt DateTime @default(now())
  @@index([tenantId, entity, entityId])
}
```

### 17.2 Matching Service (pseudo‑code)

```ts
const score = weighted({
  skills: jaccard(skillSet(req), skillSet(con)) * 0.7 + cosine(emb(req), emb(con)) * 0.3,
  location: geoScore(req, con),
  rateFitness: rateScore(req.budget, con.rate),
  seniority: bandScore(req.years, con.years),
  history: priorWinRate(con, req.company),
  availability: availabilityScore(con, req.start)
}, {0.40, 0.20, 0.15, 0.10, 0.10, 0.05});
return explain(score, factors)
```

### 17.3 AI Gateway (interfaces)

```ts
interface ChatProvider { chat(messages, schema?) => {json, tokens, cost} }
interface EmbedProvider { embed(texts, model?) => {vectors, tokens, cost} }
```

---

## 18) Integration Adapters (extensible)

* **Inbox/Email:** IMAP/Gmail API; parse threads → Requirements; dedupe by title+company+hash.
* **Job boards/ATS:** adapter interface with rate limiting and job schema mapping.
* **Calendars:** interviews scheduling; optional for R3.
* **Webhooks:** outbound events for downstream BI/Slack/MS Teams.

---

## 19) Analytics & BI

* **Operational metrics:** pipeline throughput, match conversion, recruiter productivity.
* **Business dashboards:** revenue per consultant, fill time, client win rate.
* **Warehouse (optional R3):** CDC → S3 → DuckDB/BigQuery + dbt models.

---

## 20) Documentation & DX

* **Living ADRs:** decisions with trade‑offs.
* **API Docs:** OpenAPI + examples; Postman/Insomnia collections.
* **Runbooks:** ingestion issues, queue stuck, model rollback.
* **Playbooks:** matching quality triage, data cleanup campaigns.

---

## 21) Environment Variables (additions)

```
TENANT_MODE=single|multi
JWT_AUD=benchcrm
AI_MAX_TOKENS_DAY=250000
RATE_LIMIT_CORE=200rps
OBJECT_STORAGE_BUCKET=benchcrm
INTEGRATIONS_EMAIL_*=...
```

---

## 22) Acceptance & Launch Checklist

* [ ] RLS policies enabled and tested
* [ ] SSO, MFA, session policies configured
* [ ] Backups + restore drill passed
* [ ] Load test meets p95 targets
* [ ] A11y audit (axe) passes
* [ ] Security scan clean (high/critical)
* [ ] Analytics & audit exports enabled
* [ ] Documentation complete (user/admin/dev)

---

### The Result: Strong & Beautiful

* **Strong:** resilient architecture, observability, governance, and calibrated AI.
* **Beautiful:** cohesive design system, subtle motion, crisp information density, accessible & fast.
* **Practical:** human‑in‑the‑loop controls, explainability, and cost awareness baked in.

> This plan positions BenchCRM as an enterprise‑grade, AI‑native CRM your 20‑senior‑engineer team can deliver with confidence and pride.

Tech Stack (Final)
Frontend

Framework: Next.js 14 (App Router, React 18, TypeScript)

UI: Tailwind CSS + shadcn/ui (headless, accessible primitives)

Motion: Framer Motion (micro-interactions, low overhead)

State & Data: TanStack Query (server cache) + Zustand (local UI state)

Forms & Validation: React Hook Form + Zod

Tables/Lists: TanStack Table (virtualized lists)

Charts: Recharts

Auth: Auth0 (OIDC/OAuth2; can swap for Entra/Keycloak later)

i18n: next-intl (routing-friendly)

Testing: Playwright (e2e), Vitest + Testing Library (unit/comp)

Why this FE stack?

Performance & DX: Next.js App Router gives RSC, streaming, route-level caching; Tailwind + shadcn/ui accelerates consistent, accessible UI.

Scalability: TanStack Query standardizes async/data cache; Zustand is tiny for local UI state.

Enterprise-ready: Auth0/SSO path is mature; Playwright + Vitest give reliable test coverage.

Beauty + Speed: Framer Motion for subtle motion without compromising TTI.

Backend

Framework: NestJS 10 (TypeScript)

ORM/DB: Prisma + PostgreSQL 15 (pgvector enabled)

Search: Postgres full-text (tsvector) + vector similarity (pgvector)

Cache & Queue: Redis (cache + BullMQ for jobs)

Events Bus: NATS (lightweight, easy ops) — Kafka optional later

AI Gateway: Provider-agnostic adapters (OpenAI first; pluggable to others)

Auth & Tenancy: Auth0 (JWT), Postgres RLS for tenant isolation

Docs/Contracts: OpenAPI (Swagger) + Pact (consumer contracts)

Observability: OpenTelemetry traces, Prometheus metrics, Loki JSON logs

Testing: Jest (unit/integration with Testcontainers), k6 (load)

Infra (prod): Terraform (VPC, RDS Postgres, Elasticache, S3, NAT, CloudFront), GitHub Actions CI/CD

Why this BE stack?

Velocity + Structure: NestJS modular boundaries fit our “modular monolith” plan; Prisma accelerates schema & migrations safely.

Quality Matching: pgvector keeps vectors next to relational data (joins, ACID, RLS).

Operational Simplicity: NATS + Redis + BullMQ are easy to run; scale later if needed.

Auditability: OpenAPI + Pact + OTEL deliver traceable, contract-driven services.

Implementation Order (What first, then next)

Golden rule: unblock data-in → data-through → value-out (recommendations) quickly; then harden.

Week 0–2 — Foundations

Monorepo (pnpm + Turborepo), CI lint/test/build, Docker Compose (Postgres + Redis + Mailhog).

Postgres with pgvector, Prisma schema v1 (Tenant, User, Consultant, Requirement, Submission, Embedding, AuditLog).

NestJS app skeleton (Auth, RBAC, Consultants, Requirements modules), RLS scaffolding.

Next.js app shell (layout, theme, tokens), shadcn/ui baseline, auth wiring (Auth0).

Week 3–4 — CRUD + Search (usable app)

FE pages for Consultants/Requirements (list/detail/create/edit), server components + Query.

BE CRUD with validation, pagination, tsvector search.

Audit logging, seed data, basic analytics counters.

E2E happy path (Playwright): login → create consultant → create requirement.

Week 5–6 — Embeddings + Matching v1

AI Gateway (embeddings + chat); embedding jobs (BullMQ).

Matching API: hybrid (rules + cosine) with factor weights & explanation JSON.

FE “Get Recommendations” on requirement detail; factor chips UI.

Initial metrics (Prometheus), traces across API → worker.

Week 7–8 — MVP polish & Observability

Email ingestion (IMAP/Gmail forward) → Requirement parser → normalizer → embeddings.

Dashboard v1: pipeline stats, top skills, basic win-rate.

Load test > 50 RPS read, p95 targets; A11y pass on top pages.

Blue/Green deploy to staging; feature flags.

Week 9–12 — Multi-tenant & SSO, Explainability v2

RLS enforcement + test harness; role matrix; SCIM optional.

Explainable scores: per-factor contributions stored; human-in-the-loop approve workflow.

Submissions module (status flow) + timeline Activities.

Contract tests (Pact) for FE/BE; k6 search/recommend scenarios.

Week 13–16 — Analytics v1 + Hardening

KPI API (fill time, top-5 hit rate, calibration draft).

Alerts/notifications (email/Slack) via workers.

Security gates (SAST/DAST), secrets manager, backup/restore drill.

DR runbook, chaos day, cost dashboards.

Week 17–24 — ML Offline + Calibration + Integrations

Python training jobs (logreg + XGBoost + LTR), model registry, drift & calibration (isotonic).

Shadow predictions vs baseline; promote after A/B.

Integrations v1 (job board/ATS adapter framework).

Warehouse (optional): CDC → S3 → DuckDB/BigQuery + dbt.

Detailed Timeline (Week-by-Week)

R0 — Foundations

W0: Repo bootstrap, Turborepo/pnpm, CI (ESLint, Prettier, TypeCheck), Docker Compose.

W1: DB up (Postgres + pgvector), Prisma models + migrations; NestJS skeleton; Next.js shell; Auth0 dev tenant.

W2: RLS scaffolding & tenancy headers; seed scripts; OTEL + Prometheus/Loki baseline; Playwright scaffold.

R1 — MVP

W3: Consultants/Requirements BE CRUD + OpenAPI; FE list/detail; Zod validations; table filters.

W4: tsvector search + indexes; optimistic mutations; audit logs UI; first E2E suite green.

W5: AI Gateway (embeddings); job pipeline (BullMQ); Embedding table + backfills.

W6: Matching v1 (hybrid) + explain JSON; FE “Recommend” w/ factor chips; metrics panels.

W7: Email ingestion alpha (IMAP/Gmail); normalizer + skill extraction (LLM JSON schema).

W8: Dashboard v1; a11y audit; k6 baseline; stage deploy; smoke tests; MVP sign-off.

R2 — Enterprise Basics

W9: RLS enforcement + unit/integration tests; role matrix + policy guards.

W10: Submissions module (API + FE), status transitions, activity log.

W11: Explainability v2 (stored factors, reason strings), approve/override UI.

W12: SSO polish (Auth0 rules/hooks), SCIM draft, contract tests, load goals.

R3 — Scale, ML & Integrations

W13: KPI/analytics endpoints; Grafana dashboards; cost/tokens panels.

W14: Security scans; DLP/PII tagging; secrets manager; backup/restore drill.

W15: Notifications (email/Slack) w/ rate limits; failure retries; runbooks.

W16: Hardening sprint; perf tuning; error budgets; prod readiness review.

W17–18: Offline training pipeline (Python), feature snapshots, CV splits.

W19–20: Calibration (isotonic/Platt), shadow deploy, monitoring drift.

W21–22: Promote calibrated model; A/B; LTR for top-K.

W23–24: Integrations v1 (ATS/boards), warehouse/dbt optional; GA launch.

Route & Endpoint Map (No Broken Links)
Frontend URLs (all pages implemented)

/ → Redirect to /dashboard

/dashboard → Analytics cards, trends, pipeline stats

/consultants → List + filters

/consultants/new → Create form

/consultants/[id] → Detail (profile, skills, activity)

/requirements → List + filters

/requirements/new → Create form

/requirements/[id] → Detail + “Get Recommendations”

/matches → Human-in-the-loop review queue

/submissions → List & status

/submissions/[id] → Detail timeline

/ai-chat → Conversational UI over CRM

/audit → Audit trails & exports

/settings → Tenant, roles, API keys, webhooks

Each route ships with a matching page component and loader/actions; all links above must be present in the app nav and smoke-tested.

Backend (REST, versioned under /v1)

GET /v1/consultants (q, page, sort)

POST /v1/consultants

GET /v1/consultants/:id

PATCH /v1/consultants/:id

DELETE /v1/consultants/:id

GET /v1/consultants/analytics/overview

GET /v1/requirements

POST /v1/requirements

GET /v1/requirements/:id

PATCH /v1/requirements/:id

DELETE /v1/requirements/:id

GET /v1/requirements/:id/recommendations (topK, explain)

POST /v1/requirements/:id/submit (consultantId)

POST /v1/integrations/inbox/import (email payload/IMAP ref)

POST /v1/ai/extract (schema_name, text)

POST /v1/ai/embeddings

POST /v1/ai/match-score

GET /v1/ai/analytics/:tenantId

GET /v1/audit/logs (filters, export)

GET /v1/analytics/kpis (dashboard aggregates)

OpenAPI served at /v1/docs and /v1/docs-json. Contract tests ensure FE calls only defined endpoints.

Environments & Links (for local/stage/prod)

Local (Docker Compose):

Web: http://localhost:3000

API: http://localhost:4000

API Docs: http://localhost:4000/v1/docs

Mailhog: http://localhost:8025

Postgres: localhost:5432

Redis: localhost:6379

Staging/Prod: use WEB_BASE_URL and API_BASE_URL; FE fetches from NEXT_PUBLIC_API_URL so no hard-coded hostnames. Health checks: /healthz (API), /api/healthz (FE).

Build Prompts (copy/paste to kick teams off)
Repo bootstrap (DevOps)

“Create a Turborepo with apps/web (Next.js 14) and apps/api (NestJS 10). Add shared packages/ui (shadcn components), packages/config (eslint, tsconfig). Configure pnpm workspaces, GitHub Actions for lint/test/build, and Docker Compose for Postgres (with pgvector), Redis, and Mailhog.”

Database & RLS (Backend)

“Implement Prisma models for Tenant, User, Role, Consultant, Requirement, Submission, Embedding, AuditLog. Add migrations enabling CREATE EXTENSION IF NOT EXISTS vector;. Add RLS policies keyed by tenant_id and a request-scoped SET app.tenant_id='…' in a NestJS middleware. Provide seed and factory scripts.”

Matching & Embeddings (Backend)

“Add AI Gateway with adapters for embeddings and chat. Implement BullMQ jobs for embedding upserts and backfills. Create POST /v1/requirements/:id/recommendations that returns topK with factor contributions and reasons.”

UI System (Frontend)

“Install Tailwind + shadcn/ui; create design tokens (spacing/typography/colors) and a theme switcher. Implement a 3-pane layout, Command-K palette, and skeleton loaders. Build list/detail pages for Consultants and Requirements using TanStack Query, Table, and RHF+Zod.”

Email Ingestion (Workers)

“Implement IMAP/Gmail ingestion job that converts emails → Requirement DTO, runs LLM JSON-schema extraction, normalizes skills via taxonomy, stores embeddings, and emits a RequirementImported event on NATS.”

Observability (Platform)

“Wire OpenTelemetry across API and workers, Prometheus metrics (RED), Loki structured logs, Grafana dashboards for latency (p95), queue depth, token usage, and vector index size. Add /healthz and readiness endpoints.”

Acceptance Gates per Milestone (short)

MVP (W8): All FE routes implemented; CRUD + search; recommendations v1; E2E happy path; docs at /v1/docs; A11y basic pass; p95 browse ≤ 300ms, search ≤ 600ms.

R2 (W12): RLS enforced; SSO; explainability stored; submissions flow; k6 targets met; contract tests pass.

R3 (W24): Calibrated probabilities live; alerts; at least one external integration; DR drill complete; SOC2-friendly controls in place.
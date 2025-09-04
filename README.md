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

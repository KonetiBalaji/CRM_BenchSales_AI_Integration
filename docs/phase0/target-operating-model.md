# Target Operating Model & Program Guardrails

This document anchors Phase 0 by defining how BenchCRM delivers enterprise AI safely and predictably. It aligns operating rhythms, OKRs, security posture, and AI governance with the north-star outcomes.

## Target Operating Model (TOM)

| Capability Pod | Charter | Core Roles | Cadence |
| --- | --- | --- | --- |
| **Identity & Controls** | Ship tenant isolation, RBAC, auditability, compliance automation. | Eng Lead, Security Architect, Backend Eng, QA, Compliance SME. | 2-week sprint, security review each sprint. |
| **Data & Retrieval** | Deliver ingestion, normalization, vector retrieval, ontology stewardship. | Product Manager, Data Eng, ML Eng, Backend Eng, Data Steward. | 2-week sprint, monthly dataset governance council. |
| **Matching & Copilot** | Own ranking models, LLM tooling, eval harness, human-in-the-loop UX. | PM, Applied Scientist, LLM Engineer, Full-stack Eng, UX Researcher. | 2-week sprint, weekly eval & user-feedback review. |
| **Platform & Operations** | Observability, CI/CD, infrastructure, FinOps, resiliency, developer experience. | Platform Lead, SRE, DevOps, FinOps Analyst, QA Automation. | 2-week sprint, monthly DR game-day, weekly cost checks. |

**Program governance**
- Quarterly program increment (PI) planning; roadmap reviews across pods.
- Central backlog managed in Jira; weighted shortest job first (WSJF) to prioritise.
- Change Advisory Board (CAB) with Security, AI Safety, Platform, Product; approves high-risk releases.
- Vendor steering committee for Auth0, OpenAI, cloud providers; reviews SLAs and costs.

## Product OKRs (Phase 0 ? Phase 2 horizon)

| Objective | Key Results (targets by end of Phase 2) |
| --- | --- |
| **O1: Prove enterprise-grade trust & safety.** | (a) 100% API endpoints enforced by tenant-scoped authz; (b) SOC2 gap assessment closed; (c) =95% sensitive events captured in audit log POC. |
| **O2: Establish measurable AI foundations.** | (a) Golden dataset v0 curated with =200 labeled matches; (b) Automated retrieval eval suite producing Recall@50 weekly; (c) Baseline hallucination rate <5% in copilot prototypes. |
| **O3: Accelerate rep productivity via guided workflows.** | (a) AI-assisted draft acceptance =60% in pilot; (b) Time-to-first-submit reduced by 20% for pilot customers; (c) Feedback loop instrumentation on =3 workflows. |

## Security Posture Commitments

- **Identity & Access**: SSO via Auth0/OIDC; RBAC with least privilege; service accounts rotated every 90 days.
- **Data Isolation**: Tenant_id enforced via Postgres RLS, schema partitioning strategy, encrypted S3 buckets per tenant with SSE-KMS.
- **Secrets & Config**: Centralized secrets in AWS Secrets Manager; GitHub Actions uses OIDC federation; no shared secrets in code.
- **Secure SDLC**: Threat modelling at kickoff (STRIDE doc); security checklists in Definition of Ready; SAST/DAST gates in CI before GA.
- **Logging & Monitoring**: OpenTelemetry traces from web ? API ? DB, shipped to collector (OTel Collector ? Honeycomb/SumoLogic). Central log access via least privilege with alerting on PII exfil attempts.
- **Incident Response**: 4-tier severity matrix, on-call SRE rotation, tabletop exercises twice per year, breach notification playbook aligned with SOC2.

## AI Governance Framework

- **AI Steering Committee**: Product, AI Safety, Compliance, Legal; meets bi-weekly to review roadmap, eval results, incident reports.
- **Model Lifecycle**: Use Model Cards per release; document training data, eval metrics, limitations, rollback criteria.
- **Dataset Governance**: Data steward owns ontology updates; data sourcing logged in lineage catalog; opt-out policy for consultants.
- **Review Gates**:
  - *Pre-build*: prompt-injection and data-leak scenarios documented.
  - *Pre-release*: offline metrics pass, safety evals signed, audit trail for prompts/responses sampled.
  - *Post-release*: drift dashboards, user feedback triage, cost anomaly alerts.
- **Ethics & Compliance**: No autonomous outbound comms; human approval required for AI-generated outreach; enforce content policy (biased language, PII mishandling) via validators.
- **Third-party Risk**: Vendor assessments for LLM/embedding providers; fallback/self-host plan documented in ADR-0002; DPAs executed.

## Observability Exit Criteria (Phase 0)

- **E2E Tracer**: OpenTelemetry SDK implemented in Next.js and NestJS; trace context propagated through BullMQ, Prisma; spans exported to collector.
- **Central Log Aggregation**: Pino logs ? OTel Collector ? Log store (e.g., Honeycomb, Loki, or SumoLogic). Minimum fields: trace_id, tenant_id, user_id, PII classification, event type.
- **Success Metrics**: 100% of MVP endpoints emit traces and structured logs; dashboards for latency, error rate, cross-tenant access anomalies.


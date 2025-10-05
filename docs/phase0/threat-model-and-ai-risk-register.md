# Threat Model (STRIDE) & AI Risk Register

Scope: MVP services (Next.js web, NestJS API, Prisma/Postgres, BullMQ workers), external integrations (Auth0, OpenAI embeddings), storage (S3 resumes, Redis cache), observability (OpenTelemetry traces, log aggregation).

## STRIDE Analysis

| Asset / Flow | Spoofing | Tampering | Repudiation | Information Disclosure | Denial of Service | Elevation of Privilege | Controls |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **User Authentication (Auth0/OIDC)** | Compromised tokens, phishing. | Token replay. | Claim unlinking. | Token leakage. | Auth0 outage. | Privileged role abuse. | PKCE + rotating refresh tokens; tenant-bound roles; anomaly detection; SCIM provisioning. |
| **API Gateway (NestJS)** | JWT forging. | Request body manipulation. | Lack of audit. | PII in responses. | Request flooding. | Bypass auth guard. | JWT signature verification; rate limiting (Redis-based); schema validation; structured audit log with trace_id; WAF. |
| **Postgres (RLS)** | Fake tenant_id. | SQL injection. | Query repudiation. | Cross-tenant leak. | Lock exhaustion. | SUPERUSER abuse. | Prisma parameterized queries; RLS policies; `SET app.current_tenant`; connection pool quotas; automated audits. |
| **S3 Document Store** | Signed URL theft. | Object mutation. | Missing access log. | Resume exfiltration. | Upload spam. | privilege escalation via IAM. | Pre-signed URL short TTL; checksum validation; server-side encryption; bucket policies; CloudTrail mandatory. |
| **BullMQ Workers** | Worker identity spoof. | Job payload tampering. | Job log deletion. | PII in jobs. | Queue flooding. | Execute arbitrary scripts. | Signed job payloads; worker auth key; DLQ with alerting; job schema validation; resource quotas per tenant. |
| **LLM/Embedding Calls** | Fake service endpoint. | Prompt injection. | Loss of prompt audit. | Data exfiltration via prompt. | Latency/outage. | Abuse of tool access. | Mutual TLS; prompt templates; output validators; tenant-level rate limits; red-team prompts; fallback to self-host. |
| **Admin Console** | Impersonation. | UI tampering. | Lack of change log. | Overexposed analytics. | Feature flag abuse. | Hidden privileged actions. | SSO enforced; feature flag RBAC; signed change requests; UI telemetry. |
| **Observability Pipeline** | Fake spans/logs. | Event corruption. | Audit log deletion. | Sensitive data in logs. | Collector overload. | Use of debug endpoints. | HMAC-signed log batches; PII classifiers; retention policies; access segmented; autoscaling collector. |

Residual risks: targeted DoS of Auth0 (mitigate via backup IdP), partial data exposure if prompt templates fail (mitigate via human review + validators).

## AI Risk Register

| Risk ID | Description | Impact | Likelihood | Detection | Mitigations | Owner | Residual |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AI-001 | Prompt injection manipulates retrieval context to leak PII. | High | Medium | Output validators, audit sampling. | Strict retrieval-first templates; allowlist tool outputs; user confirmation step; red-team test suite. | AI Safety Lead | Low |
| AI-002 | Data exfiltration via embeddings API (tenant mix-up). | High | Low | Billing anomalies, vector store audits. | Tenant-specific API keys; encrypt embeddings at rest; isolation tests. | Platform Lead | Low |
| AI-003 | Hallucinated outreach violates compliance policy. | Medium | Medium | Human feedback, compliance review. | Reference-grounded generation; require inline citations; content filter for bias & PII. | Product Manager (Copilot) | Medium |
| AI-004 | Model drift degrades match quality. | Medium | Medium | Eval dashboards (nDCG@10, Recall@50). | Scheduled offline evals; online A/B; rollback capability; dataset versioning. | Applied Scientist | Medium |
| AI-005 | Cost runaway from uncontrolled LLM usage. | Medium | Medium | FinOps dashboards, budget alerts. | Per-tenant quotas; request caching; degrade to heuristics on overage; monthly vendor reconciliation. | FinOps Analyst | Low |
| AI-006 | Bias/disparate impact in recommendations. | High | Medium | Fairness audit metrics, user feedback. | Sensitive attribute monitoring (opt-in); fairness eval harness; governance review board sign-off. | Ethics Officer | Medium |
| AI-007 | Poisoned documents modify ontology. | High | Low | Data quality monitors. | Hash signing; manual approval for ontology change; anomaly detection on skill frequency. | Data Steward | Low |

## Incident Response & Monitoring

- **Detection**: SIEM alerts on anomalous prompts, cross-tenant access, high-cost spikes, repeated redaction bypass.
- **Response Flow**: Triage (Security) ? Containment (Platform) ? Eradication (Eng pod) ? Recovery (QA) ? Post-mortem within 5 days.
- **Runbooks**: Prompt injection containment, data exfil triage, Auth0 outage failover, embedding service fallback.

## E2E Tracing & Logging Implementation Plan

1. **Instrumentation**: Adopt `@opentelemetry/sdk-node` in API, `@opentelemetry/sdk-trace-web` in Next.js. Wrap Prisma with `@opentelemetry/instrumentation-prisma`.
2. **Context Propagation**: Use `traceparent` headers; middleware attaches `tenant_id`, `user_id` to span attributes; BullMQ carries context via job metadata.
3. **Collector Setup**: Deploy OpenTelemetry Collector (Docker) with exporters for Honeycomb (traces) and Loki/Sumo (logs). Configure resource attributes: `service.name`, `deployment.environment`, `tenant.partition`.
4. **Correlation**: Align trace_id/log correlation by using `pino-otel` to inject `trace_id`/`span_id`; audit events capture same IDs.
5. **Dashboards & Alerts**: Create latency/error dashboards per tenant; alerts for cross-tenant RLS failures, high PII leak risk, ingestion backlog.
6. **Verification**: Synthetic trace job ensures full path coverage daily; automated test verifies trace coverage =95% of routes; logs sanitized via PII detection script.


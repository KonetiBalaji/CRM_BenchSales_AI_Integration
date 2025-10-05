# Phase 0 Completion Checklist

| Deliverable | Status | Evidence |
| --- | --- | --- |
| Target Operating Model, OKRs, security posture, AI governance | ? | `docs/phase0/target-operating-model.md` |
| Domain map + event taxonomy | ? | `docs/phase0/domain-map-and-event-taxonomy.md` |
| Architecture decision records | ? | `docs/adr/0001-0004-*.md` |
| Threat model (STRIDE) + AI risk register | ? | `docs/phase0/threat-model-and-ai-risk-register.md` |
| Definition of Ready/Done, eval metrics, golden datasets | ? | `docs/phase0/ai-delivery-guardrails.md` |
| E2E tracing (OpenTelemetry) through MVP | ? | `apps/api/src/telemetry/otel.ts`, `apps/web/lib/otel/init-browser.ts`, `.env.example` |
| Central log aggregation (collector) | ? | `docker-compose.yml` (`otel-collector`), `observability/otel-collector-config.yaml` |

**Notes**
- API traces now include Prisma spans and structured logs with `trace_id`/`span_id` on every log.
- Browser telemetry propagates trace context for fetch calls hitting the API; OpenTelemetry Collector stores traces/logs under the shared `otel-data` volume.
- Remaining work before production: integrate collector with managed backend (Honeycomb/Grafana) and add CI telemetry smoke tests.

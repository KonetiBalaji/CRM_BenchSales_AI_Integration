# ADR 0003: Observability Stack & Trace Propagation

- **Status**: Accepted (2025-09-19)
- **Context**: Phase 0 exit criteria require E2E tracing and central log aggregation. We must support future multi-tenant debugging, cost attribution, and AI incident investigations.
- **Decision**: Standardize on OpenTelemetry for tracing and metrics, Pino for structured logging, and use an OpenTelemetry Collector to fan out traces/logs to managed backends (Honeycomb for traces/metrics, Loki or SumoLogic for logs). Inject trace context via middleware at the web and API layers, propagate through BullMQ job payloads, and persist `trace_id` on audit events.
- **Consequences**:
  - **Positive**: Vendor-neutral instrumentation; unified correlation between traces, logs, and audits; supports future APM integrations.
  - **Negative**: Additional runtime overhead; requires expertise to operate collector and manage sampling.
  - **Mitigations**: Start with 100% sampling in non-prod; implement rate-limiting per tenant; add automated trace coverage tests; document fallback path if vendor outage (buffer to S3-compatible store).

# ADR 0001: Architecture Style for BenchCRM MVP

- **Status**: Accepted (2025-09-19)
- **Context**: BenchCRM MVP must evolve rapidly while serving enterprise-grade needs. We need coordinators across API, web, workers, and AI services with high cohesion, shared domain models, and manageable operational load.
- **Decision**: Adopt a modular monolith architecture using NestJS for the API, Next.js for the web app, and shared Prisma schema packages. Services remain in a single repository with modular boundaries per domain (identity, data, matching, copilot), communicating via in-process calls. Async work uses BullMQ queues. Extraction to microservices considered post-Phase 5 when clear scaling pain emerges.
- **Consequences**:
  - **Positive**: Easier cross-cutting changes; consistent guardrails (logging, auth, RLS) enforced centrally; simpler local dev & deployments.
  - **Negative**: Requires strong module boundaries to avoid monolith coupling; scaling specific components demands targeted optimization (worker autoscaling, read replicas).
  - **Mitigations**: Establish module ownership, code generation for API contracts, enforce lint rules to prevent cyclic dependencies, document extraction playbook.

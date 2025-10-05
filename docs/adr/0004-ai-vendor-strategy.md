# ADR 0004: AI Vendor Strategy & Fallback

- **Status**: Accepted (2025-09-19)
- **Context**: BenchCRM relies on external LLM/embedding providers (e.g., OpenAI). We need a deliberate strategy balancing velocity, cost, privacy, and compliance risk.
- **Decision**: Adopt a dual-path approach: primary provider is OpenAI (text-embedding-3-large, GPT-4o-mini) accessed via gated service with strict prompt templates; maintain readiness to pivot to self-hosted or alternative vendors (Cohere, Azure OpenAI, AWS Bedrock) by abstracting calls through an internal `AI Gateway` service with pluggable adapters. Store only minimal prompt/response metadata with reversible redaction.
- **Consequences**:
  - **Positive**: Enables rapid experimentation, cost benchmarking, regulatory flexibility, and avoids lock-in.
  - **Negative**: Additional engineering effort for gateway abstraction; compatibility testing required across vendors.
  - **Mitigations**: Contract clauses for data use; regularly run cross-vendor evals; maintain cached embeddings; budget guardrails component monitors spend; security review of each vendor integration.

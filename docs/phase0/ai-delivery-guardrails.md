# AI Delivery Guardrails: Definition of Ready & Done, Evaluations, Golden Datasets

## Definition of Ready (DoR) for AI Features

A story involving ML/LLM work enters sprint only when:
- **Problem Framed**: User workflow, success metrics, guardrails documented; safety constraints enumerated.
- **Data Inventory**: Required datasets identified with lineage, sensitivity classification, and access approval.
- **Baseline Established**: Current metric baseline or heuristic benchmark captured.
- **Evaluation Plan**: Offline metrics, human review protocol, acceptance thresholds agreed.
- **Risk Analysis**: Prompt injection/data leak vectors assessed; mitigations logged in AI risk register.
- **Dependencies Resolved**: APIs, feature flags, infrastructure prerequisites scheduled or completed.

## Definition of Done (DoD) for AI Features

An AI story ships only when:
- **Metrics Met**: Offline eval metrics = target; regression tests pass; variance explained.
- **Grounding Verified**: Outputs include citations/feature attributions; hallucination checks passed.
- **Observability**: Traces, logs, prompts captured with redaction where required; dashboards updated.
- **Docs & Runbooks**: Updated model card, playbook, user documentation, prompt catalogue.
- **Safety Sign-off**: AI Steering Committee (or delegate) sign-off logged; human-in-the-loop steps validated.
- **Rollback Plan**: Feature flag or model version revert path tested; data rollback plan defined.
- **Post-launch Plan**: Monitoring thresholds, feedback capture, cost targets configured.

## Evaluation Metrics Framework

| Layer | Metric | Target | Notes |
| --- | --- | --- | --- |
| Retrieval | Recall@50, MRR@10 | = baseline +10% | Golden pairs per tenant; measured weekly. |
| Ranking | nDCG@10, HitRate@5 | = baseline +15% | Evaluate per job family; fairness slices tracked. |
| Copilot | Groundedness@N, Citation@N | Groundedness =95%, Citation =90% | Sampled via LLM-assisted grading with human spot checks. |
| Safety | PII Leak ppm, Toxicity score | <X ppm, < threshold | Content filter + manual review on flagged samples. |
| Productivity | Time saved, acceptance rate | =30% time saved, =60% acceptance | Derived from instrumented workflows + surveys. |
| Cost | $/successful assist, token per tenant | Within budget envelope | FinOps dashboards, alert on 20% variance. |

Evaluation cadence: nightly automated runs (retrieval/ranking), weekly human review sessions, monthly fairness/ethics audit.

## Golden Dataset Strategy

- **Sources**: Historical placements, curated recruiter feedback, synthetic yet grounded cases.
- **Structure**: For each requirement, store ranked consultant list, relevance labels (graded), explanatory notes, sensitive attributes (when consented) for fairness checks.
- **Versioning**: Dataset versions stored in S3 `golden-datasets/{domain}/v{n}` with metadata row in `DatasetVersion`. Each model release references dataset + hash.
- **Annotation Workflow**: Use Label Studio (self-hosted) with RBAC; two-pass labeling (reviewer + approver). Track inter-annotator agreement.
- **Data Quality Checks**: Deduping, PII scan, coverage metrics (skill, location, seniority). DQ failures block dataset promotion.
- **Access Control**: Read-only in staging; production access via temporary credentials; audit log of downloads.

## Continuous Evaluation & Feedback Loop

1. **Offline Eval Automation**: GitHub Actions job runs retrieval/matching metrics on PRs tagged `ai-impact`. Reports posted as PR comment.
2. **Online Guardrails**: Experiment framework (LaunchDarkly/Unleash) gates exposure; metrics piped into warehouse for A/B.
3. **User Feedback Integration**: Thumbs-up/down tied to submission ID; reason codes stored; weekly triage integrates into backlog.
4. **Drift Monitoring**: Data drift dashboards (feature distributions, embedding norms); alerts feed to Model Ops.
5. **Cost & Sustainability**: Track energy/cost usage; prefer caching, distillation before scaling usage.


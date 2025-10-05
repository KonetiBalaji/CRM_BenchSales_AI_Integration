# Phase 5 — Matching Evaluation Summary

## Offline evaluation (labeled holdout)

| Metric         | Baseline (Phase 4) | Phase 5 v1 | Delta |
|----------------|--------------------|-------------|-------|
| nDCG@10        | 0.74               | 0.88        | +0.14 |
| Hit-Rate@10    | 0.82               | 0.93        | +0.11 |
| Feedback covg. | 0.61               | 0.78        | +0.17 |

- Dataset: 1,280 requirement → submission decisions captured between 2025-08-10 and 2025-09-10.
- Relevance labels combine match status, hiring outcome, and curated feedback (POSITIVE / HIRED weighted highest).
- Gains primarily from LightGBM reranker calibration (`baseScore = -0.3`) and hybrid retrieval signal blending.

## Online health-check (last 7 days)

- nDCG@10: **0.86** (rolling)
- Hit-Rate@10: **0.91**
- Positive-feedback rate: **0.47** (out of 312 live thumbs-up/down events)
- Latency p95: **1.9s** end-to-end (matching + explanation) — unchanged vs. baseline

Snapshots are materialised via `MatchingEvaluationService.evaluateTenant`, which also persists into `AnalyticsSnapshot` for the reporting UI.

```ts
// example usage inside a Nest context (e.g., CLI command or scheduled job)
await matchingEvaluationService.evaluateTenant("tenant-1", {
  windowStart: new Date("2025-09-01T00:00:00Z"),
  windowEnd: new Date(),
  topK: 10,
  onlineWindowHours: 24,
  baseline: { ndcgAt10: 0.74, hitRateAt10: 0.82 },
  humanReview: { totalReviewed: 25, approved: 23 }
});
```

## Human review sign-off

- Reviewed: **25** randomly sampled matches (post-explanation)
- Passes: **23** → **92%** approval (meets >90% goal)
- Main blockers documented:
  1. Clarify skill taxonomy labels for certain SAP roles (2 cases)
  2. Remote vs. hybrid location nuance missing in summary copy (1 case) — tracked for copy update

Recorded under analytics snapshot metadata (`humanReview` payload) and referenced in the QA change log.

## Next actions

1. Schedule nightly evaluation job per tenant (uses new service, emits snapshots to `AnalyticsSnapshot`).
2. Wire metrics to Observability dashboard (Grafana) using the persisted snapshots.
3. Iterate on explanation phrasing for the remote-location feedback above.
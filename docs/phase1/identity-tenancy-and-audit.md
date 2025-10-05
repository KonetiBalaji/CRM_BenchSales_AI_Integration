# Phase 1 — Identity, Tenancy, & Data Isolation

## Capabilities Delivered

- **OIDC Authentication**: The API now trusts Auth0-issued JWT access tokens (`RS256`). Tokens are validated via JWKS with audience/issuer checks and mapped to internal roles.
- **Role-Based Access Control**: Global guards enforce route-level access for the five enterprise roles (`OWNER`, `ADMIN`, `MANAGER`, `REP`, `VIEWER`). Controllers annotate read/write endpoints to reflect least-privileged defaults.
- **Tenant Context Propagation**: A request-scoped context service (AsyncLocalStorage) captures `requestId`, `tenantId`, and `AuthUser`. Guards populate the context, enabling telemetry, Prisma middleware, and auditors to consume tenant-aware metadata without parameter plumbing.
- **Postgres Row-Level Security**: Policies are enabled and forced on every multi-tenant table. Sessions must provide `current_setting('app.current_tenant')`; Prisma middleware ensures every ORM query includes the authenticated tenant and blocks cross-tenant access.
- **Audit Logging**: A global interceptor records =95% of sensitive actions (all authenticated HTTP calls). Each record chains to the previous via SHA-256 hashes, capturing actor, role, route, request payload (sanitised), response sample, IP, and user agent.

## RBAC Matrix (Highlights)

| Feature | OWNER | ADMIN | MANAGER | REP | VIEWER |
| --- | :-: | :-: | :-: | :-: | :-: |
| Tenant administration | ? | ? | ? | ? | ? |
| Consultants CRUD | ? | ? | ? | ? | ?? |
| Requirements CRUD | ? | ? | ? | ? | ?? |
| Submissions create/update | ? | ? | ? | ? | ?? |
| Matching & AI endpoints | ? | ? | ? | ? | ? |
| Analytics dashboards | ? | ? | ? | ? | ?? |
| Read-only lists/views | ? | ? | ? | ? | ? |

(`??` = read-only access)

## Data Isolation Strategy

- **Prisma Tenant Middleware**: All tenant-scoped models (`User`, `Consultant`, `Requirement`, `Submission`, etc.) receive automatic `tenantId` filters before hitting the database. Create/Update payloads gain the caller's tenant if omitted.
- **Database Guarantees**: Migration `20250919132638_phase1_identity` enables RLS, enforces `tenantId` on bridge tables, and adds compound unique constraints scoped by tenant. Chaos-style tests ensure guards reject mismatched tenants.
- **Seeds & Tooling**: Seed scripts now run inside a transaction with `SET LOCAL app.current_tenant = 'system'` to create baseline data without violating RLS.

## Audit Pipeline

1. **Interceptor Trigger**: Runs for every authenticated request (skipping `@Public`).
2. **Event Capture**: Collects method, route, tenant, actor, role, redacted payload, response preview, IP, and user agent.
3. **Tamper-Evident Chain**: Each insert includes `prevHash` + SHA-256 over the new payload, building a per-tenant hash chain.
4. **Storage**: `AuditLog` table stores metadata with composite indexes on `tenantId` and `entityType` for fast eDiscovery.

Retention and export requirements will be wired in Phase 12 (Compliance).

## Testing & Observability

- `TenantAccessGuard` and `RolesGuard` carry unit tests ensuring cross-tenant rejection and role gating.
- Prisma helper tests validate tenant filtering logic; `pnpm --filter api test` executes the suite.
- OpenTelemetry traces/logs now include request IDs and span correlation, enabling forensic alignment with audit entries.

## Operational Notes

- Populate `.env` with Auth0 issuer, JWKS URI, and audience. Locally, generate JWTs via Auth0 test console; verification is strict (`RS256`).
- Audit interceptor redacts common secrets (`password`, `token`, `secret`). Extend `SENSITIVE_FIELDS` if new payloads introduce additional keys.
- When backfilling historic data, use `AuditService.record` to maintain hash continuity.

With Phase 1 complete, the platform provides enterprise SSO, hardened multi-tenant boundaries, and auditable trails—unlocking downstream ingestion, AI, and compliance workstreams.

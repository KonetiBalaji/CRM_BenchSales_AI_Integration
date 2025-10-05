# ADR 0002: Multi-Tenant Data Isolation Strategy

- **Status**: Accepted (2025-09-19)
- **Context**: BenchCRM must guarantee zero cross-tenant data leakage for SOC 2 and enterprise trust. We considered schema-per-tenant, database-per-tenant, or shared schema with row-level security.
- **Decision**: Use a shared Postgres cluster with row-level security (RLS). Every table with tenant data includes a `tenant_id` column. Prisma middleware sets `SET app.current_tenant = $tenant_id` on connection. All queries executed via Prisma automatically enforce RLS policies restricting access to matching tenant_id. Background jobs and analytics snapshots run with service principals scoped to specific tenants.
- **Consequences**:
  - **Positive**: Centralized schema migrations; reduced operational overhead; easier cross-tenant analytics while preserving isolation.
  - **Negative**: Misconfigured RLS is a critical risk; performance tuning required for large tenants.
  - **Mitigations**: Automated tests for cross-tenant access, periodic chaos testing mixing tenant traffic, query observability logging `tenant_id`, partitioning hot tables per tenant when needed, audited migration scripts.

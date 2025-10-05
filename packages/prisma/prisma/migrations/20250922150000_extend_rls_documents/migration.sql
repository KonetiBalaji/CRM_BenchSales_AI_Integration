-- Extend tenant row-level security to newly added tables
CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.current_tenant() RETURNS text AS $$
  SELECT NULLIF(current_setting('app.current_tenant', true), '')
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app.is_system_actor() RETURNS boolean AS $$
  SELECT current_setting('app.current_tenant', true) = 'system'
$$ LANGUAGE sql STABLE;

DO $$
DECLARE
  table_name text;
  policy_name text;
  filter_expr text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'DocumentAsset',
    'DocumentMetadata',
    'SearchDocument',
    'MatchFeatureSnapshot',
    'MatchFeedback',
    'IdentitySignature',
    'IdentityCluster'
  ]
  LOOP
    policy_name := 'tenant_isolation_' || table_name;
    filter_expr := format('app.is_system_actor() OR %I.%I = app.current_tenant()', table_name, 'tenantId');

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, table_name);
    EXECUTE format('CREATE POLICY %I ON public.%I USING (%s) WITH CHECK (%s)', policy_name, table_name, filter_expr, filter_expr);
  END LOOP;
END
$$;

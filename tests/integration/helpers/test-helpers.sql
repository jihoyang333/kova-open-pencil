-- ============================================================================
-- Test-only PG helper functions used by Cluster 11 integration tests
-- ============================================================================
-- Cluster 11 plan tests call .rpc('describe_table' | 'list_indexes' | 'list_rls')
-- to assert schema invariants. These functions wrap pg_catalog / pg_class /
-- pg_policy and return JSON-friendly shapes.
--
-- NEVER include this file in supabase/migrations/. It exists only for local
-- and CI integration runs. Applied by tests/integration/helpers/apply-migrations.ts
-- after the production migrations.
-- ============================================================================

BEGIN;

-- describe_table(table_name text)
-- Returns: rows of { column text, type text, nullable boolean }
CREATE OR REPLACE FUNCTION public.describe_table(table_name text)
RETURNS TABLE ("column" text, "type" text, nullable boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    a.attname::text                                          AS "column",
    pg_catalog.format_type(a.atttypid, a.atttypmod)::text    AS "type",
    NOT a.attnotnull                                         AS nullable
  FROM pg_catalog.pg_attribute a
  JOIN pg_catalog.pg_class c    ON c.oid = a.attrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = describe_table.table_name
    AND a.attnum > 0
    AND NOT a.attisdropped
  ORDER BY a.attnum;
$$;

-- list_indexes(table_name text)
-- Returns: rows of { name text }
CREATE OR REPLACE FUNCTION public.list_indexes(table_name text)
RETURNS TABLE (name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT i.relname::text AS name
  FROM pg_catalog.pg_index x
  JOIN pg_catalog.pg_class c    ON c.oid = x.indrelid
  JOIN pg_catalog.pg_class i    ON i.oid = x.indexrelid
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = list_indexes.table_name
  ORDER BY i.relname;
$$;

-- list_rls(table_name text)
-- Returns: a single row jsonb { enabled bool, policies jsonb[] }
-- Plan tests destructure via { data: rls } then access rls.enabled / rls.policies.
CREATE OR REPLACE FUNCTION public.list_rls(table_name text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT jsonb_build_object(
    'enabled', c.relrowsecurity,
    'policies', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'name', p.polname,
            'command', CASE p.polcmd
              WHEN 'r' THEN 'SELECT'
              WHEN 'a' THEN 'INSERT'
              WHEN 'w' THEN 'UPDATE'
              WHEN 'd' THEN 'DELETE'
              WHEN '*' THEN 'ALL'
            END,
            'roles', (SELECT jsonb_agg(rolname) FROM pg_catalog.pg_roles WHERE oid = ANY(p.polroles))
          )
        )
        FROM pg_catalog.pg_policy p
        WHERE p.polrelid = c.oid
      ),
      '[]'::jsonb
    )
  )
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = list_rls.table_name;
$$;

-- Grant execute to authenticated + anon + service_role so RPC works from any client
GRANT EXECUTE ON FUNCTION public.describe_table(text) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.list_indexes(text)   TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.list_rls(text)       TO authenticated, anon, service_role;

COMMIT;

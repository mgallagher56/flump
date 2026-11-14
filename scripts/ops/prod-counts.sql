-- prod-counts.sql: read-only row COUNTS for the first-deploy runbook (G1, G3, G8).
--
-- Usage (psql 13+):
--   psql "$PGURL" -v owner='<your WorkOS user id>' -f scripts/ops/prod-counts.sql
--
-- Prints counts only: no row data, no token values, no timestamps, so two runs on
-- identical data diff clean. Everything runs in one READ ONLY transaction that is
-- rolled back. A missing table prints "missing" instead of failing.
--
-- Output is unaligned `label|value` lines.

\set ON_ERROR_STOP on
\set QUIET on
\pset format unaligned
\pset tuples_only on
\pset null '(null)'

-- The owner id is required: fail clearly (non-zero exit) when it is unset or empty.
\if :{?owner}
\else
  \echo 'ERROR: pass the owner id: psql ... -v owner=<your WorkOS user id> -f scripts/ops/prod-counts.sql'
  DO $$ BEGIN RAISE EXCEPTION 'psql variable owner is required (-v owner=...)'; END $$;
\endif
SELECT :'owner' = '' AS owner_empty \gset
\if :owner_empty
  \echo 'ERROR: owner must not be empty'
  DO $$ BEGIN RAISE EXCEPTION 'psql variable owner must not be empty'; END $$;
\endif
SELECT (lower(:'owner') ~ '[<>]'
  OR lower(:'owner') ~ '^(your|owner|user_xxx|changeme|todo|placeholder|xxx)'
  OR lower(:'owner') IN ('user_mock', 'dev_user_123')) AS owner_placeholder \gset
\if :owner_placeholder
  \echo 'ERROR: owner looks like a placeholder or a mock id; pass your real WorkOS user id'
  DO $$ BEGIN RAISE EXCEPTION 'psql variable owner is a placeholder or mock id'; END $$;
\endif

SELECT to_regclass('public.bank_connections') IS NOT NULL AS has_bank_connections \gset

BEGIN READ ONLY;

\echo '== per-table row counts'
SELECT t.name || '|' || CASE WHEN to_regclass('public.' || t.name) IS NULL THEN 'missing'
  ELSE (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM public.%I', t.name), false, true, '')))[1]::text END
FROM (VALUES ('account_details'), ('accounts'), ('bank_connections'), ('budget_entries'),
             ('mcp_tokens'), ('tax_records'), ('transactions'), ('user_profiles')) AS t(name)
ORDER BY t.name;

\echo '== bank_connections by status|rows|with access_token|with refresh_token'
\if :has_bank_connections
SELECT s.k || '|' || s.rows || '|' || s.with_access || '|' || s.with_refresh
FROM (
  SELECT CASE WHEN status IN ('connected', 'disconnected', 'error') THEN status ELSE '(other)' END AS k,
         count(*) AS rows,
         count(*) FILTER (WHERE access_token IS NOT NULL) AS with_access,
         count(*) FILTER (WHERE refresh_token IS NOT NULL) AS with_refresh
  FROM public.bank_connections
  GROUP BY 1
) AS s
ORDER BY s.k;
\else
\echo 'bank_connections|missing'
\endif

-- Per-table "owned by" counts. account_details has no user_id: it hangs off accounts.
\echo '== rows owned by the retired mock identities (user_mock, dev_user_123)'
SELECT t.name || '|' || CASE
  WHEN to_regclass('public.' || t.name) IS NULL
    OR (t.name = 'account_details' AND to_regclass('public.accounts') IS NULL) THEN 'missing'
  ELSE (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM public.%I WHERE %s', t.name,
         CASE WHEN t.name = 'account_details'
           THEN 'account_id::text IN (SELECT id::text FROM public.accounts WHERE user_id = ANY(ARRAY[''user_mock'', ''dev_user_123'']))'
           ELSE 'user_id = ANY(ARRAY[''user_mock'', ''dev_user_123''])' END),
         false, true, '')))[1]::text END
FROM (VALUES ('account_details'), ('accounts'), ('bank_connections'), ('budget_entries'),
             ('mcp_tokens'), ('tax_records'), ('transactions'), ('user_profiles')) AS t(name)
ORDER BY t.name;

\echo '== rows owned by the owner (psql variable owner)'
SELECT t.name || '|' || CASE
  WHEN to_regclass('public.' || t.name) IS NULL
    OR (t.name = 'account_details' AND to_regclass('public.accounts') IS NULL) THEN 'missing'
  ELSE (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM public.%I WHERE %s', t.name,
         CASE WHEN t.name = 'account_details'
           THEN format('account_id IN (SELECT id::text FROM public.accounts WHERE user_id = %L)', :'owner')
           ELSE format('user_id = %L', :'owner') END),
         false, true, '')))[1]::text END
FROM (VALUES ('account_details'), ('accounts'), ('bank_connections'), ('budget_entries'),
             ('mcp_tokens'), ('tax_records'), ('transactions'), ('user_profiles')) AS t(name)
ORDER BY t.name;

\echo '== migrations table'
SELECT 'migrations_table|' || coalesce(to_regclass('public.migrations')::text, 'missing');
SELECT to_regclass('public.migrations') IS NOT NULL AS has_migrations \gset
\if :has_migrations
SELECT 'migrations_rows|' || (xpath('/row/c/text()', query_to_xml('SELECT count(*) AS c FROM public.migrations', false, true, '')))[1]::text;
\endif

ROLLBACK;

-- verify-restore.sql: read-only structural checks after a restore (runbook backup-restore.md).
--
-- Usage (psql 13+):
--   psql "$STAGING_PGURL" -v expected_migrations=5 -f scripts/ops/verify-restore.sql
--
-- Counts only: no row data, no token values, no timestamps. One READ ONLY transaction that is
-- rolled back. Exits non-zero (and prints RESULT|FAIL) when any check fails.
--
-- Checks:
--   1. every expected table exists (to_regclass)
--   2. migrations rows equal expected_migrations (the timestamped files in apps/backend/src/migrations)
--   3. every serial/identity sequence has last_value >= max(column), so the next insert cannot collide
--   4. prints foreign key and index counts (compare with the same query on the source schema)

\set ON_ERROR_STOP on
\set QUIET on
\pset format unaligned
\pset tuples_only on
\pset null '(null)'

\if :{?expected_migrations}
\else
  \echo 'ERROR: pass the expected migration count: psql ... -v expected_migrations=<n> -f scripts/ops/verify-restore.sql'
  DO $$ BEGIN RAISE EXCEPTION 'psql variable expected_migrations is required'; END $$;
\endif
SELECT :'expected_migrations' ~ '^[0-9]+$' AS expected_ok \gset
\if :expected_ok
\else
  \echo 'ERROR: expected_migrations must be a whole number'
  DO $$ BEGIN RAISE EXCEPTION 'psql variable expected_migrations must be a number'; END $$;
\endif

BEGIN READ ONLY;

\echo '== tables present (to_regclass)'
SELECT t.name || '|' || CASE WHEN to_regclass('public.' || t.name) IS NULL THEN 'missing' ELSE 'present' END
FROM (VALUES ('account_details'), ('accounts'), ('bank_connections'), ('budget_entries'),
             ('mcp_tokens'), ('migrations'), ('tax_records'), ('transactions'), ('user_profiles')) AS t(name)
ORDER BY t.name;
SELECT count(*) AS missing_tables
FROM (VALUES ('account_details'), ('accounts'), ('bank_connections'), ('budget_entries'),
             ('mcp_tokens'), ('migrations'), ('tax_records'), ('transactions'), ('user_profiles')) AS t(name)
WHERE to_regclass('public.' || t.name) IS NULL \gset

\echo '== migrations'
SELECT CASE WHEN to_regclass('public.migrations') IS NULL THEN 0
  ELSE (xpath('/row/c/text()', query_to_xml('SELECT count(*) AS c FROM public.migrations', false, true, '')))[1]::text::int
  END AS migrations_rows \gset
SELECT 'migrations_rows|' || :migrations_rows;
SELECT 'migrations_expected|' || :'expected_migrations';
SELECT (:migrations_rows <> :'expected_migrations'::int)::int AS migrations_mismatch \gset

\echo '== serial and identity sequences (last_value >= max(id))'
SELECT count(*) AS sequences_checked,
       count(*) FILTER (WHERE v.last_value < v.max_id) AS sequences_behind
FROM (
  SELECT s.table_name, s.column_name,
    (xpath('/row/c/text()', query_to_xml(
      format('SELECT coalesce(max(%I), 0) AS c FROM public.%I', s.column_name, s.table_name),
      false, true, '')))[1]::text::numeric AS max_id,
    coalesce(pg_sequence_last_value(s.seq::regclass), 0) AS last_value
  FROM (
    SELECT c.table_name, c.column_name,
           pg_get_serial_sequence(format('%I.%I', c.table_schema, c.table_name), c.column_name) AS seq
    FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND (c.is_identity = 'YES' OR c.column_default LIKE 'nextval(%')
  ) AS s
  WHERE s.seq IS NOT NULL
) AS v \gset
SELECT 'sequences_checked|' || :sequences_checked;
SELECT 'sequences_behind|' || :sequences_behind;

\echo '== constraint and index counts'
SELECT 'foreign_keys|' || count(*) FROM pg_constraint c
  JOIN pg_namespace n ON n.oid = c.connamespace WHERE n.nspname = 'public' AND c.contype = 'f';
SELECT 'indexes|' || count(*) FROM pg_indexes WHERE schemaname = 'public';

\echo '== result'
SELECT (:missing_tables + :migrations_mismatch + :sequences_behind > 0) AS failed \gset
\if :failed
  \echo 'RESULT|FAIL'
  DO $$ BEGIN RAISE EXCEPTION 'verify-restore: one or more checks failed'; END $$;
\else
  \echo 'RESULT|PASS'
\endif

ROLLBACK;

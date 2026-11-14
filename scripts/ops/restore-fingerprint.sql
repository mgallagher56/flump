-- restore-fingerprint.sql: per-table row count and checksum, read-only (runbook backup-restore.md).
--
-- Usage (psql 13+):
--   psql "$RESTORE_DATABASE_URL" -X -f scripts/ops/restore-fingerprint.sql > restored.txt
--
-- Prints one line per table, `schema.table|rows|checksum`, then `migrations|<n>`. The checksum
-- is order-independent (two sums of 60-bit slices of md5(row::text)) and is computed exactly as
-- backup-run.ts computes it for the manifest (scripts/ops/backup-lib.ts, tableFingerprintSql),
-- with the same pinned session settings. Run it on two databases and `diff` the outputs: any
-- line that differs names the table that differs. Counts and hashes only, never row data.
-- One REPEATABLE READ READ ONLY transaction that is rolled back.

\set ON_ERROR_STOP on
\set QUIET on
\pset format unaligned
\pset tuples_only on

BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL TimeZone = 'UTC';
SET LOCAL DateStyle = 'ISO, YMD';
SET LOCAL IntervalStyle = 'postgres';
SET LOCAL extra_float_digits = 3;
SET LOCAL bytea_output = 'hex';
SET LOCAL lc_monetary = 'C';
SET LOCAL search_path = pg_catalog;
SET LOCAL row_security = off;

SELECT format(
  $q$SELECT %L || '|' || count(*) || '|' ||
    coalesce(sum(('x' || substr(md5(t::text), 1, 15))::bit(60)::bigint), 0)::text || ':' ||
    coalesce(sum(('x' || substr(md5(t::text), 16, 15))::bit(60)::bigint), 0)::text
  FROM ONLY %I.%I AS t$q$,
  n.nspname || '.' || c.relname, n.nspname, c.relname)
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r', 'p') AND n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND n.nspname NOT LIKE 'pg\_%'
ORDER BY n.nspname, c.relname
\gexec

SELECT 'migrations|' || CASE WHEN to_regclass('public.migrations') IS NULL THEN 'none'
  ELSE (xpath('/row/c/text()', query_to_xml('SELECT count(*) AS c FROM public.migrations', false, true, '')))[1]::text
  END;

ROLLBACK;

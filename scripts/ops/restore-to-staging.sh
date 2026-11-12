#!/usr/bin/env bash
# restore-to-staging.sh: restore a production logical dump into the STAGING database and verify it
# (runbook docs/runbooks/backup-restore.md: this is the restore drill).
#
# Usage:
#   PGURL='<production url>' STAGING_PGURL='<staging url>' \
#     bash scripts/ops/restore-to-staging.sh --owner '<WorkOS user id>' \
#       [--before-counts FILE] [--expected-migrations N] [--out-dir DIR] [--replace] <dump-file>
#
# Refuses (exit 2, nothing touched) unless ALL hold:
#   - STAGING_PGURL and PGURL are both set, differ, and name different host:port/database
#   - the staging database comment is exactly 'flump-staging' (COMMENT ON DATABASE ... IS 'flump-staging')
#   - the staging public schema is empty; with --replace it is dropped and recreated instead, but
#     only after you type 'restore-into-staging' on stdin
# Then: pg_restore --no-owner --exit-on-error --single-transaction, prints restore_seconds, writes
# <out-dir>/staging-counts.txt (prod-counts.sql) and <out-dir>/staging-verify.txt (verify-restore.sql)
# and diffs the counts against --before-counts (the <base>.counts.txt that backup-dump.sh --owner wrote).
#
# Options / environment:
#   --owner ID | OWNER        passed to prod-counts.sql (required)
#   --before-counts FILE      counts taken just before the dump; the diff must be clean
#   --expected-migrations N   default: the timestamped migration files in apps/backend/src/migrations
#   --out-dir DIR             default . (counts only, never row data)
#   PSQL / PG_RESTORE         tool commands (default psql / pg_restore; may be wrappers)
#
# Never prints PGURL or STAGING_PGURL (tool errors are shown with both URLs removed).
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib-staging.sh
. "$here/lib-staging.sh"
counts_sql="$here/prod-counts.sql"
verify_sql="$here/verify-restore.sql"
migrations_dir="$here/../../apps/backend/src/migrations"

owner="${OWNER:-}"
before_counts=""
expected_migrations=""
out_dir="."
replace=0
dump=""

usage() {
  echo "usage: PGURL=<prod> STAGING_PGURL=<staging> bash scripts/ops/restore-to-staging.sh --owner <id> [--before-counts FILE] [--expected-migrations N] [--out-dir DIR] [--replace] <dump-file>" >&2
  exit 2
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --owner)
      [ "$#" -ge 2 ] || usage
      owner="$2"
      shift
      ;;
    --before-counts)
      [ "$#" -ge 2 ] || usage
      before_counts="$2"
      shift
      ;;
    --expected-migrations)
      [ "$#" -ge 2 ] || usage
      expected_migrations="$2"
      shift
      ;;
    --out-dir)
      [ "$#" -ge 2 ] || usage
      out_dir="$2"
      shift
      ;;
    --replace) replace=1 ;;
    -h | --help) usage ;;
    -*) usage ;;
    *)
      [ -z "$dump" ] || usage
      dump="$1"
      ;;
  esac
  shift
done

[ -n "$dump" ] || usage

# Guards (all before any connection is opened, except the marker check which only reads).
assert_distinct_targets "${PGURL:-}" "${STAGING_PGURL:-}"
[ -n "$owner" ] || {
  echo "ERROR: owner id required (--owner <id> or OWNER)" >&2
  exit 2
}
[ -f "$dump" ] || {
  echo "ERROR: dump file not found: $dump" >&2
  exit 2
}
case "$dump" in
  *.age)
    echo "ERROR: decrypt the .age file first (age -d -i <key> -o <file>.dump <file>.age)" >&2
    exit 2
    ;;
esac
if [ -n "$before_counts" ] && [ ! -f "$before_counts" ]; then
  echo "ERROR: --before-counts file not found: $before_counts" >&2
  exit 2
fi
if [ -z "$expected_migrations" ]; then
  expected_migrations="$(find "$migrations_dir" -maxdepth 1 -type f -name '*[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9].ts' | wc -l | tr -d ' ')"
fi
case "$expected_migrations" in
  '' | 0 | *[!0-9]*)
    echo "ERROR: expected migration count must be a positive number (--expected-migrations N)" >&2
    exit 2
    ;;
esac

read -r -a psql_cmd <<<"${PSQL:-psql}"
read -r -a pg_restore_cmd <<<"${PG_RESTORE:-pg_restore}"
for tool in "${psql_cmd[0]}" "${pg_restore_cmd[0]}"; do
  command -v "$tool" >/dev/null || {
    echo "ERROR: required tool not found: $tool (brew install libpq, or set PSQL / PG_RESTORE)" >&2
    exit 2
  }
done

assert_staging_marker "$STAGING_PGURL"

logfile="$(mktemp)"
trap 'rm -f "$logfile"' EXIT

# Tool errors can echo a connection string; show them with both URLs removed.
fail_with_log() {
  local line
  echo "ERROR: $1" >&2
  while IFS= read -r line; do
    line="${line//"$STAGING_PGURL"/[redacted]}"
    printf '  %s\n' "${line//"$PGURL"/[redacted]}" >&2
  done < <(tail -n 8 "$logfile")
  exit 1
}

staging_psql() { "${psql_cmd[@]}" "$STAGING_PGURL" -X -v ON_ERROR_STOP=1 "$@"; }

object_count="$(staging_psql -A -t -q -c \
  "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m','S','f')" \
  </dev/null 2>"$logfile")" || fail_with_log "could not inspect the staging public schema"

if [ "$object_count" != "0" ]; then
  if [ "$replace" -ne 1 ]; then
    echo "ERROR: refusing: the staging public schema is not empty ($object_count objects); re-run with --replace to drop and recreate it" >&2
    exit 2
  fi
  echo "restore: --replace will DROP SCHEMA public CASCADE in the staging database and recreate it." >&2
  printf "Type restore-into-staging to continue: " >&2
  answer=""
  read -r answer || true
  if [ "$answer" != "restore-into-staging" ]; then
    echo >&2
    echo "ERROR: confirmation not given; nothing was changed" >&2
    exit 2
  fi
  staging_psql -q -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" </dev/null 2>"$logfile" ||
    fail_with_log "could not recreate the staging public schema"
fi

mkdir -p "$out_dir"
echo "restore: restoring $(basename "$dump") into the staging database"
start="$(date +%s)"
"${pg_restore_cmd[@]}" --dbname "$STAGING_PGURL" --no-owner --exit-on-error --single-transaction \
  <"$dump" >"$logfile" 2>&1 || fail_with_log "pg_restore failed (single transaction: staging is unchanged)"
restore_seconds=$(($(date +%s) - start))
echo "restore_seconds: $restore_seconds"

counts_out="$out_dir/staging-counts.txt"
verify_out="$out_dir/staging-verify.txt"
staging_psql -v "owner=$owner" -f - <"$counts_sql" >"$counts_out" 2>"$logfile" ||
  fail_with_log "prod-counts.sql failed on staging"

verify_status=0
staging_psql -v "expected_migrations=$expected_migrations" -f - <"$verify_sql" >"$verify_out" 2>"$logfile" ||
  verify_status=$?
echo "counts_file: $counts_out"
echo "verify_file: $verify_out"

result=0
if [ "$verify_status" -ne 0 ]; then
  echo "verify_restore: FAIL (see $verify_out)"
  result=1
else
  echo "verify_restore: PASS"
fi

if [ -n "$before_counts" ]; then
  if diff -u "$before_counts" "$counts_out" >"$out_dir/staging-counts.diff"; then
    echo "counts_diff: clean"
    rm -f "$out_dir/staging-counts.diff"
  else
    echo "counts_diff: DIFFERENT (see $out_dir/staging-counts.diff)"
    result=1
  fi
else
  echo "counts_diff: skipped (no --before-counts given)"
fi

exit "$result"

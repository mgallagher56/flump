#!/usr/bin/env bash
# backup-dump.sh: take a logical backup of production from your own machine (runbook
# docs/runbooks/backup-restore.md). Owner-run: PGURL comes from `railway connect Postgres --tunnel-only`.
#
# Usage:
#   PGURL='<from the tunnel>' bash scripts/ops/backup-dump.sh [--out-dir DIR] [--label NAME]
#                                [--owner ID] [--age-recipient age1...]
#
# Options / environment:
#   PGURL                 production connection URL (required; never printed)
#   --out-dir DIR         default ~/flump-backups (created 0700; every file is written 0600)
#   --label NAME          file name label, letters digits - _ only (default "prod")
#   --owner ID | OWNER    if given, also writes <base>.counts.txt (prod-counts.sql output) so the
#                         restore drill can diff counts against "just before the dump"
#   --age-recipient KEY   also write <dump>.age encrypted to this age public key; upload ONLY that
#   PG_DUMP / PG_RESTORE / PSQL   tool commands (default pg_dump / pg_restore / psql; may be wrappers)
#
# Writes <base>.dump (custom format, --no-owner), <base>.schema.sql, <base>.sha256 and prints
# dump_seconds, dump_bytes and table_data_entries. Never prints PGURL, row data or token values.
set -euo pipefail
umask 077

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
counts_sql="$here/prod-counts.sql"

out_dir="${HOME:-.}/flump-backups"
label="prod"
owner="${OWNER:-}"
recipient=""

usage() {
  echo "usage: PGURL=<url> bash scripts/ops/backup-dump.sh [--out-dir DIR] [--label NAME] [--owner ID] [--age-recipient KEY]" >&2
  exit 2
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --out-dir)
      [ "$#" -ge 2 ] || usage
      out_dir="$2"
      shift
      ;;
    --label)
      [ "$#" -ge 2 ] || usage
      label="$2"
      shift
      ;;
    --owner)
      [ "$#" -ge 2 ] || usage
      owner="$2"
      shift
      ;;
    --age-recipient)
      [ "$#" -ge 2 ] || usage
      recipient="$2"
      shift
      ;;
    *) usage ;;
  esac
  shift
done

# Guards first: nothing is created and nothing is contacted before these pass.
if [ -z "${PGURL:-}" ]; then
  echo "ERROR: PGURL is required (from 'railway connect Postgres --tunnel-only'); refusing" >&2
  exit 2
fi
case "$PGURL" in
  postgres://* | postgresql://*) ;;
  *)
    echo "ERROR: PGURL must be a postgres:// URL" >&2
    exit 2
    ;;
esac
case "$label" in
  '' | *[!A-Za-z0-9_-]*)
    echo "ERROR: --label may contain only letters, digits, - and _" >&2
    exit 2
    ;;
esac
if [ -n "$recipient" ]; then
  case "$recipient" in
    age1*) ;;
    *)
      echo "ERROR: --age-recipient must be an age public key (starts with age1)" >&2
      exit 2
      ;;
  esac
  command -v age >/dev/null || {
    echo "ERROR: --age-recipient needs the 'age' tool (brew install age); refusing to continue unencrypted" >&2
    exit 2
  }
fi

read -r -a pg_dump_cmd <<<"${PG_DUMP:-pg_dump}"
read -r -a pg_restore_cmd <<<"${PG_RESTORE:-pg_restore}"
read -r -a psql_cmd <<<"${PSQL:-psql}"
for tool in "${pg_dump_cmd[0]}" "${pg_restore_cmd[0]}"; do
  command -v "$tool" >/dev/null || {
    echo "ERROR: required tool not found: $tool (brew install libpq, or set PG_DUMP / PG_RESTORE)" >&2
    exit 2
  }
done
if [ -n "$owner" ]; then
  command -v "${psql_cmd[0]}" >/dev/null || {
    echo "ERROR: --owner needs psql (set PSQL)" >&2
    exit 2
  }
fi

if command -v sha256sum >/dev/null; then
  sha256() { sha256sum "$@"; }
else
  sha256() { shasum -a 256 "$@"; }
fi

mkdir -p "$out_dir"
chmod 700 "$out_dir"
stamp="$(date -u +%Y%m%dT%H%MZ)"
base="flump-${label}-${stamp}"
logfile="$(mktemp)"
trap 'rm -f "$logfile"' EXIT

# Tool errors can echo the connection string; show them only with it removed.
fail_with_log() {
  local line
  echo "ERROR: $1" >&2
  while IFS= read -r line; do
    printf '  %s\n' "${line//"$PGURL"/[redacted]}" >&2
  done < <(tail -n 8 "$logfile")
  exit 1
}

echo "backup: dumping to $out_dir/$base.dump"
start="$(date +%s)"
"${pg_dump_cmd[@]}" "$PGURL" --format=custom --no-owner >"$out_dir/$base.dump.partial" 2>"$logfile" ||
  {
    rm -f "$out_dir/$base.dump.partial"
    fail_with_log "pg_dump failed"
  }
mv "$out_dir/$base.dump.partial" "$out_dir/$base.dump"
dump_seconds=$(($(date +%s) - start))

"${pg_dump_cmd[@]}" "$PGURL" --schema-only --no-owner >"$out_dir/$base.schema.sql" 2>"$logfile" ||
  fail_with_log "schema-only pg_dump failed"

"${pg_restore_cmd[@]}" --list <"$out_dir/$base.dump" >"$out_dir/$base.list.tmp" 2>"$logfile" ||
  {
    rm -f "$out_dir/$base.list.tmp"
    fail_with_log "pg_restore --list could not read the dump"
  }
table_data="$(grep -c ' TABLE DATA ' "$out_dir/$base.list.tmp" || true)"
rm -f "$out_dir/$base.list.tmp"

if [ -n "$owner" ]; then
  "${psql_cmd[@]}" "$PGURL" -X -v ON_ERROR_STOP=1 -v "owner=$owner" -f - <"$counts_sql" \
    >"$out_dir/$base.counts.txt" 2>"$logfile" || fail_with_log "prod-counts.sql failed"
fi

if [ -n "$recipient" ]; then
  age -r "$recipient" -o "$out_dir/$base.dump.age" "$out_dir/$base.dump" 2>"$logfile" ||
    fail_with_log "age encryption failed"
fi

(cd "$out_dir" && sha256 "$base".* | grep -v '\.sha256$' >"$base.sha256")

dump_bytes="$(wc -c <"$out_dir/$base.dump" | tr -d ' ')"
echo "dump_file: $out_dir/$base.dump"
echo "dump_bytes: $dump_bytes"
echo "dump_seconds: $dump_seconds"
echo "table_data_entries: $table_data"
[ -z "$owner" ] || echo "counts_file: $out_dir/$base.counts.txt"
[ -z "$recipient" ] || echo "encrypted_file: $out_dir/$base.dump.age (upload only this one)"
echo "sha256_file: $out_dir/$base.sha256"

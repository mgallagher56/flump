#!/usr/bin/env bash
# restore-drill.sh: restore a production logical dump into a throwaway LOCAL Postgres and
# write row counts, so you know the backup is restorable (runbook G3).
#
# Usage:
#   bash scripts/ops/restore-drill.sh --owner '<WorkOS user id>' [--out FILE] [--keep] <dump-file>
#
# Options / environment (all optional):
#   --owner ID | OWNER      owner id passed to prod-counts.sql (required)
#   --out FILE              where the counts go (default ./drill-before.txt)
#   --keep                  leave the container running afterwards (prints the removal command)
#   DRILL_CONTAINER         container name (default flump-drill); refuses if it already exists
#   DRILL_PORT              host port (default 55433)
#   DRILL_PASSWORD          local-only password (default drill_local_only)
#   DRILL_DB                database name (default flump_drill)
#   DRILL_HOST              must be localhost or 127.0.0.1 (anything else, including ::1, is refused)
#   DRILL_IMAGE             image (default postgres:18-alpine)
#   PSQL / PG_RESTORE       host tool commands; if a tool is missing from PATH the script runs
#                           it inside the drill container via docker exec instead
#   DRILL_USE_DOCKER_TOOLS  set to 1 to always use the container's tools
#
# Prints the restore time in seconds and counts-file path. Never prints row data, the dump
# contents or any connection string. Removes the container on exit unless --keep.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
counts_sql="$here/prod-counts.sql"

container="${DRILL_CONTAINER:-flump-drill}"
port="${DRILL_PORT:-55433}"
password="${DRILL_PASSWORD:-drill_local_only}"
db="${DRILL_DB:-flump_drill}"
host="${DRILL_HOST:-localhost}"
image="${DRILL_IMAGE:-postgres:18-alpine}"
owner="${OWNER:-}"
out="drill-before.txt"
keep=0
dump=""

usage() {
  echo "usage: bash scripts/ops/restore-drill.sh --owner <id> [--out FILE] [--keep] <dump-file>" >&2
  exit 2
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --keep) keep=1 ;;
    --owner)
      [ "$#" -ge 2 ] || usage
      owner="$2"
      shift
      ;;
    --out)
      [ "$#" -ge 2 ] || usage
      out="$2"
      shift
      ;;
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
[ -n "$owner" ] || {
  echo "ERROR: owner id required (--owner <id> or OWNER)" >&2
  exit 2
}
[ -f "$dump" ] || {
  echo "ERROR: dump file not found: $dump" >&2
  exit 2
}
case "$host" in
  localhost | 127.0.0.1) ;;
  *)
    echo "ERROR: refusing non-local DRILL_HOST (only localhost or 127.0.0.1; IPv6 ::1 is not supported)" >&2
    exit 2
    ;;
esac
case "$port" in
  '' | *[!0-9]*)
    echo "ERROR: DRILL_PORT must be a number" >&2
    exit 2
    ;;
esac
mkdir -p "$(dirname "$out")"
command -v docker >/dev/null || {
  echo "ERROR: docker is required" >&2
  exit 2
}
if docker container inspect "$container" >/dev/null 2>&1; then
  echo "ERROR: container '$container' already exists; refusing to touch it (set DRILL_CONTAINER or remove it yourself)" >&2
  exit 2
fi

created=0
logdir="$(mktemp -d)"
cleanup() {
  rm -rf "$logdir"
  if [ "$created" -eq 1 ] && [ "$keep" -eq 0 ]; then
    docker rm -f "$container" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

# Tool selection: host tools when present, container tools otherwise.
read -r -a psql_host <<<"${PSQL:-psql}"
read -r -a restore_host <<<"${PG_RESTORE:-pg_restore}"
use_docker=0
if [ "${DRILL_USE_DOCKER_TOOLS:-0}" = "1" ] || ! command -v "${psql_host[0]}" >/dev/null ||
  ! command -v "${restore_host[0]}" >/dev/null; then
  use_docker=1
fi

drill_url="postgres://postgres:${password}@${host}:${port}/${db}"

run_psql() { # stdin is the SQL file; extra args are psql args
  if [ "$use_docker" -eq 1 ]; then
    docker exec -i "$container" psql -U postgres -d "$db" "$@"
  else
    "${psql_host[@]}" "$drill_url" "$@"
  fi
}

echo "drill: starting container '$container' ($image) on port $port"
docker run -d --name "$container" -e POSTGRES_PASSWORD="$password" -e POSTGRES_DB="$db" \
  -p "127.0.0.1:${port}:5432" "$image" >/dev/null
created=1

ready=0
for _ in $(seq 1 60); do
  # TCP inside the container only works once the entrypoint's temporary server is gone.
  if docker exec "$container" psql -h 127.0.0.1 -U postgres -d "$db" -Atc 'SELECT 1' >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done
[ "$ready" -eq 1 ] || {
  echo "ERROR: drill database did not become ready in 60s" >&2
  exit 1
}

echo "drill: restoring $(basename "$dump") ($([ "$use_docker" -eq 1 ] && echo "container tools" || echo "host tools"))"
start="$(date +%s)"
restore_status=0
if [ "$use_docker" -eq 1 ]; then
  docker cp "$dump" "$container:/tmp/drill.dump"
  docker exec "$container" pg_restore -U postgres -d "$db" --no-owner --exit-on-error /tmp/drill.dump \
    >"$logdir/restore.log" 2>&1 || restore_status=$?
else
  "${restore_host[@]}" --dbname "$drill_url" --no-owner --exit-on-error "$dump" \
    >"$logdir/restore.log" 2>&1 || restore_status=$?
fi
end="$(date +%s)"
if [ "$restore_status" -ne 0 ]; then
  # The log can quote data from failing rows, so keep it out of the terminal.
  keep_log="${out}.restore-error.log"
  cp "$logdir/restore.log" "$keep_log"
  echo "ERROR: pg_restore failed (exit $restore_status); log saved to $keep_log (may contain row data: do not share it)" >&2
  exit 1
fi
echo "drill: restore_seconds=$((end - start))"

run_psql -v ON_ERROR_STOP=1 -v owner="$owner" -f - <"$counts_sql" >"$out"
echo "drill: counts written to $out ($(wc -l <"$out" | tr -d ' ') lines)"

if [ "$keep" -eq 1 ]; then
  echo "drill: container kept. Connect with: docker exec -it $container psql -U postgres -d $db"
  echo "drill: remove it with: docker rm -f $container"
else
  echo "drill: removing container '$container'"
fi

#!/usr/bin/env bash
# lib-staging.sh: SOURCEABLE guard helpers shared by the staging-only scripts
# (restore-to-staging.sh today; E18-N11 seed-synthetic.ts uses the TS twin, staging-marker.ts).
#
#   . "$(dirname "$0")/lib-staging.sh"
#   assert_distinct_targets "$PGURL" "$STAGING_PGURL"   # exits 2 on missing/equal/same target
#   assert_staging_marker "$STAGING_PGURL"              # exits 2 unless the DB comment is flump-staging
#
# Never prints a connection string, user or password: only a generic message.
# Tools: PSQL (default psql; a command with arguments is allowed, e.g. a wrapper script).
#
# This file only defines functions and a variable; it does not set shell options or exit on load.

STAGING_MARKER="flump-staging"

# conn_target <url>: prints "host:port/db" (host lower-cased, localhost normalised to
# 127.0.0.1, default port 5432, no credentials, no query string). Returns 1 if unparseable.
conn_target() {
  local url="$1" rest authority path hostport host port db
  case "$url" in
    postgres://* | postgresql://*) ;;
    *) return 1 ;;
  esac
  rest="${url#*://}"
  authority="${rest%%/*}"
  [ "$authority" != "$rest" ] || return 1
  path="${rest#*/}"
  db="${path%%\?*}"
  hostport="${authority##*@}"
  host="${hostport%%:*}"
  port="${hostport#*:}"
  [ "$port" != "$hostport" ] || port=5432
  { [ -n "$host" ] && [ -n "$db" ]; } || return 1
  host="$(printf '%s' "$host" | tr '[:upper:]' '[:lower:]')"
  [ "$host" != "localhost" ] || host="127.0.0.1"
  printf '%s:%s/%s\n' "$host" "$port" "$db"
}

# assert_distinct_targets <prod-url> <staging-url>: exits 2 if either is empty or unparseable,
# if the two URLs are equal, or if they name the same host, port and database.
assert_distinct_targets() {
  local prod="${1:-}" staging="${2:-}" prod_target staging_target
  if [ -z "$prod" ]; then
    echo "ERROR: PGURL is required (the production URL, so the staging target can be proven different)" >&2
    exit 2
  fi
  if [ -z "$staging" ]; then
    echo "ERROR: STAGING_PGURL is required" >&2
    exit 2
  fi
  if [ "$prod" = "$staging" ]; then
    echo "ERROR: refusing: STAGING_PGURL equals PGURL (never restore over production)" >&2
    exit 2
  fi
  prod_target="$(conn_target "$prod")" || {
    echo "ERROR: PGURL is not a postgres:// URL" >&2
    exit 2
  }
  staging_target="$(conn_target "$staging")" || {
    echo "ERROR: STAGING_PGURL is not a postgres:// URL" >&2
    exit 2
  }
  if [ "$prod_target" = "$staging_target" ]; then
    echo "ERROR: refusing: STAGING_PGURL names the same host, port and database as PGURL" >&2
    exit 2
  fi
}

# assert_staging_marker <url>: exits 2 unless `COMMENT ON DATABASE <db> IS 'flump-staging'`.
assert_staging_marker() {
  local url="${1:-}" comment status=0
  local -a psql_cmd
  read -r -a psql_cmd <<<"${PSQL:-psql}"
  if [ -z "$url" ]; then
    echo "ERROR: no staging URL given to the marker check" >&2
    exit 2
  fi
  comment="$("${psql_cmd[@]}" "$url" -X -A -t -q -v ON_ERROR_STOP=1 -c \
    "SELECT coalesce(shobj_description(d.oid, 'pg_database'), '') FROM pg_database d WHERE d.datname = current_database()" \
    </dev/null 2>/dev/null)" || status=$?
  if [ "$status" -ne 0 ]; then
    echo "ERROR: could not read the staging database comment (cannot connect?); refusing" >&2
    exit 2
  fi
  if [ "$comment" != "$STAGING_MARKER" ]; then
    echo "ERROR: refusing: the target database comment is not '$STAGING_MARKER'" >&2
    echo "       (the owner sets it once: COMMENT ON DATABASE <staging db> IS '$STAGING_MARKER';)" >&2
    exit 2
  fi
}

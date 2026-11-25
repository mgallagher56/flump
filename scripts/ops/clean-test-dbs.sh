#!/usr/bin/env bash
# clean-test-dbs.sh: remove the Docker test databases a lane's worktree started.
#
#   clean-test-dbs.sh [--dry-run] <absolute worktree path>   remove that worktree's test databases
#   clean-test-dbs.sh [--dry-run] --orphans                  remove those whose worktree is gone
#
# Local OrbStack only (AGENTS.md section 18): never a remote Docker host, never Railway or any
# hosted database, never CI. It refuses to run when CI or GITHUB_ACTIONS is set, or when DOCKER_HOST or DOCKER_CONTEXT
# points anywhere but OrbStack. It reads the endpoint of the `orbstack` context, refuses unless it
# is a unix socket inside $HOME/.orbstack, and sends every daemon call there with --host, so the
# current context, DOCKER_HOST and DOCKER_CONTEXT cannot redirect it. It never falls back.
#
# Acts only on containers and volumes labelled flump.purpose=test-db with a flump.worktree=<path>
# label (AGENTS.md section 18). Containers go with `docker rm -fv`, so their anonymous volumes go
# too. Anything unlabelled is left alone, and the owner's dev database flump-postgres (and any
# volume named after it) is never touched, whatever its labels say. --dry-run only lists what would
# go. --orphans judges "gone" from this machine's file system, so run it where the worktrees live.
set -uo pipefail

PROTECTED="flump-postgres"
SEP="|"

usage() {
  sed -n '4,5p' "$0" | sed 's/^# \{0,1\}//' | sed '1s/^/usage: /' >&2
  exit 2
}

dry_run=0 orphans=0 target=""
for arg in "$@"; do
  case "$arg" in
    --dry-run) dry_run=1 ;;
    --orphans) orphans=1 ;;
    -*) usage ;;
    *) [ -z "$target" ] || usage; target="$arg" ;;
  esac
done
if [ "$orphans" = 1 ]; then
  [ -z "$target" ] || usage
else
  case "$target" in /?*) ;; *) usage ;; esac
  # Labels hold the resolved path (git rev-parse --show-toplevel), so resolve symlinks, `..` and
  # extra slashes while the worktree still exists.
  if [ -d "$target" ]; then target="$(cd "$target" && pwd -P)"; fi
  while [ "${target%/}" != "$target" ]; do target="${target%/}"; done
  [ -n "$target" ] || usage
fi

refuse() {
  echo "clean-test-dbs: refusing: $*; nothing was removed (local OrbStack only, AGENTS.md section 18)" >&2
  exit 1
}

# Whether $1 is unix://<a socket inside $HOME/.orbstack>, judged on the resolved directory (so `..`
# and symlinked directories cannot lead out) with the socket itself not a symlink.
orbstack_socket() { # endpoint
  local endpoint="$1" path dir real_dir real_root
  case "${HOME:-}" in /?*) ;; *) return 1 ;; esac
  case "$endpoint" in unix:///*) path="${endpoint#unix://}" ;; *) return 1 ;; esac
  dir="${path%/*}"
  [ -n "${path##*/}" ] && [ ! -L "$path" ] || return 1
  real_root="$(cd "$HOME/.orbstack" 2>/dev/null && pwd -P)" || return 1
  real_dir="$(cd "$dir" 2>/dev/null && pwd -P)" || return 1
  case "$real_dir/" in "$real_root"/*) ;; *) return 1 ;; esac
}

if [ -n "${CI:-}" ] || [ -n "${GITHUB_ACTIONS:-}" ]; then
  refuse "this looks like CI (CI or GITHUB_ACTIONS is set), and CI has no worktrees to clean"
fi
if [ -n "${DOCKER_CONTEXT:-}" ] && [ "$DOCKER_CONTEXT" != orbstack ]; then
  refuse "DOCKER_CONTEXT is $DOCKER_CONTEXT, not orbstack"
fi
if [ -n "${DOCKER_HOST:-}" ] && ! orbstack_socket "$DOCKER_HOST"; then
  refuse "DOCKER_HOST is $DOCKER_HOST, not the OrbStack socket"
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "clean-test-dbs: docker not found; nothing to clean" >&2
  exit 0
fi
endpoint="$(docker context inspect orbstack --format '{{.Endpoints.docker.Host}}' 2>/dev/null)" ||
  refuse "there is no orbstack Docker context"
orbstack_socket "$endpoint" || refuse "the orbstack context points at $endpoint, not a socket in ${HOME:-~}/.orbstack"
docker() { command docker --host "$endpoint" "$@"; }

if ! docker info >/dev/null 2>&1; then
  echo "clean-test-dbs: the docker daemon is not reachable; nothing was removed" >&2
  exit 1
fi

# Whether a labelled resource belongs to the run: the target worktree, or a worktree that is gone.
selected() { # worktree-label
  local worktree="$1"
  case "$worktree" in /?*) ;; *) return 1 ;; esac
  if [ "$orphans" = 1 ]; then [ ! -e "$worktree" ]; else [ "${worktree%/}" = "$target" ]; fi
}

why() { # worktree-label
  if [ "$orphans" = 1 ]; then printf ' (worktree %s is gone)' "$1"; fi
}

failed=0 found=0

containers="$(docker ps -a --filter label=flump.purpose=test-db \
  --format "{{.ID}}$SEP{{.Names}}$SEP{{.Label \"flump.purpose\"}}$SEP{{.Label \"flump.worktree\"}}")" || {
  echo "clean-test-dbs: could not list containers" >&2
  exit 1
}
while IFS="$SEP" read -r id name purpose worktree; do
  [ -n "$id" ] || continue
  [ "$purpose" = test-db ] || continue
  selected "$worktree" || continue
  case ",$name," in
    *",$PROTECTED,"*) echo "clean-test-dbs: skipping $PROTECTED, the dev database" >&2; continue ;;
  esac
  found=1
  if [ "$dry_run" = 1 ]; then
    echo "would remove container $name ($id)$(why "$worktree")"
  elif docker rm -fv "$id" >/dev/null; then
    echo "removed container $name$(why "$worktree")"
  else
    echo "clean-test-dbs: could not remove container $name ($id)" >&2
    failed=1
  fi
done <<<"$containers"

volumes="$(docker volume ls --filter label=flump.purpose=test-db \
  --format "{{.Name}}$SEP{{.Label \"flump.purpose\"}}$SEP{{.Label \"flump.worktree\"}}")" || {
  echo "clean-test-dbs: could not list volumes" >&2
  exit 1
}
while IFS="$SEP" read -r name purpose worktree; do
  [ -n "$name" ] || continue
  [ "$purpose" = test-db ] || continue
  selected "$worktree" || continue
  case "$name" in
    "$PROTECTED"*) echo "clean-test-dbs: skipping $name, named for the dev database" >&2; continue ;;
  esac
  found=1
  if [ "$dry_run" = 1 ]; then
    echo "would remove volume $name$(why "$worktree")"
  elif docker volume rm "$name" >/dev/null; then
    echo "removed volume $name$(why "$worktree")"
  else
    echo "clean-test-dbs: could not remove volume $name" >&2
    failed=1
  fi
done <<<"$volumes"

if [ "$found" = 0 ]; then
  if [ "$orphans" = 1 ]; then echo "no orphaned test databases"; else echo "nothing to clean for $target"; fi
fi
exit "$failed"

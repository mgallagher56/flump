#!/usr/bin/env bash
# clean-test-dbs.sh: remove the Docker test databases a lane's worktree started.
#
#   clean-test-dbs.sh [--dry-run] <absolute worktree path>   remove that worktree's test databases
#   clean-test-dbs.sh [--dry-run] --orphans                  remove those whose worktree is gone
#
# Acts only on containers and volumes labelled flump.purpose=test-db with a flump.worktree=<path>
# label (AGENTS.md section 18). Containers go with `docker rm -fv`, so their anonymous volumes go
# too. Anything unlabelled is left alone, and the owner's dev database flump-postgres is never
# touched, whatever its labels say. --dry-run only lists what would go.
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
  target="${target%/}"
  [ -n "$target" ] || usage
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "clean-test-dbs: docker not found; nothing to clean" >&2
  exit 0
fi
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

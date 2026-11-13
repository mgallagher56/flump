#!/usr/bin/env bash
# PreToolUse (Bash): block risky git commands, but only on main/master.
# Other branches are unrestricted, except force pushes that explicitly target main/master.
cmd=$(jq -r '.tool_input.command // empty')
[ -z "$cmd" ] && exit 0
echo "$cmd" | grep -qE '(^|[;&|[:space:]])git[[:space:]]' || exit 0

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}" 2>/dev/null || exit 0
branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)

force_push='git[[:space:]]+push([[:space:]]+[^;&|]*)?[[:space:]](--force|--force-with-lease|-f)([[:space:]=]|$)'
targets_main='[[:space:]:+/](main|master)([[:space:]]|$)'

block() {
  echo "Blocked on $1: $2" >&2
  echo "Risky git commands are only blocked on main/master. Switch to a feature branch, or ask the user to run this themselves." >&2
  exit 2
}

# Force push that names main/master is blocked from any branch. Only the push
# command itself is checked, so rebasing onto origin/main and then force-pushing
# a feature branch in the same command line is allowed.
while IFS= read -r segment; do
  if echo "$segment" | grep -qE "$force_push" && echo "$segment" | grep -qE "$targets_main"; then
    block "any branch" "force push targeting main/master"
  fi
done < <(printf '%s\n' "$cmd" | tr ';&|' '\n\n\n')

case "$branch" in
  main|master) ;;
  *) exit 0 ;;
esac

echo "$cmd" | grep -qE "$force_push"                                  && block "$branch" "force push"
echo "$cmd" | grep -qE 'git[[:space:]]+reset[[:space:]]+([^;&|]*[[:space:]])?--hard' && block "$branch" "git reset --hard"
echo "$cmd" | grep -qE '(--no-verify|[[:space:]]-n[[:space:]].*git[[:space:]]+commit|git[[:space:]]+commit[^;&|]*[[:space:]]-n([[:space:]]|$))' && block "$branch" "skipping git hooks (--no-verify)"
echo "$cmd" | grep -qE 'git[[:space:]]+clean[[:space:]]+[^;&|]*-[a-zA-Z]*f'  && block "$branch" "git clean -f"
echo "$cmd" | grep -qE 'git[[:space:]]+(checkout|restore)[[:space:]]+(--[[:space:]]+)?\.([[:space:]]|$)' && block "$branch" "discarding all working-tree changes"
echo "$cmd" | grep -qE 'git[[:space:]]+branch[[:space:]]+[^;&|]*-D'      && block "$branch" "git branch -D"
exit 0

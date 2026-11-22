#!/usr/bin/env bash
# PreToolUse (Bash): block risky git commands, but only on main/master.
# Other branches are unrestricted, except force pushes that explicitly target main/master.
input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty')
[ -z "$cmd" ] && exit 0
echo "$cmd" | grep -qE '(^|[^A-Za-z0-9_-])git[[:space:]]' || exit 0

# Decide the branch from the project directory (fails closed: the main checkout).
# The one exception is a command of the exact shape `cd /abs/path && git <subcommand> ...`
# where the target is an existing absolute path of plain characters, and the rest is a
# strict allow-list: it starts with `git` followed directly by a subcommand (so no
# `git -C`, `git -c`, `--git-dir`, `--no-pager` or env prefix), and contains no quote,
# backslash, `$`, backtick, parenthesis, newline, `=` before the subcommand, or any of
# the words cd, pushd, popd, env, eval, exec, source, command, sh, bash, zsh, GIT_,
# core.worktree, --work or -C. Then the command runs in that directory, so its branch
# decides. Anything else, including anything we cannot parse, is judged in the project
# directory.
dir="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd_re='^[[:space:]]*cd[[:space:]]+(/[A-Za-z0-9._/-]+)[[:space:]]*&&[[:space:]]*(git[[:space:]]+[a-z].*)$'
bad_chars=$'[\'"\\\\$`()\n\r]'
bad_words='(^|[^A-Za-z0-9_-])(cd|pushd|popd|env|eval|exec|source|command|sh|bash|zsh)([^A-Za-z0-9_-]|$)|GIT_|core\.worktree|--work|--git-dir|-C([^A-Za-z0-9_-]|$)'
if [[ "$cmd" =~ $cd_re ]]; then
  target="${BASH_REMATCH[1]}"
  rest="${BASH_REMATCH[2]}"
  if [ -d "$target" ] \
    && [[ ! "$rest" =~ $bad_chars ]] \
    && ! printf '%s' "$rest" | grep -qE "$bad_words"; then
    dir="$target"
  fi
fi
cd "$dir" 2>/dev/null || exit 0
branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)

force_push='git[[:space:]]+push([[:space:]]+[^;&|]*)?[[:space:]](--force|--force-with-lease|-[a-zA-Z]*f[a-zA-Z]*)([[:space:]=]|$)'
# A refspec that forces (+src:dst) or deletes (:dst) also counts as a forced push.
force_refspec='git[[:space:]]+push([[:space:]]+[^;&|]*)?[[:space:]](\+[^[:space:]]+|:[^[:space:]]+)([[:space:]]|$)'
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
  # Strip quotes so `origin "main"` is seen as main.
  unquoted=$(printf '%s' "$segment" | tr -d "\"'")
  if { echo "$unquoted" | grep -qE "$force_push" || echo "$unquoted" | grep -qE "$force_refspec"; } && echo "$unquoted" | grep -qE "$targets_main"; then
    block "any branch" "force push targeting main/master"
  fi
done < <(printf '%s\n' "$cmd" | tr ';&|' '\n\n\n')

case "$branch" in
  main|master) ;;
  *) exit 0 ;;
esac

echo "$cmd" | grep -qE "$force_push"                                  && block "$branch" "force push"
echo "$cmd" | grep -qE 'git[[:space:]]+([^;&|]*[[:space:]])?reset[[:space:]]+([^;&|]*[[:space:]])?--hard' && block "$branch" "git reset --hard"
echo "$cmd" | grep -qE '(--no-verify|[[:space:]]-n[[:space:]].*git[[:space:]]+commit|git[[:space:]]+commit[^;&|]*[[:space:]]-n([[:space:]]|$))' && block "$branch" "skipping git hooks (--no-verify)"
echo "$cmd" | grep -qE 'git[[:space:]]+([^;&|]*[[:space:]])?clean[[:space:]]+[^;&|]*-[a-zA-Z]*f'  && block "$branch" "git clean -f"
echo "$cmd" | grep -qE 'git[[:space:]]+(checkout|restore)[[:space:]]+(--[[:space:]]+)?\.([[:space:]]|$)' && block "$branch" "discarding all working-tree changes"
echo "$cmd" | grep -qE 'git[[:space:]]+([^;&|]*[[:space:]])?branch[[:space:]]+[^;&|]*-D'      && block "$branch" "git branch -D"
exit 0

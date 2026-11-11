#!/usr/bin/env bash
# PostToolUse (Edit|Write|MultiEdit): run Biome on the edited file.
# Exit 2 surfaces remaining lint errors to Claude; never blocks on tooling gaps.
file=$(jq -r '.tool_input.file_path // empty')
[ -z "$file" ] && exit 0
case "$file" in
  *.ts|*.tsx|*.js|*.jsx|*.json|*.css) ;;
  *) exit 0 ;;
esac
[ -f "$file" ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}" || exit 0
out=$(bunx biome check --write --no-errors-on-unmatched "$file" 2>&1)
status=$?
if [ $status -ne 0 ]; then
  echo "Biome found issues in $file that could not be auto-fixed:" >&2
  echo "$out" | head -40 >&2
  exit 2
fi
exit 0

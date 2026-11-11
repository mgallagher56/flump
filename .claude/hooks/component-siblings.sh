#!/usr/bin/env bash
# PostToolUse (Write): warn (never block) when a component directory is missing
# one of the 5 colocated files required by AGENTS.md section 1.
file=$(jq -r '.tool_input.file_path // empty')
[ -z "$file" ] && exit 0
case "$file" in
  */packages/ui/src/*|*/apps/web/app/features/*/components/*|*/apps/marketing/src/components/*|*/apps/marketing/src/pages/*) ;;
  *) exit 0 ;;
esac
base=$(basename "$file")
dir=$(dirname "$file")
name=$(basename "$dir")
# Only react to files named after their PascalCase directory.
case "$name" in [A-Z]*) ;; *) exit 0 ;; esac
case "$base" in
  "$name.tsx"|"$name.styles.ts"|"$name.stories.tsx"|"$name.test.tsx") ;;
  *) exit 0 ;;
esac
missing=""
for f in "$name.tsx" "$name.styles.ts" "$name.stories.tsx" "$name.test.tsx" "index.ts"; do
  [ -f "$dir/$f" ] || missing="$missing $f"
done
if [ -n "$missing" ]; then
  echo "Reminder: $name/ is still missing:$missing (AGENTS.md section 1). Create them before finishing." >&2
fi
exit 0

#!/usr/bin/env bash
# PostToolUse (Edit|Write|MultiEdit): enforce AGENTS.md section 2 –
# no raw hex/RGB and no primitive colour-scale tokens in component code.
file=$(jq -r '.tool_input.file_path // empty')
[ -z "$file" ] && exit 0
case "$file" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac
case "$file" in
  */tokens/*|*/styled-system/*|*/node_modules/*|*.test.ts|*.test.tsx|*.config.ts|*/apps/backend/*|*/apps/mobile-companion/*|*/packages/finance-engine/*|*/packages/banking/*|*/packages/common/*|*/packages/mcp/*) exit 0 ;;
esac
[ -f "$file" ] || exit 0

hex=$(grep -nE "['\"\`]#[0-9a-fA-F]{3,8}['\"\`]|rgba?\(" "$file")
prim=$(grep -nE "['\"\`](slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|success|error)\.[0-9]{2,3}\b" "$file")

if [ -n "$hex$prim" ]; then
  {
    echo "Design-token violation in $file (AGENTS.md section 2):"
    [ -n "$hex" ] && echo "Raw hex/RGB values:" && echo "$hex" | head -10
    [ -n "$prim" ] && echo "Primitive scale tokens:" && echo "$prim" | head -10
    echo "Use semantic tokens only: surface.*, text.*, border.*, primary.*, status.*.*, chart.*"
  } >&2
  exit 2
fi
exit 0

## What

<!-- A short description of the change. -->

## Why

<!-- The ticket, epic or problem this addresses. -->

## Checklist

- [ ] `bun run lint`, `bun run check-types`, `bun run test` and `bun run build` pass (AGENTS.md section 5)
- [ ] UI change: colocated component directory, stories in light and dark, semantic tokens only, `tabular-nums` and en-GB formatting on financial data

## Advice boundary

E25/E26 copy or MCP surface? Link `docs/compliance/E29-gate.md` and tick the items. This is advisory: there are no required checks, so the reviewer and the owner rely on this list.

- [ ] Not applicable (no new or changed copy, tool descriptions, prompts or MCP output)
- [ ] Gate checklist linked and the items for this PR ticked: <!-- link -->
- [ ] New or changed user-facing and MCP text meets the rules in `docs/compliance/advice-boundary-policy.md` (R1 to R8)
- [ ] No new advice-guard allow-list entries (or each has a reason and an owning ticket)

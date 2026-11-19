# Proposed AGENTS.md law: one home per value

For the coordinator to add to `AGENTS.md`, in the same pull request as slice 1 of the November 2026 system audit or straight after it. The slice did not edit `AGENTS.md` itself.

- Sign-off: owner decision 11 in [docs/audit/system-2026-11/PLAN.md](../audit/system-2026-11/PLAN.md), accepted on 19 November 2026 (round 11 in [docs/audit/plans/DECISIONS.md](../audit/plans/DECISIONS.md)). That is the sign-off AGENTS.md section 15 asks for a new law and its check.
- The check it names, `scripts/check-value-map.ts`, is already in `check:laws` from slice 1.

## 1. New section, after section 15

```markdown
## 16. ONE HOME PER VALUE LAW

> **Detailed Reference**: Before adding, moving or removing a stored value, a browser storage or cookie key, or a figure shown in more than one place, read [`docs/system/README.md`](./docs/system/README.md).

- **One source of truth per fact.** Every stored fact about a user has one entry in `docs/system/value-map.yaml`, naming the one table and column that holds it. Do not add a second store for a fact that already has a home: read it from its home. A copy is allowed only when the map lists it with its status (`cache`, `derived` and so on) and says what keeps it equal.
- **One engine function per shared figure.** A figure shown in more than one place is computed by one function in `packages/finance-engine/src`, named in its map entry. Pages, backend services and AI tools read the figure from there. They do not sum balances, apply shares or convert amounts themselves.
- **Update the map in the same PR.** A PR that adds, moves or removes a database column, a profile field, a browser storage or cookie key, or a shared figure updates the map in the same PR. A new column also goes in its table's `valueMap` in `apps/backend/src/modules/privacy/user-data-registry.ts`. Then run `bun scripts/generate-value-map.ts`.
- **Guard.** `bun scripts/check-value-map.ts` (part of `check:laws`) fails on a column or browser key with no entry, a path, function, table or column that no longer exists, a malformed entry, a fact with no source of truth, a figure outside the engine, and stale generated views. Known problems are in `scripts/value-map-baseline.json`, each tied to an audit finding. The baseline only shrinks; raising it falls under section 15. Arithmetic that may be a second formula prints as a warning and does not fail the run.
```

## 2. One-line cross-references

In section 5, item 3, add the value map to the list in brackets:

```markdown
3. `bun run check:laws` (design tokens, tabular numbers, react icons, style literals, number inputs, judgement colours, dependency versions, copy, the unsigned tax vector ratchet, the one tax engine guard and the value map)
```

In section 5, the paragraph on stale baselines, add the value map's writer to the list of commands:

```markdown
`bun scripts/check-copy.ts --write-baseline` and `bun scripts/check-value-map.ts --write-baseline`, then commit the updated baseline files.
```

## What was left out, and why

The target model's draft of the law ([TARGET-MODEL.md](../audit/system-2026-11/TARGET-MODEL.md), "The rule to add to `AGENTS.md`") has two more bullets:

- a form never sends back a value the engine has adjusted for display, and sends only the fields the user changed;
- a missing fact shows as "Not set", never as a default that looks like an answer.

They are left out of this law because they are behaviour, which the check cannot see. They belong in `docs/ux/UX-GUIDELINES.md` as review-only rules, or in this section once the link tests from the plan's slice 1 can check them. The coordinator decides which.

# Flump audit, November 2026

This folder holds the November 2026 audit of the Flump monorepo, the epics derived from it (E1 to E24) and the plans written for those epics.

## How to read it

- `AUDIT_PLAN.md`, `00-baseline.md` and `01-sweeps.md` describe how the audit was run and the baseline it started from.
- `A-*.md` to `N-*.md` are the findings by theme (tech debt, architecture, correctness, security, performance, tests, unfinished work, design system, UX, accessibility, data visualisation, copy, marketing and SEO, infrastructure). `SUMMARY.md` ranks them.
- `EPICS.md` groups the findings into epics E1 to E24, with scope, severity and effort. Start here to see what work exists.
- `plans/SEQUENCE.md` gives the order the epics should be done in, and which epics touch the same files.
- `plans/DECISIONS.md` records the decisions the owner has made on open questions. Where a plan and DECISIONS.md disagree, DECISIONS.md wins.

## Plans

Files in `plans/` named `*-plan-draft.md`, `*-plan.md`, `*-design.md`, `*-ledger.md` and the E12, E15 and E16 packs were written by planning agents. They are drafts to be reviewed, not approved designs. Evidence behind them is in `plans/evidence/`.

## Not included

Screenshots, the E16 HTML decision pack and other binary or generated files are deliberately left out. Only Markdown is tracked.

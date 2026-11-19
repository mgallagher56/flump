# System audit, November 2026

The owner asked on 19 November 2026 for an audit of the system as a whole: whether the same fact is stored or entered in more than one place, whether pages that depend on each other stay in step, and whether the database is doing more work than it needs to.

Audited commit: `f5631d4f0` (`origin/main` on 19 November 2026). This audit changed no product code and no database. No tests were run.

## Read in this order

| File | What it is |
|---|---|
| [SUMMARY.md](./SUMMARY.md) | One page for the owner |
| [PLAN.md](./PLAN.md) | Nine slices in order, and fifteen owner decisions. Decisions: open |
| [TARGET-MODEL.md](./TARGET-MODEL.md) | The recommended single source of truth for each disputed fact, the proposed law and its check |
| [FACTS.md](./FACTS.md) | The fact register: what is flagged and why |
| [DEPENDENCIES.md](./DEPENDENCIES.md) | Pages against facts, figures with more than one code path, and the expected links |
| [FINDINGS.md](./FINDINGS.md) | Every finding, by area, with evidence |
| [BROWSER-EVIDENCE.md](./BROWSER-EVIDENCE.md) | What was run in a browser and on a local database |
| [docs/system](../../system/README.md) | The value map that the audit leaves behind, as data with generated views |

## Method

1. **Map.** Six read-only inventories (sonnet): database schema, profile and browser state, web routes, backend endpoints, derived figures, AI tools with imports and export. From these the lead (fable) wrote 66 expected links as testable statements.
2. **Deep dives.** Ten read-only reviewers (opus), one per area, traced every write path and read path for the links in their area and gave each a verdict with file and line evidence. They and the reviewer added seven links the first list had missed.
3. **Browser and database.** The lead ran sixteen change-here-read-there checks, and the reviewer ran four more, in Chromium against a local build with a seeded persona on local Postgres, and counted queries per page from the Postgres log.
4. **Synthesis.** The lead grouped 119 findings (115 from the deep dives and 4 added by the lead) under ten root causes and wrote the target model and the plan.
5. **Independent review.** A reviewer that wrote none of this checked claims against the code and the browser. Its result is recorded in the pull request.

## Out of scope

- `apps/mobile-companion`, the old mobile app. It is parked until the E12 rebuild. It holds its own net worth sum, its own monthly conversion and its own tax function, and it is the only client of `GET /transactions`. None of that is counted in the findings.
- `apps/marketing` and the signed-out calculators, except where they leave numbers in the browser that onboarding reads.
- Security, accessibility and visual design, which have their own audits.

## Evidence standard

- Every claim cites a file and line, a measured query count, or a browser observation.
- "Confirmed in code" means read, not run. "Inferred, not confirmed" is marked as such.
- A claim about what the user sees is confirmed only where [BROWSER-EVIDENCE.md](./BROWSER-EVIDENCE.md) lists it. That file also lists what was not checked.
- Line numbers are for commit `f5631d4f0` and will drift. The value map uses file paths without line numbers for that reason.

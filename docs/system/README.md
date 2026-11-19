# The value map

One file answers "where is this value stored, entered and used": [value-map.yaml](./value-map.yaml).

It has an entry for every stored fact about a user (a salary, an account balance, a rent) and for every derived figure shown in more than one place (net worth, left over each month, estimated tax). It is the only file in this folder that is edited by hand.

## Use it

| Question                                     | Open                                                                |
| -------------------------------------------- | ------------------------------------------------------------------- |
| Where is my salary stored, entered and used? | [generated/by-fact.md](./generated/by-fact.md), then find the value |
| What does the Mortgage page read and write?  | [generated/by-page.md](./generated/by-page.md)                      |
| How do the parts of one area connect?        | [generated/connections.md](./generated/connections.md)              |
| Which cross-page links hold today?           | [generated/links.md](./generated/links.md)                          |

An agent starting a task reads the entry for each value the task touches. The entry gives the single source of truth, every other store and its status, every writer and every reader. If the task adds a store or a reader, the entry changes in the same pull request.

## The format

```yaml
facts:
  - id: salary # stable id, never reused
    name: Salary (yearly pay before tax)
    area: pay
    source_of_truth:
      { ref: user_profiles.annual_salary, path: apps/backend/src/entities/user-profile.entity.ts }
    other_stores: # every other place the same fact is held
      - { ref: "budget_entries income row", status: duplicate, path: ..., note: "..." }
    writers: # every screen, service, tool or import that changes it
      - { surface: settings, path: ... }
    readers: # every page, selector, tool or export that uses it
      - { surface: take-home, path: ... }
    links: [L24, L25] # expected cross-page links that involve it
    verdict: duplicated # holds | manual | broken | duplicated | not-checked
    findings: [PP-1, BU-1] # ids in the audit that set the verdict

figures:
  - id: net-worth
    name: Net worth today
    area: accounts
    computed_by:
      {
        function: selectNetWorth,
        path: packages/finance-engine/src/picture/selectors/portfolio-totals.ts,
      }
    other_paths: [] # any other code that computes the same figure
    inputs: [account-balance] # fact ids
    shown_on:
      - { surface: dashboard, path: ... }
```

- `surfaces` lists the pages, flows, services and tools that entries refer to.
- `links` lists the expected cross-page links as testable statements.
- A store `status` is one of `duplicate`, `cache`, `derived`, `legacy`, `default`.
- Every `path` must exist in the repository. A path may end in `:line`, but plain file paths age better.

## Generate and check

```sh
bun scripts/generate-value-map.ts          # rewrite generated/*.md
bun scripts/generate-value-map.ts --check  # fail on a bad id, a missing file or stale views
```

`bun run value-map` runs the first command. Never edit the files in `generated/`.

## How it stays true

Today the script checks ids, paths and stale views. It is not yet part of CI.

The plan in [docs/audit/system-2026-11/PLAN.md](../audit/system-2026-11/PLAN.md), slice 1, adds a CI check that also fails when:

- a database column, profile field or browser storage key that holds user data has no entry;
- a figure is computed outside the engine function its entry names.

It also adds the rule to `AGENTS.md` that a pull request adding or moving a stored value or a shared figure updates this map in the same pull request. Until that slice lands, updating the map is good practice and not yet a law.

## Where it came from

The first version was written by the November 2026 system audit at commit `f5631d4f0`. The verdicts and finding ids point at [docs/audit/system-2026-11](../audit/system-2026-11/README.md).

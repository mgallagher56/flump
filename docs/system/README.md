# The value map

One file answers "where is this value stored, entered and used": [value-map.yaml](./value-map.yaml).

It has an entry for every stored fact about a user (a salary, an account balance, a rent), for every derived figure shown in more than one place (net worth, left over each month, estimated tax), and for every key the browser code keeps in storage or a cookie. It is the only file in this folder that is edited by hand.

The rule behind it is "one home per value": each fact has one source of truth, each shared figure has one engine function, and a pull request that adds or moves either updates the map. `bun run check:laws` enforces it through `scripts/check-value-map.ts`.

## Use it

| Question                                     | Open                                                                       |
| -------------------------------------------- | -------------------------------------------------------------------------- |
| Where is my salary stored, entered and used? | [generated/by-fact.md](./generated/by-fact.md), then find the value        |
| What does the Mortgage page read and write?  | [generated/by-page.md](./generated/by-page.md)                             |
| How do the parts of one area connect?        | [generated/connections.md](./generated/connections.md)                     |
| Which cross-page links hold today?           | [generated/links.md](./generated/links.md)                                 |
| What does the browser keep?                  | [generated/by-fact.md](./generated/by-fact.md#browser-storage-and-cookies) |

An agent starting a task reads the entry for each value the task touches. The entry gives the single source of truth, every other store and its status, every writer and every reader.

## The format

```yaml
facts:
  - id: salary # stable id, never reused
    name: Salary (yearly pay before tax)
    area: pay
    source_of_truth: # the one home: a table and column
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
    computed_by: # the one engine function, in packages/finance-engine/src
      {
        function: selectNetWorth,
        path: packages/finance-engine/src/picture/selectors/portfolio-totals.ts,
      }
    other_paths: [] # any other code that computes the same figure
    inputs: [account-balance] # fact ids
    shown_on:
      - { surface: dashboard, path: ... }

browser_storage:
  - {
      key: flump_onboarding_seed, # as the code spells it; a trailing * means a prefix
      storage: cookie, # localStorage | sessionStorage | cookie
      user_data: true, # does it hold a fact about the user, even as a copy?
      fact: salary, # required when user_data is true
      path: packages/finance-engine/src/persistence.ts,
      note: "what it holds, in a few words",
    }
```

- `surfaces` lists the pages, flows, services and tools that entries refer to.
- `links` lists the expected cross-page links as testable statements.
- A store `status` (in `other_stores`) is one of `duplicate`, `cache`, `derived`, `legacy`, `default`.
- A code path `status` (in `other_paths`) is one of `duplicate`, `wrapper`, `legacy`, `default`.
- Every `path` must exist in the repository. A path may end in `:line`, but plain file paths age better.
- A `ref` that starts with a table (`accounts.balance`, `user_profiles.a, b`) must name real tables and columns, by their database names.

### Where database columns are tied to the map

Each table in [`apps/backend/src/modules/privacy/user-data-registry.ts`](../../apps/backend/src/modules/privacy/user-data-registry.ts) has a `valueMap`. The registry stays the legal list for export, erasure and reset; the map does not replace it.

```ts
valueMap: {
  facts: { balance: "account-balance", name: "account-name" }, // column -> fact id in the map
  notFacts: { id: ROW_ID, createdAt: WRITTEN_AT },              // column -> why it holds no fact
}
// or, for a table with no fact about the user at all (tokens, audit, idempotency):
valueMap: { noUserFacts: "an agent access token and its settings, not a fact about money" }
```

Every column is listed once, by its property name. There is no default for a whole table, so a new column cannot pass unseen.

## Add, move or remove a value

1. Edit [value-map.yaml](./value-map.yaml): add or change the fact, figure or browser key. Give a new entry a new id; never reuse an old one.
2. For a new database column, add it to that table's `valueMap` in `user-data-registry.ts`, next to its export entry.
3. Run `bun scripts/generate-value-map.ts` to rewrite the views in `generated/`. Never edit those files by hand.
4. Run `bun scripts/check-value-map.ts`. It is also part of `bun run check:laws`.
5. Commit the map, the views and the registry in the same pull request as the code change.

## What each failure means and how to fix it

Each message names the entry and says what to do. This table says the same at more length.

| Rule                    | It means                                                                                                                                                                                                                    | Fix                                                                                                                                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `unmapped-column`       | A column of a table in the user-data registry is not in that table's `valueMap`, the table has no `valueMap`, or a column is tied to a fact id the map does not have.                                                       | Add the column to `valueMap.facts` with the id of the fact it holds, or to `valueMap.notFacts` with the reason it holds none. If the fact is new, add it to the map first. |
| `unmapped-storage-key`  | The browser code writes a storage or cookie key the map does not list.                                                                                                                                                      | Add it under `browser_storage:` with its storage, `user_data`, the fact it copies (if any), path and note.                                                                 |
| `dead-storage-key`      | The map lists a browser key no code writes any more.                                                                                                                                                                        | Remove the entry, or fix the key to how the code spells it now.                                                                                                            |
| `dead-path`             | An entry points at a file that no longer exists.                                                                                                                                                                            | Change the path to where the code lives now, or remove the entry if the code is gone.                                                                                      |
| `dead-symbol`           | A figure's function (`computed_by` or `other_paths`) is no longer in the file named.                                                                                                                                        | Point the entry at the file that defines it now, or rename it to match the code.                                                                                           |
| `dead-column`           | A `ref` names a table or column that does not exist, or a registry `valueMap` names a column the entity does not have.                                                                                                      | Fix the ref to the database name in the entity, or remove the store.                                                                                                       |
| `malformed`             | An unknown verdict or status, a duplicate id, a missing name, area, path or note, an unknown surface, link or input fact, a browser key that holds user data and names no fact, or a column in both `facts` and `notFacts`. | Do what the message says. Allowed values are listed in it.                                                                                                                 |
| `no-source-of-truth`    | A fact names no source of truth, or says it is not stored.                                                                                                                                                                  | Store the fact in one column and name it under `source_of_truth`.                                                                                                          |
| `figure-outside-engine` | A figure is computed outside `packages/finance-engine/src`, or described in words rather than named by one function.                                                                                                        | Move the arithmetic into an engine function (a picture selector) and name it under `computed_by`.                                                                          |
| `stale-views`           | A file in `generated/` differs from a fresh render of the map.                                                                                                                                                              | Run `bun scripts/generate-value-map.ts` and commit the views.                                                                                                              |
| `STALE` (baseline)      | A problem in the baseline is fixed.                                                                                                                                                                                         | Run `bun scripts/check-value-map.ts --write-baseline` and commit `scripts/value-map-baseline.json`.                                                                        |
| `baseline:`             | A baseline entry names no finding, or a finding that is not a heading in the audit's FINDINGS.md.                                                                                                                           | Fix the finding id. Every entry must be traceable to the audit.                                                                                                            |

### The baseline

`scripts/value-map-baseline.json` lists the problems that were known when the check was added, each with the audit finding that explains it and the slice that fixes it. A problem in the baseline does not fail the run.

The baseline only shrinks. `--write-baseline` drops fixed entries and lowers warning counts; it never adds an entry or raises a count. A new problem is fixed, not baselined. Adding an entry by hand is raising a baseline, which needs sign-off under AGENTS.md section 15.

### Second-formula warnings

The check also looks for arithmetic in `apps/web/app`, `apps/backend/src` and `packages/mcp/src` that may be a second formula for a shared figure:

- `sum-of-saved-amounts`: summing balances, amounts, payments or monthly contributions of saved rows;
- `share-arithmetic`: applying a joint share by hand rather than through `applyAccountShare`;
- `monthly-yearly`: turning a saved amount from monthly to yearly or back.

These are warnings (owner decision 11). They never fail the run, because scenario tools must do sums on what-if inputs and the patterns need tuning. A new one prints with its file and line, the figures it might duplicate, and the engine function to read instead. Warnings in files the baseline lists, with their finding, are counted and shown with `--verbose`.

If a warning is a figure shown elsewhere, read the figure from the engine. If it is what-if arithmetic, leave it.

For the rule to become a failure, all of these should be true: the engine has a function for every figure the patterns can produce (slice 3 adds the missing ones); the files still in the baseline have been moved onto those functions or explained; and the patterns have run for a few weeks with no new false positives, so that what-if code is either out of their reach or marked in a way the rule can read.

## Where it came from

The first version was written by the November 2026 system audit at commit `f5631d4f0`. The verdicts and finding ids point at [docs/audit/system-2026-11](../audit/system-2026-11/README.md). Slice 1 of that audit's plan added the check, the registry tie, the browser keys and two facts (`account-name`, `currency-and-country`) so every column has an entry.

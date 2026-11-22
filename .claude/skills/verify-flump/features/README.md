# Flump web app verification map

This directory is the maintained source for verifying the user-facing behaviour of the Flump web app (`apps/web`). Read this index before driving the app, then use the matching feature file as the recipe.

## Baseline preconditions

- A live run started with `V up` (`V` is `.claude/skills/verify-flump/scripts/verify-flump`, run from the repo root).
- `V doctor` exits 0, including `ok build matches the checkout`.
- The run's user holds the `homeowner` persona: net worth £231,400 (£427,000 owned, £195,600 owed), accounts `Current account` £3,400, `Easy access savings`, `Cash ISA`, `Workplace pension`, `Home` £310,000, `Residential mortgage` £186,000, `Credit card`, `Car loan`, six past months of balances and no check-in for the current month.
- Never drive an instance this skill did not start, and never a deployed environment.

## Driving conventions

- Start each recipe from the baseline. After a journey that changes saved data, `V seed homeowner` restores it (one reset; 10 an hour).
- Prefer roles and accessible names, then the app's own data attributes. Never coordinates.
- Wait for hydration before clicking: use `open(page, path)` or `hydrated(page)` from `scripts/lib.ts`.
- Treat quoted names, paths and commands as literal.
- One `step` per user action, so each action has its own screenshot and ARIA snapshot.
- Write ad hoc journeys in your scratchpad, importing `scripts/lib.ts` by absolute path, and run them with `V drive <path>`.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- UI proof is the step screenshots and ARIA snapshots under `.verify/evidence/<run-id>/journeys/`.
- A change to saved data needs a second, read-only view: a reload, an `api()` read-back, or the page that depends on it.
- Report the feature ID and entry point with each proof, plus the evidence folder.
- Report an unreachable path with the attempted step and the unmet precondition. Do not report a skipped entry point as verified through a different one.
- A pass with entries in `problems.jsonl` (console errors, HTTP 5xx) is reported with those entries.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behaviour. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behaviour.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with verify-flump` starts with `Preconditions:` and uses labelled bullets that pair each user action with the exact handle or command and the observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

Keep implementation details out of the map. Name only user paths, stable handles, required state, commands and observable proof.

## Features

- [Sign in and the dashboard](./sign-in-dashboard.md) covers sign-in, the net worth headline and sign-out. Shipped journey: `dashboard`.
- [Accounts](./accounts.md) covers adding an account and seeing it in the list, the read-back and the dashboard. Shipped journey: `accounts-add`.
- [Budget](./budget.md) covers adding a spending entry in place and the "left over each month" figure.
- [Monthly check-in](./monthly-check-in.md) covers recording this month's balances from the dashboard card and seeing them in history.
- [Setup for a new user](./setup.md) covers the first-run setup flow from an empty user to the dashboard.

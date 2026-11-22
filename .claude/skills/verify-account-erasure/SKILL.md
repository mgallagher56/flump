---

name: verify-account-erasure
description: Model-check account erasure against in-flight requests and the financial-data reset with TLA+. Use when a change touches AccountDeletionService.deleteAccount, lockUserData, the AuthGuard erased-account check, resetFinancialData, or the order of USER_DATA_REGISTRY, or when asked whether an erased user's data can survive or come back.
---

# Verify account erasure

A TLA+ model of account erasure (BE-04), checked with TLC over every order of steps. It tells you whether a change to erasure, the user-data lock, the AuthGuard check or the reset can leave an erased user's rows behind.

- **Property:** when an erasure has finished, none of the user's rows are left in the database.
- **Harm if it breaks:** a person told their account is erased still has personal financial data stored, which breaks the erasure promise (UK GDPR Article 17).
- **Scope:** only the order of steps in the account-deletion service (`deleteAccount`) against requests and the reset. It does not cover the rest of the privacy module (export, retention purge, the registry's contents, consents).

A race this finds in `account-deletion.service.ts` is a privacy finding. Report it to the coordinator with the counterexample, and do not fix product code in the same lane.

## Does my change touch it?

Run the check if your diff touches any code in the coverage record below. Also run it if a new code path writes user rows without going through the AuthGuard, or if a write takes `lockUserData`. If none applies, you do not need to run it.

## Run

The toolchain is dev-only and installed per user by mise. It is not a product, CI or Docker dependency. Set it up once:

```bash
brew install mise
```

```bash
mise install java@temurin-25 'http:tla2tools[url=https://github.com/tlaplus/tlaplus/releases/download/v1.7.4/tla2tools.jar,checksum=sha256:936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88]@1.7.4'
```

Confirm the install: the first command prints a Temurin 25 version, and the second lists `tla2tools.jar`. mise verified the jar's checksum during the install.

```bash
"$(mise which java --tool java@temurin-25)" -version
```

```bash
ls "$(mise where 'http:tla2tools[url=https://github.com/tlaplus/tlaplus/releases/download/v1.7.4/tla2tools.jar,checksum=sha256:936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88]@1.7.4')"
```

Then run the check from the repo root. It takes about 5 seconds, and `check.sh` pins the same versions and checksum:

```bash
sh .claude/skills/verify-account-erasure/check.sh
```

Each line says `ok` or `FAIL`. The script exits 0 only when every config gives its expected result:

| Config (`model/`)               | What it checks                                                                                 | Expected                                      |
| ------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `current.cfg`                   | The code as it is: `ResetNeverOutlivesErasure`, `StragglerSweepCatchesEarlierWrites`, `TypeOK` | pass                                          |
| `promise.cfg`                   | The code against the full promise, `ErasureLeavesNothing`                                      | violated: finding F1                          |
| `broken-reset-no-lock.cfg`      | Reset without `lockUserData`                                                                   | `ResetNeverOutlivesErasure` violated          |
| `broken-no-straggler-sweep.cfg` | `deleteAccount` without step (b2)                                                              | `StragglerSweepCatchesEarlierWrites` violated |
| `whatif-writes-lock.cfg`        | Not the code: every write takes `lockUserData` and checks the tombstone again                  | pass, all four rules                          |

The two `broken-` configs show that the rules can fail. If either of them passes, the model can no longer see the bug it guards against, so fix the model. Pass config names to run only those, for example `check.sh current promise`.

Read every result, pass or fail, with the pstack `/statechart` skill on `model/AccountErasure.tla` and the config. For a violation it gives the shortest path in plain words. Tell that path in this repo's words (`deleteAccount`, the tombstone, the AuthGuard). For a pass it draws how erasure, requests and the reset move between states. Use one request (`Requests = {r1}`) in a scratch copy of the config so the chart stays readable.

## Real bug or modelling error?

When a result changes, open the actions in the counterexample and compare each one with the code it names in its comment in `AccountErasure.tla`.

- **Real bug:** every step in the path is something the code allows, and in the code each indivisible step is one statement or one commit. Report it with the path. Do not change product code or weaken a rule unless the owner asks.
- **Modelling error:** a step the code cannot take (for example, a write after a refusal), or two code statements merged into one step. Fix the model so it matches the code, then run again.

## Intended changes

If your change alters behaviour that the model describes, update the matching action and its code comment in the same PR. Examples: a new sweep, a lock taken by writes, or a new tombstone check. Run the check again and update the table above if an expected result changes. If F1 is fixed, `promise.cfg` passes, so the script fails until you change `promise` to `pass` in `check.sh`, move `ErasureLeavesNothing` into `current.cfg` and delete F1 below.

## Coverage record

Sync commit: `cf6a2938a41fed85ddc3110e73702648cdbc6e62`. At that commit, the model was confirmed to describe this code:

| Model action                                             | Code                                                                                                                                                           |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EraseLock`, `EraseSweep`, `EraseCommit`                 | `apps/backend/src/modules/privacy/account-deletion.service.ts`, `deleteAccount` step (b): `lockUserData`, `sweep`, `sweepLinked`, the tombstone insert, commit |
| `EraseStragglerSweep`, `EraseFinish`                     | the same file, `deleteAccount` step (b2), the second `sweep` in its own transaction                                                                            |
| `Tables` (two, in order)                                 | `apps/backend/src/modules/privacy/user-data-registry.ts`, `USER_DATA_REGISTRY`, one `DELETE` per table                                                         |
| Lock                                                     | `apps/backend/src/modules/privacy/user-data-lock.ts`, `lockUserData`                                                                                           |
| `RequestGuard`                                           | `apps/backend/src/auth/auth.guard.ts`, `canActivate`, the `isErased` check                                                                                     |
| `RequestWrite`                                           | any authenticated handler that inserts a row of the user's, with no lock and no tombstone check                                                                |
| `ResetPrecheck`, `ResetLock`, `ResetCheck`, `ResetWrite` | `apps/backend/src/modules/profile/user-profile.service.ts`, `resetFinancialData`                                                                               |

Check whether the verification needs another look with `git log --oneline cf6a2938a41fed85ddc3110e73702648cdbc6e62..HEAD -- <the paths above>`. Move the sync commit forward only after you have read those changes and confirmed that the model still describes the code at the new commit, even if the check passes.

## Bounds and assumptions

- One user, two in-flight requests, one reset, one erasure, two registry tables. More requests or tables add only more orders of the same steps. The rules are about whether any write commits after a given sweep step, so a bug that needs more than two requests is not expected, but the check does not prove that.
- Postgres READ COMMITTED: a `DELETE` sees only committed rows, so a request's insert counts only when it commits. The model applies erasure deletes at the statement. Nothing in the model reads rows, so that gives the same result as applying them at commit.
- Not covered: transaction failures and rollbacks, retries of `deleteAccount`, the WorkOS steps (c) and (d), the `erasedCache`, the bank consent revoke, `/mcp` (outside the AuthGuard; its tokens are deleted with the account), updates that hit unique keys while a delete is uncommitted, and the per-service `isErased` rechecks (such as `findOrCreateProfile`). Those rechecks run outside the lock, so they narrow F1's window but do not close it.

## Findings

**F1: a row can be saved after the erasure finishes** (`promise.cfg`, open at the sync commit). Shortest path:

1. `deleteAccount` takes `lockUserData` and sweeps every table.
2. A request from the same user passes the AuthGuard. `isErased` is still false because the tombstone has not committed.
3. The tombstone commits, the straggler sweep (b2) deletes every table, and `deleteAccount` returns `deleted`.
4. The request's handler commits its insert. The row stays, and the AuthGuard now refuses the user, so nothing in the app reaches or removes it. Only a repeated `deleteAccount` would sweep it.

Step (b2) catches every write that commits before it reaches that table (`StragglerSweepCatchesEarlierWrites` holds). It cannot catch a write that commits later. `whatif-writes-lock.cfg` shows one design that closes the gap. It is not a decided fix.

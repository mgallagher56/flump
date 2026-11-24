---

name: verify-account-erasure
description: Model-check account erasure against in-flight requests and the financial-data reset with TLA+. Use when a change touches AccountDeletionService.deleteAccount, lockUserData, the AuthGuard erased-account check, resetFinancialData, or the order of USER_DATA_REGISTRY, or when asked whether an erased user's data can survive or come back.
---

# Verify account erasure

A TLA+ model of account erasure (BE-04), checked with TLC over every order of steps. It tells you whether a change to erasure, the user-data lock, the AuthGuard check or the reset can leave an erased user's rows behind.

- **Property:** when an erasure has finished, none of the user's rows are left in the database.
- **Harm if it breaks:** a person told their account is erased still has personal financial data stored, which breaks the erasure promise (UK GDPR Article 17).
- **Scope:** only the order of steps in the account-deletion service (`deleteAccount`) against requests and the reset. It does not cover the rest of the privacy module (export, retention purge, the registry's contents, consents).

A race this finds in `account-deletion.service.ts` or the write fence is a privacy finding. Report it to the coordinator with the counterexample, and do not fix product code in the same lane.

## Does my change touch it?

Run the check if your diff touches any code in the coverage record below. Also run it if a new code path writes user rows without the write fence (outside a signed-in request and not in `runAsUserRequest`, or outside a transaction), if a write takes `lockUserData`, or if code runs `withoutWriteFence`. If none applies, you do not need to run it.

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

| Config (`model/`)               | What it checks                                                                                                         | Expected                                      |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `current.cfg`                   | The code as it is: `ErasureLeavesNothing`, `ResetNeverOutlivesErasure`, `StragglerSweepCatchesEarlierWrites`, `TypeOK` | pass                                          |
| `promise.cfg`                   | The code against the full promise alone, `ErasureLeavesNothing`                                                        | pass                                          |
| `broken-writes-no-fence.cfg`    | Writes without the write fence (the code before F1, or a future unfenced writer)                                       | `ErasureLeavesNothing` violated: F1           |
| `broken-reset-no-lock.cfg`      | Reset without `lockUserData`                                                                                           | `ResetNeverOutlivesErasure` violated          |
| `broken-no-straggler-sweep.cfg` | `deleteAccount` without step (b2), with unfenced writes (a future job, say)                                            | `StragglerSweepCatchesEarlierWrites` violated |

The three `broken-` configs show that the rules can fail. If any of them passes, the model can no longer see the bug it guards against, so fix the model. Pass config names to run only those, for example `check.sh current promise`.

Read every result, pass or fail, with the pstack `/statechart` skill on `model/AccountErasure.tla` and the config. For a violation it gives the shortest path in plain words. Tell that path in this repo's words (`deleteAccount`, the tombstone, the AuthGuard). For a pass it draws how erasure, requests and the reset move between states. Use one request (`Requests = {r1}`) in a scratch copy of the config so the chart stays readable.

## Real bug or modelling error?

When a result changes, open the actions in the counterexample and compare each one with the code it names in its comment in `AccountErasure.tla`.

- **Real bug:** every step in the path is something the code allows, and in the code each indivisible step is one statement or one commit. Report it with the path. Do not change product code or weaken a rule unless the owner asks.
- **Modelling error:** a step the code cannot take (for example, a write after a refusal), or two code statements merged into one step. Fix the model so it matches the code, then run again.

## Intended changes

If your change alters behaviour that the model describes, update the matching action and its code comment in the same PR. Examples: a new sweep, a lock taken by writes, or a new tombstone check. Run the check again and update the table above if an expected result changes. If a change brings F1 back, `promise.cfg` and `current.cfg` fail with the same path as `broken-writes-no-fence.cfg`.

## Coverage record

Sync commit: `f2f955f28bf1aa1e46d166b6c9cd351c7249c62f`. At that commit, the model was confirmed to describe this code:

| Model action                                             | Code                                                                                                                                                                                                                    |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EraseLock`, `EraseSweep`, `EraseCommit`                 | `apps/backend/src/modules/privacy/account-deletion.service.ts`, `deleteAccount` (run `withoutWriteFence`) step (b): `lockUserData`, `sweep`, `sweepLinked`, the tombstone insert, commit                                |
| `EraseStragglerSweep`, `EraseFinish`                     | the same file, `deleteAccount` step (b2), the second `sweep` in its own transaction                                                                                                                                     |
| `Tables` (two, in order)                                 | `apps/backend/src/modules/privacy/user-data-registry.ts`, `USER_DATA_REGISTRY`, one `DELETE` per table                                                                                                                  |
| Lock (`lock` exclusive, `shared`)                        | `apps/backend/src/modules/privacy/user-data-lock.ts`, `lockUserData` and `lockUserDataShared`                                                                                                                           |
| `RequestGuard`                                           | `apps/backend/src/auth/auth.guard.ts`, `canActivate`, the `isErased` check                                                                                                                                              |
| `RequestLock`, `RequestRecheck`                          | `apps/backend/src/modules/privacy/user-data-write-fence.ts`, `UserDataWriteFence.afterTransactionStart`: `lockUserDataShared`, then `isErasedForWrite` (`account-deletion.service.ts`)                                  |
| `RequestLockedWrite`                                     | any authenticated handler's or `/mcp` insert of a user row (`mcp-imports.adapter.ts`, `mcp.service.ts` `recordAudit`), in the fenced transaction (`beforeQuery` refuses an INSERT or MERGE outside one), and its commit |
| `RequestWrite`                                           | broken variants only: a write with no fence (none in the code today)                                                                                                                                                    |
| `ResetPrecheck`, `ResetLock`, `ResetCheck`, `ResetWrite` | `apps/backend/src/modules/profile/user-profile.service.ts`, `resetFinancialData` (its transaction runs `withoutWriteFence`)                                                                                             |

Check whether the verification needs another look with `git log --oneline f2f955f28bf1aa1e46d166b6c9cd351c7249c62f..HEAD -- <the paths above>`. Move the sync commit forward only after you have read those changes and confirmed that the model still describes the code at the new commit, even if the check passes.

## Bounds and assumptions

- One user, two in-flight requests, one reset, one erasure, two registry tables. More requests or tables add only more orders of the same steps. The rules are about whether any write commits after a given sweep step, so a bug that needs more than two requests is not expected, but the check does not prove that.
- Postgres READ COMMITTED: a `DELETE` sees only committed rows, so a request's insert counts only when it commits. The model applies erasure deletes at the statement. Nothing in the model reads rows, so that gives the same result as applying them at commit. The fence's recheck needs it too (a REPEATABLE READ snapshot would be taken before the lock wait), so `isErasedForWrite` refuses any other level.
- Shared and exclusive advisory locks are granted in any order the model picks, which covers Postgres's queueing (a shared request waits behind a queued exclusive one).
- Not covered: transaction failures and rollbacks, retries of `deleteAccount`, the WorkOS steps (c) and (d), the `erasedCache`, the bank consent revoke, updates that hit unique keys while a delete is uncommitted, the per-service `isErased` rechecks (such as `findOrCreateProfile`), and updates that set a blanked user column (the beta invite redemption runs in a transaction, so it is fenced). `current.cfg` models every writer as fenced: a new writer that takes no fence (a job) is `broken-writes-no-fence.cfg`, and only the straggler sweep (b2) covers what it commits while (b) runs.

## Findings

**F1 (fixed): a row could be saved after the erasure finished.** `broken-writes-no-fence.cfg` keeps the path:

1. `deleteAccount` takes `lockUserData` and sweeps every table.
2. A request from the same user passes the AuthGuard. `isErased` is still false because the tombstone has not committed.
3. The tombstone commits, the straggler sweep (b2) deletes every table, and `deleteAccount` returns `deleted`.
4. The request's handler commits its insert. The row stays, and the AuthGuard now refuses the user, so nothing in the app reaches or removes it.

The write fence closes it: the insert's transaction takes the shared `lockUserData` first and rechecks the tombstone inside it, so the write either commits before the erasure takes its lock (and is swept) or waits for the erasure and is refused. The backend test `user-data-write-fence.integration.spec.ts` reproduces the path on real Postgres.

Signed-in requests take the fence through `UserDataWriteFenceInterceptor`. `/mcp` is outside the AuthGuard, so its two writes (the staging adapter and the audit row) run inside `runAsUserRequest` for the token's user. No background job writes user rows today; one that does must do the same.

---

name: verify-bank-sync
description: Model-check bank sync against concurrent syncs, reconnects and bank revocation with TLA+. Use when a change touches BankConnectionSync.claim, release or resolveActiveAccessToken (the token refresh, its compare-and-swap, lazy re-encryption, the AUTH_EXPIRED recovery), FinanceService.runSync or its status write, or connectBank's token transaction, or when asked whether a sync can lose a fresh token or wrongly mark a connection needs_reconnect.
---

# Verify bank sync

A TLA+ model of one bank connection's sync (BE-12, BE-18), checked with TLC over every order of steps. It tells you whether a change to the sync lease, the token refresh and its compare-and-swap (CAS), lazy re-encryption (M11), the AUTH_EXPIRED recovery or the status the sync records can run two syncs at once, put back an older token, or mark a working connection `needs_reconnect`.

- **Property:** a connection shows `needs_reconnect` only when its stored token no longer works at the bank, a sync never records `error` or `needs_reconnect` over a reconnect that landed while it ran, a sync that outlived its lease never replaces a newer sync's status, at most one sync runs inside its lease at a time, and no write replaces the stored tokens with an older grant's.
- **Harm if it breaks:** a user who has just reconnected is told to reconnect again or sees an error that belonged to the token they replaced, a stale `connected` hides a newer failure (or a stale `error` a newer success), two syncs spend the same single-use refresh token, or a fresh token is overwritten by one the bank may already have withdrawn.
- **Scope:** the order of steps in `runSync` and `BankConnectionSync` token handling against a second sync, a reconnect and the bank revoking consent. It does not cover `writeAccounts`, the disconnect or which accounts are written.

Bank connections are off (decision D11), so a finding here is not live harm yet. A race that could expose or keep a token the user withdrew is a security finding: report it to the coordinator with the counterexample, and do not fix product code in the same lane.

## Does my change touch it?

Run the check if your diff touches any code in the coverage record below. Also run it if new code writes `access_token`, `refresh_token` or `status` on `bank_connections`, takes or clears `sync_started_at`, adds a caller of `activeAccessToken` outside `runSync`, or adds a reconnect path (for example the OAuth callback that `consumeOAuthState` is waiting for). If none applies, you do not need to run it.

## Run

The toolchain is the same as `verify-account-erasure`'s: Java Temurin 25 and the TLA+ tools 1.7.4, dev-only and installed per user by mise. If that skill's setup is done, nothing more is needed. Otherwise:

```bash
brew install mise
```

```bash
mise install java@temurin-25 'http:tla2tools[url=https://github.com/tlaplus/tlaplus/releases/download/v1.7.4/tla2tools.jar,checksum=sha256:936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88]@1.7.4'
```

Then run the check from the repo root. It takes about 15 seconds, and `check.sh` pins the same versions and checksum:

```bash
sh .claude/skills/verify-bank-sync/check.sh
```

Each line says `ok` or `FAIL`. The script exits 0 only when every config gives its expected result:

| Config (`model/`)                 | What it checks                                                                                               | Expected                                      |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| `current.cfg`                     | The code as it is, every sync inside its lease, against every rule (the ones below and `TypeOK`)             | pass                                          |
| `current-lapse.cfg`               | The code as it is, with a lease that can lapse under a running sync, against every rule but the full promise | pass                                          |
| `known-lapse-refresh-overlap.cfg` | The same, against `NeedsReconnectOnlyWhenTokenDead` (finding L2, accepted)                                   | `NeedsReconnectOnlyWhenTokenDead` violated    |
| `broken-claim-no-lease.cfg`       | `claim` without the `sync_started_at` check                                                                  | `OneSyncAtATime` violated                     |
| `broken-refresh-no-cas.cfg`       | The refresh write without `WHERE access_token = prev ...`                                                    | `StoredTokensNeverGoBack` violated            |
| `broken-reencrypt-no-cas.cfg`     | Lazy re-encryption without its `WHERE access_token = ...`                                                    | `StoredTokensNeverGoBack` violated            |
| `broken-no-recovery.cfg`          | AUTH_EXPIRED from the refresh rethrown without rereading the row                                             | `RefreshRejectionHonoursReplacement` violated |
| `broken-status-no-cas.cfg`        | The `needs_reconnect` write without `WHERE access_token = ANY(judged)` (finding B1, fixed)                   | `NeedsReconnectOnlyWhenTokenDead` violated    |
| `broken-error-no-cas.cfg`         | The `error` write without `WHERE access_token = ANY(judged)` (finding B2, fixed)                             | `FailureNeverHidesReconnect` violated         |
| `broken-status-no-lease.cfg`      | Status writes without `WHERE sync_started_at = lease`, with a lease that can lapse (finding L1, fixed)       | `StatusNeverGoesBack` violated                |

The `broken-` configs show that the rules can fail. If any of them passes, the model can no longer see the bug it guards against, so fix the model. `known-` configs keep an accepted finding visible: if one starts to pass, the finding is gone, so record that. Pass config names to run only those, for example `check.sh current broken-status-no-cas`.

Before L1, `current.cfg` with the old code (`StatusChecksLease = FALSE`) passed every rule, `StatusNeverGoesBack` included: the old bound that no lease lapses hid the bug.

Read every result, pass or fail, with the pstack `/statechart` skill on `model/BankSync.tla` and the config. For a violation it gives the shortest path in plain words. Tell that path in this repo's words (`runSync`, `claim`, the CAS, `connectBank`). For a pass it draws how the syncs, the reconnect and the bank move between states. Use one sync (`Syncs = {s1}`) in a scratch copy of the config so the chart stays readable.

## Real bug or modelling error?

When a result changes, open the actions in the counterexample and compare each one with the code it names in its comment in `BankSync.tla`.

- **Real bug:** every step in the path is something the code allows, and in the code each indivisible step is one SQL statement, one provider call or one transaction. Report it with the path. Do not change product code or weaken a rule unless the owner asks.
- **Modelling error:** a step the code cannot take, or two statements merged into one step. Example met while building this: the bank revoking the reconnect's fresh token too, after which `needs_reconnect` is correct; the rule was narrowed to the spent refresh token, not weakened. Fix the model so it matches the code, then run again.

## Intended changes

If your change alters behaviour the model describes, update the matching action and its code comment in the same PR, run the check again, and update the table above if an expected result changes. Examples: a lease check added to the refresh CAS, a second caller of `activeAccessToken`, a sync running on more than one backend instance becoming normal, or a reconnect that also writes `sync_started_at`.

## Coverage record

Sync commit: the commit on `main` titled `fix(banking): a sync that outlived its lease never replaces a newer sync's status (L1)`. Find it with:

```bash
sync=$(git log -1 --format=%H --fixed-strings --grep="fix(banking): a sync that outlived its lease never replaces a newer sync's status (L1)")
```

Name the sync commit by its title, not its hash: PRs are rebase-merged, which gives every commit a new hash on `main`. At that commit, the model was confirmed to describe this code:

| Model action                                    | Code                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Claim`, `Release`, `EarlyFails`                | `apps/backend/src/modules/banking/bank-connection-sync.ts`, `BankConnectionSync.claim` (`sync_started_at`, and the `access_token` it returns as `SyncLease.storedAccess`) and `release`                                                                                                                                       |
| `ReadRow`                                       | the same file, `resolveActiveAccessToken`, the first `repo.findOne` and the `isTokenExpiring` / `tokenNeedsReencrypt` branch                                                                                                                                                                                                  |
| `Refresh`, `RefreshFails`                       | the same file, `provider.refreshToken(... spentRefresh)`; the bank side (rotation, AUTH_EXPIRED on a spent or revoked token) is the provider                                                                                                                                                                                  |
| `Recover`                                       | the same file, the `catch` after `refreshToken`: `AUTH_EXPIRED`, a second `repo.findOne`, `decryptStoredAccessToken(latest)` or rethrow                                                                                                                                                                                       |
| `CasWrite`, `CasMiss`                           | the same file, the `for (attempt < 3)` loop: the conditional `UPDATE ... RETURNING "id"`, then `repo.findOne`, not expiring, same refresh token retry, or `ConnectionNeedsReconnectError`                                                                                                                                     |
| `Reencrypt`                                     | the same file, the lazy re-encryption `UPDATE` (M11)                                                                                                                                                                                                                                                                          |
| `Fetch`, `FetchFails`                           | `apps/backend/src/modules/finance/finance.service.ts`, `runSync`: `provider.fetchAccounts` and `sync.writeAccounts`; 401/403 is `BankAuthExpiredError` in `packages/banking/src/server/provider-fetch.ts`; any other error, or no account read, is `error`                                                                    |
| `DecideReconnect`, `DecideError`, `StatusWrite` | `finance.service.ts`, `runSync`'s `catch` (`needsReconnect(err)`; `judged` is `ConnectionNeedsReconnectError.judged`, else the token's `storedAs`, else the lease's `storedAccess`) and `finally`: `BankConnectionSync.recordStatus` (`WHERE sync_started_at = lease`, plus the status CAS for `needs_reconnect` and `error`) |
| `LeaseLapses`                                   | a sync slower than `SYNC_LEASE_MS` in `bank-connection-sync.ts`; `claim` then takes the lease over; not code                                                                                                                                                                                                                  |
| `Reconnect`                                     | `finance.service.ts`, `connectBank`'s token transaction: the `ON CONFLICT` upsert of the same row, the new `accessToken`, `status: "connected"`                                                                                                                                                                               |
| `BankRevokes`                                   | the bank withdrawing consent; not code                                                                                                                                                                                                                                                                                        |

Check whether the verification needs another look with `git log --oneline "$sync"..HEAD -- apps/backend/src/modules/banking/bank-connection-sync.ts apps/backend/src/modules/finance/finance.service.ts packages/banking/src/server/provider-fetch.ts packages/banking/src/server/orchestrator.ts`. Move the sync commit forward only after you have read those changes and confirmed that the model still describes the code at the new commit, even if the check passes.

## Bounds and assumptions

- One connection, two `runSync` calls, one reconnect, one revocation by the bank. Only the starting token can be expiring, and it starts expiring or not, on the old or the active key version (all four are checked). A newly issued token stays fresh for a run.
- A token generation stands for one access/refresh pair. The code writes both columns in one statement, so this loses nothing. Two ciphertexts are equal when generation and key version match, which is what the CAS compares.
- The bank rotates refresh tokens: using one spends it. Rotation leaves the earlier access token working; revocation stops every token.
- A lease can lapse under a running sync (`current-lapse`, at most once per sync), at any step. The provider calls have timeouts (`PROVIDER_TIMEOUT_MS`, the 25 s `SYNC_DEADLINE_MS`) well inside the 120 s `SYNC_LEASE_MS`, but the database calls have none, and a process can stall. `current.cfg` keeps every sync inside its lease, so it can check the full promise.
- The in-process refresh coalescing is not modelled. In one process it joins a second sync's refresh to the first's until the first's CAS ends, so two refreshes of one connection overlap only across two backend instances (finding L2).
- Provider errors other than AUTH_EXPIRED (a timeout, an outage, no account read) are one step each: `FetchFails` about the token the sync used; `EarlyFails` (a failure before the row is read, such as `findOneOrFail`) and `RefreshFails` about the token stored at `claim`. A refresh that fails is modelled as failing before the bank acts. One that times out after the bank rotated the refresh token loses the new grant; that is not modelled.
- Not covered: `writeAccounts` and the `FOR SHARE` / `FOR UPDATE` handshake with `deleteConnectionData`, decrypt failures, a crash between steps, a failed status write (it is logged and the status is left as it was), and the reconnect's own sync getting 409 (it is one of the two syncs, but its 409 to the user is not a rule here).

## Findings

**B1 (fixed): an old sync's AUTH_EXPIRED marked a just-reconnected connection `needs_reconnect`.** `broken-status-no-cas.cfg` keeps the shortest path:

1. A sync takes the lease (`claim`) and reads the stored token (`resolveActiveAccessToken`); it is not expiring.
2. The bank withdraws consent.
3. `provider.fetchAccounts` is refused (401, AUTH_EXPIRED), so `runSync` decides `needs_reconnect`.
4. The user reconnects: `connectBank`'s transaction stores a fresh token and sets `status` to `connected`. Its own `runSync` gets 409, because the old sync still holds the lease.
5. The old sync's `finally` wrote `needs_reconnect` over the fresh connection.

The same happened on the refresh path when the reconnect committed after the recovery's second `findOne`. No data was lost and it was not a privacy or security finding. The fix: the `needs_reconnect` write is a compare-and-swap on the stored access token ciphertexts the verdict was about (now `recordStatus`); on a miss nothing is written and the old request answers "try again". `bank-connection-sync.integration.spec.ts`, "a stale sync and a reconnect (B1)", reproduces both paths against real Postgres.

**B2 (fixed): an old sync's other failure marked a just-reconnected connection `error`.** `broken-error-no-cas.cfg` keeps the shortest path:

1. A sync takes the lease (`claim`) and reads the stored token; it is expiring.
2. `provider.refreshToken` times out, so `runSync` decides `error`.
3. The user reconnects: `connectBank` stores a fresh token and sets `status` to `connected`. Its own `runSync` gets 409.
4. The old sync's `finally` wrote `error` over the fresh connection.

A `fetchAccounts` timeout after the reconnect does the same. The fix: the `error` write uses the same compare-and-swap (`recordStatus`), judged on the token the sync used or, before it read one, the token `claim` returned. "a stale sync and a reconnect (B1)" in the integration spec reproduces both paths.

**L1 (fixed): a sync that outlived its lease replaced a newer sync's status.** `broken-status-no-lease.cfg` keeps the shortest path:

1. A sync takes the lease (`claim`), reads the stored token and `provider.fetchAccounts` succeeds.
2. It stalls past `SYNC_LEASE_MS` before its status write (for example `writeAccounts` waiting on a lock).
3. A second sync takes the lapsed lease, fails (for example a timeout) and writes `error`.
4. The old sync's `finally` wrote `connected` over that `error`.

The other way round is the same: an old sync's timeout wrote `error` over a newer sync's `connected`, since both judged the same token. With a revocation in between, a stale `connected` hid a newer `needs_reconnect`. Each healed on the next sync. The fix: every status write is `WHERE sync_started_at = lease` (`recordStatus`), the check `release` already makes, so only the sync whose lease is current records a status; a miss writes nothing and answers "try again". A lapsed lease nobody took over still matches. "a sync that outlived its lease (L1)" in the integration spec reproduces both directions against real Postgres.

**L2 (accepted): two backend instances refreshing at once after a lapse.** `known-lapse-refresh-overlap.cfg` keeps the shortest path: sync A's refresh succeeds (the bank rotates the refresh token), then A stalls past its lease before its CAS; sync B, on another instance, takes the lease, refreshes with the now-spent refresh token, gets AUTH_EXPIRED, rereads an unchanged row and writes `needs_reconnect`; A's CAS then stores the new token, and the lease check skips A's `connected`. The connection shows `needs_reconnect` with a working token until the next sync, which reads the new token and writes `connected`, or a reconnect. Accepted because it needs two instances (the backend runs one, so only a deploy overlap), a 120 s stall in the one statement between the refresh reply and the CAS, and it heals on the next sync. Closing it would mean a lease check on the refresh CAS and a new recovery path; revisit if the backend runs more than one instance.

---

name: verify-bank-sync
description: Model-check bank sync against concurrent syncs, reconnects and bank revocation with TLA+. Use when a change touches BankConnectionSync.claim, release or resolveActiveAccessToken (the token refresh, its compare-and-swap, lazy re-encryption, the AUTH_EXPIRED recovery), FinanceService.runSync or its status write, or connectBank's token transaction, or when asked whether a sync can lose a fresh token or wrongly mark a connection needs_reconnect.
---

# Verify bank sync

A TLA+ model of one bank connection's sync (BE-12, BE-18), checked with TLC over every order of steps. It tells you whether a change to the sync lease, the token refresh and its compare-and-swap (CAS), lazy re-encryption (M11), the AUTH_EXPIRED recovery or the status the sync records can run two syncs at once, put back an older token, or mark a working connection `needs_reconnect`.

- **Property:** a connection shows `needs_reconnect` only when its stored token no longer works at the bank, at most one sync runs at a time, and no write replaces the stored tokens with an older grant's.
- **Harm if it breaks:** a user who has just reconnected is told to reconnect again, two syncs spend the same single-use refresh token, or a fresh token is overwritten by one the bank may already have withdrawn.
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

Then run the check from the repo root. It takes about 5 seconds, and `check.sh` pins the same versions and checksum:

```bash
sh .claude/skills/verify-bank-sync/check.sh
```

Each line says `ok` or `FAIL`. The script exits 0 only when every config gives its expected result:

| Config (`model/`)                | What it checks                                                                                                      | Expected                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `current.cfg`                    | The code as it is: `OneSyncAtATime`, `StoredTokensNeverGoBack`, `RefreshRejectionHonoursReplacement`, `TypeOK`      | pass                                           |
| `promise.cfg`                    | The code against the full promise, `NeedsReconnectOnlyWhenTokenDead`                                                | `NeedsReconnectOnlyWhenTokenDead` violated: B1 |
| `broken-claim-no-lease.cfg`      | `claim` without the `sync_started_at` check                                                                         | `OneSyncAtATime` violated                      |
| `broken-refresh-no-cas.cfg`      | The refresh write without `WHERE access_token = prev ...`                                                           | `StoredTokensNeverGoBack` violated             |
| `broken-reencrypt-no-cas.cfg`    | Lazy re-encryption without its `WHERE access_token = ...`                                                           | `StoredTokensNeverGoBack` violated             |
| `broken-no-recovery.cfg`         | AUTH_EXPIRED from the refresh rethrown without rereading the row                                                    | `RefreshRejectionHonoursReplacement` violated  |
| `whatif-status-checks-token.cfg` | Not the code: one way to close B1, the `needs_reconnect` write also requires the token it judged to still be stored | pass                                           |

The `broken-` configs show that the rules can fail. If any of them passes, the model can no longer see the bug it guards against, so fix the model. Pass config names to run only those, for example `check.sh current promise`.

Read every result, pass or fail, with the pstack `/statechart` skill on `model/BankSync.tla` and the config. For a violation it gives the shortest path in plain words. Tell that path in this repo's words (`runSync`, `claim`, the CAS, `connectBank`). For a pass it draws how the syncs, the reconnect and the bank move between states. Use one sync (`Syncs = {s1}`) in a scratch copy of the config so the chart stays readable.

## Real bug or modelling error?

When a result changes, open the actions in the counterexample and compare each one with the code it names in its comment in `BankSync.tla`.

- **Real bug:** every step in the path is something the code allows, and in the code each indivisible step is one SQL statement, one provider call or one transaction. Report it with the path. Do not change product code or weaken a rule unless the owner asks.
- **Modelling error:** a step the code cannot take, or two statements merged into one step. Example met while building this: the bank revoking the reconnect's fresh token too, after which `needs_reconnect` is correct; the rule was narrowed to the spent refresh token, not weakened. Fix the model so it matches the code, then run again.

## Intended changes

If your change alters behaviour the model describes, update the matching action and its code comment in the same PR, run the check again, and update the table above if an expected result changes. Examples: a status write made conditional (then compare with `whatif-status-checks-token.cfg` and move `NeedsReconnectOnlyWhenTokenDead` into `current.cfg`), a lease that can lapse under a running sync, a second caller of `activeAccessToken`, or a reconnect that also writes `sync_started_at`.

## Coverage record

Sync commit: `769061d859b301c5858e2a0c07871f62ec7ae196`. At that commit, the model was confirmed to describe this code:

| Model action                     | Code                                                                                                                                                                                                      |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Claim`, `Release`               | `apps/backend/src/modules/banking/bank-connection-sync.ts`, `BankConnectionSync.claim` and `release` (`sync_started_at`)                                                                                  |
| `ReadRow`                        | the same file, `resolveActiveAccessToken`, the first `repo.findOne` and the `isTokenExpiring` / `tokenNeedsReencrypt` branch                                                                              |
| `Refresh`                        | the same file, `provider.refreshToken(... spentRefresh)`; the bank side (rotation, AUTH_EXPIRED on a spent or revoked token) is the provider                                                              |
| `Recover`                        | the same file, the `catch` after `refreshToken`: `AUTH_EXPIRED`, a second `repo.findOne`, `decryptStoredAccessToken(latest)` or rethrow                                                                   |
| `CasWrite`, `CasMiss`            | the same file, the `for (attempt < 3)` loop: the conditional `UPDATE ... RETURNING "id"`, then `repo.findOne`, not expiring, same refresh token retry, or `ConnectionNeedsReconnectError`                 |
| `Reencrypt`                      | the same file, the lazy re-encryption `UPDATE` (M11)                                                                                                                                                      |
| `Fetch`                          | `apps/backend/src/modules/finance/finance.service.ts`, `runSync`: `provider.fetchAccounts` and `sync.writeAccounts`; 401/403 is `BankAuthExpiredError` in `packages/banking/src/server/provider-fetch.ts` |
| `DecideReconnect`, `StatusWrite` | `finance.service.ts`, `runSync`'s `catch` (`needsReconnect(err)`) and `finally`: `bankConnectionRepository.update({ id, userId }, { status })`                                                            |
| `Reconnect`                      | `finance.service.ts`, `connectBank`'s token transaction: the `ON CONFLICT` upsert of the same row, the new `accessToken`, `status: "connected"`                                                           |
| `BankRevokes`                    | the bank withdrawing consent; not code                                                                                                                                                                    |

Check whether the verification needs another look with `git log --oneline 769061d859b301c5858e2a0c07871f62ec7ae196..HEAD -- apps/backend/src/modules/banking/bank-connection-sync.ts apps/backend/src/modules/finance/finance.service.ts packages/banking/src/server/provider-fetch.ts packages/banking/src/server/orchestrator.ts`. Move the sync commit forward only after you have read those changes and confirmed that the model still describes the code at the new commit, even if the check passes.

## Bounds and assumptions

- One connection, two `runSync` calls, one reconnect, one revocation by the bank. Only the starting token can be expiring, and it starts expiring or not, on the old or the active key version (all four are checked). A newly issued token stays fresh for a run.
- A token generation stands for one access/refresh pair. The code writes both columns in one statement, so this loses nothing. Two ciphertexts are equal when generation and key version match, which is what the CAS compares.
- The bank rotates refresh tokens: using one spends it. Rotation leaves the earlier access token working; revocation stops every token.
- No lease lapses under a running sync: every provider call has a timeout (`PROVIDER_TIMEOUT_MS`, the 25 s `SYNC_DEADLINE_MS`) and `SYNC_LEASE_MS` is 120 s. A sync that outlives its lease is not modelled. The in-process refresh coalescing is not modelled either: under the lease, two refreshes of one connection never overlap.
- Not covered: `writeAccounts` and the `FOR SHARE` / `FOR UPDATE` handshake with `deleteConnectionData`, decrypt failures, provider errors other than AUTH_EXPIRED (they record `error`), a crash between steps, and the reconnect's own sync getting 409 (it is one of the two syncs, but its 409 to the user is not a rule here).

## Findings

**B1 (open): an old sync's AUTH_EXPIRED marks a just-reconnected connection `needs_reconnect`.** `promise.cfg` keeps the shortest path:

1. A sync takes the lease (`claim`) and reads the stored token (`resolveActiveAccessToken`); it is not expiring.
2. The bank withdraws consent.
3. `provider.fetchAccounts` is refused (401, AUTH_EXPIRED), so `runSync` decides `needs_reconnect`.
4. The user reconnects: `connectBank`'s transaction stores a fresh token and sets `status` to `connected`. Its own `runSync` gets 409, because the old sync still holds the lease.
5. The old sync's `finally` runs `update({ id, userId }, { status: "needs_reconnect" })`. The fresh token is stored, but the connection says it needs reconnecting.

The same happens on the refresh path when the reconnect commits after the recovery's second `findOne`. The recovery (`RefreshRejectionHonoursReplacement`) covers only a reconnect that lands before the refresh is refused; the fetch path has no recovery. Nothing is lost: the next manual sync uses the fresh token and records `connected`. It is a wrong status and a confusing 409 for the user, not a privacy or security finding. `whatif-status-checks-token.cfg` shows one closing design (the `needs_reconnect` write also requires `access_token` to still be the ciphertext the sync judged); not decided.

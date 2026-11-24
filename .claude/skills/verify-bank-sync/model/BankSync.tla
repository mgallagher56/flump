------------------------------- MODULE BankSync -------------------------------
\* Bank sync (BE-12, BE-18) of one connection: the sync lease, the token refresh
\* and its compare-and-swap, lazy re-encryption (M11), the AUTH_EXPIRED
\* recovery, and the status the sync records, racing with a reconnect that
\* stores a fresh token and with the bank revoking consent. Every action names
\* the code it stands for; paths are from the repo root.
\*
\*   Sync       apps/backend/src/modules/finance/finance.service.ts
\*              FinanceService.runSync (claim, token, fetch, status, release)
\*   Lease      apps/backend/src/modules/banking/bank-connection-sync.ts
\*              BankConnectionSync.claim and release (sync_started_at)
\*   Token      the same file, resolveActiveAccessToken: refresh, the CAS loop,
\*              the AUTH_EXPIRED recovery, lazy re-encryption
\*   Reconnect  finance.service.ts connectBank, the token transaction (upsert of
\*              the same row, new access token, status 'connected')
\*
\* Abstraction: a token generation `gen` stands for one access/refresh pair the
\* bank issued; the code always writes both columns together, so the stored row
\* is one record <<gen, kv>>, where kv is the ciphertext's key version. Two
\* records are the same ciphertext exactly when gen and kv match. Gens are
\* issued in increasing order. Only gen 0 (the token stored at the start) can be
\* expiring; every newly issued token is fresh for the length of a run.
\* writeAccounts, the disconnect, decrypt failures, other provider errors and
\* the in-process refresh coalescing are out of scope (the lease already keeps
\* two syncs of one connection apart).

EXTENDS Naturals, FiniteSets

CONSTANTS
    Syncs,              \* runSync calls for this connection (model values)
    ClaimChecksLease,   \* claim's WHERE sync_started_at IS NULL OR lapsed (code: TRUE)
    RefreshCAS,         \* the refresh write's WHERE access_token = prev ... (code: TRUE)
    ReencryptCAS,       \* the re-encryption write's WHERE access_token = ... (code: TRUE)
    RefreshRecovery,    \* AUTH_EXPIRED from refresh rereads the row (code: TRUE)
    StatusChecksToken   \* needs_reconnect only if the judged token is still stored (code: TRUE)

MaxAttempts == 3   \* the CAS loop's `attempt < 3`
Gens == 0..(Cardinality(Syncs) + 1)
Rec == [gen : Gens, kv : {"old", "new"}]
None == [gen |-> 0, kv |-> "none"]   \* a sync's local before it reads the row

VARIABLES
    stored,       \* bank_connections.access_token / refresh_token, as <<gen, kv>>
    expiringGens, \* gens whose expires_at is within TOKEN_REFRESH_MARGIN_MS
    status,       \* bank_connections.status
    holders,      \* syncs whose lease is current (sync_started_at = their lease)
    live,         \* at the bank: gens whose access token is accepted
    refreshable,  \* at the bank: gens whose refresh token is unspent
    nextGen,      \* the next gen the bank issues
    highWater,    \* history: the highest gen ever stored
    revoked,      \* the bank has revoked consent (once)
    reconnected,  \* connectBank's token transaction has committed (once)
    pc,           \* per sync: where runSync is
    read,         \* per sync: the row resolveActiveAccessToken read (conn)
    prev,         \* per sync: the CAS's expected ciphertext (prevAccessCipher)
    got,          \* per sync: the gen the refresh returned
    attempts,     \* per sync: CAS attempts made
    access,       \* per sync: the gen of the access token it uses
    judged,       \* per sync: the gen whose rejection made it decide needs_reconnect
                  \* (code: ConnectionNeedsReconnectError.judged or the token's storedAs)
    outcome,      \* per sync: the status runSync will write
    replacedFirst \* per sync: a fresh token was stored before its refresh was rejected

vars == <<stored, expiringGens, status, holders, live, refreshable, nextGen,
          highWater, revoked, reconnected, pc, read, prev, got, attempts,
          access, judged, outcome, replacedFirst>>
syncVars == <<pc, read, prev, got, attempts, access, judged, outcome, replacedFirst>>
bankVars == <<live, refreshable, nextGen>>

PCs == {"start", "claimed", "read", "refreshing", "recover", "cas", "casMiss",
        "reencrypt", "fetch", "status", "release", "done", "busy"}

TypeOK ==
    /\ stored \in Rec
    /\ expiringGens \subseteq {0}
    /\ status \in {"connected", "error", "needs_reconnect"}
    /\ holders \subseteq Syncs
    /\ live \subseteq Gens /\ refreshable \subseteq Gens
    /\ nextGen \in Gens \cup {Cardinality(Syncs) + 2}
    /\ highWater \in Gens
    /\ revoked \in BOOLEAN /\ reconnected \in BOOLEAN
    /\ pc \in [Syncs -> PCs]
    /\ read \in [Syncs -> Rec \cup {None}]
    /\ prev \in [Syncs -> Rec \cup {None}]
    /\ got \in [Syncs -> Gens]
    /\ attempts \in [Syncs -> 0..MaxAttempts]
    /\ access \in [Syncs -> Gens]
    /\ judged \in [Syncs -> Gens]
    /\ outcome \in [Syncs -> {"none", "connected", "needs_reconnect"}]
    /\ replacedFirst \in [Syncs -> BOOLEAN]

\* The starting token may be expiring or not, and may be on an old key version.
Init ==
    /\ \E e \in {{}, {0}}, k \in {"old", "new"} :
         expiringGens = e /\ stored = [gen |-> 0, kv |-> k]
    /\ status = "connected"
    /\ holders = {}
    /\ live = {0} /\ refreshable = {0} /\ nextGen = 1
    /\ highWater = 0
    /\ revoked = FALSE /\ reconnected = FALSE
    /\ pc = [s \in Syncs |-> "start"]
    /\ read = [s \in Syncs |-> None]
    /\ prev = [s \in Syncs |-> None]
    /\ got = [s \in Syncs |-> 0]
    /\ attempts = [s \in Syncs |-> 0]
    /\ access = [s \in Syncs |-> 0]
    /\ judged = [s \in Syncs |-> 0]
    /\ outcome = [s \in Syncs |-> "none"]
    /\ replacedFirst = [s \in Syncs |-> FALSE]

Expiring(r) == r.gen \in expiringGens
Max(a, b) == IF a > b THEN a ELSE b

\* A write of new token columns.
Store(r) ==
    /\ stored' = r
    /\ highWater' = Max(highWater, r.gen)

Goto(s, p) == pc' = [pc EXCEPT ![s] = p]

\* catch: needsReconnect(err) is true, the status to record is needs_reconnect.
DecideReconnect(s, g) ==
    /\ outcome' = [outcome EXCEPT ![s] = "needs_reconnect"]
    /\ judged' = [judged EXCEPT ![s] = g]
    /\ Goto(s, "status")

-----------------------------------------------------------------------------
\* runSync

\* claim(): UPDATE ... SET sync_started_at = now() WHERE sync_started_at IS NULL
\* (or lapsed). No row back means another sync holds it: 409, nothing else runs.
\* Syncs are assumed to finish inside SYNC_LEASE_MS (every provider call has a
\* timeout), so a lease never lapses under a running sync.
Claim(s) ==
    /\ pc[s] = "start"
    /\ IF ~ClaimChecksLease \/ holders = {}
         THEN holders' = holders \cup {s} /\ Goto(s, "claimed")
         ELSE UNCHANGED holders /\ Goto(s, "busy")
    /\ UNCHANGED <<stored, expiringGens, status, bankVars, highWater, revoked,
                   reconnected, read, prev, got, attempts, access, judged,
                   outcome, replacedFirst>>

\* resolveActiveAccessToken: repo.findOne, outside any transaction.
ReadRow(s) ==
    /\ pc[s] = "claimed"
    /\ read' = [read EXCEPT ![s] = stored]
    /\ prev' = [prev EXCEPT ![s] = stored]
    /\ Goto(s, IF Expiring(stored) THEN "refreshing"
               ELSE IF stored.kv = "old" THEN "reencrypt" ELSE "fetch")
    /\ access' = [access EXCEPT ![s] = stored.gen]
    /\ UNCHANGED <<stored, expiringGens, status, holders, bankVars, highWater,
                   revoked, reconnected, got, attempts, judged, outcome, replacedFirst>>

\* provider.refreshToken(spentRefresh): one call; the bank rotates the refresh
\* token on use. A spent or revoked refresh token is rejected: AUTH_EXPIRED.
Refresh(s) ==
    /\ pc[s] = "refreshing"
    /\ LET g == read[s].gen IN
       IF g \in refreshable
         THEN /\ refreshable' = (refreshable \ {g}) \cup {nextGen}
              /\ live' = live \cup {nextGen}
              /\ nextGen' = nextGen + 1
              /\ got' = [got EXCEPT ![s] = nextGen]
              /\ Goto(s, "cas")
              /\ UNCHANGED replacedFirst
         ELSE /\ replacedFirst' = [replacedFirst EXCEPT ![s] =
                   stored /= read[s] /\ ~Expiring(stored)]
              /\ Goto(s, "recover")
              /\ UNCHANGED <<bankVars, got>>
    /\ UNCHANGED <<stored, expiringGens, status, holders, highWater, revoked,
                   reconnected, read, prev, attempts, access, judged, outcome>>

\* catch (AUTH_EXPIRED): repo.findOne again; if the tokens changed and are not
\* expiring, use the stored access token, else rethrow.
Recover(s) ==
    /\ pc[s] = "recover"
    /\ IF RefreshRecovery /\ stored /= read[s] /\ ~Expiring(stored)
         THEN /\ access' = [access EXCEPT ![s] = stored.gen]
              /\ Goto(s, "fetch")
              /\ UNCHANGED <<outcome, judged>>
         ELSE /\ DecideReconnect(s, read[s].gen)
              /\ UNCHANGED access
    /\ UNCHANGED <<stored, expiringGens, status, holders, bankVars, highWater,
                   revoked, reconnected, read, prev, got, attempts, replacedFirst>>

\* The CAS: UPDATE ... SET the new tokens WHERE access_token = prevAccessCipher
\* AND refresh_token IS NOT DISTINCT FROM prevRefreshCipher RETURNING id.
CasWrite(s) ==
    /\ pc[s] = "cas"
    /\ attempts' = [attempts EXCEPT ![s] = @ + 1]
    /\ IF ~RefreshCAS \/ stored = prev[s]
         THEN /\ Store([gen |-> got[s], kv |-> "new"])
              /\ access' = [access EXCEPT ![s] = got[s]]
              /\ Goto(s, "fetch")
         ELSE /\ UNCHANGED <<stored, highWater, access>>
              /\ Goto(s, "casMiss")
    /\ UNCHANGED <<expiringGens, status, holders, bankVars, revoked, reconnected,
                   read, prev, got, judged, outcome, replacedFirst>>

\* No row updated: findOne latest. Not expiring: use it. Still expiring with the
\* same refresh token (re-encrypted): retry the CAS against it. Otherwise, or
\* after three attempts: ConnectionNeedsReconnectError.
CasMiss(s) ==
    /\ pc[s] = "casMiss"
    /\ IF ~Expiring(stored)
         THEN /\ access' = [access EXCEPT ![s] = stored.gen]
              /\ Goto(s, "fetch")
              /\ UNCHANGED <<prev, outcome, judged>>
         ELSE IF stored.gen = read[s].gen /\ attempts[s] < MaxAttempts
           THEN /\ prev' = [prev EXCEPT ![s] = stored]
                /\ Goto(s, "cas")
                /\ UNCHANGED <<access, outcome, judged>>
           ELSE /\ DecideReconnect(s, stored.gen)
                /\ UNCHANGED <<access, prev>>
    /\ UNCHANGED <<stored, expiringGens, status, holders, bankVars, highWater,
                   revoked, reconnected, read, got, attempts, replacedFirst>>

\* Lazy re-encryption (M11): UPDATE ... SET the same tokens under the active key
\* WHERE access_token = conn.accessToken AND refresh_token ... ; it returns the
\* access token whether or not a row was updated.
Reencrypt(s) ==
    /\ pc[s] = "reencrypt"
    /\ IF ~ReencryptCAS \/ stored = read[s]
         THEN Store([gen |-> read[s].gen, kv |-> "new"])
         ELSE UNCHANGED <<stored, highWater>>
    /\ Goto(s, "fetch")
    /\ UNCHANGED <<expiringGens, status, holders, bankVars, revoked, reconnected,
                   read, prev, got, attempts, access, judged, outcome, replacedFirst>>

\* provider.fetchAccounts(accessToken) and writeAccounts. A rejected access
\* token is AUTH_EXPIRED (401/403 in providerFetch), with no recovery.
Fetch(s) ==
    /\ pc[s] = "fetch"
    /\ IF access[s] \in live
         THEN /\ outcome' = [outcome EXCEPT ![s] = "connected"]
              /\ Goto(s, "status")
              /\ UNCHANGED judged
         ELSE DecideReconnect(s, access[s])
    /\ UNCHANGED <<stored, expiringGens, status, holders, bankVars, highWater,
                   revoked, reconnected, read, prev, got, attempts, access, replacedFirst>>

\* finally: connected or error is bankConnectionRepository.update({ id, userId },
\* { status }); needs_reconnect is BankConnectionSync.recordNeedsReconnect, the
\* status CAS (B1): UPDATE ... WHERE access_token = ANY(judged ciphertexts). On
\* a miss nothing is written (runSync answers "failed", not "needs_reconnect").
\* The code compares ciphertexts, the model gens: under the lease the only
\* other ciphertext of the judged gen is this sync's own re-encryption, which
\* the code also passes (storedAs), and every other write stores a new gen.
StatusWrite(s) ==
    /\ pc[s] = "status"
    /\ IF outcome[s] = "needs_reconnect" /\ StatusChecksToken /\ stored.gen /= judged[s]
         THEN UNCHANGED status
         ELSE status' = outcome[s]
    /\ Goto(s, "release")
    /\ UNCHANGED <<stored, expiringGens, holders, bankVars, highWater, revoked,
                   reconnected, read, prev, got, attempts, access, judged,
                   outcome, replacedFirst>>

\* release(): UPDATE ... SET sync_started_at = NULL WHERE sync_started_at = lease.
Release(s) ==
    /\ pc[s] = "release"
    /\ holders' = holders \ {s}
    /\ Goto(s, "done")
    /\ UNCHANGED <<stored, expiringGens, status, bankVars, highWater, revoked,
                   reconnected, read, prev, got, attempts, access, judged,
                   outcome, replacedFirst>>

-----------------------------------------------------------------------------
\* The world

\* The bank revokes consent (expired or withdrawn): every token stops working.
BankRevokes ==
    /\ ~revoked
    /\ revoked' = TRUE /\ live' = {} /\ refreshable' = {}
    /\ UNCHANGED <<stored, expiringGens, status, holders, nextGen, highWater,
                   reconnected, syncVars>>

\* connectBank's token transaction: the upsert keeps the row (and its lease) and
\* stores a new, fresh token with status 'connected'. Its own runSync is one of
\* Syncs, which can start at any time.
Reconnect ==
    /\ ~reconnected
    /\ reconnected' = TRUE
    /\ live' = live \cup {nextGen} /\ refreshable' = refreshable \cup {nextGen}
    /\ nextGen' = nextGen + 1
    /\ Store([gen |-> nextGen, kv |-> "new"])
    /\ status' = "connected"
    /\ UNCHANGED <<expiringGens, holders, revoked, syncVars>>

Finished ==
    /\ \A s \in Syncs : pc[s] \in {"done", "busy"}
    /\ UNCHANGED vars

Next ==
    \/ \E s \in Syncs :
         \/ Claim(s) \/ ReadRow(s) \/ Refresh(s) \/ Recover(s) \/ CasWrite(s)
         \/ CasMiss(s) \/ Reencrypt(s) \/ Fetch(s) \/ StatusWrite(s) \/ Release(s)
    \/ BankRevokes \/ Reconnect
    \/ Finished

Spec == Init /\ [][Next]_vars

-----------------------------------------------------------------------------
\* Properties

\* The lease: at most one sync of a connection runs at a time.
OneSyncAtATime == Cardinality(holders) <= 1

\* The token CAS: a write never replaces stored tokens with an older grant's
\* (a reconnect's or a refresh's newer token is never overwritten).
StoredTokensNeverGoBack == stored.gen = highWater

\* The AUTH_EXPIRED recovery: a sync whose refresh is rejected after a fresh
\* token was already stored never decides needs_reconnect on that spent refresh
\* token: it moves on to the stored token (which can still fail on its own).
RefreshRejectionHonoursReplacement ==
    \A s \in Syncs :
        replacedFirst[s] =>
            ~(outcome[s] = "needs_reconnect" /\ judged[s] = read[s].gen)

\* The promise: a connection shows needs_reconnect only when its stored token
\* really no longer works at the bank.
NeedsReconnectOnlyWhenTokenDead ==
    status = "needs_reconnect" => stored.gen \notin live

=============================================================================

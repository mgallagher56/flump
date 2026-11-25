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
\* Provider errors other than AUTH_EXPIRED (a timeout, an outage, no account
\* readable) are a failed fetch or refresh that records `error`.
\* A lease can lapse under a running sync (LeaseCanLapse): a sync slower than
\* SYNC_LEASE_MS keeps running while a second sync claims. writeAccounts, the
\* disconnect, decrypt failures and the in-process refresh coalescing are out
\* of scope.

EXTENDS Naturals, FiniteSets

CONSTANTS
    Syncs,              \* runSync calls for this connection (model values)
    ClaimChecksLease,   \* claim's WHERE sync_started_at IS NULL OR lapsed (code: TRUE)
    RefreshCAS,         \* the refresh write's WHERE access_token = prev ... (code: TRUE)
    ReencryptCAS,       \* the re-encryption write's WHERE access_token = ... (code: TRUE)
    RefreshRecovery,    \* AUTH_EXPIRED from refresh rereads the row (code: TRUE)
    StatusChecksToken,  \* needs_reconnect only if the judged token is still stored (code: TRUE)
    ErrorChecksToken,   \* error only if the judged token is still stored (code: TRUE)
    LeaseCanLapse,      \* the world: a sync can outlive SYNC_LEASE_MS
    StatusChecksLease   \* every status write only while the sync's lease is current (code: TRUE)

MaxAttempts == 3   \* the CAS loop's `attempt < 3`
Clock == 0..(Cardinality(Syncs) + 1)   \* one observation per sync, one reconnect
Gens == 0..(Cardinality(Syncs) + 1)
Rec == [gen : Gens, kv : {"old", "new"}]
None == [gen |-> 0, kv |-> "none"]   \* a sync's local before it reads the row

VARIABLES
    stored,       \* bank_connections.access_token / refresh_token, as <<gen, kv>>
    expiringGens, \* gens whose expires_at is within TOKEN_REFRESH_MARGIN_MS
    status,       \* bank_connections.status
    statusAbout,  \* history: the gen the last status write was about
    reconGen,     \* history: the gen the reconnect stored (0 before it)
    holders,      \* syncs that took a lease and have not released it (running)
    current,      \* the sync whose lease sync_started_at holds ({} or one sync)
    lapsed,       \* running syncs whose lease is older than SYNC_LEASE_MS
    clock,        \* history: observations made so far (sync verdicts, the reconnect)
    statusSeen,   \* history: the observation the shown status comes from
    wentBack,     \* history: a write replaced the status with an older observation's
    live,         \* at the bank: gens whose access token is accepted
    refreshable,  \* at the bank: gens whose refresh token is unspent
    nextGen,      \* the next gen the bank issues
    highWater,    \* history: the highest gen ever stored
    revoked,      \* the bank has revoked consent (once)
    reconnected,  \* connectBank's token transaction has committed (once)
    pc,           \* per sync: where runSync is
    claimed,      \* per sync: the gen stored when its lease was taken (SyncLease.storedAccess)
    read,         \* per sync: the row resolveActiveAccessToken read (conn)
    prev,         \* per sync: the CAS's expected ciphertext (prevAccessCipher)
    got,          \* per sync: the gen the refresh returned
    attempts,     \* per sync: CAS attempts made
    access,       \* per sync: the gen of the access token it uses
    judged,       \* per sync: the gen whose rejection made it decide needs_reconnect
                  \* (code: ConnectionNeedsReconnectError.judged or the token's storedAs)
    outcome,      \* per sync: the status runSync will write
    replacedFirst,\* per sync: a fresh token was stored before its refresh was rejected
    seen          \* per sync: the clock when it reached its verdict

leaseVars == <<current, lapsed>>
histVars == <<clock, statusSeen, wentBack>>
vars == <<stored, expiringGens, status, statusAbout, reconGen, holders, live,
          refreshable, nextGen, highWater, revoked, reconnected, pc, claimed,
          read, prev, got, attempts, access, judged, outcome, replacedFirst,
          leaseVars, histVars, seen>>
syncVars == <<pc, claimed, read, prev, got, attempts, access, judged, outcome,
              replacedFirst, seen>>
bankVars == <<live, refreshable, nextGen>>

PCs == {"start", "claimed", "read", "refreshing", "recover", "cas", "casMiss",
        "reencrypt", "fetch", "status", "release", "done", "busy"}

TypeOK ==
    /\ stored \in Rec
    /\ expiringGens \subseteq {0}
    /\ status \in {"connected", "error", "needs_reconnect"}
    /\ statusAbout \in Gens /\ reconGen \in Gens
    /\ holders \subseteq Syncs
    /\ current \subseteq Syncs /\ Cardinality(current) <= 1
    /\ lapsed \subseteq holders
    /\ clock \in Clock /\ statusSeen \in Clock /\ wentBack \in BOOLEAN
    /\ seen \in [Syncs -> Clock]
    /\ live \subseteq Gens /\ refreshable \subseteq Gens
    /\ nextGen \in Gens \cup {Cardinality(Syncs) + 2}
    /\ highWater \in Gens
    /\ revoked \in BOOLEAN /\ reconnected \in BOOLEAN
    /\ pc \in [Syncs -> PCs]
    /\ claimed \in [Syncs -> Gens]
    /\ read \in [Syncs -> Rec \cup {None}]
    /\ prev \in [Syncs -> Rec \cup {None}]
    /\ got \in [Syncs -> Gens]
    /\ attempts \in [Syncs -> 0..MaxAttempts]
    /\ access \in [Syncs -> Gens]
    /\ judged \in [Syncs -> Gens]
    /\ outcome \in [Syncs -> {"none", "connected", "error", "needs_reconnect"}]
    /\ replacedFirst \in [Syncs -> BOOLEAN]

\* The starting token may be expiring or not, and may be on an old key version.
Init ==
    /\ \E e \in {{}, {0}}, k \in {"old", "new"} :
         expiringGens = e /\ stored = [gen |-> 0, kv |-> k]
    /\ status = "connected"
    /\ statusAbout = 0 /\ reconGen = 0
    /\ holders = {} /\ current = {} /\ lapsed = {}
    /\ clock = 0 /\ statusSeen = 0 /\ wentBack = FALSE
    /\ seen = [s \in Syncs |-> 0]
    /\ live = {0} /\ refreshable = {0} /\ nextGen = 1
    /\ highWater = 0
    /\ revoked = FALSE /\ reconnected = FALSE
    /\ pc = [s \in Syncs |-> "start"]
    /\ claimed = [s \in Syncs |-> 0]
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

\* A sync reaches its verdict: one observation, stamped with the clock.
Observe(s) ==
    /\ clock' = clock + 1
    /\ seen' = [seen EXCEPT ![s] = clock + 1]

\* catch: needsReconnect(err) is true, the status to record is needs_reconnect.
DecideReconnect(s, g) ==
    /\ outcome' = [outcome EXCEPT ![s] = "needs_reconnect"]
    /\ judged' = [judged EXCEPT ![s] = g]
    /\ Observe(s)
    /\ Goto(s, "status")

\* catch: any other error, the status to record is error. `g` is the token the
\* sync used, or before it read one, the token stored at claim.
DecideError(s, g) ==
    /\ outcome' = [outcome EXCEPT ![s] = "error"]
    /\ judged' = [judged EXCEPT ![s] = g]
    /\ Observe(s)
    /\ Goto(s, "status")

-----------------------------------------------------------------------------
\* runSync

\* claim(): UPDATE ... SET sync_started_at = now() WHERE sync_started_at IS NULL
\* (or lapsed) RETURNING sync_started_at, access_token. No row back means
\* another sync holds it: 409, nothing else runs. A lapsed lease is taken over:
\* sync_started_at now names this sync's lease, while the slow sync runs on.
Claim(s) ==
    /\ pc[s] = "start"
    /\ IF ~ClaimChecksLease \/ holders \subseteq lapsed
         THEN /\ holders' = holders \cup {s}
              /\ current' = {s}
              /\ claimed' = [claimed EXCEPT ![s] = stored.gen]
              /\ Goto(s, "claimed")
         ELSE UNCHANGED <<holders, current, claimed>> /\ Goto(s, "busy")
    /\ UNCHANGED <<stored, expiringGens, status, statusAbout, reconGen, bankVars,
                   highWater, revoked, reconnected, read, prev, got, attempts,
                   access, judged, outcome, replacedFirst, lapsed, histVars, seen>>

\* A running sync outlives SYNC_LEASE_MS (a stalled database call, a paused
\* process): its lease can now be taken over. It keeps running.
LeaseLapses(s) ==
    /\ LeaseCanLapse
    /\ s \in holders \ lapsed
    /\ lapsed' = lapsed \cup {s}
    /\ UNCHANGED <<stored, expiringGens, status, statusAbout, reconGen, holders,
                   current, bankVars, highWater, revoked, reconnected, syncVars,
                   histVars>>

\* resolveActiveAccessToken: repo.findOne, outside any transaction.
ReadRow(s) ==
    /\ pc[s] = "claimed"
    /\ read' = [read EXCEPT ![s] = stored]
    /\ prev' = [prev EXCEPT ![s] = stored]
    /\ Goto(s, IF Expiring(stored) THEN "refreshing"
               ELSE IF stored.kv = "old" THEN "reencrypt" ELSE "fetch")
    /\ access' = [access EXCEPT ![s] = stored.gen]
    /\ UNCHANGED <<stored, expiringGens, status, statusAbout, reconGen, claimed, holders, bankVars, highWater,
                   revoked, reconnected, got, attempts, judged, outcome, replacedFirst,
                   leaseVars, histVars, seen>>

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
    /\ UNCHANGED <<stored, expiringGens, status, statusAbout, reconGen, claimed,
                   holders, highWater, revoked, reconnected, read, prev,
                   attempts, access, judged, outcome, leaseVars, histVars, seen>>

\* runSync fails before resolveActiveAccessToken reads the row (findOneOrFail
\* or the database errors): the status to record is error, about the token
\* stored at claim. A reconnect since claim makes it stale.
EarlyFails(s) ==
    /\ pc[s] = "claimed"
    /\ DecideError(s, claimed[s])
    /\ UNCHANGED <<stored, expiringGens, status, statusAbout, reconGen, claimed,
                   holders, bankVars, highWater, revoked, reconnected, read,
                   prev, got, attempts, access, replacedFirst, leaseVars, statusSeen, wentBack>>

\* provider.refreshToken fails another way (a timeout, an outage) before the
\* bank acts: rethrown, the status to record is error. No token was read into
\* runSync yet, so the verdict is about the token stored at claim.
RefreshFails(s) ==
    /\ pc[s] = "refreshing"
    /\ DecideError(s, claimed[s])
    /\ UNCHANGED <<stored, expiringGens, status, statusAbout, reconGen, claimed,
                   holders, bankVars, highWater, revoked, reconnected, read,
                   prev, got, attempts, access, replacedFirst, leaseVars, statusSeen, wentBack>>

\* catch (AUTH_EXPIRED): repo.findOne again; if the tokens changed and are not
\* expiring, use the stored access token, else rethrow.
Recover(s) ==
    /\ pc[s] = "recover"
    /\ IF RefreshRecovery /\ stored /= read[s] /\ ~Expiring(stored)
         THEN /\ access' = [access EXCEPT ![s] = stored.gen]
              /\ Goto(s, "fetch")
              /\ UNCHANGED <<outcome, judged, clock, seen>>
         ELSE /\ DecideReconnect(s, read[s].gen)
              /\ UNCHANGED access
    /\ UNCHANGED <<stored, expiringGens, status, statusAbout, reconGen, claimed, holders, bankVars, highWater,
                   revoked, reconnected, read, prev, got, attempts, replacedFirst, leaseVars, statusSeen, wentBack>>

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
    /\ UNCHANGED <<expiringGens, status, statusAbout, reconGen, claimed, holders, bankVars, revoked, reconnected,
                   read, prev, got, judged, outcome, replacedFirst, leaseVars, histVars, seen>>

\* No row updated: findOne latest. Not expiring: use it. Still expiring with the
\* same refresh token (re-encrypted): retry the CAS against it. Otherwise, or
\* after three attempts: ConnectionNeedsReconnectError.
CasMiss(s) ==
    /\ pc[s] = "casMiss"
    /\ IF ~Expiring(stored)
         THEN /\ access' = [access EXCEPT ![s] = stored.gen]
              /\ Goto(s, "fetch")
              /\ UNCHANGED <<prev, outcome, judged, clock, seen>>
         ELSE IF stored.gen = read[s].gen /\ attempts[s] < MaxAttempts
           THEN /\ prev' = [prev EXCEPT ![s] = stored]
                /\ Goto(s, "cas")
                /\ UNCHANGED <<access, outcome, judged, clock, seen>>
           ELSE /\ DecideReconnect(s, stored.gen)
                /\ UNCHANGED <<access, prev>>
    /\ UNCHANGED <<stored, expiringGens, status, statusAbout, reconGen, claimed, holders, bankVars, highWater,
                   revoked, reconnected, read, got, attempts, replacedFirst, leaseVars, statusSeen, wentBack>>

\* Lazy re-encryption (M11): UPDATE ... SET the same tokens under the active key
\* WHERE access_token = conn.accessToken AND refresh_token ... ; it returns the
\* access token whether or not a row was updated.
Reencrypt(s) ==
    /\ pc[s] = "reencrypt"
    /\ IF ~ReencryptCAS \/ stored = read[s]
         THEN Store([gen |-> read[s].gen, kv |-> "new"])
         ELSE UNCHANGED <<stored, highWater>>
    /\ Goto(s, "fetch")
    /\ UNCHANGED <<expiringGens, status, statusAbout, reconGen, claimed, holders, bankVars, revoked, reconnected,
                   read, prev, got, attempts, access, judged, outcome, replacedFirst,
                   leaseVars, histVars, seen>>

\* provider.fetchAccounts(accessToken) and writeAccounts. A rejected access
\* token is AUTH_EXPIRED (401/403 in providerFetch), with no recovery.
Fetch(s) ==
    /\ pc[s] = "fetch"
    /\ IF access[s] \in live
         THEN /\ outcome' = [outcome EXCEPT ![s] = "connected"]
              /\ Observe(s)
              /\ Goto(s, "status")
              /\ UNCHANGED judged
         ELSE DecideReconnect(s, access[s])
    /\ UNCHANGED <<stored, expiringGens, status, statusAbout, reconGen, claimed,
                   holders, bankVars, highWater, revoked, reconnected, read,
                   prev, got, attempts, access, replacedFirst, leaseVars, statusSeen, wentBack>>

\* fetchAccounts or writeAccounts fails another way (a timeout, an outage, or
\* no account readable: total > 0 and updated = 0): the status to record is
\* error, about the token the sync used (token.storedAs).
FetchFails(s) ==
    /\ pc[s] = "fetch"
    /\ DecideError(s, access[s])
    /\ UNCHANGED <<stored, expiringGens, status, statusAbout, reconGen, claimed,
                   holders, bankVars, highWater, revoked, reconnected, read,
                   prev, got, attempts, access, replacedFirst, leaseVars, statusSeen, wentBack>>

\* finally: BankConnectionSync.recordStatus, one UPDATE ... WHERE
\* sync_started_at = lease (the lease check). For needs_reconnect and error it
\* is also the status CAS (B1): AND access_token = ANY(judged ciphertexts). On
\* a miss nothing is written (runSync answers "failed").
\* The code compares ciphertexts, the model gens: under a current lease the
\* only other ciphertext of the judged gen is this sync's own re-encryption,
\* which the code also passes (storedAs), and every other write stores a new
\* gen. Without the lease check a newer sync's re-encryption makes the code miss
\* where the model writes; the model is then the more permissive of the two.
StatusWrite(s) ==
    /\ pc[s] = "status"
    /\ LET checked == \/ outcome[s] = "needs_reconnect" /\ StatusChecksToken
                      \/ outcome[s] = "error" /\ ErrorChecksToken
           leaseOk == ~StatusChecksLease \/ s \in current
       IN IF ~leaseOk \/ (checked /\ stored.gen /= judged[s])
            THEN UNCHANGED <<status, statusAbout, statusSeen, wentBack>>
            ELSE /\ status' = outcome[s]
                 /\ statusAbout' = IF outcome[s] = "connected" THEN access[s] ELSE judged[s]
                 /\ statusSeen' = IF outcome[s] = status THEN Max(statusSeen, seen[s])
                                  ELSE seen[s]
                 /\ wentBack' = (wentBack \/ (outcome[s] /= status /\ seen[s] < statusSeen))
    /\ Goto(s, "release")
    /\ UNCHANGED <<stored, expiringGens, reconGen, claimed, holders, bankVars,
                   highWater, revoked, reconnected, read, prev, got, attempts,
                   access, judged, outcome, replacedFirst, leaseVars, clock, seen>>

\* release(): UPDATE ... SET sync_started_at = NULL WHERE sync_started_at = lease.
Release(s) ==
    /\ pc[s] = "release"
    /\ holders' = holders \ {s}
    /\ current' = current \ {s}
    /\ lapsed' = lapsed \ {s}
    /\ Goto(s, "done")
    /\ UNCHANGED <<stored, expiringGens, status, statusAbout, reconGen, claimed, bankVars, highWater, revoked,
                   reconnected, read, prev, got, attempts, access, judged,
                   outcome, replacedFirst, histVars, seen>>

-----------------------------------------------------------------------------
\* The world

\* The bank revokes consent (expired or withdrawn): every token stops working.
BankRevokes ==
    /\ ~revoked
    /\ revoked' = TRUE /\ live' = {} /\ refreshable' = {}
    /\ UNCHANGED <<stored, expiringGens, status, statusAbout, reconGen, holders, nextGen, highWater,
                   reconnected, syncVars, leaseVars, histVars>>

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
    /\ statusAbout' = nextGen /\ reconGen' = nextGen
    /\ clock' = clock + 1 /\ statusSeen' = clock + 1
    /\ UNCHANGED <<expiringGens, holders, revoked, syncVars, leaseVars, wentBack>>

Finished ==
    /\ \A s \in Syncs : pc[s] \in {"done", "busy"}
    /\ UNCHANGED vars

Next ==
    \/ \E s \in Syncs :
         \/ Claim(s) \/ ReadRow(s) \/ Refresh(s) \/ Recover(s) \/ CasWrite(s)
         \/ CasMiss(s) \/ Reencrypt(s) \/ Fetch(s) \/ StatusWrite(s) \/ Release(s)
         \/ EarlyFails(s) \/ RefreshFails(s) \/ FetchFails(s) \/ LeaseLapses(s)
    \/ BankRevokes \/ Reconnect
    \/ Finished

Spec == Init /\ [][Next]_vars

-----------------------------------------------------------------------------
\* Properties

\* The lease: at most one sync of a connection runs inside its lease at a time
\* (a sync whose lease lapsed may still be running beside it).
OneSyncAtATime == Cardinality(holders \ lapsed) <= 1

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

\* A stale sync never hides a reconnect: a failure status (error or
\* needs_reconnect) is about the reconnect's token or a later one, never about
\* a token read before the user reconnected. Gens are issued in order.
FailureNeverHidesReconnect ==
    status \in {"error", "needs_reconnect"} => statusAbout >= reconGen

\* A slow sync never turns the clock back: no status write changes the shown
\* status to what an older observation (a sync verdict or the reconnect) said.
\* A skipped write leaves the newer status in place.
StatusNeverGoesBack == ~wentBack

=============================================================================

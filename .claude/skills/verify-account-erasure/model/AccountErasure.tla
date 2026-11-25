---------------------------- MODULE AccountErasure ----------------------------
\* Account erasure (BE-04) racing with in-flight requests and a financial-data
\* reset of the same user. Every action names the code it stands for; paths are
\* from the repo root.
\*
\*   Erasure  apps/backend/src/modules/privacy/account-deletion.service.ts
\*            AccountDeletionService.deleteAccount, steps (b) and (b2)
\*   Lock     apps/backend/src/modules/privacy/user-data-lock.ts lockUserData
\*   Guard    apps/backend/src/auth/auth.guard.ts (isErased before the handler)
\*   Fence    apps/backend/src/modules/privacy/user-data-write-fence.ts
\*            UserDataWriteFence: the shared lockUserData and the tombstone
\*            recheck at the start of every transaction of a signed-in request
\*   Reset    apps/backend/src/modules/profile/user-profile.service.ts
\*            UserProfileService.resetFinancialData
\*
\* Abstraction: one user. The registry tables (user-data-registry.ts) are two
\* tables swept in order; each DELETE statement is one step. A request is any
\* authenticated write that inserts a row of the user's in its own transaction;
\* only its commit matters, because a DELETE under READ COMMITTED never sees an
\* uncommitted insert. Erasure deletes take effect at the statement: nothing in
\* the model reads rows, so that is the same as at commit. Failures, rollbacks
\* and the WorkOS step (c), (d) are out of scope.

EXTENDS Naturals, Sequences

CONSTANTS
    Requests,         \* in-flight authenticated requests (model values)
    ResetTakesLock,   \* resetFinancialData takes lockUserData (code: TRUE)
    SecondSweep,      \* deleteAccount runs the straggler sweep (b2) (code: TRUE)
    RequestsLock      \* writes take the shared lockUserData and recheck (code: TRUE)

Tables == <<"accounts", "profile">>   \* stands for USER_DATA_REGISTRY order
TableIds == 1..Len(Tables)
Writers == Requests \cup {"existing", "reset"}

VARIABLES
    ePc,        \* erasure: "idle" | "sweep1" | "sweep2" | "done"
    eIdx,       \* next table the current sweep deletes from
    tombstone,  \* the tombstone has committed, so isErased answers true
    lock,       \* exclusive pg_advisory_xact_lock on user-data:<id>: "none" | "erasure" | "reset"
    shared,     \* requests holding pg_advisory_xact_lock_shared on the same key
    rows,       \* committed rows of the user's, by table and writer
    late,       \* rows committed after the straggler sweep passed their table
    rPc,        \* request: "start" | "passed" | "locked" | "checked" | "done" | "refused"
    sPc         \* reset: "start" | "prechecked" | "locked" | "checked" | "done" | "refused"

vars == <<ePc, eIdx, tombstone, lock, shared, rows, late, rPc, sPc>>

TypeOK ==
    /\ ePc \in {"idle", "sweep1", "sweep2", "done"}
    /\ eIdx \in 1..(Len(Tables) + 1)
    /\ tombstone \in BOOLEAN
    /\ lock \in {"none", "erasure", "reset"}
    /\ shared \subseteq Requests
    /\ (lock # "none" => shared = {})
    /\ rows \in [TableIds -> SUBSET Writers]
    /\ late \in [TableIds -> SUBSET Writers]
    /\ rPc \in [Requests -> {"start", "passed", "locked", "checked", "done", "refused"}]
    /\ sPc \in {"start", "prechecked", "locked", "checked", "done", "refused"}

Init ==
    /\ ePc = "idle"
    /\ eIdx = 1
    /\ tombstone = FALSE
    /\ lock = "none"
    /\ shared = {}
    /\ rows = [t \in TableIds |-> {"existing"}]
    /\ late = [t \in TableIds |-> {}]
    /\ rPc = [r \in Requests |-> "start"]
    /\ sPc = "start"

\* The straggler sweep (b2) has already deleted from table t.
SweptLate(t) == ePc = "done" \/ (ePc = "sweep2" /\ t < eIdx)

\* A commit of one row by writer w into table t.
Commit(w, t) ==
    /\ rows' = [rows EXCEPT ![t] = @ \cup {w}]
    /\ late' = IF SweptLate(t) THEN [late EXCEPT ![t] = @ \cup {w}] ELSE late

\* Nobody holds the lock, in either mode: an exclusive request can be granted.
Free == lock = "none" /\ shared = {}

-----------------------------------------------------------------------------
\* Erasure: deleteAccount

\* (b) transaction, first statement: lockUserData(manager, userId).
EraseLock ==
    /\ ePc = "idle" /\ Free
    /\ lock' = "erasure" /\ ePc' = "sweep1" /\ eIdx' = 1
    /\ UNCHANGED <<tombstone, shared, rows, late, rPc, sPc>>

\* (b) sweep(): one DELETE per registry table, children first.
EraseSweep ==
    /\ ePc = "sweep1" /\ eIdx <= Len(Tables)
    /\ rows' = [rows EXCEPT ![eIdx] = {}]
    /\ eIdx' = eIdx + 1
    /\ UNCHANGED <<ePc, tombstone, lock, shared, late, rPc, sPc>>

\* (b) tombstone insert and commit: isErased now answers true, the lock is freed.
EraseCommit ==
    /\ ePc = "sweep1" /\ eIdx > Len(Tables)
    /\ tombstone' = TRUE /\ lock' = "none"
    /\ ePc' = IF SecondSweep THEN "sweep2" ELSE "done"
    /\ eIdx' = 1
    /\ UNCHANGED <<shared, rows, late, rPc, sPc>>

\* (b2) the straggler sweep, in its own transaction, no lock.
EraseStragglerSweep ==
    /\ ePc = "sweep2" /\ eIdx <= Len(Tables)
    /\ rows' = [rows EXCEPT ![eIdx] = {}]
    /\ eIdx' = eIdx + 1
    /\ UNCHANGED <<ePc, tombstone, lock, shared, late, rPc, sPc>>

EraseFinish ==
    /\ ePc = "sweep2" /\ eIdx > Len(Tables)
    /\ ePc' = "done"
    /\ UNCHANGED <<eIdx, tombstone, lock, shared, rows, late, rPc, sPc>>

-----------------------------------------------------------------------------
\* In-flight request: AuthGuard, then the handler's write.

\* AuthGuard: isErased(request.user.id) refuses once the tombstone has committed.
RequestGuard(r) ==
    /\ rPc[r] = "start"
    /\ rPc' = [rPc EXCEPT ![r] = IF tombstone THEN "refused" ELSE "passed"]
    /\ UNCHANGED <<ePc, eIdx, tombstone, lock, shared, rows, late, sPc>>

\* Broken variant only (RequestsLock = FALSE): the handler's insert commits with
\* no lock and no recheck, as the code did before the write fence (finding F1).
RequestWrite(r, t) ==
    /\ ~RequestsLock
    /\ rPc[r] = "passed"
    /\ Commit(r, t)
    /\ rPc' = [rPc EXCEPT ![r] = "done"]
    /\ UNCHANGED <<ePc, eIdx, tombstone, lock, shared, sPc>>

\* UserDataWriteFence.afterTransactionStart, first statement of the write's
\* transaction: tryLockUserDataShared. Granted while no erasure or reset holds
\* the exclusive lock; other requests of the user hold it alongside.
RequestLock(r) ==
    /\ RequestsLock /\ rPc[r] = "passed" /\ lock = "none"
    /\ shared' = shared \cup {r} /\ rPc' = [rPc EXCEPT ![r] = "locked"]
    /\ UNCHANGED <<ePc, eIdx, tombstone, lock, rows, late, sPc>>

\* The same try when the lock is busy: an erasure or reset holds or waits for
\* the exclusive lock, so the write is refused (503) without waiting. Allowed
\* at any time here, which covers a queued exclusive request the model does not
\* track; a refusal writes nothing.
RequestBusy(r) ==
    /\ RequestsLock /\ rPc[r] = "passed"
    /\ rPc' = [rPc EXCEPT ![r] = "refused"]
    /\ UNCHANGED <<ePc, eIdx, tombstone, lock, shared, rows, late, sPc>>

\* The fence's second statement: isErasedForWrite, inside the lock. A refusal
\* (410) rolls the transaction back, which frees the lock.
RequestRecheck(r) ==
    /\ rPc[r] = "locked"
    /\ IF tombstone
         THEN rPc' = [rPc EXCEPT ![r] = "refused"] /\ shared' = shared \ {r}
         ELSE rPc' = [rPc EXCEPT ![r] = "checked"] /\ UNCHANGED shared
    /\ UNCHANGED <<ePc, eIdx, tombstone, lock, rows, late, sPc>>

\* The handler's insert, in the same transaction, and its commit (frees the lock).
RequestLockedWrite(r, t) ==
    /\ rPc[r] = "checked"
    /\ Commit(r, t)
    /\ shared' = shared \ {r} /\ rPc' = [rPc EXCEPT ![r] = "done"]
    /\ UNCHANGED <<ePc, eIdx, tombstone, lock, sPc>>

-----------------------------------------------------------------------------
\* Reset: resetFinancialData

\* isErased before the transaction.
ResetPrecheck ==
    /\ sPc = "start"
    /\ sPc' = IF tombstone THEN "refused" ELSE "prechecked"
    /\ UNCHANGED <<ePc, eIdx, tombstone, lock, shared, rows, late, rPc>>

\* Transaction, first statement: lockUserData(manager, userId).
ResetLock ==
    /\ sPc = "prechecked"
    /\ IF ResetTakesLock THEN Free /\ lock' = "reset" ELSE UNCHANGED lock
    /\ sPc' = "locked"
    /\ UNCHANGED <<ePc, eIdx, tombstone, shared, rows, late, rPc>>

\* isErased(userId, manager) inside the lock; a refusal rolls back and frees it.
ResetCheck ==
    /\ sPc = "locked"
    /\ IF tombstone
         THEN /\ sPc' = "refused"
              /\ lock' = IF lock = "reset" THEN "none" ELSE lock
         ELSE sPc' = "checked" /\ UNCHANGED lock
    /\ UNCHANGED <<ePc, eIdx, tombstone, shared, rows, late, rPc>>

\* profileRepo.save(profile) and commit.
ResetWrite ==
    /\ sPc = "checked"
    /\ Commit("reset", 2)
    /\ lock' = IF lock = "reset" THEN "none" ELSE lock
    /\ sPc' = "done"
    /\ UNCHANGED <<ePc, eIdx, tombstone, shared, rPc>>

-----------------------------------------------------------------------------

Finished ==
    /\ ePc = "done"
    /\ \A r \in Requests : rPc[r] \in {"done", "refused"}
    /\ sPc \in {"done", "refused"}
    /\ UNCHANGED vars

Next ==
    \/ EraseLock \/ EraseSweep \/ EraseCommit \/ EraseStragglerSweep \/ EraseFinish
    \/ \E r \in Requests : RequestGuard(r)
    \/ \E r \in Requests, t \in TableIds : RequestWrite(r, t)
    \/ \E r \in Requests : RequestLock(r)
    \/ \E r \in Requests : RequestBusy(r)
    \/ \E r \in Requests : RequestRecheck(r)
    \/ \E r \in Requests, t \in TableIds : RequestLockedWrite(r, t)
    \/ ResetPrecheck \/ ResetLock \/ ResetCheck \/ ResetWrite
    \/ Finished

Spec == Init /\ [][Next]_vars

-----------------------------------------------------------------------------
\* Properties

\* The promise: once an erasure has finished, none of the user's rows remain.
ErasureLeavesNothing ==
    ePc = "done" => \A t \in TableIds : rows[t] = {}

\* A reset never leaves a profile row behind an erasure.
ResetNeverOutlivesErasure ==
    ePc = "done" => \A t \in TableIds : "reset" \notin rows[t]

\* Every row still there after an erasure was committed after the straggler
\* sweep had already passed its table: (b2) catches all earlier stragglers.
StragglerSweepCatchesEarlierWrites ==
    ePc = "done" => \A t \in TableIds : rows[t] \subseteq late[t]

=============================================================================

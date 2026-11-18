# Coordinator working rules

For a session that coordinates lane sessions. The laws in [`AGENTS.md`](../../AGENTS.md) apply as well.

1. Lane sessions report to the coordinator only when a PR is ready to merge, they are blocked, or they need a decision. While waiting on CI they wait inside the turn.
2. The coordinator tells the owner only about merges, failures and things that need the owner. No "no change" updates.
3. A claim about a live system (Railway variables, deploy behaviour, plan or usage limits) is either verified in this session or labelled "not checked". A subagent's report is not verification.
4. Anything the coordinator depends on across restarts (merge scripts, the ledger) lives in the repo or beside the ledger, never only in a temp folder.

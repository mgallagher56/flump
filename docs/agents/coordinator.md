# Coordinator working rules

For a session that coordinates lane sessions. The laws in [`AGENTS.md`](../../AGENTS.md) apply as well.

1. Lane sessions report to the coordinator only when a PR is ready to merge, they are blocked, or they need a decision. While waiting on CI they wait inside the turn.
2. The coordinator tells the owner only about merges, failures and things that need the owner. No "no change" updates.
3. A claim about a live system (Railway variables, deploy behaviour, plan or usage limits) is either verified in this session or labelled "not checked". A subagent's report is not verification.
4. Anything the coordinator depends on across restarts (merge scripts, the ledger) lives in the repo or beside the ledger, never only in a temp folder.
5. The coordinator does not relay each subagent or reviewer report to the owner. It sends one short message per PR when it merges or needs the owner, with the findings that matter in a line or two.
6. One independent review per PR, then one check of the fixes. A third round needs a stated reason (a guard, money or security change that the second round still found faults in).
7. A reviewer is given the diff and the specific things to check, not a reading list. An implementer's brief names the files and the two or three documents it needs.
8. A message to the owner is a few lines, about 100 words at most: the result or what is needed from them, then stop. More detail only when they ask (owner, 22 November 2026).
9. The coordinator manages its own context. At each natural break, such as a finished merge batch, it writes the status file in rule 10 and tells the owner it is a good point to compact or start a new session.
10. A handoff or status file is one page at most: where things stand, open PRs, next steps in order, what waits on the owner, what is not verified. History stays in git and the PRs.

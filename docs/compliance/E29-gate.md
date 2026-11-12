# E29 gate checklist (E29-T10)

> **DRAFT, agent-drafted, unreviewed, not legal advice; owner reviews and signs later.**
> Version 0.1, 2026-11-12.

PRs for E25 copy, E26 and any MCP surface link this file and tick the items that apply. The list is taken from the E29 gate minimums in `docs/audit/plans/E29-plan.md` and DECISIONS round 4 item 5 and its addendum. It is advisory, because the repo has no required checks (DECISIONS round 3 item 12; the owner merges). The automated parts (the T3 advice guard, the T6 MCP output policy) carry most of the weight.

How to use it:

1. Find the gate your PR touches.
2. Tick each item in the PR description or in the copy of this table in the PR.
3. Put the evidence in the **Evidence** column: a test name, doc path, PR number or env var.
4. Items that cite a ticket not yet merged cannot be ticked. Say so in the PR. Do not tick them early.

**Rule ids** (R1 to R8) are defined in [advice-boundary-policy.md](advice-boundary-policy.md).

## Hub enquiry clock (owner records here)

The 8-week clock for E26 starts on the day the owner sends the Innovation Hub enquiry (`docs/legal/fca-innovation-hub-enquiry.md`). Agents never send it.

| Event                                                | Date                                | Recorded by |
| ---------------------------------------------------- | ----------------------------------- | ----------- |
| Hub enquiry sent                                     | `[OWNER: YYYY-MM-DD]`               |             |
| Hub reply received (and whether adverse)             | `[OWNER: YYYY-MM-DD or "none yet"]` |             |
| Eight weeks after send (no reply, no adverse signal) | `[OWNER: calculated]`               |             |

## Gate 1: Before friends (beta)

These are in addition to the round 3 item 9 friends preconditions (invite-only sign-up, bank connection owner-only, ICO fee, monitored mailbox, beta notice and terms, deletion and export, breach runbook, offsite backup and restore drill, region move, synthetic staging data, Sentry scrubber, signed tax vectors).

| #   | Item                                                                                                                                                                                                    | Evidence (fill in) | Ticked |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------ |
| F1  | An E29a copy pass: advice-language patterns in `apps/marketing/src/claims.test.ts` and an equivalent web guard in `apps/web/app/copy-guard.test.ts`, with the allow-list ratchet green (E29-T3, T4, T5) |                    | []     |
| F2  | The widened Innovation Hub enquiry has been sent by the owner, covering projections, salary-sacrifice and pension outputs, and LLM replies through MCP (draft: E29-T11; date recorded above)            |                    | []     |
| F3  | MCP and PAT creation limited to owner-allowlisted accounts until the DPIA draft exists (E29-T8; env: `MCP_ALLOWED_USER_IDS=<owner id>`, `MCP_OPEN_ACCESS` unset; never `MCP_ENABLED=false`)             |                    | []     |
| F4  | A beta notice that says "guidance and calculations, not advice; unreviewed" is published (`BETA_NOTICE`, E29-T7; E19 C1 and C2)                                                                         |                    | []     |

## Gate 2: Before E25 copy ships

| #   | Item                                                                            | Evidence (fill in) | Ticked |
| --- | ------------------------------------------------------------------------------- | ------------------ | ------ |
| C1  | The E29-T3 guard enforces the E29a rules and is green on the PR                 |                    | []     |
| C2  | New copy meets R2, R5, R6 and R8, and the PR adds no allow-list entries         |                    | []     |
| C3  | Tax figures carry the "unverified" notice until the E25 vectors are signed (R6) |                    | []     |
| C4  | The owner has approved the copy (E7)                                            |                    | []     |

The E25 engine itself is not gated.

## Gate 3: Before E26 ships to friends

All of these must hold.

| #   | Item                                                                                               | Evidence (fill in) | Ticked |
| --- | -------------------------------------------------------------------------------------------------- | ------------------ | ------ |
| E1  | The owner has signed the DPIA draft (`docs/legal/dpia-mcp.md`, E29-T9)                             |                    | []     |
| E2  | Tool descriptions are worded as guidance and pass `assertDescriptionPolicy` (E29-T6; E17-N22 lint) |                    | []     |
| E3  | Every response carries an "unverified" notice (`MCP_NOTICE` in the E17-N8 envelope)                |                    | []     |
| E4  | Evals show no personal product recommendations (E17-N21 graders using the T6 policy function)      |                    | []     |
| E5  | The Hub has replied, or 8 weeks have passed with no adverse signal (dates recorded above)          |                    | []     |
| E6  | An audit log exists (E17-N17)                                                                      |                    | []     |

## Gate 4: Public launch (E29b)

| #   | Item                                                                                                                                                                                       | Evidence (fill in) | Ticked |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ | ------ |
| L1  | The lawyer's perimeter view is bought as part of the one fixed-fee solicitor engagement at launch, with the brief `docs/legal/fca-perimeter-brief.md` (E29-T11) and the Hub reply (if any) |                    | []     |
| L2  | The solicitor confirms the T1 rules and the DPIA review                                                                                                                                    |                    | []     |
| L3  | E26 for non-friends: the same Gate 3 items hold and L1 is done                                                                                                                             |                    | []     |

## Triggers for a separate written FCA opinion

Buy a separate written opinion **only** if one of these happens. Record which in the PR.

| #   | Trigger                                                         | Happened? |
| --- | --------------------------------------------------------------- | --------- |
| W1  | Bank connection goes public                                     | []        |
| W2  | The Hub reply is adverse                                        | []        |
| W3  | The solicitor will not cover the perimeter within the fixed fee | []        |
| W4  | E26 gains write tools or names products                         | []        |
| W5  | Charging starts                                                 | []        |

All money and engagement decisions are the owner's.

## Where the automated guards live

| Guard                         | File                                                                  | Ticket | State at `5cfe3ef0`                                                               |
| ----------------------------- | --------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------- |
| Advice-language lexicon       | `packages/finance-engine/src/compliance/advice-lexicon.ts`            | E29-T3 | Not landed                                                                        |
| Web copy guard and allow-list | `apps/web/app/copy-guard.test.ts`, `apps/web/app/advice-allowlist.ts` | E29-T3 | The file exists, with only "guarantee" and "FCA"; the advice guard has not landed |
| Marketing claims guard        | `apps/marketing/src/claims.test.ts`                                   | E29-T3 | The file exists, without advice patterns                                          |
| MCP output policy             | `packages/mcp/src/policy/output-policy.ts`                            | E29-T6 | Not landed                                                                        |
| Canonical notices             | `packages/finance-engine/src/disclaimers.ts`                          | E29-T7 | Not landed                                                                        |
| MCP and PAT allowlist         | `apps/backend/src/mcp-access.ts`                                      | E29-T8 | Not landed                                                                        |

## Requests to other lanes (from E29-T6)

These are requests written into this gate. E29 does not edit those tickets' files.

- **E17-N8:** the envelope gains a required `notice` field (`MCP_NOTICE`).
- **E17-N22:** the catalogue lint imports `assertDescriptionPolicy`.
- **E17-N21:** the eval graders add a "no product recommendation" behaviour using the same function.
- **E17-N11, N12, N14:** remove the advice-shaped keys and wording listed in [advice-copy-inventory.md](advice-copy-inventory.md) section B.
- **E17-N18:** handle the 404 `feature_disabled` response from E29-T8.

# E17 MCP re-plan (2026-11)

Status: **approved by the owner on 2026-11-13** (DECISIONS.md round 9). Written by a fable review of the MCP surface on main; this file is the record. It supersedes the parts of [E17-next-phases-plan.md](E17-next-phases-plan.md) named in "Stop and cancel" below.

## 1. Intent: two pillars

- **Pillar A, data access.** Rich, queryable read access to the user's own data, so an LLM can answer open-ended questions ("how did my savings move over the last two years?", "which months have no balance recorded?").
- **Pillar B, data entry and migration.** The LLM puts data into Flump. The flagship case is importing a personal spreadsheet of monthly balances. The LLM stages; the user reviews and commits in the Flump UI.

## 2. Why it drifted

- E17 put writes in Phase 4, behind the DPIA, terms, E21 and evals. Phases 3 to 5 were never ticketed.
- N11 and N12 rebuilt the eight legacy calculators as "v2".
- E26 was defined as more calculators.
- Compliance effort went into policing calculator output.
- Reads were designed as summaries (D5-A), not queries.

## 3. Inventory on main before the re-plan (19 primitives)

- **Tools (11).**
  - Data reads (5): `get_financial_snapshot`, `get_net_worth_history`, `list_accounts`, `get_budget_summary`, `get_debt_overview`.
  - Data writes: none.
  - Calculators (6): `compare_mortgage_overpay_vs_invest`, `simulate_debt_payoff`, `project_net_worth`, `evaluate_student_loan_overpayment`, and the legacy `simulate_uk_tax_and_pension_sacrifice` and `calculate_self_assessment_and_section24`.
- **Resources (5):** whole-document dumps (`executive-snapshot`, `baseline`, `accounts`, `budget`, `tax-ledger`).
- **Prompts (3):** "advisor" prompts that steered the model to calculators (`uk-financial-health-audit`, `escape-100k-tax-trap`, `crush-high-apr-debt`).

Other findings:
- Reads were summaries, not queries: no per-account series, date range, grouping or tax-record query.
- Tokens are forced anonymised (`apps/backend/src/agent/mcp-token.service.ts`). Scopes are hard-coded to read plus simulate.
- No writes and no agent audit table (N17 not landed).

## 4. Keep, demote, delete

| Primitive | Decision |
|---|---|
| 5 read tools | Keep. `get_net_worth_history` is absorbed by `get_balance_history` (PR B). |
| `simulate_debt_payoff`, `project_net_worth` | Keep: they run on recorded data and must match the app. |
| `simulate_uk_tax_and_pension_sacrifice`, `calculate_self_assessment_and_section24` | Replace with ONE tool, `get_tax_year_position`: the user's position for a tax year from stored data (income, Personal Allowance taper, HICBC, Scottish bands, Section 24 credit). Facts and estimates only. |
| `compare_mortgage_overpay_vs_invest` | **Deprecated, first to cut.** Frozen: no new inputs or outputs. |
| `evaluate_student_loan_overpayment` | Delete. |
| 3 prompts | Delete. Two new prompts (`import-spreadsheet`, `monthly-check-in`) come with the write tools in PR D. |
| 5 resources | Delete four; the fifth becomes `flump://schema` (data dictionary). |

## 5. Target surface

### Reads (scope: today's read scopes, `mcp:read:anonymized` or `mcp:read:full`; D5-A calls this `read:summary`)

- `get_balance_history` (new). Inputs `from`, `to`, `accountIds?`, `category?`, `groupBy` (`account | category | total`), `metric` (`balance | delta | pctDelta`), `interval` (`month | quarter | year`). Each point carries `carriedForward` and `source`. Built on the E30 selectors (carry-forward at read time, liabilities as the amount owed). Absorbs `get_net_worth_history`.
- `get_data_coverage` (new): per account, the first and last recorded month, missing months and sources.
- `list_tax_records` (new): `taxYear`, `category?`, `groupBy` (`month | category`). Totals plus capped rows. Replaces the `tax-ledger` resource.
- `get_tax_year_position` (new, replaces the two legacy tax tools).
- `get_financial_snapshot`: adds `asOfMonth?`.
- `list_accounts`: adds mortgage rate, term and fixed-rate end, and pension contribution, where stored.
- `get_budget_summary`, `get_debt_overview`: unchanged.
- One resource: `flump://schema`.
- Prompts (PR D): `import-spreadsheet` and `monthly-check-in`.

### Writes (PR D; one opt-in scope, `write:stage`; a token can stage but never commit)

- `stage_import`. Inputs `batchId?`, `idempotencyKey`, `accounts[{ref, name, type, details}]`, `balances[{accountRef, month, value}]`; later `budgetEntries` and `taxRecords`. Returns `batchId`, `reviewUrl`, counts of new, overwrite and unchanged rows, and validation errors.
- `get_import_status`. Input `batchId`.

## 6. Import flow

1. The LLM maps the sheet. Future-dated columns are dropped.
2. It calls `stage_import`, in chunks.
3. The server validates with the snapshot rules and stores an `import_batches` row. Nothing live is touched.
4. The user opens `reviewUrl` in Flump and maps rows to new or existing accounts.
5. The user reviews the diff and commits under session auth: `POST /imports/:id/commit`, one transaction, reusing the E30 upsert.
6. The LLM polls `get_import_status`.

## 7. Safety design

- **No MCP tool commits.** A commit needs a web session.
- **No deletes.** Overwrites of manual rows are flagged and unticked by default.
- **Caps:** 5,000 rows per batch, 3 open batches per user, 7-day expiry.
- **Undo:** batch-level revert. Prior values are stored at commit; revert restores only rows still owned by the batch.
- **Idempotency:** `idempotencyKey` on stage; commit is a natural-key upsert.
- **Provenance:** `source = 'agent'` plus `import_batch_id` on `account_details` (needs a migration). The source is sticky against bank sync.
- **Rate limits:** the existing limits, plus 30 stage calls an hour.
- **Output:** refs and counts, never names.
- **Advice:** recording the user's own figures is bookkeeping, not advice.
- **FCA trigger:** the recorded trigger is "E26 gains writes or names products". Read literally it covers E26, not E17 data entry; the owner confirms the reading with the launch solicitor (round 9, item 2).
- **Docs to correct before any write ships (PR F):** the DPIA ("no write tools exist"), the Innovation Hub enquiry ("read-only access") and the perimeter brief.

## 8. Stop and cancel

- **Stop:** N12 as three tools, N13, N14, E26 planning, any new simulate tool, and new calculator golden tasks in N21.
- **Cancel:** E26 (folded into E17 as the single tax tool), N13, N14.
- **Keep:** N10, N15 (with the new scope), N17 (a hard gate for writes), N18, N19, N22, N23.

## 9. PR order

| PR | Size | Content | Depends on |
|---|---|---|---|
| **A. Prune** | S | Delete the student-loan tool, the 3 prompts and 4 resources; one tax tool; update the surface snapshot and scope tables. | none |
| **B. Query reads** | M | `get_balance_history`, `get_data_coverage`, `list_tax_records`, `asOfMonth`, richer `list_accounts`, `flump://schema`, ranged provider methods. | E30 PR1 (landed) |
| **C. Import backend** | L | `import_batches`, the `source` migration, stage, commit and revert services and routes, the audit table (N17), contract entries. | E21; backup drill before the migration |
| **F. Compliance docs** | S | DPIA writes addendum, corrected Hub and perimeter facts, terms line; the owner signs. | parallel with C |
| **D. MCP write tools** | M | `stage_import`, `get_import_status`, `write:stage`, opt-in at token mint, injection tests, the two prompts. | C, N15 |
| **E. Web review** | L | `features/imports` review, commit and undo; scope toggle in the token card. | C, E30 PR2 |

Order: A, then B, C and F in parallel, then D, then E. A and B ship as one PR (owner preference for fewer, larger PRs). Roll out to the owner only, through `MCP_ALLOWED_USER_IDS`. The owner's own spreadsheet is the acceptance test.

## 10. Owner decisions (approved 2026-11-13, DECISIONS.md round 9)

1. **Who commits a write?** The user, in the Flump UI only. Amends D3-B.
2. **FCA trigger scope.** Data-entry writes under E17 are gated by the DPIA and terms addendum, not a written opinion. The owner confirms this with the launch solicitor in one line.
3. **Pruning list:** approved.
4. **Owner-only writes before the round 3 interviews:** yes.
5. **In-app CSV import uses the same staging pipeline:** yes. One import primitive, two front ends.

## 11. Strongest argument against

A spreadsheet migration is a one-off per user, and an in-app paste or CSV importer serves every user with no MCP client. The hedge: the staging batch, review UI and revert are needed by a CSV importer anyway, so only PR D is MCP-specific.

## 12. Notes from PR A+B

- `get_net_worth_history` is **removed**, not aliased. The only MCP user is the owner (`MCP_ALLOWED_USER_IDS`), so a deprecated alias would protect no client; `get_balance_history` with `groupBy: "total"` returns the same series.
- `compare_mortgage_overpay_vs_invest` says "Deprecated" in its description and is the first tool to cut.
- The new reads use ranged provider methods (`getAccountSnapshots`, `getDataCoverage`, `getTaxRecordsForYear`) that filter in SQL by user, account and month; nothing loads the whole history to filter in memory.

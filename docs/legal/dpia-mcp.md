# DPIA: MCP and AI context pack

> **DRAFT v0.2, agent-drafted, unreviewed, not legal advice; for owner sign-off, then solicitor review at launch (E29b).**
>
> This document was written by an agent from the code at `origin/main` `5cfe3ef0` and from [`data-map.md`](./data-map.md). Nobody has reviewed it. It poses legal questions; it does not answer them. It is the MCP annex to the E19 B2 DPIA and is the document E26 and E17 phase 4 wait on (E29-T9). Where it cites planned work (E17, E20, E29-T6, E29-T8), that work has **not landed** unless stated.

## 0. Status and how to read this

| Item             | State                                                             |
| ---------------- | ----------------------------------------------------------------- |
| Prepared         | 2026-11-12, agent draft                                           |
| Owner sign-off   | Not signed (see section 10)                                       |
| Solicitor review | Not done. Scheduled with the fixed-fee launch engagement (E29b)   |
| Evidence base    | Code paths cited as `path:line`; re-verify before relying on them |

Verified at the time of writing v0.1: `apps/backend/src/auth/mcp-access.ts` did not exist (E29-T8 not landed), and `docs/mcp/consent.md` did not exist (E17-N19 not landed).

**v0.2 (2026-11-14, agent-drafted, unreviewed).** Sections 2.1 to 2.3 and 6 are re-checked against `origin/main` after the E17 re-plan prune and query reads (#637): the tool, resource and prompt lists, data paths and scopes now match the code. `mcp-access.ts` (the allowlist) and `docs/mcp/consent.md` (draft copy, unsigned) now exist. Section 11 is new: a **DRAFT** addendum for staged imports written by an AI client, pending owner signature and pending the import backend (re-plan PR C). Sections 7, 9 and 10 are otherwise as in v0.1 and are not re-verified except where marked.

## 1. Screening: is a DPIA needed?

Applying the ICO screening criteria to this processing:

| Criterion                                                          | Applies? | Why                                                                                                                                                                           |
| ------------------------------------------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Financial data, or data that people would consider highly personal | Yes      | Income, debts, mortgage, pension, savings, budget and tax records (`data-map.md`, server-side table). Debt balances can indicate vulnerability (`data-map.md`, Accounts row). |
| New technology or novel application                                | Yes      | Disclosure of the user's financial picture to a third-party large language model client over the Model Context Protocol.                                                      |
| Possible inference or special category data                        | Possible | Free-text fields and transaction descriptions may reveal Article 9 information (section 6).                                                                                   |
| Evaluation or scoring                                              | Partly   | v0.1 cited a health-score tool that was deleted (E17-N11); no current MCP tool returns a score or stage (v0.2).                                                               |
| Vulnerable data subjects                                           | Possible | Users in debt; not screened for at sign-up.                                                                                                                                   |
| Large scale                                                        | No       | Owner-allowlisted friends only at this stage.                                                                                                                                 |

**Record:** a DPIA is being carried out whether or not the ICO criteria make it mandatory. The combination of financial data, a novel flow and inference risk makes it prudent. Whether it is legally mandatory is a question for the solicitor.

## 2. Description of the processing

### 2.1 Surfaces

Registered in `packages/mcp/src/`, served by `McpController` (`apps/backend/src/modules/agent/mcp.controller.ts:33-43`, `POST /mcp` and `GET /mcp`) through `McpService.getHttpHandler()` (`apps/backend/src/modules/agent/mcp.service.ts`).

**Surface as at v0.2 (after the E17 re-plan prune, #637).** The authoritative list is the scope table `packages/mcp/src/auth/scopes.ts` (`TOOL_SCOPES`, `RESOURCE_SCOPES`, `PROMPT_SCOPES`); every registered primitive must appear there or the server refuses to start.

**Tools today (all read or simulate; no write tool exists yet).** Every tool declares `readOnlyHint: true` (`packages/mcp/src/define-tool.ts:49`, `tools/simulate/common.ts:16`). Section 11 describes the staged-import write tools planned in re-plan PR D; they are **not built**.

| Tool                                 | Kind     | File                                                                                           |
| ------------------------------------ | -------- | ---------------------------------------------------------------------------------------------- |
| `get_financial_snapshot`             | Read     | `packages/mcp/src/tools/read/getFinancialSnapshot.ts`                                          |
| `get_balance_history`                | Read     | `packages/mcp/src/tools/read/getBalanceHistory.ts`                                             |
| `get_data_coverage`                  | Read     | `packages/mcp/src/tools/read/getDataCoverage.ts`                                               |
| `list_accounts`                      | Read     | `packages/mcp/src/tools/read/listAccounts.ts`                                                  |
| `get_budget_summary`                 | Read     | `packages/mcp/src/tools/read/getBudgetSummary.ts`                                              |
| `get_debt_overview`                  | Read     | `packages/mcp/src/tools/read/getDebtOverview.ts`                                               |
| `list_tax_records`                   | Read     | `packages/mcp/src/tools/read/listTaxRecords.ts`                                                |
| `get_tax_year_position`              | Read     | `packages/mcp/src/tools/read/getTaxYearPosition.ts`                                            |
| `simulate_debt_payoff`               | Simulate | `packages/mcp/src/tools/simulate/simulateDebtPayoff.ts`                                        |
| `project_net_worth`                  | Simulate | `packages/mcp/src/tools/simulate/projectNetWorth.ts`                                           |
| `compare_mortgage_overpay_vs_invest` | Simulate | `packages/mcp/src/tools/simulate/compareMortgageOverpayVsInvest.ts` (deprecated, first to cut) |

**Resources:** one, `flump://schema` (`packages/mcp/src/resources/schema.resource.ts:6`), a data dictionary that holds no user data. The earlier `flump://context/*` document resources were deleted in #637.

**Prompts:** none. The three earlier advisor prompts were deleted in #637. Re-plan PR D adds `import-spreadsheet` and `monthly-check-in`; their wording must pass the advice-boundary policy (R7).

### 2.2 Data categories (from `data-map.md`)

| Category                                                              | Source table                  | Reaches MCP via                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Profile: income, mortgage, pension, savings settings, employment type | `user_profiles`               | `AgentDataService.getBaseline` and `getUserFinancialData` (`apps/backend/src/modules/agent/agent-data.service.ts:170,286`, `userProfileToFinancialBaseline`)                                                                                                                                                                                    |
| Accounts and balance history                                          | `accounts`, `account_details` | `getAccounts`, `getAccountSnapshots` and `getDataCoverage` (`agent-data.service.ts:150,174,209`), filtered by user in SQL. Account names reach a tool only without anonymisation, after `sanitiseText` (`packages/mcp/src/tools/read/common.ts:112`).                                                                                           |
| Budget entries including free-text `notes`                            | `budget_entries`              | `getUserFinancialData` loads `notes` for the context pack (`agent-data.service.ts:313-314`). No MCP tool returns budget notes; entry names are scrubbed when anonymised (`tools/read/common.ts`, `safeText`).                                                                                                                                   |
| Tax records                                                           | `tax_records`                 | `getTaxRecords` (`agent-data.service.ts:249`) selects explicit columns without `notes` or any receipt column (`MCP_TAX_RECORD_SELECT`, `:68-79`). `list_tax_records` returns record names only with full read access.                                                                                                                           |
| Transactions: amount, description, category                           | `transactions`                | No current MCP tool reads transactions. The backend method `queryTransactions` remains (`agent-data.service.ts:331`) but is not in the MCP provider interface (`packages/mcp/src/types.ts`). Only manually posted transactions exist; bank sync no longer stores them (`apps/backend/src/migrations/DeleteSyncedTransactions1794355500000.ts`). |
| Identity                                                              | WorkOS                        | Not sent through MCP. The token carries the internal `userId` only.                                                                                                                                                                                                                                                                             |
| Bank tokens                                                           | `bank_connections`            | Never sent; encrypted at rest and stripped from responses (`data-map.md`).                                                                                                                                                                                                                                                                      |

### 2.3 Authentication and scopes

- A user creates a personal access token (PAT) in the web app: `POST /mcp-tokens` (`mcp.controller.ts:58-75`). The token is `flump_pat_` plus 32 hex characters; only its hash and a display prefix are stored (`apps/backend/src/modules/agent/mcp-token.service.ts`, `hashPatToken`).
- The `mcp_tokens` row holds: `name`, `token_hash`, `token_prefix`, `scopes`, `anonymize_institutions`, `expires_at`, `last_used_at`, `total_tool_calls`, `revoked_at`, `created_at` (`apps/backend/src/entities/mcp-token.entity.ts`; DDL in `Baseline1794355200000.ts:24`).
- Every token is minted with `mcp:read:anonymized` and `mcp:simulate`, and `anonymize_institutions` is forced to true; a request to turn it off is refused (`apps/backend/src/modules/agent/mcp-token.service.ts:98-111`, `mcp-token.entity.ts:20-24`). The scope set is `mcp:read:anonymized`, `mcp:read:full` and `mcp:simulate` (`packages/mcp/src/auth/scopes.ts`); no route mints `mcp:read:full` today. Re-plan PR D adds one opt-in scope, `write:stage` (section 11); it is **not built**.
- `POST /mcp-tokens` and the context pack sit behind the kill switch, sign-in and the owner allowlist (`McpKillSwitchGuard`, `AuthGuard`, `McpAllowlistGuard`, `mcp.controller.ts:58-60,91-92`; `apps/backend/src/auth/mcp-access.ts`).
- The verifier looks up the hash, applies expiry and revocation, and records usage (`token-verifier.ts:135-141`, `mcp.service.ts:70-86`). Rate limits are 60 requests per minute and 300 per hour per bucket (`packages/mcp/src/auth/rate-limiter.ts:22`). Failed authentication is limited separately (`packages/mcp/src/auth/failed-auth-limiter.ts`).
- Users can list and revoke tokens (`GET mcp-tokens`, `DELETE mcp-tokens/:id`, `mcp.controller.ts:48-86`). Revocation sets `revoked_at`; it does not delete the row.

### 2.4 The context-pack download

`GET /mcp-tokens/context-pack` (`mcp.controller.ts:80-87`) builds a one-off JSON and Markdown pack of the user's data through `buildFlumpAiContextPack` and `formatAiContextPackMarkdown` (`packages/finance-engine/src/ai-context-pack.ts`, called at `mcp.service.ts` `getContextPack`). It is designed to be pasted into a model. It is **in scope** for this DPIA and is gated together with MCP (E29 round 4, OD3 A). Its `anonymize` query parameter defaults to true and is switched off by `anonymize=false` (`mcp.controller.ts:84-86`).

### 2.5 What Flump stores and does not store

| Stored                                                                                                                                                     | Not stored                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Token hash, prefix, scopes, flag, expiry, last-used time, call count (`mcp_tokens`)                                                                        | Tool and resource **outputs** (`data-map.md`: "Not stored")                                    |
| Planned: an audit log of calls, 13-month retention, deleted with the account (E17-N17; adopted provisionally in DECISIONS round 3 item 15). **Not built.** | The prompts the user sends to their AI client, and the model's replies. Flump never sees them. |
| Application logs on Railway (class and leading phrase for errors; `data-map.md`)                                                                           | Raw tokens                                                                                     |

Flump cannot recall data once it has been sent to the AI client (`data-map.md`, MCP outputs row).

### 2.6 Flow

User's AI client (for example a desktop assistant the user has configured) calls Flump `/mcp` with the PAT. Flump reads from Postgres, computes, and returns JSON to that client. From that moment the data is held by the client and its provider under the user's own arrangement with them.

## 3. Roles: OPEN QUESTION FOR THE SOLICITOR

This section deliberately concludes nothing.

**Question 3.1.** When Flump returns a user's data to an AI client the user has chosen, is Flump:

- (a) a controller disclosing personal data to a recipient, at the data subject's own instruction; or
- (b) a controller whose disclosure makes the AI provider Flump's processor; or
- (c) something else, for example the user acting for themselves in a purely personal capacity with their own vendor?

**Question 3.2.** Is the AI model provider:

- the user's own vendor (a separate controller for what the user sends it under their own terms); or
- a processor or joint controller in relation to Flump's disclosure?

**Facts relevant to the answer (not a view):**

- Flump does not choose, contract with, or pay the provider. The user does. There is no Flump-provider data processing agreement.
- The PAT is created by the user and pasted into the client by the user.
- Flump decides what categories each tool returns and whether free text is included.
- The client could be any MCP-capable product; Flump does not allow-list clients.
- Flump has no visibility of what the provider does with the data.

**Consequences that depend on the answer:** whether Article 28 terms are needed; whether Flump is responsible for the provider's later handling; who owns the international-transfer analysis (section 5); what the privacy notice must say.

**Parked until the solicitor advises.** No marketing or product copy should assert a role.

## 4. Lawful-basis options for the disclosure

For the solicitor to choose between. Neither is adopted here.

| Option                                                                                       | For                                                                                | Against                                                                                                                                                                                           |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Art 6(1)(b) contract** (disclosure is necessary to provide the feature the user asked for) | No consent-withdrawal mechanics. Fits a feature the user deliberately switched on. | "Necessary" is a high bar for an optional feature; it may be read narrowly (solicitor to confirm).                                                                                                |
| **Art 6(1)(a) consent**                                                                      | Matches the optional, user-initiated nature. Withdrawal maps to token revocation.  | Must be specific, informed and freely given; withdrawal must be as easy as giving it; Article 9 inference (section 6) would need explicit consent if special-category data is actually disclosed. |

Either option needs a transparency layer: consent and connection copy shown at token creation. That is E17-N19 (`docs/mcp/consent.md`) and the E17-N18 UI. Neither has landed, so no such copy exists today. The current web card says the feature is "not available yet" (`apps/web/app/features/ai-connections/components/McpConnectionCard/McpConnectionCard.tsx`, per the E29 plan, `bef3b851`), but the API route is not gated until E29-T8.

## 5. International transfers

- The provider is likely outside the UK. Which party makes the restricted transfer, and therefore which mechanism (adequacy, UK IDTA or Addendum, or the user's own act) applies, depends on the answer to section 3. Open question for the solicitor.
- WorkOS (US-hosted AuthKit) is already recorded as an international identity processor (DECISIONS round 3 item 8; `data-map.md`). It is not part of the MCP data flow.
- Flump's own hosting and storage region is covered in the main E19 B2 DPIA and E18 (region move pending); not repeated here.

## 6. Article 9 inference risk

Free text and descriptions can reveal health, religion, trade-union membership, sexual orientation or sex life. Where those fields reach an AI client the risk is real even though Flump does not ask for such data.

**Fields that can carry it, with paths:**

- Budget entry `notes`: the context pack only (`agent-data.service.ts:313-314`); no MCP tool returns them.
- Account and tax record **names**: returned by the read tools only when the token is not anonymised, after `sanitiseText` (`packages/mcp/src/tools/read/common.ts:112`, `listTaxRecords.ts:153`). Every token minted today is anonymised (section 2.3).
- Budget entry **names and categories** (non-income entries): returned on anonymised tokens too, by `get_budget_summary` in detailed format (`packages/mcp/src/tools/read/getBudgetSummary.ts:80-88`). Anonymising removes institution names and account numbers (`anonymiseDescription`); the rest of the name is sent. Income entries become "Income #n" on anonymised tokens.
- Tax record `notes`: not selected for MCP (`MCP_TAX_RECORD_SELECT`, `agent-data.service.ts:68-79`).
- Transaction `description`: no current MCP tool reads transactions (section 2.2).
- Planned (section 11): names and values an AI client **writes into** a staged import are user-supplied free text and can carry the same information.

**Mitigations, with honest status:**

| Mitigation                                                            | Status                                                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Synced transactions no longer stored                                  | **Done.** `DeleteSyncedTransactions1794355500000.ts`; manual transactions via `POST /transactions` only.                                                                                                                                                                                                                                     |
| Read and simulate scopes only (`mcp:read:anonymized`, `mcp:simulate`) | **Done**: the only scopes minted (`mcp-token.service.ts:111`). No write tool exists today. The planned `write:stage` scope (section 11) is opt-in and can stage but never commit.                                                                                                                                                            |
| Free-text notes excluded from tool output by default                  | **Done for tools (v0.2).** No MCP tool returns budget or tax notes (section 2.2). The context pack drops budget notes when anonymised (`packages/finance-engine/src/ai-context-pack.ts:186-190`) and keeps them when `anonymize=false`.                                                                                                      |
| Anonymisation                                                         | **Partial.** Anonymised tokens get generic labels for accounts and income entries; other budget entry names only lose institution names and account numbers (`anonymiseDescription` in the engine). It does not detect health terms or other sensitive content inside a name a user chose. Do not describe it as anonymisation of free text. |
| Consent copy before first connection                                  | **Not done** (E17-N19).                                                                                                                                                                                                                                                                                                                      |

**Residual risk of free-text disclosure through the read tools is lower than in v0.1** (notes are not returned; account and tax record names are withheld on anonymised tokens), but remains for budget entry names and categories, which pass on anonymised tokens with only institution names and account numbers removed, for the context pack with `anonymize=false`, and for any future full-read token. Agent view, for the owner to challenge: medium.

## 7. Retention

| Data                                   | Retention                                                                     | Basis in repo                                                | Gap                                                                                                                                                                                                                                                                            |
| -------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `mcp_tokens` rows                      | Until the account is deleted. Revocation sets `revoked_at` and keeps the row. | `mcp.service.ts` `revokeToken`                               | Revoked and expired rows are never purged. Owner decision needed on a purge period.                                                                                                                                                                                            |
| Planned audit log                      | 13 months, provisional, deleted with the account                              | DECISIONS round 3 item 15; E17 D12 flagged for the solicitor | Not built (E17-N17). Retention schedule entry is owed by E19.                                                                                                                                                                                                                  |
| Tool outputs                           | Not retained by Flump                                                         | `data-map.md`                                                | None.                                                                                                                                                                                                                                                                          |
| Data held by the AI client or provider | Outside Flump's control                                                       | n/a                                                          | Must be stated plainly to users (section 8).                                                                                                                                                                                                                                   |
| Context-pack download                  | Not retained by Flump after the response                                      | `mcp.service.ts` `getContextPack`                            | The user's copy is outside Flump's control.                                                                                                                                                                                                                                    |
| Deletion with account                  | Required for `mcp_tokens` and the audit log                                   | DECISIONS conflict 5                                         | **I could not find a whole-account deletion path in `apps/backend/src` that touches `mcp_tokens`.** Per-record deletes exist (`finance.controller.ts:151`, `tax.controller.ts:132`, `budget.controller.ts:349`). The deletion and export work (E12 F40) must cover this table. |

## 8. No training by Flump; provider position unknown

- **Flump does not train models on user data.** Flump does not train models at all; no code in the repo does so.
- **The AI provider's use of data sent to it, including any training or retention, is outside Flump's control and is not known to Flump.** It depends on the provider's terms and the user's own account settings.
- User-facing copy must say this in those words or equivalent. **It must not claim, imply or suggest that the provider will not train, will delete, or will not retain.** The claims guard (`apps/marketing/src/claims.test.ts`) exists to catch this class of claim; add a row there if marketing ever cites this DPIA or makes any statement about provider behaviour.

## 9. Risk table

Likelihood and severity are an agent estimate on a low, medium, high scale, for the owner to challenge. "Mitigation status" is as at the date of this draft.

| #   | Risk                                                                                              | Likelihood | Severity                                 | Mitigation (planned item)                                                                                                                      | Status                                                                                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Free-text notes or descriptions reveal Article 9 data to the provider                             | Medium     | High                                     | Exclude notes by default; stronger anonymisation (E17 N4, N9)                                                                                  | Partly done (v0.2): no tool returns notes, but budget entry names still pass on anonymised tokens; the context pack with `anonymize=false` still carries notes                            |
| R2  | A non-allowlisted user creates a PAT or downloads the context pack before this DPIA is signed     | Medium     | Medium                                   | Owner allowlist and `MCP_OPEN_ACCESS` flag, with a check order of kill switch, auth, allowlist (E29-T8, `apps/backend/src/auth/mcp-access.ts`) | Landed (v0.2): `McpAllowlistGuard` on token creation and the context pack (`mcp.controller.ts:58-60,91-92`). The owner must set `MCP_ALLOWED_USER_IDS` and leave `MCP_OPEN_ACCESS` unset. |
| R3  | Token leaked or used after the user thinks it is revoked                                          | Low        | High                                     | Hash-only storage, revoke, expiry, rate limits, failed-auth limiter (present); audit log and revoke review (E17 N16, N17)                      | Partly done                                                                                                                                                                               |
| R4  | Broad scope granted by default                                                                    | Low        | Medium                                   | Default read-anonymised and simulate scopes (present); scope model (E20-N17, N18)                                                              | Partly done                                                                                                                                                                               |
| R5  | Model turns calculations into personal product advice                                             | Medium     | Medium (regulatory, not data protection) | Output policy `assertToolOutputPolicy` and prompt wording rules (E29-T6, E17 N11, N12, N14)                                                    | Partly done (v0.2): `packages/mcp/src/policy/output-policy.ts` is enforced by tests over every tool; the advisor prompts were deleted (#637).                                             |
| R6  | Provider retains or trains on the data                                                            | Unknown    | High                                     | Not controllable by Flump. Consent copy and plain statement (section 8; E17-N19)                                                               | Not done                                                                                                                                                                                  |
| R7  | Role and transfer analysis is wrong, leaving Flump without needed contracts or transfer mechanism | Unknown    | High                                     | Solicitor review (section 3, E29b)                                                                                                             | Open                                                                                                                                                                                      |
| R8  | Data not deleted with the account (tokens, audit log)                                             | Medium     | Medium                                   | Include in deletion and export work (E12 F40); retention schedule (E19)                                                                        | Not done                                                                                                                                                                                  |
| R9  | Outputs and unverified tax figures taken as reliable                                              | Medium     | Medium                                   | `MCP_NOTICE` in every result (E29-T7, E17-N8)                                                                                                  | Done for every read and simulate tool (v0.2, `MCP_NOTICE`)                                                                                                                                |
| R10 | Users cannot tell what has been shared                                                            | Medium     | Medium                                   | Audit log view (E17-N17); consent screen (E17-N19)                                                                                             | Not landed                                                                                                                                                                                |

## 10. Residual risk and sign-off

**Residual risk (agent view, pre-mitigation).** High until at least R1, R2 and R8 are addressed and the solicitor has answered section 3. The draft recommends that no friend receives MCP access, and that MCP and PAT creation stay limited to the owner, until:

1. E29-T8 has landed and the owner has set `MCP_ALLOWED_USER_IDS` and left `MCP_OPEN_ACCESS` unset;
2. free-text notes are excluded from output by default;
3. the owner has decided the open questions in sections 3, 4 and 7;
4. this document has been read and signed.

If residual risk remains high after mitigation, the ICO prior-consultation route (UK GDPR Article 36) must be considered. That is a decision for the owner and the solicitor.

**Open questions for the solicitor (E29b):** 3.1, 3.2, the lawful basis in section 4, the transfer analysis in section 5, the 13-month audit retention, and whether a DPIA is mandatory here.

### Sign-off

| Role                            | Name | Decision                              | Date | Notes |
| ------------------------------- | ---- | ------------------------------------- | ---- | ----- |
| Owner (controller, sole trader) |      | Accept / Accept with changes / Reject |      |       |
| Solicitor (E29b review)         |      |                                       |      |       |

Sign-off here records the owner's acceptance of the residual risk for a friends-only beta. It is not a legal opinion and does not replace solicitor review.

## 11. Addendum: staged imports written by an AI client

> **DRAFT, agent-drafted, unreviewed, not legal advice. Pending owner signature (section 11.9) and pending the import backend (E17 re-plan PR C) landing.** Nothing in this section is built at v0.2. It describes the design approved in DECISIONS round 9 and [`E17-mcp-replan-2026-11.md`](../audit/plans/E17-mcp-replan-2026-11.md) sections 5 to 7. Re-verify every statement against the code once PRs C, D and E have merged, and replace "planned" with `path:line` references before signing.

### 11.1 What changes

Until now the MCP connection only read data out of Flump. The re-plan adds **data entry**: an AI client the user has connected can **stage** an import (for example the user's own spreadsheet of monthly balances), and the **user** reviews and **commits** it in the Flump web app. Recording a user's own figures is bookkeeping, not advice (re-plan section 7). The same staging pipeline also serves the in-app CSV import (DECISIONS round 9 item 5), so this addendum covers both front ends.

### 11.2 Data flow

1. The user asks their AI client to bring data into Flump. The client reads the user's source (a spreadsheet the user gave it) under the user's own arrangement with its provider. Flump never sees the source file.
2. The client calls `stage_import` (planned, re-plan PR D) with accounts (`ref`, `name`, `type`, `details`) and monthly balances (`accountRef`, `month`, `value`); later budget entries and tax records. The client drops future-dated months when it maps the sheet (re-plan section 6.1); whether Flump also rejects them server-side is proposed, not in the re-plan.
3. Flump validates the rows with the same rules as manual snapshot entry and stores them in a new `import_batches` record for that user (planned, PR C). **No live table is touched.**
4. The tool returns a batch id, a review link, counts (new, overwrite, unchanged) and validation errors. It returns refs and counts, never account names.
5. The user opens the review link in Flump, signed in through the normal web session, maps rows to new or existing accounts, sees the diff and commits (`POST /imports/:id/commit`, planned). The commit runs in one transaction and reuses the existing snapshot upsert.
6. The client may call `get_import_status` (planned) to learn whether the batch was committed, reverted or expired.

**New categories of processing:** staged rows held by Flump before commit; a provenance marker on committed rows; an audit record of agent calls. The data categories themselves (account names and types, balances, later budget and tax records) are the ones Flump already holds (section 2.2).

### 11.3 The stage and commit split

- **No MCP tool commits, edits or deletes live data.** An MCP token can stage and read import status only (limiting status reads to batches the same token staged is proposed, not in the re-plan). A commit needs a signed-in web session (DECISIONS round 9 item 1, which amends E17 D3-B).
- **Who commits:** the user only, in the Flump web UI. No agent, token or background job commits on the user's behalf.
- **Scope:** one new opt-in scope, `write:stage`, chosen by the user when minting a token (planned, PR D and the token card in PR E). Existing tokens keep read and simulate only.
- **Rollout:** the owner only, through `MCP_ALLOWED_USER_IDS` (DECISIONS round 9 item 4).

### 11.4 Safety controls (planned)

| Control     | Design (re-plan section 7)                                                                                                                                                                                                                         |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Caps        | 5,000 rows per batch, 3 open batches per user                                                                                                                                                                                                      |
| Expiry      | Uncommitted batches expire after 7 days                                                                                                                                                                                                            |
| No deletes  | An import never deletes a row. Overwrites of rows the user entered by hand are flagged and unticked by default                                                                                                                                     |
| Undo        | Batch-level revert. Prior values are stored at commit; revert restores only rows the batch still owns                                                                                                                                              |
| Idempotency | `idempotencyKey` on stage; commit is a natural-key upsert, so a repeat cannot double-count                                                                                                                                                         |
| Provenance  | `source = 'agent'` plus `import_batch_id` on committed balance rows (`account_details`, needs a migration). The source is not overwritten by bank sync                                                                                             |
| Audit       | An agent audit table (E17-N17, a hard gate for writes). Proposed, not in the re-plan: one row per agent call (token, tool, batch, counts, outcome). Retention 13 months, provisional (DECISIONS round 2 item 5; E17 D12), deleted with the account |
| Rate limits | The existing 60 a minute and 300 an hour, plus 30 stage calls an hour                                                                                                                                                                              |
| Output      | Refs and counts only, never names                                                                                                                                                                                                                  |

### 11.5 Retention

| Data                                    | Retention (planned)                                                                                                          | Gap to close before signing                                                                                              |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Uncommitted batch rows                  | Batches expire after 7 days (re-plan). Proposed, not in the re-plan: rows deleted at expiry, on discard, or with the account | Owner decision; confirm the purge job exists                                                                             |
| Committed batch record and prior values | Kept while undo is possible; owner to set a period                                                                           | Owner decision: how long undo stays available                                                                            |
| Provenance columns                      | Life of the row                                                                                                              | None                                                                                                                     |
| Agent audit rows                        | 13 months, provisional; deleted with the account                                                                             | Solicitor to confirm (section 10 open questions); add to the retention schedule (E19) and the account deletion path (R8) |

### 11.6 Risks and mitigations

W1 to W8 mitigations come from the re-plan unless marked. **The mitigations for W9 to W13 are proposed by this draft and are not in the re-plan;** PRs C to E should adopt or reject each one, and this table records the outcome before signing.

| #   | Risk                                                                                                                                                                         | Likelihood | Severity            | Mitigation                                                                                                                                                                                                        | Status                                      |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| W1  | **Prompt injection.** Text inside the user's spreadsheet, or another tool's output, instructs the AI client to stage false or extra data                                     | Medium     | Medium              | Nothing is live until the user commits; the review page shows every new and overwritten row; overwrites of manual rows are unticked by default; batch revert; injection tests in PR D                             | Planned                                     |
| W2  | The AI client mis-maps columns (wrong month, sign or account) and the user commits without noticing                                                                          | Medium     | Medium              | Diff view with counts; validation with the manual-entry rules; future months dropped; batch revert                                                                                                                | Planned                                     |
| W3  | A leaked token with `write:stage` floods a user's account with staged batches                                                                                                | Low        | Low                 | Opt-in scope; 3 open batches; 5,000 rows; 30 stage calls an hour; 7-day expiry; revoke                                                                                                                            | Planned                                     |
| W4  | A token or agent commits without the user                                                                                                                                    | Low        | High                | No commit route accepts a PAT; commit needs a web session (re-plan); authorisation tests on the commit route (proposed, not in the re-plan)                                                                       | Planned (PR C)                              |
| W5  | Staged free text (account names) carries Article 9 information into Flump                                                                                                    | Low        | Medium              | The user chose to put it there; it is shown to the user on review; same handling and deletion as manually entered names                                                                                           | Planned                                     |
| W6  | Committed rows cannot be told apart from manual or bank rows, so undo or a dispute is impossible                                                                             | Low        | Medium              | `source = 'agent'` plus `import_batch_id`; prior values kept at commit                                                                                                                                            | Planned (migration in PR C)                 |
| W7  | Users cannot see what an agent did                                                                                                                                           | Medium     | Medium              | Agent audit table (N17); import history in the review UI (PR E; proposed, not in the re-plan)                                                                                                                     | Planned                                     |
| W9  | **Injection used to read data out.** Text in the sheet steers the client to call the read tools and send the results to a destination the attacker controls                  | Medium     | High                | Outside Flump's control once data reaches the client; read tools return anonymised, capped output; the consent copy says the client holds what it reads; Flump never follows links or instructions in staged data | Partly in place (read limits); rest planned |
| W10 | **Staged text echoed back.** Names or validation messages built from staged text are returned to the model, or rendered in the review page, and carry instructions or markup | Medium     | Medium              | Tool output returns refs and counts, never names; validation errors name the field and row, not the value; the review page renders staged text as plain text, never HTML                                          | Planned (PR C, PR D, PR E)                  |
| W11 | **Spoofed review link.** The client, or injected text, shows the user a look-alike link instead of Flump's review page                                                       | Low        | Medium              | The review link is on Flump's own domain; commit needs a signed-in Flump session; the review page shows the batch id the tool returned; the user can also open imports from inside Flump                          | Planned (PR E)                              |
| W12 | **Review fatigue.** A batch of up to 5,000 rows is committed without being read                                                                                              | Medium     | Medium              | Counts first (new, overwrite, unchanged); overwrites of manual rows unticked by default; grouping by account; batch revert after commit                                                                           | Planned (PR E)                              |
| W13 | **Third-party data in the source.** The user's sheet holds another person's figures (for example a partner's accounts)                                                       | Low        | Medium              | Terms line: the user is responsible for what they confirm; the review shows every new account before commit; same deletion rights as manually entered data                                                        | Planned                                     |
| W8  | Recording figures is read as advice                                                                                                                                          | Low        | Medium (regulatory) | The tools record the user's own numbers and return counts; the two new prompts must pass R7 of the advice-boundary policy; the FCA reading is confirmed with the launch solicitor (DECISIONS round 9 item 2)      | Planned                                     |

### 11.7 Residual risk

Agent view, for the owner to challenge: **low to medium** once PRs C, D and E land as designed, because the user reviews and commits every change and can revert a whole batch. Prompt injection (W1) is the main residual risk; it is contained by the review step, not prevented.

### 11.8 Preconditions before any write ships

1. PR C (import backend, audit table, provenance migration) has merged, with a backup drill before the migration.
2. The terms line for agent-staged data entry ([`fca-perimeter-brief.md`](./fca-perimeter-brief.md), "Proposed terms line") is approved by the owner and the solicitor.
3. The owner has confirmed with the launch solicitor that data-entry writes are gated by this addendum and the terms line, not by a written FCA opinion (DECISIONS round 9 item 2).
4. This section has been re-verified against the code and signed below.

### 11.9 Sign-off for the addendum

| Role                            | Name | Decision                              | Date | Notes |
| ------------------------------- | ---- | ------------------------------------- | ---- | ----- |
| Owner (controller, sole trader) |      | Accept / Accept with changes / Reject |      |       |
| Solicitor (E29b review)         |      |                                       |      |       |

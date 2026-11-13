# DPIA: MCP and AI context pack

> **DRAFT v0.1, agent-drafted, unreviewed, not legal advice; for owner sign-off, then solicitor review at launch (E29b).**
>
> This document was written by an agent from the code at `origin/main` `5cfe3ef0` and from [`data-map.md`](./data-map.md). Nobody has reviewed it. It poses legal questions; it does not answer them. It is the MCP annex to the E19 B2 DPIA and is the document E26 and E17 phase 4 wait on (E29-T9). Where it cites planned work (E17, E20, E29-T6, E29-T8), that work has **not landed** unless stated.

## 0. Status and how to read this

| Item             | State                                                             |
| ---------------- | ----------------------------------------------------------------- |
| Prepared         | 2026-11-12, agent draft                                           |
| Owner sign-off   | Not signed (see section 10)                                       |
| Solicitor review | Not done. Scheduled with the fixed-fee launch engagement (E29b)   |
| Evidence base    | Code paths cited as `path:line`; re-verify before relying on them |

Verified at the time of writing: `apps/backend/src/mcp-access.ts` does not exist yet (E29-T8 not landed), and `docs/mcp/consent.md` does not exist (E17-N19 not landed). Section 9 treats both as planned mitigations, not present ones.

## 1. Screening: is a DPIA needed?

Applying the ICO screening criteria to this processing:

| Criterion                                                          | Applies? | Why                                                                                                                                                                           |
| ------------------------------------------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Financial data, or data that people would consider highly personal | Yes      | Income, debts, mortgage, pension, savings, budget and tax records (`data-map.md`, server-side table). Debt balances can indicate vulnerability (`data-map.md`, Accounts row). |
| New technology or novel application                                | Yes      | Disclosure of the user's financial picture to a third-party large language model client over the Model Context Protocol.                                                      |
| Possible inference or special category data                        | Possible | Free-text fields and transaction descriptions may reveal Article 9 information (section 6).                                                                                   |
| Evaluation or scoring                                              | Partly   | `evaluate_cashflow_runway_and_health` produces a health score and stage (`packages/mcp/src/tools/financial-audit.tool.ts:18`).                                                |
| Vulnerable data subjects                                           | Possible | Users in debt; not screened for at sign-up.                                                                                                                                   |
| Large scale                                                        | No       | Owner-allowlisted friends only at this stage.                                                                                                                                 |

**Record:** a DPIA is being carried out whether or not the ICO criteria make it mandatory. The combination of financial data, a novel flow and inference risk makes it prudent. Whether it is legally mandatory is a question for the solicitor.

## 2. Description of the processing

### 2.1 Surfaces

Registered in `packages/mcp/src/`, served by `McpController` (`apps/backend/src/mcp.controller.ts:26-34`, `POST /mcp` and `GET /mcp`) through `McpService.getHttpHandler()` (`apps/backend/src/mcp.service.ts`).

**Tools (all read or simulate; no write tools exist):**

| Tool                                      | File                                                 |
| ----------------------------------------- | ---------------------------------------------------- |
| `simulate_debt_payoff`                    | `packages/mcp/src/tools/debt-simulator.tool.ts:54`   |
| `calculate_self_assessment_and_section24` | `packages/mcp/src/tools/section24.tool.ts:51`        |
| `evaluate_cashflow_runway_and_health`     | `packages/mcp/src/tools/financial-audit.tool.ts:19`  |
| `evaluate_uk_student_loan`                | `packages/mcp/src/tools/financial-audit.tool.ts:143` |
| `query_transactions_and_spending`         | `packages/mcp/src/tools/financial-audit.tool.ts:186` |
| `project_wealth_scenario`                 | `packages/mcp/src/tools/life-events.tool.ts:62`      |
| `simulate_uk_tax_and_pension_sacrifice`   | `packages/mcp/src/tools/uk-tax-trap.tool.ts:50`      |
| `compare_mortgage_overpay_vs_isa`         | `packages/mcp/src/tools/mortgage-isa.tool.ts:57`     |

**Resources:** `flump://context/accounts` (`resources/accounts.resource.ts:10`), `flump://context/executive-snapshot` and `flump://context/baseline` (`resources/baseline.resource.ts:10,35`), `flump://context/budget` (`resources/budget.resource.ts:10`), `flump://context/tax-ledger` (`resources/tax-ledger.resource.ts:10`). The static `flump://rules/uk-fiscal-guardrails` resource was removed in E17-N5; E17-N14 adds `flump://tax-rules/{taxYear}`.

**Prompts:** `uk-financial-health-audit`, `uk-marginal-tax-and-pension` (renamed from `escape-100k-tax-trap` in E31), `crush-high-apr-debt` (`packages/mcp/src/prompts/uk-advisor.prompts.ts`). Their wording is outside the scope of this DPIA but is addressed by the advice-boundary work (E29-T1, T6).

### 2.2 Data categories (from `data-map.md`)

| Category                                                              | Source table                  | Reaches MCP via                                                                                                                                                                                               |
| --------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Profile: income, mortgage, pension, savings settings, employment type | `user_profiles`               | `McpService.getUserFinancialData` (`apps/backend/src/mcp.service.ts:91-127`, `userProfileToFinancialBaseline`)                                                                                                |
| Accounts and balance history                                          | `accounts`, `account_details` | Same function, `financeService.getAccounts` and `getAccountDetails`                                                                                                                                           |
| Budget entries including free-text `notes`                            | `budget_entries`              | Same function; `notes` is passed through (`mcp.service.ts:123`)                                                                                                                                               |
| Tax records including `notes`                                         | `tax_records`                 | Same function; returned as `taxRecords` (the receipt base64 blob is part of the entity but see open item 9.A)                                                                                                 |
| Transactions: amount, description, category                           | `transactions`                | `McpService.queryTransactions` (`mcp.service.ts:129-166`). Only manually posted transactions exist; bank sync no longer stores them (`apps/backend/src/migrations/DeleteSyncedTransactions1794355500000.ts`). |
| Identity                                                              | WorkOS                        | Not sent through MCP. The token carries the internal `userId` only.                                                                                                                                           |
| Bank tokens                                                           | `bank_connections`            | Never sent; encrypted at rest and stripped from responses (`data-map.md`).                                                                                                                                    |

### 2.3 Authentication and scopes

- A user creates a personal access token (PAT) in the web app: `POST /mcp-tokens` (`mcp.controller.ts:49-68`). The token is `flump_pat_` plus 32 hex characters; only its hash and a display prefix are stored (`mcp.service.ts` `createPatToken`, `hashPatToken`).
- The `mcp_tokens` row holds: `name`, `token_hash`, `token_prefix`, `scopes`, `anonymize_institutions`, `expires_at`, `last_used_at`, `total_tool_calls`, `revoked_at`, `created_at` (`apps/backend/src/entities/mcp-token.entity.ts`; DDL in `Baseline1794355200000.ts:24`).
- Default scopes are `mcp:read:anonymized` and `mcp:simulate`; `anonymize_institutions` defaults to true (`mcp-token.entity.ts:20-24`, `mcp.service.ts` `createPatToken`). The wider `mcp:read:full` scope exists in the type (`packages/mcp/src/auth/token-verifier.ts:3`).
- The verifier looks up the hash, applies expiry and revocation, and records usage (`token-verifier.ts:135-141`, `mcp.service.ts:70-86`). Rate limits are 60 requests per minute and 300 per hour per bucket (`packages/mcp/src/auth/rate-limiter.ts:22`). Failed authentication is limited separately (`packages/mcp/src/auth/failed-auth-limiter.ts`).
- Users can list and revoke tokens (`GET mcp-tokens`, `DELETE mcp-tokens/:id`, `mcp.controller.ts:38-76`). Revocation sets `revoked_at`; it does not delete the row.

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

- Transaction `description` (`apps/backend/src/mcp.service.ts:158-165`, via `query_transactions_and_spending`, `financial-audit.tool.ts:240-275`).
- Budget entry `name` and `notes` (fetched `mcp.service.ts:101-105`, mapped `:115-124` with `notes` at `:123`, via `flump://context/budget` and the context pack).
- Tax record `name` and `notes` (fetched `mcp.service.ts:106-109`, returned whole at `:125`, via `flump://context/tax-ledger`).
- Account names (`accounts.resource.ts:36`).

**Mitigations, with honest status:**

| Mitigation                                                       | Status                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Synced transactions no longer stored                             | **Done.** `DeleteSyncedTransactions1794355500000.ts`; manual transactions via `POST /transactions` only.                                                                                                                                                                                                                                                                                                                                 |
| Read-only default scopes (`mcp:read:anonymized`, `mcp:simulate`) | **Done** as defaults (`mcp-token.entity.ts:20`). No write tool exists. E20 scopes (D5-A) refine this; not landed.                                                                                                                                                                                                                                                                                                                        |
| Free-text notes excluded from tool output by default             | **Not done.** `notes` is currently passed through (`mcp.service.ts:123`). Requested of E17 N4 and N9.                                                                                                                                                                                                                                                                                                                                    |
| Anonymisation                                                    | **Partial.** The only anonymisation in the code is a regex that replaces nine named bank and card brands in transaction descriptions with "Bank" (`financial-audit.tool.ts:251-256`) and institution anonymisation flags passed to the engine. It does not remove personal names, health terms or any other free text. E17 N4 plans a stronger version; not landed. Do not describe the current behaviour as anonymisation of free text. |
| Consent copy before first connection                             | **Not done** (E17-N19).                                                                                                                                                                                                                                                                                                                                                                                                                  |

**Residual risk of free-text disclosure is currently medium to high** until notes are excluded by default.

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

| #   | Risk                                                                                              | Likelihood | Severity                                 | Mitigation (planned item)                                                                                                                 | Status                                                                             |
| --- | ------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| R1  | Free-text notes or descriptions reveal Article 9 data to the provider                             | Medium     | High                                     | Exclude notes by default; stronger anonymisation (E17 N4, N9)                                                                             | Not done                                                                           |
| R2  | A non-allowlisted user creates a PAT or downloads the context pack before this DPIA is signed     | Medium     | Medium                                   | Owner allowlist and `MCP_OPEN_ACCESS` flag, with a check order of kill switch, auth, allowlist (E29-T8, `apps/backend/src/mcp-access.ts`) | Not landed. Routes `mcp.controller.ts:49,80` currently open to any signed-in user. |
| R3  | Token leaked or used after the user thinks it is revoked                                          | Low        | High                                     | Hash-only storage, revoke, expiry, rate limits, failed-auth limiter (present); audit log and revoke review (E17 N16, N17)                 | Partly done                                                                        |
| R4  | Broad scope granted by default                                                                    | Low        | Medium                                   | Default read-anonymised and simulate scopes (present); scope model (E20-N17, N18)                                                         | Partly done                                                                        |
| R5  | Model turns calculations into personal product advice                                             | Medium     | Medium (regulatory, not data protection) | Output policy `assertToolOutputPolicy` and prompt wording rules (E29-T6, E17 N11, N12, N14)                                               | Not landed. Current violations listed in E29 plan T6.                              |
| R6  | Provider retains or trains on the data                                                            | Unknown    | High                                     | Not controllable by Flump. Consent copy and plain statement (section 8; E17-N19)                                                          | Not done                                                                           |
| R7  | Role and transfer analysis is wrong, leaving Flump without needed contracts or transfer mechanism | Unknown    | High                                     | Solicitor review (section 3, E29b)                                                                                                        | Open                                                                               |
| R8  | Data not deleted with the account (tokens, audit log)                                             | Medium     | Medium                                   | Include in deletion and export work (E12 F40); retention schedule (E19)                                                                   | Not done                                                                           |
| R9  | Outputs and unverified tax figures taken as reliable                                              | Medium     | Medium                                   | `MCP_NOTICE` in every result (E29-T7, E17-N8)                                                                                             | Not landed                                                                         |
| R10 | Users cannot tell what has been shared                                                            | Medium     | Medium                                   | Audit log view (E17-N17); consent screen (E17-N19)                                                                                        | Not landed                                                                         |

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

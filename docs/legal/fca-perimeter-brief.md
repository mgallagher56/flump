# FCA perimeter brief for the launch solicitor (E29b; closes E19 B7)

> **DRAFT, agent-drafted, unreviewed, not legal advice; owner reviews and signs later.**
> Version 0.2, 2026-11-14: Fact 5, sections 3 to 5 and question 16 refreshed after the E17 re-plan (DECISIONS round 9). Version 0.1, 2026-11-12. Facts checked against `origin/main` at `73dc5227` (docs identical to `5cfe3ef0` for code). Legal references were read by an agent and are marked **[U]** where unverified. The solicitor's view supersedes everything here.

This brief packages the facts and questions for the one fixed-fee solicitor engagement at launch (DECISIONS round 3 item 15). It refreshes the facts in `docs/audit/plans/E19-plan-draft.md` section 5 and adds the mitigations built since. It is not an analysis of the law. Where a legal point is stated it is the agent's reading and is **[U]**.

How to read the references: `path:line` was checked on 2026-11-12. **[V-code]** means verified in code on that date. **[Planned]** means a ticket exists but nothing has merged. Lines drift, so the solicitor should treat them as pointers.

## 1. Facts

### Fact 1. Bank data by personal access token [V-code]

- The user pastes a Monzo or Starling personal access token, or a Trading 212 key. The wizard describes this as "Preview: connect via Personal Access Token or OAuth" (`apps/web/app/components/dialogs/connectBankWizard/ConnectBankWizard.tsx:89`). The form action is the `connectBank` intent (`apps/web/app/routes/app.accounts._index.tsx:55`) and the API route is `POST bank-connections` (`apps/backend/src/modules/finance/finance.controller.ts:176-180`).
- The backend encrypts the token with `BankSyncOrchestrator.encryptToken` and stores it on the connection (`apps/backend/src/modules/finance/finance.service.ts:178`).
- Monzo calls: `https://api.monzo.com/accounts` (`apps/backend/src/modules/banking/providers/monzo.provider.ts:58`), `/balance` (`:78`), `/pots` (`:105`) and `/transactions` (`:135`). Trading 212: `/api/v0/equity/account/cash` (`apps/backend/src/modules/banking/providers/trading212.provider.ts:58`), `/account/info` (`:76`) and `/equity/history/orders` (`:110`). Starling calls are in `apps/backend/src/modules/banking/providers/starling.provider.ts:48-173`.
- **Change since the E19 plan:** synced transactions are no longer stored, and a migration removes those already stored (`apps/backend/src/migrations/DeleteSyncedTransactions1794355500000.ts`; `docs/legal/data-map.md`). Balances and accounts are still stored.
- Data is shown back to the user with manually entered accounts, as net worth and debt.

### Fact 2. OAuth and open banking [V-code]

- OAuth endpoints for HSBC, Barclays, Revolut and Santander are configured (`apps/backend/src/modules/banking/providers/open-banking-standard.provider.ts:21-44`; the E19 plan also named NatWest, Lloyds and Chase, so the solicitor should treat the list as indicative).
- The service builds a redirect URI `${BACKEND_URL}/bank-connections/callback` only when a client id and secret are configured for the institution (`apps/backend/src/modules/finance/finance.service.ts:200-209`).
- No route found handling `bank-connections/callback` at `73dc5227`: `apps/backend/src/modules/finance/finance.controller.ts` has `bank-connections` routes at `:166,172,176-190` only. So the OAuth flow appears not to complete. This is the E19 D-05 finding, re-checked.

### Fact 3. Where bank connect is offered [V-code]

- Bank connection is owner-allowlisted. `isBankConnectionAllowed` (`apps/backend/src/modules/banking/bank-connections.access.ts:16-31`) allows ids in `BANK_CONNECTIONS_ALLOWED_USER_IDS`, or everyone when `BANK_CONNECTIONS_ENABLED=true`, and defaults to off in production. `BankConnectionsEnabledGuard` (`:33-44`) returns a 404 `feature_disabled`. It guards `POST bank-connections` and the neighbouring routes (`apps/backend/src/modules/finance/finance.controller.ts:178,184,190`), and the capability endpoint reports it (`:172-175`). Reading and disconnecting existing connections is not gated.
- **Production environment values are not visible from the repo.** The owner must confirm the Railway values before this brief is sent.
- Sign-up goes through WorkOS AuthKit (`apps/web/app/routes/signup._index.tsx:23`, `getSignUpUrl`). The route contains no allowlist. Whether sign-up is invite-only is a WorkOS configuration, not evidenced in code [owner to confirm].
- Marketing says bank connection is coming soon (`apps/marketing/src/pages/SecurityPage.tsx:83`).

### Fact 4. Calculators and user-specific outputs [V-code]

- **Debt payoff order** (avalanche and snowball) from the user's own debts: `apps/web/app/components/debt/PayoffStrategySwitcher.tsx` and `apps/web/app/features/debt/components/PayoffStrategyControls/PayoffStrategyControls.tsx`. Both strategies are shown side by side. Both labels currently carry "optimal" wording (`PayoffStrategySwitcher.tsx:303,372`; `PayoffStrategyControls.tsx:113`), which T4 will remove.
- **Mortgage overpay versus ISA.** The old "Invest 100%" recommendation string is gone. The v0.1 MCP tool `compare_mortgage_overpay_vs_isa` returned verdict-shaped keys (`recommendation`, `guaranteedInterestSavedGbp`, `favorsOption`). It was rebuilt as `compare_mortgage_overpay_vs_invest` (E17-N11), which returns none of them (checked 2026-11-14); it is deprecated and first to cut.

  The web comparison shows "Verdict: Overpay mortgage" or "Save in account / ISA" (`apps/web/app/features/mortgage/components/OverpayVsSaveCompare/OverpayVsSaveCompare.tsx:342`). Removal is planned in E17-N11 for the MCP keys and handed to E15 for the web verdict **[Planned]**.
- **Pension contribution and £100,000 taper.**
  - Web: a statement and a button "Reclaim Allowance (SIPP £X) →" (`apps/web/app/containers/pension/PensionContainer.tsx:446-458`). Its handler `handleOptimizeTaxTrap` **saves a new contribution percentage** through `handleSyncContributions` (`:366-376`). This is the highest-risk item and is planned to become a pre-fill only (E29-T4, rule R5) **[Planned]**.
  - Web: a second prompt "Apply X%" sets local state only (`apps/web/app/components/pension/PensionForecasterCard.tsx:796-825`).
  - Engine: the health score observation "Sacrifice £X into pension to reclaim your £12,570 personal allowance" (`packages/finance-engine/src/health-score.ts:174-176`), and a field `recommendedSacrifice` (`packages/finance-engine/src/uk-tax.ts:225`).
- **Segment-driven content.** A lifecycle stage is computed (`packages/finance-engine/src/health-score.ts:285-317`) and drives a dashboard hero banner with a stage title and "Priority:" line (`apps/web/app/components/dashboard/HomeDashboard.tsx:479-527`) and stage-specific health-score lines (`health-score.ts:59-176`). This engages the targeted-support question **[U]**. Planned removal under R4 (E29-T5 for the engine, E15 for the dashboard).
- **Student loan.** The engine returns `recommendation: "do_not_overpay" | "consider_overpaying"` (`packages/finance-engine/src/types.ts:205`; `debt-payoff.ts:742`), shown as "Verdict: DO NOT OVERPAY" (`packages/ui/src/calculators/StudentLoanCalculator/StudentLoanCalculator.tsx:154-155`) and "Do NOT Overpay" (`apps/web/app/components/debt/UkDebtInstrumentsCard.tsx:505`). Planned rename to `projectedOutcome` (E29-T5).
- Section 24, Gift Aid, student loan and tax-trap calculators also exist in the web app and on marketing tool pages (tax, which is generally not FCA-regulated **[U]**). The MCP versions were deleted or replaced by `get_tax_year_position` (#637, Fact 5).
- A "guidance, not advice" notice (`PROJECTION_NOTICE_TEXT`) appears on the projection pages (`packages/ui/src/patterns/ProjectionNotice/ProjectionNotice.tsx:9-10`; used, for example, at `PensionContainer.tsx:390`). The wording is interim.
- The full advice-style copy list, with proposed rewrites, is [advice-copy-inventory.md](../compliance/advice-copy-inventory.md) (E29-T2).

### Fact 5. MCP and AI assistants [V-code]

- A user creates a personal access token (`POST mcp-tokens`, `apps/backend/src/modules/agent/mcp.controller.ts:58-60`) and gives it to an AI client of their choice, which calls tools over MCP (`@Post("mcp")` at `:33`). Tokens are stored as a hash (`apps/backend/src/entities/mcp-token.entity.ts:3`, `docs/legal/data-map.md`). Outputs are not stored.
- **Refreshed 2026-11-14 after the E17 re-plan prune (#637) [V-code].** The tools are listed in the scope table `packages/mcp/src/auth/scopes.ts` (`TOOL_SCOPES`): eight reads of the user's own data (`get_financial_snapshot`, `get_balance_history`, `get_data_coverage`, `list_accounts`, `get_budget_summary`, `get_debt_overview`, `list_tax_records`, `get_tax_year_position`) and three simulations on recorded data (`simulate_debt_payoff`, `project_net_worth`, and `compare_mortgage_overpay_vs_invest`, deprecated and first to cut). Every tool declares `readOnlyHint: true` (`packages/mcp/src/define-tool.ts:49`, `tools/simulate/common.ts:16`). There is one resource, `flump://schema` (a data dictionary), and **no prompts**: the three advisor prompts were deleted.
- **Today there is no write tool.** Tokens are minted with read and simulate scopes only (`apps/backend/src/modules/agent/mcp-token.service.ts:111`).
- **Planned: staged data entry [Planned, E17 re-plan PRs C to E; DECISIONS round 9].** An AI client with a new opt-in `write:stage` scope will be able to **stage** an import of the user's own figures (for example monthly balances from the user's spreadsheet). Nothing changes in the user's live data until the user reviews and **commits** the batch in the Flump web app under their own signed-in session; no MCP token can commit, edit or delete. Batches are capped, expire after 7 days and can be reverted as a whole. Rows carry an `agent` source marker. The data-protection analysis is the DPIA addendum ([dpia-mcp.md](dpia-mcp.md) section 11, draft). The owner's working view is that recording a user's own figures is bookkeeping, not advice (question 16).
- The context pack, a text file designed to be pasted into a model, is downloadable at `GET mcp-tokens/context-pack` (`mcp.controller.ts:91-92`). Its wording was swept for advice-style lines in the E29 copy sweep (`a2fcc245`, `4a8288fd`); the v0.1 path:line references no longer apply.
- **Access is restricted [V-code].** `POST mcp-tokens` and the context pack sit behind the kill switch, sign-in and the owner allowlist (`McpKillSwitchGuard`, `AuthGuard`, `McpAllowlistGuard`, `mcp.controller.ts:58-60,91-92`; `apps/backend/src/auth/mcp-access.ts`). The owner confirms the production values: `MCP_ALLOWED_USER_IDS` set to the owner's id and `MCP_OPEN_ACCESS` unset or false.

### Fact 6. No products [V-code, with caveat]

- No provider is recommended, there are no affiliate links, payments or money movement (see `apps/marketing/src/pages/SecurityPage.tsx:83`). Caveat: some strings still use product-type judgements, for example "top-tier Cash ISA" (`health-score.ts:137-138`), which R3 will remove **[Planned]**.

### Fact 7. The owner

- An individual with no company. Flump is free and no price is set (E7). A closed beta with invited friends is planned (DECISIONS round 3 item 9). Incorporation is planned before opening beyond friends or charging (round 3 item 15).

## 2. Primary texts relied on (agent's reading; all [U] until the solicitor confirms)

From E19 section 5.2 (read from primary sources by an earlier agent; PERG 15 could not be read, so any exclusion in FCA guidance is unchecked):

- **PSRs 2017 reg 2**, account information service: online service providing consolidated information on payment accounts held with another provider, "whether information is provided (a) in its original form or after processing; (b) only to the payment service user or to the payment service user and to another person". No "own account only" exclusion was found.
- **PSRs 2017 Sch 1 Pt 2 para 2(j):** the technical-service-provider exclusion applies "excluding payment initiation services or account information services".
- **RAO article 39E:** advising a borrower about the liquidation of a debt due under a credit agreement.
- **RAO article 53(1):** advising on the merits of buying, selling or subscribing for a particular investment. Article 53A (regulated mortgage contracts) is **[U]**.
- **FSMA s21** (financial promotions) and the targeted support regime in force from 6 April 2026 are **[U]**: not read in full.
- **Monzo developer docs** limit use to your own account or a small set of users you allow. That is a contractual limit separate from regulation. Starling and Trading 212 terms are **[U]**.

## 3. What has been built to reduce risk

| Mitigation                                                            | State                              | Reference                                                              |
| --------------------------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------- |
| Bank connect owner-allowlisted, off by default in production          | In place [V-code]                  | `apps/backend/src/modules/banking/bank-connections.access.ts:16-44`    |
| Synced transactions not stored                                        | In place [V-code]                  | `DeleteSyncedTransactions1794355500000.ts`                             |
| Guidance-not-advice notice on projection pages                        | In place, interim wording [V-code] | `ProjectionNotice.tsx:9-10`                                            |
| Written advice boundary rules R1 to R8                                | Drafted, unsigned                  | [advice-boundary-policy.md](../compliance/advice-boundary-policy.md)   |
| Advice-language guard with a shrinking allow-list (web and marketing) | **[Planned]**                      | E29-T3                                                                 |
| MCP output and description policy, checked by tests                   | In place [V-code, 2026-11-14]      | `packages/mcp/src/policy/output-policy.ts` and its tests (E29-T6)      |
| Canonical notices, including the beta notice                          | **[Planned]**                      | E29-T7                                                                 |
| MCP and PAT creation allowlisted                                      | In place [V-code, 2026-11-14]      | `apps/backend/src/auth/mcp-access.ts`, `mcp.controller.ts:58-60,91-92` |
| Draft DPIA for MCP                                                    | Drafted v0.2, unsigned             | [dpia-mcp.md](dpia-mcp.md); section 11 covers staged imports (draft)   |
| MCP advisor prompts and the student-loan and legacy tax tools removed | In place [V-code, 2026-11-14]      | E17 re-plan prune (#637); `packages/mcp/src/auth/scopes.ts`            |
| Copy rewrite and neutral engine observations                          | **[Planned]**                      | E29-T4, T5                                                             |
| Gate checklist                                                        | Drafted                            | [E29-gate.md](../compliance/E29-gate.md)                               |

## 4. Scope of the near-term product

- **E25** adds tax and marginal-rate calculators and a tax hub and pension planner. They must meet rules R2, R5, R6 and R8, and show figures as "unverified" until the tax vectors are signed.
- **E26** has been folded into E17 as the single `get_tax_year_position` tool (DECISIONS round 9 item 6). No further calculator tools are planned. The recorded trigger for a separate written FCA opinion remains "E26 gains writes or names products"; no product names are planned anywhere.
- **E17 staged data entry** (re-plan PRs C to E) lets an AI client stage an import of the user's own figures, which only the user commits in the web app (Fact 5). The owner's working reading is that this is gated by the DPIA addendum and the terms line below, not by a written FCA opinion, because the trigger above covers E26 rather than E17 data entry. Question 16 asks the solicitor to confirm that reading.

### Proposed terms line: agent-staged data entry

> **PROPOSED, agent-drafted, not legal advice. For owner and solicitor approval before any write tool ships.** Placement: the terms of use, in the section on AI connections, and summarised on the token card when the `write:stage` scope is chosen.

"If you allow an AI assistant to add data to Flump, it can only prepare an import for you to check. Flump holds the prepared import for up to 7 days; nothing changes in your figures until you review it and confirm it yourself in Flump. You can undo a confirmed import, except for figures that have changed since. Flump records the figures you give it; it checks their format but not that they are correct, and does not give advice on them. You are responsible for what you confirm. The AI assistant is not provided by Flump and works under your own agreement with its provider."

## 5. Questions for the solicitor

**Bank data**

1. Does the token flow make Flump (or the owner) a provider of account information services under the PSRs 2017, given reg 2(b) and Sch 1 para 2(j)? Does it matter that the user supplies their own token rather than using PSD2 open-banking access?
2. Does the answer change if bank connect is used only by (a) the owner, (b) a handful of invited friends free of charge, or (c) the public? How does "regular occupation or business activity" apply to a free beta?
3. Is the Trading 212 connection in scope at all (is it a "payment account")?
4. Which route is realistic: registered AISP, acting as agent under an authorised aggregator, or dropping bank connection? What does each mean for marketing copy?

**Guidance versus advice**

5. Is a debt payoff order computed from the user's own balances "advice ... about the liquidation of a debt" (article 39E)? Which framings keep it on the guidance side?
6. Does mortgage-versus-ISA, shown as two projected outcomes with no verdict, amount to advising on investments (article 53) or on regulated mortgage contracts (article 53A)? Does generic "an ISA or SIPP" wording keep it outside article 53?
7. Do pension contribution, salary-sacrifice and £100,000-taper estimates raise any pension advice issue, including where a button pre-fills a what-if?
8. Does segment-driven layout (which modules show by default, based on a computed lifecycle stage) engage the targeted support regime? Is the strict rule R4 stricter than necessary?
9. Are the T1 rules R1 to R8, plus the guards, adequate controls?

**Promotions and other regimes**

10. Financial promotions (FSMA s21): could marketing or tool pages that compare overpaying with investing be an inducement to engage in investment activity? What review process is needed for marketing copy?
11. Does any FCA regime apply to the tax tools? What liability arises in negligence or misrepresentation, and are the disclaimers adequate?

**MCP and AI**

12. Is Flump responsible if a third-party AI turns Flump's calculations into personal recommendations? What should tool outputs and terms say? Does it matter whether the user pastes the context pack or connects live?
13. Roles under UK GDPR for the disclosure to the user's AI client (see [dpia-mcp.md](dpia-mcp.md) section 3).

**Status and claims**

14. Which statements of regulatory status may Flump make? (Owner-only wording today.)
15. What did the Innovation Hub say, if it replied? (Owner to attach the reply.)

**Data entry**

16. Data entry: are E17 data-entry writes (an AI client stages the user's own figures; only the user commits them in Flump) gated by the DPIA addendum and the terms line above, rather than by a written FCA opinion? Is the proposed terms line adequate?

## 6. Open items for the owner before this goes to the solicitor

1. Confirm the production values of `BANK_CONNECTIONS_*` and whether sign-up is invite-only.
2. Fact 5 was refreshed on 2026-11-14 (T8 has landed). Confirm the production values of `MCP_ALLOWED_USER_IDS` and `MCP_OPEN_ACCESS`, and refresh the staged data entry bullet once re-plan PRs C and D merge.
3. Attach the Hub enquiry ([fca-innovation-hub-enquiry.md](fca-innovation-hub-enquiry.md)) as sent, its send date and any reply.
4. Re-run the path:line checks if more than a few weeks pass.

## Review

| Role                     | Name | Date | Notes |
| ------------------------ | ---- | ---- | ----- |
| Owner                    |      |      |       |
| Solicitor (E29b, launch) |      |      |       |

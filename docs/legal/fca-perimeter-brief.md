# FCA perimeter brief for the launch solicitor (E29b; closes E19 B7)

> **DRAFT, agent-drafted, unreviewed, not legal advice; owner reviews and signs later.**
> Version 0.1, 2026-11-12. Facts checked against `origin/main` at `73dc5227` (docs identical to `5cfe3ef0` for code). Legal references were read by an agent and are marked **[U]** where unverified. The solicitor's view supersedes everything here.

This brief packages the facts and questions for the one fixed-fee solicitor engagement at launch (DECISIONS round 3 item 15). It refreshes the facts in `docs/audit/plans/E19-plan-draft.md` section 5 and adds the mitigations built since. It is not an analysis of the law. Where a legal point is stated it is the agent's reading and is **[U]**.

How to read the references: `path:line` was checked on 2026-11-12. **[V-code]** means verified in code on that date. **[Planned]** means a ticket exists but nothing has merged. Lines drift, so the solicitor should treat them as pointers.

## 1. Facts

### Fact 1. Bank data by personal access token [V-code]

- The user pastes a Monzo or Starling personal access token, or a Trading 212 key. The wizard describes this as "Preview: connect via Personal Access Token or OAuth" (`apps/web/app/components/dialogs/connectBankWizard/ConnectBankWizard.tsx:89`). The form action is the `connectBank` intent (`apps/web/app/routes/app.accounts._index.tsx:55`) and the API route is `POST bank-connections` (`apps/backend/src/finance.controller.ts:176-180`).
- The backend encrypts the token with `BankSyncOrchestrator.encryptToken` and stores it on the connection (`apps/backend/src/finance.service.ts:178`).
- Monzo calls: `https://api.monzo.com/accounts` (`apps/backend/src/providers/monzo.provider.ts:58`), `/balance` (`:78`), `/pots` (`:105`) and `/transactions` (`:135`). Trading 212: `/api/v0/equity/account/cash` (`apps/backend/src/providers/trading212.provider.ts:58`), `/account/info` (`:76`) and `/equity/history/orders` (`:110`). Starling calls are in `apps/backend/src/providers/starling.provider.ts:48-173`.
- **Change since the E19 plan:** synced transactions are no longer stored, and a migration removes those already stored (`apps/backend/src/migrations/DeleteSyncedTransactions1794355500000.ts`; `docs/legal/data-map.md`). Balances and accounts are still stored.
- Data is shown back to the user with manually entered accounts, as net worth and debt.

### Fact 2. OAuth and open banking [V-code]

- OAuth endpoints for HSBC, Barclays, Revolut and Santander are configured (`apps/backend/src/providers/open-banking-standard.provider.ts:21-44`; the E19 plan also named NatWest, Lloyds and Chase, so the solicitor should treat the list as indicative).
- The service builds a redirect URI `${BACKEND_URL}/bank-connections/callback` only when a client id and secret are configured for the institution (`apps/backend/src/finance.service.ts:200-209`).
- I found **no route handling `bank-connections/callback`** in `apps/backend/src/finance.controller.ts` (it has `bank-connections` routes at `:166,172,176-190` only). So the OAuth flow does not complete. This is the E19 D-05 finding, re-checked.

### Fact 3. Where bank connect is offered [V-code]

- Bank connection is owner-allowlisted. `isBankConnectionAllowed` (`apps/backend/src/bank-connections.access.ts:16-31`) allows ids in `BANK_CONNECTIONS_ALLOWED_USER_IDS`, or everyone when `BANK_CONNECTIONS_ENABLED=true`, and defaults to off in production. `BankConnectionsEnabledGuard` (`:33-44`) returns a 404 `feature_disabled`. It guards `POST bank-connections` and the neighbouring routes (`apps/backend/src/finance.controller.ts:178,184,190`), and the capability endpoint reports it (`:172-175`). Reading and disconnecting existing connections is not gated.
- **Production environment values are not visible from the repo.** The owner must confirm the Railway values before this brief is sent.
- Sign-up goes through WorkOS AuthKit (`apps/web/app/routes/signUp._index.tsx:18`, `getSignUpUrl`). The route contains no allowlist. Whether sign-up is invite-only is a WorkOS configuration, not evidenced in code [owner to confirm].
- Marketing says bank connection is coming soon (`apps/marketing/src/pages/SecurityPage.tsx:83`).

### Fact 4. Calculators and user-specific outputs [V-code]

- **Debt payoff order** (avalanche and snowball) from the user's own debts: `apps/web/app/components/debt/PayoffStrategySwitcher.tsx` and `apps/web/app/features/debt/components/PayoffStrategyControls/PayoffStrategyControls.tsx`. Both strategies are shown side by side. Both labels currently carry "optimal" wording (`PayoffStrategySwitcher.tsx:303,372`; `PayoffStrategyControls.tsx:113`), which T4 will remove.
- **Mortgage overpay versus ISA.** The old "Invest 100%" recommendation string is gone. The MCP tool `compare_mortgage_overpay_vs_isa` still returns a verdict-shaped result:
  - a `recommendation` key reading "Not applicable ... This is a calculation, not advice" (`packages/mcp/src/tools/mortgage-isa.tool.ts:88-89`);
  - `guaranteedInterestSavedGbp` (`:132`);
  - `favorsOption` with `"TAX_FREE_ISA_COMPOUNDING"` or `"GUARANTEED_MORTGAGE_OVERPAYMENT"` (`:143-146`).

  The web comparison shows "Verdict: Overpay mortgage" or "Save in account / ISA" (`apps/web/app/features/mortgage/components/OverpayVsSaveCompare/OverpayVsSaveCompare.tsx:342`). Removal is planned in E17-N11 for the MCP keys and handed to E15 for the web verdict **[Planned]**.
- **Pension contribution and £100,000 taper.**
  - Web: a statement and a button "Reclaim Allowance (SIPP £X) →" (`apps/web/app/containers/pension/PensionContainer.tsx:446-458`). Its handler `handleOptimizeTaxTrap` **saves a new contribution percentage** through `handleSyncContributions` (`:366-376`). This is the highest-risk item and is planned to become a pre-fill only (E29-T4, rule R5) **[Planned]**.
  - Web: a second prompt "Apply X%" sets local state only (`apps/web/app/components/pension/PensionForecasterCard.tsx:796-825`).
  - Engine: the health score observation "Sacrifice £X into pension to reclaim your £12,570 personal allowance" (`packages/finance-engine/src/health-score.ts:174-176`), and a field `recommendedSacrifice` (`packages/finance-engine/src/uk-tax.ts:225`).
- **Segment-driven content.** A lifecycle stage is computed (`packages/finance-engine/src/health-score.ts:285-317`) and drives a dashboard hero banner with a stage title and "Priority:" line (`apps/web/app/components/dashboard/HomeDashboard.tsx:479-527`) and stage-specific health-score lines (`health-score.ts:59-176`). This engages the targeted-support question **[U]**. Planned removal under R4 (E29-T5 for the engine, E15 for the dashboard).
- **Student loan.** The engine returns `recommendation: "do_not_overpay" | "consider_overpaying"` (`packages/finance-engine/src/types.ts:205`; `debt-payoff.ts:742`), shown as "Verdict: DO NOT OVERPAY" (`packages/ui/src/calculators/StudentLoanCalculator/StudentLoanCalculator.tsx:154-155`) and "Do NOT Overpay" (`apps/web/app/components/debt/UkDebtInstrumentsCard.tsx:505`). Planned rename to `projectedOutcome` (E29-T5).
- Section 24, Gift Aid, student loan and tax-trap tools also exist (tax, which is generally not FCA-regulated **[U]**).
- A "guidance, not advice" notice (`PROJECTION_NOTICE_TEXT`) appears on the projection pages (`packages/ui/src/patterns/ProjectionNotice/ProjectionNotice.tsx:9-10`; used, for example, at `PensionContainer.tsx:390`). The wording is interim.
- The full advice-style copy list, with proposed rewrites, is [advice-copy-inventory.md](../compliance/advice-copy-inventory.md) (E29-T2).

### Fact 5. MCP and AI assistants [V-code]

- A user creates a personal access token (`POST mcp-tokens`, `apps/backend/src/mcp.controller.ts:49-51`) and gives it to an AI client of their choice, which calls tools over MCP (`@Post("mcp")` at `:26`). Tokens are stored as a hash (`apps/backend/src/entities/mcp-token.entity.ts:3`, `docs/legal/data-map.md`). Outputs are not stored.
- The tools (`registerTool` calls in `packages/mcp/src/tools/`) are: `simulate_debt_payoff`, `evaluate_cashflow_runway_and_health`, `evaluate_uk_student_loan`, `query_transactions_and_spending`, `project_wealth_scenario`, `compare_mortgage_overpay_vs_isa`, `calculate_self_assessment_and_section24` and `simulate_uk_tax_and_pension_sacrifice`. **I found no write tool**; at least one tool declares `readOnlyHint: true` (`life-events.tool.ts:68`), and I did not check the others for the hint.
- The context pack, a text file designed to be pasted into a model, is downloadable at `GET mcp-tokens/context-pack` (`mcp.controller.ts:80-86`). It carries advice-style lines today (`packages/finance-engine/src/ai-context-pack.ts:332,367`).
- Prompts carry advice-style wording (`packages/mcp/src/prompts/uk-advisor.prompts.ts:28,39,53,62-75`) **[Planned]** rewrite in E17-N14.
- **Access is not yet restricted.** `POST mcp-tokens` and the context pack have `AuthGuard` only (`mcp.controller.ts:50,81`). The owner allowlist (`MCP_ALLOWED_USER_IDS`, with `MCP_OPEN_ACCESS` unset) is **[Planned]** in E29-T8. **This fact must be refreshed to "allowlisted" after T8 lands and the owner has set the variables.**

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

| Mitigation                                                            | State                              | Reference                                                            |
| --------------------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------- |
| Bank connect owner-allowlisted, off by default in production          | In place [V-code]                  | `apps/backend/src/bank-connections.access.ts:16-44`                  |
| Synced transactions not stored                                        | In place [V-code]                  | `DeleteSyncedTransactions1794355500000.ts`                           |
| Guidance-not-advice notice on projection pages                        | In place, interim wording [V-code] | `ProjectionNotice.tsx:9-10`                                          |
| Written advice boundary rules R1 to R8                                | Drafted, unsigned                  | [advice-boundary-policy.md](../compliance/advice-boundary-policy.md) |
| Advice-language guard with a shrinking allow-list (web and marketing) | **[Planned]**                      | E29-T3                                                               |
| MCP output and description policy, checked by tests                   | **[Planned]**                      | E29-T6                                                               |
| Canonical notices, including the beta notice                          | **[Planned]**                      | E29-T7                                                               |
| MCP and PAT creation allowlisted                                      | **[Planned]**                      | E29-T8                                                               |
| Draft DPIA for MCP                                                    | **[Planned]**                      | E29-T9                                                               |
| Copy rewrite and neutral engine observations                          | **[Planned]**                      | E29-T4, T5                                                           |
| Gate checklist                                                        | Drafted                            | [E29-gate.md](../compliance/E29-gate.md)                             |

## 4. Scope of the near-term product

- **E25** adds tax and marginal-rate calculators and a tax hub and pension planner. They must meet rules R2, R5, R6 and R8, and show figures as "unverified" until the tax vectors are signed.
- **E26** (not yet planned in detail) would let an AI assistant use Flump through MCP, possibly with more tools. It is gated by the DPIA signed, no-recommendation evals, the Hub reply or 8 weeks, and an audit log. Writes or product names would be a trigger for a separate written FCA opinion.
- **E17 phase 4** (agent writes) is blocked until the DPIA covers writes.

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
13. Roles under UK GDPR for the disclosure to the user's AI client (see the DPIA draft once it exists).

**Status and claims**

14. Which statements of regulatory status may Flump make? (Owner-only wording today.)
15. What did the Innovation Hub say, if it replied? (Owner to attach the reply.)

## 6. Open items for the owner before this goes to the solicitor

1. Confirm the production values of `BANK_CONNECTIONS_*` and whether sign-up is invite-only.
2. Refresh Fact 5 once T8 has landed and the variables are set.
3. Attach the Hub enquiry ([fca-innovation-hub-enquiry.md](fca-innovation-hub-enquiry.md)) as sent, its send date and any reply.
4. Re-run the path:line checks if more than a few weeks pass.

## Review

| Role                     | Name | Date | Notes |
| ------------------------ | ---- | ---- | ----- |
| Owner                    |      |      |       |
| Solicitor (E29b, launch) |      |      |       |

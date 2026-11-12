# E16 plan draft: Product and functionality review (value, journeys, bloat)

Status: **draft for owner review. Nothing implemented, no files written.** Planning was read-only, against `f5d05b0` (main checkout and the `e1-auth-fail-closed` worktree; both on the same HEAD). I also read `docs/audit/*` and `docs/audit/plans/*`, plus the E12 inventory and plan, which exist only in `/Users/marcgallagher/personal/flump/.claude/worktrees/e2-backend-no-seeding-3ba884/docs/audit/plans/`. There is no E15 document yet in any worktree, so this plan treats E15 (visual/UX elevation) as a sibling epic whose scope is still open.

AGENTS.md laws this epic touches: phases 0 to 3 produce documents only, so no law applies to them except section 6 (subagent model tiers) and section 7 (rtk). Phase 4 tickets touch section 1 (colocation, when a merge creates new components), section 2 (tokens and tabular-nums on any surface that moves), section 3 (KpiStrip, SimulatorSplitLayout, SliderField and CollapsibleDrawer on merged simulator pages) and sections 4 and 5 (Definition of Done plus the four `bun run` checks on every execution PR).

---

## 1. Goals and non-goals

**Goals**
1. A complete, evidence-backed inventory of every user-facing feature across web, backend, finance-engine, MCP, banking and marketing. Each entry records its state (real, partial, mock, stub or dead) and what it depends on.
2. Score every feature on one rubric and place it in one of four buckets: MOST VALUABLE, NICE-TO-HAVE, BLOAT-SLOP or NO VALUE. Each placement carries a recommended action: keep, fix, merge, demote, cut or add.
3. Journey maps for five key journeys. Each map shows friction, drop-off points, aha moments and a target time to first value.
4. A decision pack the owner can mark, with a recommendation on every row.
5. Execution tickets for cuts, merges, navigation and IA changes, and the top-3 additive features. Each ticket lists its blast radius: routes, endpoints, tests, marketing claims, MCP tools and E12 inventory rows.
6. A roadmap and metrics, plus a privacy-first instrumentation proposal and an owner-run interview kit.
7. Unblock other epics. E6 gets finish, flag or delete decisions; E12 gets a frozen feature list; E15 and E9 get the list of pages worth polishing or migrating.

**Non-goals**
- Shipping large features. Additive work stops at tickets plus at most a spike. Small cuts and merges are executed only after owner sign-off, and in phase 4.
- Re-auditing security, correctness or accessibility. E1, E4 and E8 own those. E16 uses their findings as inputs to the trust and risk scores.
- Visual redesign. That is E15. E16 decides *what* exists and *where*; E15 decides *how it looks*.
- Pricing and billing design (the E7 decision stands: placeholder price, no trial).
- Regulatory sign-off. E16 flags exposure; it does not clear it.

---

## 2. What exists today (inventory seed from code)

Phase 0 must verify all of this. It is the starting point, not the result.

**Web routes** (`apps/web/app/routes/`): `/` (signed-out `LoggedOutHome`, signed-in `HomeDashboard`, plus a `?demo=true` branch at `_index.tsx:23-25`), `/app` gate, `/app/onboarding` (1,228 lines, 3 steps at `app.onboarding.tsx:98-115`), `/app/accounts`, `/app/accounts/:account`, `/app/budget`, `/app/debt`, `/app/savings`, `/app/pension`, `/app/mortgage`, `/app/forecast`, `/app/tax`, `/app/profile`, `/sandbox` and `/app/sandbox`, `/tools` and `/tools/:slug` (7 calculators, slugs at `tools.$slug.tsx:42,90,137,186,223,249,275`), and the auth and plumbing routes. `auth.callback.tsx` duplicates `callback.tsx`.

**Page registry**: `apps/web/app/utils/pageConfig.ts` has 8 page keys. All are enabled by default (`DEFAULT_ENABLED_PAGES = [...ALL_PAGE_KEYS]`) and each has a dashboard widget.

**Feature components by page** (from the container imports):
- **Home**: KPIs "Total Net Worth", "Monthly Net Surplus", "Weekly Safe-to-Spend" (`HomeDashboard.tsx` around lines 378-423), a financial-stage hero (`:472-527`), `SetupChecklist`, 8 widgets with `WidgetSettingsModal` (per-widget config, order and sizes, stored on the profile), and `DemoModeBanner`.
- **Accounts**: list, `AddEditAccountsDialog`, `ConnectBankWizard`, `BankConnectionsList`, `MonthlyBalanceCheckInDrawer`, `AnnualAllowancePill`.
- **Account detail**: history chart and ledger. Editing calls endpoints that do not exist (G-04).
- **Budget**: `BudgetDashboard` (1,012 lines; its "MTD actuals" are fabricated, I-03), `BudgetCategoryTable`, `BudgetSetupWizard` (1,003), `RunwayCalculator` (1,236; settings in localStorage via `utils/runwayStorage.ts:17-45`), `AddCategoryModal`.
- **Debt**: `DebtSummaryCards`, `DebtAccountsList`, `AddDebtDialog`, `PayoffStrategySwitcher` (avalanche vs snowball), `UkDebtInstrumentsCard` (0% cliff, overdraft, car-finance balloon, student loan), `DebtToWealthBridgeCard`.
- **Savings**: summary cards, accounts list, `SavingsForecasterCard` (wraps `SavingsForecaster`), `AnnualAllowancePill`.
- **Pension**: summary, accounts list, `PensionForecasterCard` (1,180), `PensionQuickStartWizard`, salary sacrifice and the £100k trap via `calculateEmployerNISavings`.
- **Mortgage** (1,225 lines): `MortgageTracker`, `OverpaymentSimulator`, `OverpayVsSaveCompare`, `RemortgageShockSim`, LTV milestones.
- **Forecast**: `SavingsForecaster` (the same component as on Savings), `UKTaxCalculator` (take-home) and `TaxTrapAlertBanner`.
- **Tax** (2,198 lines): Self Assessment records per tax year, `TaxIncomeSectionCard`, `CopyTaxYearModal`, `PaymentsOnAccountCard`, `TaxTrapAlertBanner`, receipts stored as base64, and a multi-year comparison.
- **Profile** (`UserProfilePanel`, 1,348 lines): personal and income fields, a selector for 11 countries and currencies (`:42-52`), Irish take-home (`:227-228`), BTL fields, change password, the "AI & MCP Access" tab (`:506`) rendering a fake `<McpConnectionCard />` (`:987`, G-06), and the reset Danger Zone (`:902-931`).

**Childcare**: there is no separate childcare calculator. Childcare appears only as copy inside the £100k trap tool (`tools.$slug.tsx:45-70`), in `TaxTrapAlertBanner.tsx:131`, and as a scenario in the dead `ScenarioLayersWidget.tsx:30`. Marketing still sells it as a feature (`PricingPage.tsx:369`, marketing `FeaturePillars.tsx:204`).

**Dead code** (no non-test importer; I checked with grep):
- `components/navigation/GlobalBaselineScenarioBar.tsx` and `state/scenario.store.ts`
- `components/forecast/ScenarioLayersWidget.tsx`
- `components/home/WealthCheckHeroWidget.tsx`
- `components/savings/SavingsQuickStartWizard.tsx`
- `features/sandbox/components/SandboxTemplates`, which `routes/sandbox.tsx` does not import
- `features/debt/components/{PayoffStrategyControls,PromoCliffTracker}`

The two `features/debt` components and `SandboxTemplates` are the only web components that use `SimulatorSplitLayout`, `SliderField` or `CollapsibleDrawer` (I-09). Deleting them could throw away the only law-compliant versions, so cut versus adopt is a decision (D10).

**Maths outside finance-engine** (a coarse grep heuristic; phase 1 must confirm): `SavingsForecaster.tsx`, `SavingsForecasterCard.tsx`, `PensionForecasterCard.tsx`, `RunwayCalculator.tsx`, the four `components/mortgage/*` simulators and `MortgageContainer.tsx` contain local `/ 12` compounding or amortisation. The public tools are better: they come from `packages/ui/src/calculators/*`, which import `@flump/finance-engine`. This matters for the trust score, and it is the web equivalent of B-07.

**Engine exports with no direct `apps/web/app` consumer** (grep): `calculateFinancialHealthScore`, `projectCrossoverWealth`, `analyzePromoCliff`, `calculateSection24*` and `calculateMortgageVsIsa`. The last two are probably used through `packages/ui` calculators or MCP; phase 0 verifies.

**Data dependency gap** (needs verification):
- `FinancialBaseline` (`packages/finance-engine/src/types.ts:25-49`) needs `ukRegion`, `studentLoanPlan` and `age`.
- `user_profile` (`apps/backend/src/entities/user-profile.entity.ts:12-222`) has none of these columns.
- `userProfileToFinancialBaseline` reads `profile.studentLoanPlan` (`profile.ts:233`) and otherwise falls back to defaults `ENGLAND_NI_WALES` and `NONE` (`profile.ts:17,33`).

If confirmed, Scottish taxpayers and student-loan payers silently get wrong take-home and trap figures in signed-in pages. Those are the core personas.

**Client-only state** that is lost across devices or users:
- the runway settings
- the checklist dismissal (`SetupChecklist.tsx:130,240`)
- the baseline (`baseline.store.ts:14,47`), whose localStorage key `flump_financial_baseline_v1` is not scoped to a user (G-10)

**Backend: what the product stores** (controllers):
- accounts, account-details (GET only), portfolio-snapshot, transactions (GET and POST; no web consumer, G-09), and bank-connections (`finance.controller.ts:100-171`)
- budget-entries, seed-defaults, categories and `reset` (`budget.controller.ts:204-352`)
- tax-records with bulk (`tax.controller.ts:56-825`; the seed still sits at `:46-758` on this HEAD)
- user-profile, change and update password, password reset, reset-financial-data and checklist (`user-profile.controller.ts:60-98`)
- mcp transport, mcp-tokens and context-pack (`mcp.controller.ts:26-80`)

There is no account deletion and no export.

**MCP** (`packages/mcp/src/tools/*`): 8 tools. They are `simulate_uk_tax_and_pension_sacrifice`, `compare_mortgage_overpay_vs_isa`, `evaluate_cashflow_runway_and_health`, `evaluate_uk_student_loan`, `query_transactions_and_spending` (the stdio fallback returns `[]`, G table), `simulate_debt_payoff`, `project_wealth_scenario` and `calculate_self_assessment_and_section24`. There are also 4 resources and `prompts/uk-advisor.prompts.ts`. `baseline.resource.ts:109-114` hard-codes Scottish bands, which is outside the engine and a correctness candidate.

**Banking**: personal access tokens (PAT) work for Monzo, Starling and Trading212. OAuth has no callback (G-02). The open-banking-standard providers are unproven (G-05). Plaid and sandbox are mocks and unwired (G-07). The CSV parser is real but unwired (G-08).

**Marketing** (`apps/marketing/src/App.tsx:14-20`): `/`, `/tools`, `/tools/:slug` (a landing page whose CTA goes to `${appUrl}/signUp`, `ToolPage.tsx:37-41`), `/pricing` (claims at `PricingPage.tsx:203-404`, including CSV import, FCA sync, childcare and auto-categorisation), `/security` and `/mcp`. A second public home, with about 15 duplicated section components, lives inside the web app (`components/home/*`).

**Other surface**: i18n ships `en` and `es` (`apps/web/app/i18n.ts:2`). Two demo systems exist: `?demo=true` and `/sandbox` (I-10).

---

## 3. Evaluation framework

### 3.1 Criteria (each scored 1 to 5, with anchors)

| Code | Criterion | 1 | 3 | 5 |
|---|---|---|---|---|
| V | User value: does it answer a real money question or job? | Decorative; no decision changes | Useful context; occasionally changes a decision | Directly changes a decision worth more than £100/yr or reduces real anxiety |
| F | Frequency | Once ever | Quarterly or yearly (tax year, remortgage) | Weekly or monthly ritual |
| D | Differentiation vs UK alternatives (Monzo/Starling in-app, Emma, Snoop, MoneySavingExpert calculators, HMRC tools and personal tax account, MoneyHelper, salary calculators, a spreadsheet) | Free and better elsewhere | Comparable, but Flump adds personalisation from the user's own data | Not available in combination elsewhere (e.g. trap plus sacrifice plus student loan on your own numbers, or AI via MCP) |
| T | Correctness and trust of output | Shows fabricated or known-wrong numbers | Plausible; maths outside the engine or untested; open E4 findings | Engine-backed, vector-tested, sourced, with disclaimers where needed |
| DD | Data dependency (higher means the data is easier to get) | Needs data the product cannot get (actuals without bank or CSV) | Needs manual entry of several fields | Works from onboarding answers or a few inputs |
| C | Completeness | Dead, unreachable, or the core action 404s | Works with gaps (no persistence, no empty state) | End to end, with persistence and all states |
| M | Maintenance cost (inverted: 5 = cheap) | More than 1,000 lines, duplicated, local maths, yearly rule updates | Moderate | Small, engine-backed, few rules |
| R | Risk and regulatory exposure (inverted: 5 = safe) | Implies regulated activity (personal advice, debt counselling, AISP) or holds sensitive data with no deletion | Guidance with disclaimer | Pure information or calculation |
| E | Effort to bring to "good" (inverted: 5 = small) | L or more, plus a backend change | M | S |

### 3.2 Scores and gates

- **Value** = (3V + 2F + 2D) / 7
- **Health** = (2T + DD + C) / 4
- **Cost** = (M + R + E) / 3 (higher is cheaper and safer)
- **Gates**, which override buckets:
  - T = 1 means the feature cannot stay visible until fixed or hidden.
  - R = 1 means legal or owner review is needed before keep or add.
  - "Duplicate of X" is a flag that forces a merge decision.
  - "Dead" (no importer or route) means NO VALUE.

### 3.3 Buckets

- **MOST VALUABLE**: Value ≥ 4.0 and D ≥ 3. These are the reason to use Flump. The action is *keep* if Health ≥ 3.5, otherwise *fix first*. Investment priority goes here.
- **NICE-TO-HAVE**: Value 3.0 to 3.9. The action is *keep* if Health ≥ 3 and Cost ≥ 3. Otherwise *demote* (move behind a module toggle, a secondary tab, or the tools page) or *merge* into a MOST VALUABLE host.
- **BLOAT-SLOP**: Value < 3.0 with Cost < 3, **or** a duplicate flag, **or** any of these slop signals: fabricated or decorative figures, copy heavy with "engine" and "unlock" (L-15), more than 800 lines for a low-frequency job, no persistence where the user expects it, inconsistent parallel implementations. The action is *merge*, *demote* or *cut*.
- **NO VALUE**: Value ≤ 2.0, or dead or unreachable code, or a promise with no implementation (marketing-only). The action is *cut*, or for marketing-only items, remove the claim (E7).

### 3.4 Calibration

Two sonnet agents score 3 anchor features independently: Debt payoff (expected MOST VALUABLE but T-gated), the Runway calculator (expected NICE or BLOAT), and the Irish take-home (expected NO VALUE). Target: within ±1 on at least 80% of criterion scores. Where they disagree, tighten the anchor text before phase 1. The owner reviews the anchors in 15 minutes.

---

## 4. Evidence plan (pre-launch, N = 1 real user)

1. **Agent heuristic walkthroughs in a real browser.**
   - Set-up: run the docker-compose stack locally with the dev auth bypass (E11 D4; confirm `auth.server.ts` dev path after E1). Use the browser automation available at execution time, either the Playwright MCP or Chrome control.
   - Seed three persona fixtures through an explicit dev script, never production.
   - Per page, capture screenshots at 375 and 1440 px in light and dark mode, plus clicks-to-value, number of inputs before the first output, empty, error and loading states, and whether edits persist across a reload.
   - Lens: Nielsen's heuristics through `design-critique` and `interaction-design`.
2. **Analytics-less proxies, measured from code and runtime:**
   - feature depth (route clicks from Home)
   - *state after onboarding*: what each page shows for a persona who has only completed onboarding. Is the output personalised, a generic default, empty, or fabricated?
   - empty-state dead ends: no next action offered
   - a data-dependency matrix: the fields each feature needs against what onboarding collects and what the backend stores (§2 gap)
   - code weight: lines of code, test count, `git log --since` churn, and the share of local maths against engine calls
3. **The owner's own usage, run by the owner, aggregate only.**
   - A read-only SQL template gives counts and last-`updatedAt` per table for the owner's user id: accounts, budget entries, tax records, bank connections, mcp tokens, account details. It returns no values, and the owner runs it.
   - Plus a 2-week **diary**: the owner logs each session (job, page, did it answer the question, workaround used). Template supplied in phase 0.
4. **Jobs-to-be-done map.** For each job, list the features that serve it and the competitors that already do it. Draft jobs:
   - "Know if I'm OK this month"
   - "Know my net worth trend"
   - "Pay off debt fastest"
   - "Overpay the mortgage or invest?"
   - "Avoid the £100k trap and keep childcare support"
   - "Am I on track for retirement?"
   - "Get my Self Assessment numbers right"
   - "Ask an AI about my finances safely"
5. **Persona hypotheses** (validated in interviews):
   - **P1 Sam, 29**: PAYE, £38k, Plan 2 student loan, renting and saving for a first home (LISA or ISA).
   - **P2 Priya, 41**: £105k to £120k, two children under 5, salary sacrifice, mortgage. Hits the £100k trap and the childcare cliff.
   - **P3 Gareth, 52**: saver planning a pension, mortgage near its end, ISA and SIPP, thinking about early retirement.
   - **P4 Dan, 35**: PAYE plus a side business or one buy-to-let, files Self Assessment (Section 24).
   - **P5 Alex**: AI-forward power user, wants Claude or ChatGPT over their numbers via MCP.
   - **P6** (stress-test only): debt-stressed renter with cards and an overdraft. This tests the advice boundary.
6. **Competitive desk research** (`research` and `ux-strategy` skills). For each job, record what Monzo, Starling, Emma, Snoop, MoneySavingExpert, the HMRC calculators and personal tax account, MoneyHelper and a typical spreadsheet do today, with the date checked and a link. Mark anything not verified as "unverified". No claims from memory.
7. **User tests**: 5 to 8 interviews run by the owner (§8).

---

## 5. Journey maps (phase 2 deliverable; current state seeded from audit I and G)

| Journey | Current path and friction (code evidence) | Likely drop-off | Aha moment to engineer | Target |
|---|---|---|---|---|
| J1 First run to first insight | Marketing, then WorkOS, then `/app`, then `/`, then onboarding: 2 redirects (I first-run table). The 15 onboarding inputs are pre-filled with fiction (I-05). There is no bank step. The dashboard shows £0 KPIs and fabricated debt (I-02). | Onboarding step 2; a dashboard full of zeros | "Your take-home is £X; you are £Y from the £100k trap / your safe-to-spend is £Z a week", computed from *their* answers | **Time to first value under 3 minutes, with at most 6 required inputs**. Signed-out tools under 60 seconds. |
| J2 Monthly check-in | Budget has no month dimension (I-13). Actuals are fake (I-03). The check-in drawer lives on Accounts (`MonthlyBalanceCheckInDrawer`). History editing 404s (G-04). | Nothing to do after viewing | "Net worth up £N since last month; surplus £S, put it here" | One flow, under 5 minutes |
| J3 Overpay the mortgage or invest? | Split across the Mortgage page (`OverpayVsSaveCompare`, local maths), the `/tools/mortgage-overpay-vs-isa` tool (engine) and MCP `compare_mortgage_overpay_vs_isa`. Three implementations. | Conflicting numbers between surfaces | One answer, prefilled from the user's mortgage and savings, with assumptions shown | One engine function, one UI, linked from all three |
| J4 Tax-year planning | Trap appears in Pension, Forecast banner, Tax banner, tool and MCP. Take-home sits on Forecast. SA records sit on Tax. Region and student loan are not stored (§2). The 6 April boundary is an E4 item. | User cannot find "what should I do before 5 April" | "Sacrifice £X to recover £Y and keep childcare" | One "Tax year" hub with a checklist that is aware of the deadline |
| J5 Connect AI via MCP | Profile tab, then a fake token (G-06). The `npx @flump/mcp` package is private (M-10). Auth is not fail-closed until E1. | 100% fail at the token step | Claude answers "can I afford X" from real data | A working token, then the first tool call, in under 5 minutes; preview label |

For each journey, phase 2 produces: a stage table (doing, thinking, feeling, touchpoint, pain, opportunity), screenshots from the walkthrough, the measured click and input counts, and 2 or 3 redesign options (A minimal fix, B merge, C rethink) with effort.

---

## 6. First-pass bucket hypothesis

**HYPOTHESIS, NOT A CONCLUSION. Phase 1 validates or overturns every row.**

| Feature | Hypothesised bucket | Proposed action | Key evidence and why |
|---|---|---|---|
| £100k trap, pension sacrifice, employer NI (Pension, tools, MCP) | MOST VALUABLE | Fix (E4 vectors; persist region and student loan; one surface) | High £ value for P2, weak in competitors on your own numbers; T is low until C-01/C-02 are fixed |
| UK take-home calculator (`UKTaxCalculator` on Forecast) | MOST VALUABLE (as part of the tax hub) | Merge into Tax | Common need; HMRC and salary calculators exist, so D is only high when personalised |
| Debt payoff: avalanche vs snowball, 0% cliff, overdraft | MOST VALUABLE for P6, T-gated | Fix (E2 T8-T11), add an advice-boundary review | Fabricated debts (I-01); R needs a guidance-vs-advice check |
| Mortgage: overpay vs invest | MOST VALUABLE | Merge three implementations into the engine | J3 above |
| Accounts and net worth, manual | MOST VALUABLE (foundation) | Keep; fix history editing (G-04) or remove it | Everything else depends on it |
| Home dashboard KPIs and safe-to-spend | MOST VALUABLE if honest | Fix empty states; KpiStrip | I-02, I-04 |
| Onboarding | MOST VALUABLE (activation) | Fix: shorten to the TTFV path; collect region and student loan | I-05 |
| Pension pots and forecaster | NICE-TO-HAVE (high for P3) | Keep; move maths to the engine | Local maths in `PensionForecasterCard.tsx` |
| Savings pots, AER, ISA allowance pill | NICE-TO-HAVE | Keep; merge forecaster duplication | `SavingsForecaster` is used on both Savings and Forecast |
| Budget plan (categories, surplus) | NICE-TO-HAVE | Keep plan-only; hide actuals | I-03; Monzo and Emma beat it on actuals |
| Self Assessment ledger (Tax records, receipts, copy year, payments on account) | NICE-TO-HAVE for P4, BLOAT for P1 to P3 | Demote: module off by default unless the user has self-employed or rental income | 2,198 lines; receipts in list responses (E12 B10) |
| Section 24 | NICE-TO-HAVE (P4) | Keep inside the Tax module and tools | Niche, but a real differentiator for landlords |
| MCP AI access | MOST VALUABLE *differentiator* if made real; currently NO VALUE (fake) | Fix behind a preview flag after E1, or hide | G-06, M-10 |
| Public tools (7) | MOST VALUABLE for acquisition | Keep one host; fix the SEO duplication (M-03, M-04) | Engine-backed; the best TTFV in the product |
| Forecast page as its own route | BLOAT (duplicate) | Merge into Savings, Pension and Tax; redirect `/app/forecast` | It is three components borrowed from other pages |
| Runway calculator (1,236 lines, localStorage) | BLOAT-SLOP | Demote to one "emergency fund months" card in Budget | Overlaps safe-to-spend and the stage hero |
| Financial stage hero and health score | NICE-TO-HAVE or BLOAT | Fix inputs (I-01 literals) or cut | The health score has no web consumer |
| Remortgage shock simulator | NICE-TO-HAVE | Keep inside Mortgage, engine maths | Seasonal value |
| UK debt instruments card (car balloon, student loan) | NICE-TO-HAVE | Keep; dedupe against the student-loan tool | |
| `DebtToWealthBridgeCard` | BLOAT candidate | Merge into the debt payoff outcome | Overlapping narrative |
| Dashboard customisation (widget order, sizes, per-widget config, enabled pages) | BLOAT-SLOP | Demote to show or hide only | Seven configs, little value for one user |
| `BudgetSetupWizard`, `PensionQuickStartWizard` | NICE-TO-HAVE | Merge into onboarding or empty states | Overlapping wizards |
| Bank connect via PAT (Monzo, Starling, T212) | NICE-TO-HAVE (beta) | Keep behind "Advanced / beta" | Real, but most UK users cannot get a token (I-08) |
| Bank OAuth and open-banking-standard providers | NO VALUE today | Flag off or delete (E6) | No callback; unproven |
| Synced transactions (stored, never shown) | NO VALUE today | Decide: show on account detail or stop storing (privacy) | G-09 |
| CSV import | Not shipped; **candidate ADD** | Add (top-3) | Parser exists; unlocks actuals and history; promised on Pricing |
| Account deletion and data export | Missing; compliance | Add (hygiene, not optional) | M-06, E12 B6/B13, UK GDPR |
| Country selector (11 countries), Irish take-home, `es` locale | NO VALUE | Cut | UK-only positioning; adds maintenance and tax-table risk |
| Two demos (`?demo=true` and `/sandbox`) | BLOAT | Keep `/sandbox` only (already E2 T17/T18) | I-10 |
| Two public homes (web `components/home/*` and marketing) | BLOAT | Cut the web one; signed-out `/` goes to marketing | I first-run row 1; E7 T12 mirrors |
| Dead components (§2) | NO VALUE | Cut, except possibly adopting `PayoffStrategyControls` and `PromoCliffTracker` (D10) | No importers |
| Plaid and sandbox adapters, orchestrator mocks | NO VALUE | Delete (G-07) | |
| Pro plan, trial, auto-categorisation, "all UK banks" claims | NO VALUE (claim only) | Removed by E7 | |
| Childcare "calculator" | Claim-only as a standalone feature | Fold into the trap module copy or add a real eligibility check (decision) | Not implemented as a calculator |

---

## 7. Instrumentation proposal (privacy-first, UK GDPR)

- **First-party and server-side only.** A `product_event` table in the backend:
  - columns: `id`, `user_id` (internal), `event`, `props jsonb`, `created_at`
  - written from route actions and loaders, plus a thin `POST /events` for client-only interactions
  - no third-party SDK, no cookies, no device storage, no session replay
  - avoiding device storage means PECR's storage and access rule does not apply. Lawful basis: legitimate interests, with a one-page legitimate interests assessment (LIA) and a DPIA screening. Retention: 13 months, then aggregate.
  - Note: the Data (Use and Access) Act 2025 relaxes consent for some analytics storage. Verify the current ICO guidance at execution time; do not rely on it.
- **Props allow-list**: route key, tool slug, step number, success or failure kind, input count. **No amounts, no free text, no account names.** The schema enforces this with a zod allow-list and a test.
- **Events**: `signup_completed`, `onboarding_step_completed{n}`, `onboarding_completed`, `first_personal_insight_viewed{kind}`, `page_viewed{key}`, `empty_state_seen{key}`, `error_state_seen{kind}`, `tool_used{slug}`, `account_added{manual|bank}`, `bank_connect_{started|succeeded|failed}`, `monthly_checkin_completed`, `mcp_token_created`, `mcp_tool_called{name}` (server-side in `packages/mcp`).
- **Controls**: a per-user opt-out toggle in Profile, events included in the data export, and deleted with the account. A privacy notice line, worded by the owner.
- **Marketing site**: cookieless, self-hosted page counts (for example Umami or Plausible self-hosted) or server log aggregation. Owner decision D9.

---

## 8. Owner-run interview and test kit (5 to 8 sessions)

- **Recruit**: 1 or 2 people for each of P1 to P4, and 1 for P5. Friends of friends are acceptable; avoid finance professionals. 45 minutes each, remote. Use the persona fixture or their own rough numbers, never real bank logins. Get recorded consent.
- **Script**:
  - 10 minutes on current tools: how do you answer "am I OK this month", "tax year", "overpay or invest" today?
  - Then 3 tasks: (1) sign up and get your first useful number, timed; (2) "should you overpay your mortgage?"; (3) "what would you do before 5 April?"
  - Then a 5-minute card sort of the 8 modules plus tools, asking which you would keep.
  - Then a "would you pay" probe with no price, and a willingness to connect AI or a bank.
- **Capture**: the task success rate, time to first value, quotes, and a Kano classification (must-have, performance, delighter, indifferent) per feature.
- **Templates** come from the `ux-research` skill (screener, discussion guide, notes grid, synthesis board). The owner runs the sessions; an agent synthesises the notes.

---

## 9. Phases and tasks

Effort: S ≤ 0.5 agent-day, M about 1, L 2 to 3. Skills: `ux-strategy`, `journey-mapping`, `ux-research`, `design-critique`, `interaction-design`, `ux-writing`, `grilling`, `domain-modeling`, `research`. Models follow AGENTS.md section 6: **haiku** for extraction, **sonnet** for analysis and writing, **opus** only for plan synthesis. All of phases 0 to 3 are read-only and write to `docs/audit/plans/E16-*`. Every task pins the commit SHA it read.

### Phase 0: Inventory and rubric calibration

| ID | Task | Acceptance | Eff | Deps | Skill | Model |
|---|---|---|---|---|---|---|
| T0.1 | Web feature inventory: every route, container, component and hook. State (real, partial, mock, stub, dead), line count, test files, engine calls vs local maths, persistence (server, localStorage, none), and the page that reaches it | One row per user-facing feature; the dead-code list in §2 confirmed or corrected with grep evidence | M | none | domain-modeling | haiku |
| T0.2 | Backend, engine, MCP and banking inventory: endpoints with their web consumer (or none), engine exports with consumers, MCP tools and resources against engine functions, providers | Each endpoint and export has a consumer list; orphans flagged | M | none | domain-modeling | haiku |
| T0.3 | Marketing claim map: every feature claim on marketing and the web public home, mapped to the inventory row and to the E7 claim register | Every claim links to a row or is marked "no implementation" | S | T0.1, E7 T1 | ux-writing | haiku |
| T0.4 | Data-dependency matrix: fields each feature needs, against onboarding inputs, against backend columns. Verify the `ukRegion`, `studentLoanPlan` and `age` gap | Matrix plus a yes or no verdict on the §2 gap, with file:line | S | T0.1 | domain-modeling | sonnet |
| T0.5 | Rubric doc, calibration on 3 anchors by 2 agents, owner review of anchors | At least 80% agreement within ±1; anchors updated | S | T0.1 | grilling | sonnet |
| T0.6 | Persona fixtures and walkthrough harness: a dev-only seed script spec for P1 to P6 (no code merged in phase 0, only the spec), the browser walkthrough checklist, the owner diary template, the owner aggregate SQL template | Spec reviewed; nothing touches production | S | E1 dev bypass confirmed | ux-research | sonnet |
| T0.7 | Reconcile with in-flight epics: list inventory rows already changed on E2, E4, E5, E7 and E8 branches (e.g. E12 references web fixes `dbdb9b7`, `1af60a4`) | A delta table so scoring uses the post-epic state where it is merged | S | T0.1 | research | haiku |

### Phase 1: Feature-by-feature scoring with evidence

| ID | Task | Acceptance | Eff | Deps | Skill | Model |
|---|---|---|---|---|---|---|
| T1.1 | Browser walkthroughs, per persona (6 runs): onboarding, then every enabled page; screenshots, clicks, inputs, state after onboarding, empty and error dead ends, reload persistence | One evidence file per persona; every inventory row has at least one observation or is marked "not reachable" | L | T0.6, local stack | design-critique | sonnet |
| T1.2 | Competitive research per job (§4.6), dated and linked | A table of jobs × competitors; nothing unsourced | M | T0.1 | research, ux-strategy | sonnet |
| T1.3 | Correctness and trust pass: map E4, C-track, I-01 to I-03 and local-maths findings onto rows; check where the same question gives different numbers on different surfaces (trap, take-home, overpay vs ISA) | A T score per row with cited findings; a surface-disagreement list with example inputs | M | T0.2 | domain-modeling | sonnet |
| T1.4 | Risk pass: tag each row for the advice boundary (debt counselling, investment advice), AISP, data retention, deletion | An R score with rationale; R=1 rows listed for owner and legal | S | T0.1 | grilling | sonnet |
| T1.5 | Score every row on the rubric and assign a bucket and action; show the delta from the §6 hypothesis | A complete score table; every bucket change from §6 explained | M | T1.1 to T1.4 | ux-strategy | sonnet |
| T1.6 | Independent skeptic review of the top 10 and bottom 10 scores | Disagreements resolved or escalated to the owner | S | T1.5 | grilling | sonnet |

### Phase 2: Journey mapping and value-path redesign options

| ID | Task | Acceptance | Eff | Deps | Skill | Model |
|---|---|---|---|---|---|---|
| T2.1 | Current-state maps for J1 to J5 from the walkthrough evidence | Stage tables with friction, drop-off, aha, measured TTFV | M | T1.1 | journey-mapping | sonnet |
| T2.2 | JTBD-to-feature map; identify the 3 to 4 "value paths" (e.g. Tax-year hub, Monthly check-in, Big decisions: mortgage, debt and pension, AI companion) | Each kept feature belongs to at least one path; orphans are cut candidates | S | T1.5 | ux-strategy | sonnet |
| T2.3 | Options A, B, C per journey and a proposed IA and navigation: one route manifest generated from `pageConfig.ts` (I-12), top-level items ≤ 6, module defaults by persona | Option sheets with effort, blast radius and a TTFV estimate; a nav diagram | M | T2.1, T2.2 | interaction-design | sonnet |
| T2.4 | Onboarding redesign spec for the TTFV target: required inputs ≤ 6 including region and student loan, with placeholders and no defaults (aligned with E2 D1) | Spec plus a wireframe description; the first-insight screen defined | S | T2.3, T0.4 | ux-writing, interaction-design | sonnet |
| T2.5 | Instrumentation spec (§7) and interview kit (§8) finalised | Event schema with allow-list; LIA and DPIA-screen outline; interview guide | S | T2.1 | ux-research | sonnet |

### Phase 3: Owner decision workshop pack

| ID | Task | Acceptance | Eff | Deps | Skill | Model |
|---|---|---|---|---|---|---|
| T3.1 | Decision table: one row per feature with the bucket, scores, evidence links, recommendation, and checkboxes for keep, fix, merge, demote, cut or add, plus an owner notes column. Built as a single-file interactive HTML artifact (filter by bucket and persona, export choices to JSON or Markdown) **and** a Markdown fallback | Opens offline; export round-trips; every row has a recommendation | M | T1.5, T2.3 | ux-strategy | sonnet |
| T3.2 | Top-3 additive feature briefs (hypothesis: CSV import; Tax-year hub with persisted region and student loan; Monthly check-in), each with job, persona, evidence, effort, dependencies and a kill criterion | 1 page each; alternatives considered | S | T2.2 | ux-strategy | sonnet |
| T3.3 | Decisions-needed list (§12) refreshed with evidence; a 60-minute agenda for the workshop | Owner can decide in one sitting | S | T3.1 | grilling | opus (planning) or sonnet |
| T3.4 | Owner workshop (human). Record outcomes in `DECISIONS.md` format | Every row marked; open items listed | S | T3.1 to T3.3 | none | human |

### Phase 4: Execution tickets

Tickets are written after T3.4. They are drafted as GitHub issues in the EPICS.md format, start as `needs-triage`, and follow the shared acceptance rule (failing test first; the four `bun run` checks).

| ID | Task | Acceptance | Eff | Deps | Skill | Model |
|---|---|---|---|---|---|---|
| T4.1 | Ticket drafts for each *cut*, with blast radius: routes, loaders and actions, backend endpoints and entities (and a data migration or export if stored data is removed), tests and stories to delete, marketing claims (E7 register row), MCP tools, i18n keys, E12 inventory row, docs (`docs/pages_and_features.md`, G-14) | Each ticket lists every touchpoint found by grep; a redirect for any removed URL; stored data never silently dropped | M | T3.4 | domain-modeling | sonnet |
| T4.2 | Ticket drafts for each *merge* and *demote*, including the layout laws for merged simulator pages (`SimulatorSplitLayout`, `SliderField`, `KpiStrip`) and the colocation law for new components | Acceptance names the host page, the redirect, the law components, and the stories in light and dark | M | T3.4 | interaction-design | sonnet |
| T4.3 | Navigation and IA ticket: one manifest drives desktop nav, the mobile drawer and the bottom bar (fixes Debt missing on mobile web, I-12); module defaults by persona | Tests assert the three navs derive from the manifest | S | T4.2 | interaction-design | sonnet |
| T4.4 | E6 decision tickets: bank OAuth (flag off and delete `getOAuthUrl`), open-banking-standard (flag), Plaid and sandbox (delete), transactions (show or stop storing), account history editing (implement B1 or remove the UI), MCP card (wire after E1 or hide) | Each maps to G-02, G-04, G-05, G-06, G-07 or G-09 with a chosen option | S | T3.4 | grilling | sonnet |
| T4.5 | Top-3 additive tickets, split into S/M slices with a spike first; no build inside E16 | Each has a kill criterion and a metric | M | T3.2, T3.4 | ux-strategy | sonnet |
| T4.6 | Update the E12 feature inventory: mark cut and merged rows, re-prioritise P0 to P3, drop work (e.g. rows 19b country selector, the forecast route) | E12 inventory diff reviewed by the E12 owner | S | T4.1, T4.2 | domain-modeling | haiku |
| T4.7 | Hand-off notes for E15 (pages to polish, in priority order), E9 (migration order skips cut pages), E8 (skip a11y work on cut components), E7 (claims to restore only when built) | One section per epic | S | T4.1 to T4.5 | ux-strategy | sonnet |

**Draft ticket seeds, contingent on decisions, with blast radius:**
- **CUT-1 Dead components.** Covers `GlobalBaselineScenarioBar` plus `scenario.store.ts`, `ScenarioLayersWidget`, `WealthCheckHeroWidget`, `SavingsQuickStartWizard`, and `features/sandbox` / `features/debt` unless adopted (D10). Blast radius: their tests and stories, and the L-track copy findings that reference them. Routes, endpoints and marketing are untouched.
- **CUT-2 Non-UK scope.** Covers the `UserProfilePanel.tsx:42-52,179,227-228` country selector and Irish branch, and the engine `IRELAND_*` and `calculateIrishTakeHome` in `tax-rules.ts`. `es` locale files only if D6 says so. Blast radius: profile `country` and `currency` columns (keep the columns, force GB/GBP with a migration for non-GB rows), E12 rows 15 and 19b, engine tests.
- **CUT-3 Web public home duplicate.** Covers `apps/web/app/components/home/*` (about 15 components) and the `_index.tsx` signed-out branch, which would redirect to marketing. Blast radius: E7 T12 mirrors (obsolete), E2 T17, the E8 T07 `FeaturePillars` sweep, the `LoggedOutHome` and `HomeHero` tests, and `persistOnboardingSeed` hand-off (E12 D17 already drops it on mobile).
- **MERGE-1 Forecast route.** `/app/forecast` redirects to `/app/savings#forecast`. `UKTaxCalculator` moves to the Tax hub. Blast radius: `app.forecast.tsx`, `ForecastContainer` and its test, `ForecastWidget`, the `forecast` page key in `pageConfig.ts` and the profile `enabledPages` and `dashboardWidgets` data (migration), E12 row 12, MCP `project_wealth_scenario` (unchanged), marketing "5-year forecast" claim.
- **MERGE-2 Overpay vs invest.** One engine function backs the Mortgage page, the tool and MCP, and the local maths in `components/mortgage/*` is deleted. Blast radius: E4 (engine tests), the mortgage tests, the `MortgageVsIsaCalculator` in `packages/ui`.
- **DEMOTE-1 Self Assessment module.** Off by default unless the profile has rental or self-employed income. Blast radius: `DEFAULT_ENABLED_PAGES`, onboarding, the TaxWidget, E12 row 13 priority.
- **DEMOTE-2 Runway.** Becomes an emergency-fund card. Blast radius: `RunwayCalculator.tsx` and its test, `utils/runwayStorage.ts`, the `_index.tsx` `calculateRunwayStats` import, MCP `evaluate_cashflow_runway_and_health` (unchanged), and the Pricing "emergency runway" claim.
- **DEMOTE-3 Dashboard customisation.** Show or hide only. Blast radius: `WidgetSettingsModal` (7 widgets), profile `dashboardWidgetOrder`, `Sizes` and `Config` columns (stop writing; drop in a later migration), E12 row 19a.

### Phase 5: Roadmap and metrics

| ID | Task | Acceptance | Eff | Deps | Skill | Model |
|---|---|---|---|---|---|---|
| T5.1 | Now / Next / Later roadmap: cuts and merges (Now, after E2/E5 land on hotspots), the Tax-year hub and onboarding (Next, after E4 vectors), CSV import and check-in (Next), the MCP preview (after E1), mobile v1 (E12, on the frozen list) | Each item links to a ticket and an epic dependency | S | Phase 4 | ux-strategy | sonnet |
| T5.2 | Metrics definitions: **activation** (onboarding completed, plus a personalised insight viewed, plus at least 1 account, within 24 hours); **TTFV** (median, target under 3 minutes); **monthly returning planners** (north star: users with at least 1 personalised insight view or check-in in 2 consecutive months); feature breadth; **trust** (0 fabricated figures, which is a CI guard via E2; error-state rate); MCP weekly tool calls | Each metric maps to §7 events; baseline from owner usage | S | T2.5 | ux-strategy | sonnet |
| T5.3 | Re-review cadence: re-score after the 8 interviews and after 4 weeks of instrumentation | A dated checkpoint in the roadmap | S | T5.1 | none | haiku |

---

## 10. Sequencing against other epics (recommendation)

1. **E16 phases 0 to 3 start now**, in parallel with E1 to E5. They are read-only and conflict with nothing. T1.1 needs the local stack and the dev bypass; if E1 is mid-flight, run it on the persona fixtures with E11 D4's bypass.
2. **E7 removals go first regardless.** False claims come down now. E16 only decides which claims may *return* once built (CSV import, account deletion, MCP preview).
3. **E6 waits on E16 T4.4** for its finish, flag or delete scope. E16 is the decision forum E6's notes asked for ("needs a scope decision per integration").
4. **E12: the mobile feature inventory freezes only after E16 T3.4 and T4.6.** E12 M0 to M3 (spikes, shared packages, shell, auth) can proceed. M4 to M7 (feature screens) must use the E16-updated inventory. The order is: E16 decisions, then the E12 inventory update, then E12 M4 onwards. This avoids building the forecast route, the Irish take-home, dashboard customisation or the SA module on mobile only to cut them.
5. **E15 (visual elevation)**: token and primitive foundations run in parallel. Page-level redesign starts after E16 T3.4, in the order from T4.7, and polishes only KEEP and MERGE hosts.
6. **E9 (adopt packages/ui, colocation)**: ratchets and foundations proceed. Page-by-page migration skips CUT rows and migrates MERGE hosts after the merge.
7. **E8**: a11y fixes on components marked for cut are dropped (e.g. `PayoffStrategySwitcher` if replaced by `PayoffStrategyControls`, D10).
8. **E2, E5 and E4 hotspots**: E16 execution tickets that touch `_index.tsx`, `app.onboarding.tsx`, `app.debt.tsx`, `HomeDashboard.tsx` or `TaxContainer.tsx` land **after** E2 and E5 (SEQUENCE.md overlap list). Tax-hub and trap tickets land after E4 vectors are signed off by the owner. Features that depend on E4 cannot be marked "keep as is" until then.

---

## 11. Risks

- **N=1 bias.** The owner is the only real user and also the decider. Mitigations: personas, interviews before any cut of a MOST VALUABLE candidate, and the T1.6 skeptic pass.
- **Agent walkthrough artefacts.** Dev-bypass and fixture data are not real usage. Treat walkthroughs as heuristic evidence only, never as adoption data.
- **Moving target.** Seven epics are in flight. Mitigation: pin the SHA and use the T0.7 delta table.
- **Cutting SEO and acquisition surfaces.** The tools pages may be the main traffic source. Never cut a tool without the M-track sitemap and 301 plan.
- **Stored-data removal.** Cutting tax records, transactions or widget config can destroy user data. Every cut that touches stored data needs export, migration and a backup (E2 T6 pattern).
- **Regulatory.** Debt prioritisation and overpay-vs-invest can drift into personal advice. Bank sync implies AISP. An R=1 row needs an owner and legal decision before keep or add.
- **Scope creep.** "Fix" can become "build". The non-goal holds: E16 writes tickets, it does not build features.
- **Instrumentation privacy.** Mitigations: the allow-list schema test, no amounts, and an opt-out.
- **E12 delay.** Freezing the mobile inventory waits on the workshop. Keep phases 0 to 3 to about 1 week of agent time plus a 60-minute owner session.

---

## 12. Decisions needed from the product owner

1. **D1. What is Flump's core job and positioning?**
   - A. A UK tax and wealth planner on your own numbers (trap, take-home, pension, mortgage and debt decisions); budgeting is secondary.
   - B. An all-in-one money manager that competes with Emma and Snoop on budgeting, actuals and bank sync.
   - C. Calculators plus an AI companion via MCP, with minimal in-app UI.
   - Recommendation: **A, with C as the differentiator.** B needs regulated bank aggregation and wins little against free incumbents.
   - Blocks: T1.5 weights (D), T2.2, T3.1.
2. **D2. Budget actuals?**
   - A. Plan-only budget; hide actuals for good.
   - B. Actuals from CSV import (top-3 add).
   - C. Actuals from bank sync (needs a regulated partner).
   - Recommendation: **A now, B as an add.** C only if D4 changes.
   - Blocks: T3.2, T4.5.
3. **D3. Self Assessment ledger (Tax records)?**
   - A. Keep as a default page.
   - B. Demote to an opt-in module (default on only for self-employed or rental income).
   - C. Cut, keeping Section 24 and payments on account as tools.
   - Recommendation: **B.**
   - Blocks: DEMOTE-1, E12 row 13.
4. **D4. Bank connection scope (feeds E6)?**
   - A. Keep PAT for Monzo, Starling and T212 behind "Advanced / beta"; flag off OAuth and open banking.
   - B. Hide all bank connection until there is a regulated partner.
   - C. Pursue an aggregator partner now.
   - Recommendation: **A**, with public copy per E7 D1.
   - Blocks: T4.4.
5. **D5. The Forecast route?**
   - A. Keep it.
   - B. Merge into Savings, Pension and the Tax hub, with a redirect.
   - C. Rebuild it as the single "plan" page that absorbs Savings and Pension forecasters.
   - Recommendation: **B.**
   - Blocks: MERGE-1, E12 row 12.
6. **D6. Non-UK scope (11 countries, Irish take-home, Spanish)?**
   - A. Keep.
   - B. Cut countries and Irish tax; keep the `es` string layer dormant.
   - C. Cut all three.
   - Recommendation: **B.** It matches E12 D22 (en-GB only) at low cost.
   - Blocks: CUT-2.
7. **D7. Public surfaces?**
   - A. Keep both public homes.
   - B. Marketing owns the home, pricing and tool landing pages; the web app hosts the tool calculators only.
   - C. Move the calculators to marketing as well.
   - Recommendation: **B.**
   - Blocks: CUT-3, the tools SEO tickets.
8. **D8. MCP AI access?**
   - A. Finish it as a preview right after E1 (wire `/mcp-tokens`, fix the snippet).
   - B. Hide it until after launch.
   - C. Cut it.
   - Recommendation: **A.** It is the clearest differentiator, but gate it on E1 D-03 being fixed.
   - Blocks: T4.4, J5.
9. **D9. Instrumentation?**
   - A. First-party, server-side events (§7) plus cookieless marketing page counts.
   - B. No instrumentation; interviews only.
   - C. A third-party analytics SDK.
   - Recommendation: **A.**
   - Blocks: T2.5, T5.2.
10. **D10. Dead but law-compliant components (`PayoffStrategyControls`, `PromoCliffTracker`, `SandboxTemplates`)?**
    - A. Delete them.
    - B. Adopt them on the Debt page and in the sandbox, replacing `PayoffStrategySwitcher` and the cliff tab.
    - C. Leave them for E15 to decide.
    - Recommendation: **B.** They already follow AGENTS.md section 3.
    - Blocks: CUT-1, E8 T17.
11. **D11. Dashboard customisation?**
    - A. Keep order, sizes and per-widget config.
    - B. Show or hide only, plus a default layout by persona.
    - C. A fixed dashboard.
    - Recommendation: **B.**
    - Blocks: DEMOTE-3.
12. **D12. Account history editing (G-04)?**
    - A. Implement the endpoints (backend B1, shared with E12).
    - B. Remove the edit UI and make history read-only, fed by the check-in.
    - C. Replace it with CSV import of history.
    - Recommendation: **B now, C later** with CSV import. The monthly check-in becomes the only way to write history.
    - Blocks: T4.4, the E12 row 5 edit.
13. **D13. Decision pack format?**
    - A. Interactive single-file HTML plus a Markdown export.
    - B. Markdown only.
    - Recommendation: **A.**
    - Blocks: T3.1.
14. **D14. Who runs the interviews, and when?**
    - A. The owner runs 5 to 8 before the workshop.
    - B. After the workshop, to validate.
    - C. Skip.
    - Recommendation: **A for at least 3 sessions (P1, P2, P3) before cuts to MOST VALUABLE candidates; the rest after.**
    - Blocks: T1.6, T3.4 for contested rows.

---

## Relevant paths

- `/Users/marcgallagher/personal/flump/docs/audit/EPICS.md`, `SUMMARY.md`, `I-ux.md`, `G-unfinished.md`, `L-copy.md`, `M-marketing-seo.md`
- `/Users/marcgallagher/personal/flump/docs/audit/plans/SEQUENCE.md`, `DECISIONS.md`, `E2-plan-draft.md`, `E5-plan-draft.md`, `E7-plan-draft.md`, `E8-plan-draft.md`
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e2-backend-no-seeding-3ba884/docs/audit/plans/E12-feature-inventory.md` and `E12-mobile-rebuild-plan.md`
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e1-auth-fail-closed/apps/web/app/utils/pageConfig.ts`
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e1-auth-fail-closed/apps/web/app/routes/` (`_index.tsx`, `app.onboarding.tsx`, `tools.$slug.tsx`, `sandbox.tsx`)
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e1-auth-fail-closed/apps/web/app/containers/` (forecast, tax, mortgage, pension, debt, budget, savings, accounts)
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e1-auth-fail-closed/apps/web/app/components/budget/UserProfilePanel.tsx`
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e1-auth-fail-closed/apps/web/app/components/dashboard/HomeDashboard.tsx`
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e1-auth-fail-closed/apps/web/app/features/` (ai-connections, debt, sandbox)
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e1-auth-fail-closed/apps/backend/src/` (controllers and `entities/user-profile.entity.ts`)
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e1-auth-fail-closed/packages/finance-engine/src/` (`types.ts`, `profile.ts`, `tax-rules.ts`, `uk-tax.ts`)
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e1-auth-fail-closed/packages/mcp/src/tools/`, `resources/baseline.resource.ts`
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e1-auth-fail-closed/packages/ui/src/calculators/`
- `/Users/marcgallagher/personal/flump/.claude/worktrees/e1-auth-fail-closed/apps/marketing/src/App.tsx`, `pages/PricingPage.tsx`, `pages/ToolPage.tsx`

# AGENT IMPLEMENTATION BLUEPRINT: FLUMP ARCHITECTURE, FULL-LIFECYCLE UX & BANKING ENGINE

## 1. SYSTEM CONTEXT & ARCHITECTURAL OBJECTIVES

You are refactoring and expanding **Flump**, a UK-native personal finance, debt recovery, and wealth/tax forecasting platform.

### Core Architectural Shifts Required:

1. **Strict Target Separation (`apps/marketing` vs `apps/web`):** Split the logged-out acquisition/SEO experience (the marketing site) from the authenticated stateful application (the web app) within the Turborepo monorepo.
2. **Full-Lifecycle Financial Stage Engine:** Support users across three distinct financial stages:
   - `STAGE_1_DEBT_RECOVERY` (High-interest debt payoff, Priority vs Non-Priority UK bill protection, Safe-to-Spend).
   - `STAGE_2_BUFFER_BUILD` (Starter £1k buffer, 3–6 month Emergency Runway, Cash ISA / high-yield savings).
   - `STAGE_3_WEALTH_OPTIMIZE` (UK £100k tax trap, Salary Sacrifice, ISA/SIPP allowances, Mortgage vs Invest, Section 24 BTL tax).
3. **Eliminate State Fragmentation & Wizard Fatigue:**
   - Merge `/app/savings` into `/app/accounts` as a unified Net Worth, Yield & Allowance Hub.
   - Centralize all core financial baseline variables (Gross Salary, Tax Code, Pension %, BTL Split) into a single `FinancialBaseline` store—removing duplicate inputs from `/app/profile`, `/app/pension`, and `/app/forecast`.
   - Replace scattered module quick-start wizards with a single 90-second progressive `/onboarding` flow hydrated via a cross-subdomain seed cookie (`flump_onboarding_seed`).
4. **Provider-Agnostic Banking Package (`@flump/banking`):** Isolate Plaid, TrueLayer, CSV statement parsing, and Sandbox mock connections behind a unified adapter interface with strict client/server subpath exports.

---

## 2. TARGET MONOREPO STRUCTURE

Ensure the workspace adheres to the following package and app boundaries:

```text
flump/
├── apps/
│   ├── marketing/               # Public SEO & Acquisition site (the marketing site)
│   │   └── src/
│   │       ├── pages/
│   │       │   ├── index.tsx    # Dual-Mode Hero, 4-Persona Tabs, Scenario Layers, Matrix
│   │       │   ├── pricing.tsx  # Free (Manual/CSV) vs Pro (Open Banking & Tax Engine)
│   │       │   ├── security.tsx # FCA AISP Read-Only scope, Encryption, UK GDPR
│   │       │   └── tools/
│   │       │       └── [slug].tsx # Programmatic UK SEO calculators
│   │       └── components/
│   │           ├── DualModeHeroCalculator.tsx
│   │           ├── PersonaSwitcher.tsx
│   │           └── ScenarioLayersPreview.tsx
│   │
│   ├── web/                     # Authenticated SPA & Live Sandbox (the web app)
│   │   └── src/
│   │       ├── routes/
│   │       │   ├── login.tsx
│   │       │   ├── signup.tsx
│   │       │   ├── callback.tsx
│   │       │   ├── sandbox.tsx      # Zero-signup Demo Mode (?persona=debt | wealth)
│   │       │   ├── onboarding.tsx   # Single 3-step progressive onboarding
│   │       │   ├── index.tsx        # Stage-Adaptive Home Dashboard
│   │       │   ├── accounts/        # Unified Net Worth, Savings Yield & ISA Allowance Hub
│   │       │   │   ├── index.tsx
│   │       │   │   └── [accountId].tsx
│   │       │   ├── debt/            # NEW: Snowball/Avalanche, 0% Cliffs, Overdrafts
│   │       │   │   └── index.tsx
│   │       │   ├── budget/          # Cash Flow, Safe-to-Spend, Priority Bills, Actuals
│   │       │   │   └── index.tsx
│   │       │   ├── pension/         # Workplace/SIPP, Salary Sacrifice, £60k Allowance
│   │       │   │   └── index.tsx
│   │       │   ├── mortgage/        # Residential/BTL, LTV Milestones, Overpay vs ISA
│   │       │   │   └── index.tsx
│   │       │   ├── forecast/        # 30-Yr Trajectory, Life Event Chips, £100k Tax Trap
│   │       │   │   └── index.tsx
│   │       │   ├── tax/             # Self-Assessment, Section 24, Payments on Account
│   │       │   │   └── index.tsx
│   │       │   └── profile/         # Strictly Auth, Security, Theme & Billing (NO financial inputs)
│   │       │       └── index.tsx
│   │       └── state/
│   │           ├── baseline.store.ts # Single source of truth for Salary, Tax, Stage
│   │           └── scenario.store.ts # Global "What-If" Sandbox bar state
│   │
│   ├── mobile/                  # Expo / React Native app
│   └── api/                     # Backend API (NestJS / Node)
│
└── packages/
    ├── finance-engine/          # Pure TS UK financial & tax math (Zero IO/UI deps)
    │   └── src/
    │       ├── uk-tax.ts        # PAYE, NI, £100k 60% trap, Personal Savings Allowance
    │       ├── debt-payoff.ts   # Snowball, Avalanche, 0% promo cliff, Student Loan filter
    │       ├── mortgage.ts      # Amortization, LTV brackets, Overpay vs After-Tax ISA
    │       ├── section24.ts     # BTL Section 24 20% reducer & Payments on Account reserve
    │       ├── forecast.ts      # Compound growth + Life Event scenario layers
    │       └── health-score.ts  # Stage-weighted Financial Health Score algorithm
    │
    ├── banking/                 # Provider-agnostic Open Banking & CSV normalization
    │   ├── package.json         # Strict subpath exports: ./core, ./server, ./client
    │   └── src/
    │       ├── core/
    │       ├── server/
    │       └── client/
    │
    └── ui/                      # Shared design tokens, charts, and calculator primitives
```

---

## 3. SHARED PACKAGE 1: `@flump/finance-engine` SPECIFICATION

Implement pure, deterministic TypeScript functions with 100% unit test coverage. Do not allow currency symbol swaps to alter UK tax math; lock tax rules to UK fiscal years (`2025/26` and `2026/27`) and treat foreign currencies strictly as account-level conversion attributes (`balanceInGbp`).

### 3.1 Core Domain Types (`packages/finance-engine/src/types.ts`)

```typescript
export type FinancialStage =
  | "STAGE_1_DEBT_RECOVERY"
  | "STAGE_2_BUFFER_BUILD"
  | "STAGE_3_WEALTH_OPTIMIZE";

export type ActiveModule =
  | "accounts"
  | "debt"
  | "budget"
  | "pension"
  | "mortgage"
  | "forecast"
  | "tax";

export interface FinancialBaseline {
  userId: string;
  taxYear: "2025/26" | "2026/27";
  ukRegion: "ENGLAND_NI_WALES" | "SCOTLAND";
  employmentStatus: "PAYE" | "SELF_EMPLOYED" | "MIXED" | "OTHER";
  annualGrossSalary: number;
  annualBonusOrSideIncome: number;
  pensionContributionPct: number;
  employerPensionMatchPct: number;
  isSalarySacrifice: boolean;
  studentLoanPlan: "NONE" | "PLAN_1" | "PLAN_2" | "PLAN_4" | "PLAN_5" | "POSTGRAD";
  propertyOwnershipSharePct: number; // e.g., 50 or 100 for BTL splitting
  financialStage: FinancialStage;
  enabledModules: ActiveModule[];
}

export interface OnboardingSeedPayload {
  mode: "DEBT" | "WEALTH";
  annualGrossSalary?: number;
  pensionContributionPct?: number;
  isSalarySacrifice?: boolean;
  totalUnsecuredDebt?: number;
  averageDebtApr?: number;
  monthlyDebtRepaymentBudget?: number;
  initialCashSavings?: number;
  initialInvestments?: number;
  monthlySavingsSurplus?: number;
  inferredStage: FinancialStage;
  inferredModules: ActiveModule[];
  timestamp: number;
}
```

### 3.2 Debt Engine Rules (`packages/finance-engine/src/debt-payoff.ts`)

Must implement:

1. **`calculateDebtSchedule(debts, monthlyExtraBudget, strategy: 'AVALANCHE' | 'SNOWBALL')`**:

- **Avalanche:** Sort by highest effective APR first (prioritizing arranged overdrafts at ~35–39.9% EAR and expiring 0% balance transfer cards).
- **Snowball:** Sort by smallest `balanceGbp` first to compute the earliest `firstQuickWinDate`.
- **0% Promotional Cliff Detection:** Accept `promoAprExpiryDate?: string` and `revertApr?: number`. Calculate `requiredMonthlyToClearBeforeCliff`. Flag an alert if current allocation leaves a balance at expiry.
- **UK Student Loan Guardrail:** Explicitly exclude UK Student Loans (`PLAN_1`, `PLAN_2`, `PLAN_4`, `PLAN_5`, `POSTGRAD`) from consumer debt snowballs; treat them as a payroll tax deduction in `uk-tax.ts`.
- **Debt-to-Wealth Crossover Projection:** Once total unsecured debt reaches `£0` at month $M$, project the trajectory from month $M+1$ to $M+60$ assuming the user redirects their total monthly debt payment (`minimums + monthlyExtraBudget`) into a tax-free ISA compounding at `expectedReturnPct`.

### 3.3 UK Tax & Allowance Rules (`packages/finance-engine/src/uk-tax.ts`)

Must implement:

1. **£100k–£125,140 60% Tax Trap Optimizer:**

- Detect when `adjustedNetIncome > 100000` (factoring in PAYE, bonus, taxable savings interest, and net BTL profit).
- Calculate exact Personal Allowance tapered away (£1 lost per £2 over £100k) and the exact pension/Salary Sacrifice or Gift Aid contribution required to restore `adjustedNetIncome <= 100000`.

2. **UK Annual Allowance Trackers (6 April – 5 April):**

- ISA Allowance: `£20,000` combined limit across Cash ISAs and Stocks & Shares ISAs.
- Pension Annual Allowance: `£60,000` limit.
- Personal Savings Allowance (PSA): `£1,000` Basic Rate, `£500` Higher Rate, `£0` Additional Rate.

3. **HMRC Self-Assessment & Payments on Account Reserve (`section24.ts`):**

- Compute Section 24 finance cost restriction (20% basic rate tax reducer).
- Calculate 31 January (balancing payment + 1st Payment on Account) and 31 July (2nd Payment on Account) liabilities, outputting `recommendedMonthlyTaxSetAsideGbp`.

---

## 4. SHARED PACKAGE 2: `@flump/banking` SPECIFICATION

Create `packages/banking` with strict `package.json` subpath exports so Node-only provider SDKs and encryption helpers are never bundled into `apps/web` or `apps/mobile`.

### 4.1 `packages/banking/package.json`

```json
{
  "name": "@flump/banking",
  "version": "1.0.0",
  "private": true,
  "exports": {
    "./core": "./src/core/index.ts",
    "./server": "./src/server/index.ts",
    "./client": "./src/client/index.ts"
  }
}
```

### 4.2 Core Normalized Types & Sign Enforcement (`packages/banking/src/core/types.ts`)

```typescript
export type BankingProviderName = "plaid" | "truelayer" | "csv" | "sandbox" | "manual";

export type FlumpAccountCategory =
  | "CURRENT"
  | "SAVINGS"
  | "CASH_ISA"
  | "STOCKS_ISA"
  | "GENERAL_INVESTMENT"
  | "PENSION_WORKPLACE"
  | "PENSION_SIPP"
  | "CREDIT_CARD"
  | "OVERDRAFT"
  | "LOAN_PERSONAL"
  | "CAR_FINANCE_PCP_HP"
  | "MORTGAGE_RESIDENTIAL"
  | "MORTGAGE_BTL";

export type ConsentStatus =
  | "ACTIVE"
  | "EXPIRING_SOON" // < 7 days until 90-day UK FCA expiry
  | "REAUTH_REQUIRED"
  | "ERROR"
  | "MANUAL";

export interface NormalizedAccount {
  externalAccountId: string;
  provider: BankingProviderName;
  institutionName: string;
  name: string;
  category: FlumpAccountCategory;
  currency: string;
  /**
   * SIGN CONVENTION LAW:
   * Assets (Current, Savings, ISA, Pension) are POSITIVE.
   * Liabilities (Credit Card debt, Overdraft used, Loans, Mortgages) are NEGATIVE for Net Worth math,
   * while `principalOwedGbp` is exposed as a POSITIVE number for Debt/Mortgage payoff calculators.
   */
  netWorthImpactGbp: number;
  principalOwedGbp: number;
  creditLimitGbp?: number;
  interestRateApr?: number;
  promoAprExpiryDate?: string;
  revertApr?: number;
  mortgageFixExpiryDate?: string;
  isTaxFreeIsaWrapper: boolean;
  lastSyncedAt: string;
}

export type FlumpBudgetBucket =
  | "PRIORITY_HOUSING_COUNCIL_ENERGY"
  | "ESSENTIAL_BILLS_GROCERIES"
  | "DEBT_MINIMUM_REPAYMENT"
  | "DEBT_OVERPAYMENT"
  | "DISCRETIONARY_WANTS"
  | "SAVINGS_INVESTMENTS_TRANSFER"
  | "INCOME";

export interface NormalizedTransaction {
  externalTransactionId: string;
  externalAccountId: string;
  postedDate: string;
  merchantOrDescription: string;
  amountGbp: number; // Outflows negative, Inflows positive
  flumpBucket: FlumpBudgetBucket;
  isRecurringContract: boolean;
  rawProviderCategory?: string;
}
```

### 4.3 Server Adapter Contract (`packages/banking/src/server/interface.ts`)

Implement this contract for `PlaidAdapter`, `SandboxAdapter`, and `CsvStatementParser` (supporting Monzo, Starling, Amex, and HSBC CSV formats):

```typescript
export interface BankingProviderAdapter {
  readonly providerName: BankingProviderName;
  createLinkSession(
    userId: string,
    reauthConnectionId?: string,
  ): Promise<{ linkTokenOrUrl: string; expiresAt: string }>;
  exchangePublicToken(publicTokenOrCode: string): Promise<{
    accessTokenEncrypted: string;
    providerItemId: string;
    consentExpiresAt: string; // Default +90 days for UK Open Banking
  }>;
  getAccounts(accessTokenEncrypted: string): Promise<NormalizedAccount[]>;
  syncTransactions(
    accessTokenEncrypted: string,
    cursor?: string,
  ): Promise<{
    added: NormalizedTransaction[];
    modified: NormalizedTransaction[];
    removedIds: string[];
    nextCursor: string;
  }>;
  revokeConnection(accessTokenEncrypted: string): Promise<void>;
}
```

- **Security Requirement:** `accessTokenEncrypted` must be encrypted/decrypted inside `packages/banking/src/server/crypto.ts` using `AES-256-GCM` with an environment key (`BANKING_TOKEN_ENCRYPTION_KEY`) before ever touching the database.

---

## 5. CORE APPLICATION REFACTORS (`apps/web`)

### 5.1 Route & State Cleanup

1. **Remove Redundant Wizards:** Delete the standalone Quick-Start Wizards inside `/app/budget`, `/app/savings`, and `/app/pension`. All initial setup happens once in `/onboarding`, backed by `FinancialBaseline`.
2. **Merge `/app/savings` into `/app/accounts`:**

- Redirect `/app/savings` → `/app/accounts?tab=savings-yield`.
- `/app/accounts` must include:
- Top Summary Bar: **Total Net Worth**, **Total Liquid Cash & Savings (with Weighted Average AER)**, and **UK £20,000 ISA Allowance Progress Pill** (with days remaining until 5 April).
- Tabs: `All` | `Cash & Current` | `Savings & ISAs (Yield & Compound Forecaster)` | `Investments & Pensions` | `Credit & Debt` | `Mortgages`.
- **60-Second Monthly Balance Check-In Drawer:** A 1-click inline grid allowing users with manual accounts (SIPPs, Vanguard, Mortgages) to update all current-month balances in one view without opening individual account pages.

3. **Purge Financial Inputs from `/app/profile`:**

- Remove Salary, Pension %, Salary Sacrifice, and Buy-to-Let property fields from `/app/profile`.
- Move them to `baseline.store.ts`, editable inline via a **Global Baseline & "What-If" Scenario Bar** at the top of `/forecast`, `/pension`, `/tax`, and `/debt`.
- Remove empty `/about` and `/contact` routes from the web router.

### 5.2 New Module: Debt Crusher (`/app/debt`)

Build `apps/web/src/routes/debt/index.tsx`:

- **Top 3 Metrics:**

1. **Debt-Free Date** (e.g., `November 2028 — 14 months sooner with current plan`)
2. **Total Unsecured Debt & Weighted APR**
3. **Total Interest Saved vs. Minimum Payments**

- **Interactive Strategy Controls:**
- Segmented toggle: **`Avalanche (Save Most Interest)`** vs. **`Snowball (Fastest First Win)`**.
- Single slider: **`Monthly Extra Overpayment (£)`** (auto-clamped to the user's monthly budget surplus from `/app/budget`).

- **0% Balance Transfer & Overdraft Alerts:** Highlight any card whose `promoAprExpiryDate` will expire before its projected payoff date.
- **Primary Visual Chart:** **The Debt-to-Wealth Crossover Chart** — Area chart showing debt dropping to `£0` (red/amber zone) followed immediately by the 5-year positive wealth accumulation trajectory (emerald zone) when redirecting those exact monthly debt payments into an ISA.

### 5.3 Upgrades to `/app/budget`

- Add **"Weekly Safe-to-Spend"** card (`(Net Monthly Income - Priority Bills - Essential Groceries - Debt Minimums - Planned Savings) / 4.33`).
- Visually group expenses into **Priority Obligations** (Council Tax, Mortgage/Rent, Utilities) vs. **Flexible / Discretionary** so Stage 1 users in a cash-flow deficit never sacrifice a priority UK bill to overpay unsecured debt.
- Add inline **Actual MTD Spend** progress bars mapped from `@flump/banking` transactions.
- Add optional `contractEndDate` badge on Bills rows to flag broadband/mobile/insurance renewal cliffs 30 days prior.

### 5.4 Upgrades to `/app/forecast`, `/app/pension`, `/app/mortgage`, and `/app/tax`

- **`/app/forecast`:** Add toggleable **Life Event Scenario Chips** below the 30-year chart (`+ Buy a Home`, `+ Have a Child`, `+ Remortgage Rate Shock`, `+ Retire Early Bridge`). Render a contextual **£100k–£125k 60% Tax Trap Banner** with a single escape slider whenever projected adjusted net income exceeds £95,000.
- **`/app/pension`:** Add the **£60,000 Annual Allowance Progress Pill** at the top of the page.
- **`/app/mortgage`:** Add `mortgageFixExpiryDate` and a **Target LTV Milestone Badge** (showing how much overpayment is needed before renewal to hit the next LTV band: 85% → 80% → 75% → 60%).
- **`/app/tax`:** Add a **Monthly HMRC Tax Reserve Card** showing the exact monthly transfer needed to cover 31 January and 31 July Self-Assessment + Payments on Account bills.

### 5.5 Zero-Signup Live Sandbox (`/sandbox`)

Build `apps/web/src/routes/sandbox.tsx`:

- Hydrate the entire application state in memory using `SandboxAdapter` and deterministic UK fixtures without requiring WorkOS login.
- Provide a persistent top bar with a 2-Persona Switcher:
- **Persona 1 (`?persona=debt`):** £38k salary, £6,200 across a 24.9% credit card, expiring 0% balance transfer card, and Monzo overdraft. Boots in `STAGE_1_DEBT_RECOVERY`.
- **Persona 2 (`?persona=wealth`):** £108k PAYE salary (in the 60% tax trap), 1 Buy-to-Let property, residential mortgage expiring in 14 months, Vanguard ISA, and Workplace Pension. Boots in `STAGE_3_WEALTH_OPTIMIZE`.

- Clicking **"Save My Custom Numbers →"** serializes the in-memory sandbox store and routes to `/signup`.

---

## 6. DEDICATED MARKETING SITE (`apps/marketing`)

### 6.1 Landing Page (`apps/marketing/src/pages/index.tsx`)

Build a high-speed Static/SSR page importing calculations directly from `@flump/finance-engine`:

1. **Hero Section with Dual-Mode Interactive Calculator:**

- Headline: _"Get out of the red. Build into the black."_
- Mode Toggle Tab A (`Clear Debt & Stabilize`): Inputs for Total Unsecured Debt, Avg APR, Monthly Repayment Budget. Outputs Debt-Free Date, Interest Saved, and 3-Year Post-Debt Wealth.
- Mode Toggle Tab B (`Build Wealth & Optimize Tax`): Inputs for UK Gross Salary, Current Pot, Monthly Contribution. Outputs 10-Yr Net Worth, Marginal Tax Band (with 60% trap warning), and Salary Sacrifice Tax Saved.
- **Primary CTA:** Writes `OnboardingSeedPayload` to root cookie `flump_onboarding_seed` (`Path=/; Max-Age=3600; SameSite=Lax; Secure, host-only`) and redirects to the web app's `/signup`.
- **Secondary CTA:** Links directly to the web app's `/sandbox`.

2. **4-Tab Interactive Persona Switcher:**

- Tab 1: _The Debt Crusher & Rebuilder_
- Tab 2: _The Higher-Rate PAYE Earner (£100k Trap)_
- Tab 3: _The Homeowner & Remortgager_
- Tab 4: _The Landlord & Self-Employed (Section 24)_

3. **Interactive "Scenario Layers" Demo:** 30-year chart with 4 clickable life-event chips overlaying a dotted comparison trajectory.
4. **90-Second Onboarding Timeline & Comparison Matrix:** Comparing Flump against DIY Spreadsheets and Generic Budgeting Apps.

### 6.2 Programmatic UK SEO Calculators (`apps/marketing/src/pages/tools/[slug].tsx`)

Generate static pages powered by `@flump/finance-engine` for:

- `/tools/uk-100k-tax-trap-calculator`
- `/tools/uk-debt-snowball-vs-avalanche-calculator`
- `/tools/0-percent-balance-transfer-payoff-calculator`
- `/tools/mortgage-overpay-vs-isa-calculator`
- `/tools/section-24-landlord-tax-calculator`
  Every calculator must feature a **"Open & Save This Plan in Flump →"** button that populates the `flump_onboarding_seed` cookie and redirects to onboarding.

---

## 7. EXECUTION PHASES & VERIFICATION GATES

Execute this plan sequentially. After each phase, run typecheck, unit tests, and bundle boundary checks before proceeding.

- **Phase 1: Foundation Packages (`@flump/finance-engine` & `@flump/banking`)**
- _Deliverables:_ Implement domain types, UK tax/debt/mortgage/Section 24 math, and the banking subpath package (`./core`, `./server`, `./client`) with `SandboxAdapter`, `CsvStatementParser`, and `PlaidAdapter`.
- _Verification Gate:_ `pnpm --filter @flump/finance-engine test` and `pnpm --filter @flump/banking typecheck` must pass with zero client imports of `./server`.

- **Phase 2: State Consolidation & Progressive Onboarding (`apps/web`)**
- _Deliverables:_ Create `baseline.store.ts`, remove duplicate profile/module wizards, merge `/app/savings` into `/app/accounts`, and implement the 3-step `/onboarding` route with host-only seed cookie hydration.
- _Verification Gate:_ Verify that signing up with a mocked `flump_onboarding_seed` cookie pre-fills `FinancialBaseline`, assigns the proper `FinancialStage`, and lands on the stage-adapted Home Dashboard in under 3 clicks.

- **Phase 3: Debt Crusher (`/app/debt`), Module Upgrades & `/sandbox**`
- _Deliverables:_ Build `/app/debt` (Snowball/Avalanche + Debt-to-Wealth chart), add Safe-to-Spend & Priority Bills to `/app/budget`, add Allowance Pills and Life Event Chips to `/pension` and `/forecast`, and wire up `/sandbox`.
- _Verification Gate:_ Test `/sandbox?persona=debt` and `/sandbox?persona=wealth` to confirm adaptive navigation and stage-weighted Health Scores render accurately.

- **Phase 4: Dedicated Marketing Site (`apps/marketing`)**
- _Deliverables:_ Build `/`, `/pricing`, `/security`, and the 5 `/tools/[slug]` SEO pages using `@flump/finance-engine` and `@flump/ui`.
- _Verification Gate:_ Confirm zero WorkOS SDK code is bundled into `apps/marketing` and verify cookie handoff (host-only cookies; superseded, see E21 domain removal) from the marketing site to the web app's `/onboarding`.

# Flump IA, navigation and ease-of-use review, November 2026

Date: 2026-11-12. Pinned to `origin/main` at `70f4ec76`. Read-only: no code was changed. Builds on [app-review-2026-11.md](app-review-2026-11.md) (IDs `R-nn` cited, not repeated), [E16 decision pack](../plans/E16-decision-pack.md) (`F`, `D`, `T-` IDs), [E15 plan](../plans/E15-plan-draft.md) and [market research](../../research/market-research-2026-11.md).

## Method and limits

- **Live:** signed-out `https://web-production-845e6c.up.railway.app/sandbox` at 1280px and 375px (DOM probe of header, drawer, links, tap heights), and `GET /app/tax` (redirects to a *staging* AuthKit sign-in).
- **Code:** nav manifest, header, drawer, bottom bar, `pageConfig`, onboarding, profile, Savings tabs (paths below).
- **Not covered:** every signed-in screen. I did not run the app locally signed in (needs backend and WorkOS), so page structure is judged from code and the E16 inventory, not seen running. The local main build of the sandbox is the same screen as live.
- **Simulated, not real:** the card sort, tree test and tap counts in sections 2.4 and 4 are heuristic simulations against five personas produced by a subagent, then reconciled by me against the code. They are estimates. Real users have not been tested (E16 D14 interviews are still open). Validate with a real tree test of at least 15 people per segment before treating any percentage as fact.
- **Skills used:** design-critique (heuristics, IA four systems, excise), ux-strategy (jobs to be done, opportunity order), journey-mapping (current-state first-run journey).
- **Decisions:** straightforward IA calls (labels, page specs, simulated tests) by an opus subagent; the contested ones (top-level vs grouped, bottom bar) by a fable `decider` subagent. Its recommendations are adopted below with its runner-ups recorded. The owner was not asked.

## 1. Navigation inventory (today)

### 1.1 Signed in, desktop (`apps/web/app/components/navigation/navConfig.ts:29-67`, `components/structure/header/Header.tsx:67-109`)

Header, left to right: logo, **Home** (`navConfig.ts:22`), then:

| Order | Item | Type | Route | Visible when |
| --- | --- | --- | --- | --- |
| 1 | Debt | direct | `/app/debt` | `debt` enabled (auto-on only if onboarding found unsecured debt, `app.onboarding.tsx:237`) |
| 2 | Budget | direct | `/app/budget` | always (default on) |
| 3 | Accounts | direct | `/app/accounts` | always |
| 4 | Wealth | dropdown | Savings `/app/savings`, Pension `/app/pension`, Mortgage `/app/mortgage` | each if enabled; group vanishes if none |
| 5 | Planning | dropdown | Tax `/app/tax` only | opt-in (`pageConfig.ts:126`); self-employed users get it by default (`app.onboarding.tsx:242`) |

Right of the nav: theme toggle, avatar link to `/app/profile` (a plain link, not a menu, `Header.tsx:83-89`), log out. A hamburger button is rendered for mobile.

Not in the nav at all: Forecast (route `/app/forecast` 301-redirects to `/app/savings#forecast`, `routes/app.forecast.tsx:7`; yet the `forecast` key is still in `ALL_PAGE_KEYS`, `pageConfig.ts:8,37,91-98`, and onboarding still enables it, `app.onboarding.tsx:236`); Onboarding; AI connections; public Tools (`/tools`, `/mcp`; the only in-app links are in the signed-out footer, `components/home/HomeFooter.tsx:139-164`).

Depth (clicks from Home, desktop): Debt 1, Budget 1, Accounts 1, Savings/Pension/Mortgage 2 (open dropdown, pick), Tax 2, Profile 1, **take-home calculator 3+** (Wealth, Savings, then the fourth of four tabs, `SavingsContainer.tsx:96,237`; default tab is "forecaster"), **AI connections 2** (avatar, then the "AI connections" segmented tab, `UserProfilePanel.tsx:235,404`).

### 1.2 Mobile drawer (`MobileNavDrawer.tsx:29-170`)

Opened with the header hamburger or "More". Same manifest: Home, Debt, Budget, Accounts, then section headings "Wealth" and "Planning" with children (`NavMenu.tsx:173-174`), a "User Profile" link, theme toggle, log out. Modal with focus trap (good, H3).

### 1.3 Bottom bar (`MobileBottomBar.tsx:27-66`)

Budget, Debt, Savings, Accounts, More. **No Home tab.** Tabs are filtered by enabled modules, so the bar can shrink to 3 + More when Debt or Savings is off. Not rendered in the signed-out sandbox (probe: `#mobile-bottom-bar` absent at 375px).

### 1.4 Signed out (live)

- Header: logo, Home, theme, **Sign up** (`/signup`, 32px high), **Log in**, hamburger (44px). Drawer lists only "Home / Sign up / Log in". No bottom bar.
- Sandbox dashboard "Open" links point to `/app/debt`, `/app/accounts`, `/app/budget`, all behind login (R-02).
- At 375px the page `h1` ("Welcome back, Sam Jordan") starts about 660px down an 812px screen: two identical disclaimer banners, persona picker and sample-data note come first (R-07). First value is below the fold.
- Unknown and protected URLs go to a **staging** AuthKit page (R-14).

### 1.5 Where the top jobs live today

| Job (segment) | Where it is | Findable? |
| --- | --- | --- |
| £100k trap, take-home, salary sacrifice (PAYE high earner, family) | Savings, fourth tab; "Planning > Tax" label promises it (`common.json:47` `navTaxDesc`) but that page is the Self Assessment ledger | No |
| Self Assessment, Section 24, rental P&L (landlord, self-employed) | Planning > Tax, opt-in, hidden unless self-employed | Partly |
| Net worth, balance check-in (FIRE, everyone) | Accounts / Home | Yes |
| Overpay vs invest, remortgage (family, landlord) | Wealth > Mortgage | Mostly |
| Debt payoff | Debt (top-level on desktop and in the mobile bar) | Yes |
| Connect an AI (AI power user) | Avatar, then Profile, then AI tab | Weak |
| Free calculators (acquisition, quick checks) | Marketing site only | No |

## 2. Ideal order and grouping

### 2.1 Principles from the evidence

1. **Put the strongest demand where people look first.** The £100k trap and marginal-rate cliffs are the highest-ranked pain point (market research 2.1, rows 1, 4, 5) and F05/F06 score 4.43/3.14 (E16), yet sit in a fourth tab under Savings.
2. **Daily and monthly habit pages stay one click away.** The only monthly loop is the balance check-in (F04): Accounts and Budget are always on and should not hide in a dropdown.
3. **Group by the question the user asks, with nouns they search for.** "Wealth" and "Planning" are internal categories (Hick, Mental model). Mortgage is a liability yet sits under "Wealth".
4. **At most six top-level items** (E16 rule, Miller). Groups of one collapse to a direct link.
5. **One manifest** drives desktop, drawer and bottom bar (E16 T-IA-1, E15 T2.8).

### 2.2 Decisions (explicit)

Recommendation: amend E16's proposed nav rather than adopt it as written. E16 proposed *Home, Tax year, Money (Accounts, Budget, Savings), Decisions (Debt, Mortgage, Pension), Tools, Profile and AI*. It loses on three counts: it puts the three daily pages one click deeper, "Decisions" is not a word people search for, and "Tax year" names a hub that does not exist yet. Its best ideas (tax first, six items, Tools and AI off the primary bar) are kept.

| Question | Decision | Reason |
| --- | --- | --- |
| **Savings: top-level or under Wealth?** | **Not top-level. Group "Savings and pension" (Savings, Pension).** Drop the label "Wealth". | Savings is neither a daily nor the strongest-demand page; it is a growth-projection and allowance page (F14 value 2.71). It still gets a one-click entry via the group and a Home card. Runner-up (Savings top-level) loses because it spends a scarce slot on a nice-to-have. Revisit if beta analytics show Savings visited more often than Budget. |
| **Pension** | Under "Savings and pension"; cross-linked from Tax and pay (salary sacrifice) | Card sort splits Pension three ways (simulated); grouping with Savings is the least-bad label, the cross-link covers the rest. |
| **Mortgage** | Under "Borrowing" with Debt | Both are liabilities with a payoff-or-overpay decision. Out of "Wealth". |
| **Debt** | Under "Borrowing" (direct link when it is the only one enabled). Mobile: in More. | Biggest trade-off: Debt drops from top-level. Mitigated by a Home debt card (E15 dashboard) and by the one-item collapse rule. Revisit if beta data shows Debt outranks Budget. |
| **Tax and take-home** | **New top-level "Tax and pay"**, always on, containing Take-home pay (with the £100k trap and salary sacrifice, moved out of Savings) and, when opted in, Self Assessment. Becomes E16's "Tax year" hub when built. | Highest-value feature, always relevant to PAYE users. Direct link while only Take-home is enabled. |
| **Budget** | Top-level, always on | Monthly loop; surplus feeds safe-to-spend. |
| **Ledger (opt-in)** | Child of "Tax and pay", labelled **Self Assessment**, off by default, on for self-employed or rental income (E16 D3). | "Ledger" and bare "Tax" hide that it is the HMRC return. Fixes the `navTaxDesc` mismatch. |
| **Forecast** | Removed as a concept. Growth forecast stays a tab on Savings; the take-home calculator moves to Tax and pay. | E16 D5-B; stop enabling the dead `forecast` key. |
| **Accounts** | Top-level, always on | Net-worth tracker and check-in. |
| **AI connections** | Avatar menu, direct link to the AI tab. Not top-level. | Serves one segment; a power user will look under their account. Also surface on Home when empty. |
| **Settings and profile** | Avatar menu "Settings" | Avoids "Profile" suggesting a public page. |
| **Free calculators** | Avatar menu "Free calculators" (`/tools`) | Acquisition surface and quick checks; not a daily destination. |

### 2.3 Bottom bar (mobile, signed in)

**Home | Accounts | Budget | Tax and pay | More.** All four are always-on pages, so the bar never reflows when modules switch off. Savings, Pension, Debt, Mortgage, Self Assessment, Settings, Connect AI and Free calculators live in More (grouped as on desktop, filtered by enabled modules). Add the missing Home tab (it matches the E12 companion, which starts at Dashboard).

- Runner-up: Home | Accounts | Budget | Savings | More. Mirrors E12 more closely and needs no new route, but keeps the top feature two taps deep on the device where payslip questions get asked.
- Rejected: the current bar (no Home; Debt can be switched off, leaving a gap).
- Counter-argument: take-home is episodic (payslip, pay rise, April), so it may not earn a permanent slot. Swap slot four to Savings if beta tap data shows it at a fraction of Savings' use.
- **Conflict to settle with E15 and E12:** E15 T2.8 and I-12 say "Home first and Debt reachable on mobile". This proposal puts Debt one tap deeper (More) and the E12 tab list (Dashboard, Accounts, Budget, Savings/Forecast, Mortgage, Tax, Profile) differs. The owner should not have to arbitrate: E15's shell owner should take this manifest and update E12's list.
- **Signed-out sandbox** uses the same bar; its tabs point at sandbox views of the same pages and More holds Sign up and Log in.

### 2.4 Proposed navigation trees

Current:

```
Desktop header                          Mobile bottom bar         Mobile drawer
Home                                    Budget                    Home
Debt          (direct)                  Debt                      Debt
Budget        (direct)                  Savings                   Budget
Accounts      (direct)                  Accounts                  Accounts
Wealth  v  Savings | Pension | Mortgage More                      Wealth: Savings, Pension, Mortgage
Planning v  Tax (opt-in)                                          Planning: Tax (opt-in)
[avatar -> Profile]                                               User Profile
```

Proposed:

```
Desktop header                                  Mobile bottom bar     Mobile drawer ("More")
Home                                            Home                  Savings and pension: Savings, Pension
Accounts                                        Accounts              Borrowing: Debt, Mortgage
Budget                                          Budget                Self Assessment (opt-in)
Tax and pay   v  Take-home pay | Self Assessment*   Tax and pay       Settings
Savings and pension v  Savings | Pension        More                  Connect AI
Borrowing     v  Debt | Mortgage                                      Free calculators
[avatar menu: Settings | Connect AI | Free calculators | Log out]      Theme, log out
* opt-in. A group with one visible child renders as a direct link.
```

Labels (plain UK English, from the opus pass): Tax and pay (not "Planning"), Take-home pay, Self Assessment, Savings and pension (not "Wealth"), Borrowing, Accounts (net worth becomes a KPI, not part of the label), Settings (not "Profile"), Connect AI (name Claude and ChatGPT on the page, which is what people search), "Growth forecast" tab on Savings (not "Wealth forecaster"). Fix the page-config labels too: "Accounts and net worth", "Mortgage tools", "Wealth forecaster" (`pageConfig.ts:44,85,93`).

### 2.5 Simulated card sort (5 personas, 24 cards; estimates)

Stable groups: **Money now** (85%+: Accounts, balance update, net worth, Budget, spending categories, savings rate); **Account and settings** (90%: AI connections, export, preferences; the AI power user alone files AI under Tools); **Tax year** (75%: take-home, £100k trap, salary sacrifice, ISA allowance, 5 April checklist); **Self Assessment** (70%, landlord and self-employed want it inside tax, PAYE and FIRE want it hidden); **Big decisions** (65%: Mortgage, overpayment, rate shock, Debt payoff, Pension projection). Least agreement: Pension (split three ways), the Savings projection, public calculators (Tools or Tax year). Result: the "Tax and pay" group and avatar-menu placement fit the sort; "Savings and pension" and "Borrowing" are the weakest groupings and the first thing to test for real.

### 2.6 Simulated tree test, current tree (estimates)

| # | Task | First click right | Eventually succeed | Where they go wrong |
| --- | --- | --- | --- | --- |
| 1 | How much do I lose above £100k | 10% | 15% | Planning > Tax shows the ledger; real home is a hidden Savings tab |
| 2 | Interest saved by overpaying mortgage | 60% | 80% | Some try Debt first |
| 3 | Connect Claude to my data | 25% | 55% | Look for a top-level AI item, then Planning |
| 4 | Add this month's balances | 65% | 85% | Fine on mobile (Accounts in bar) |
| 5 | Self Assessment deadline | 35% | 60% | "Planning" does not read as tax; opt-in |
| 6 | Salary sacrifice effect | 15% | 30% | Not surfaced; try Pension or Planning |
| 7 | Will my pension be enough | 50% | 75% | Mobile: Pension is behind More |
| 8 | Monthly surplus | 70% | 90% | Budget |
| 9 | Debt-free date | 80% | 90% | Debt |
| 10 | Take-home pay | 10% | 20% | Hidden Savings tab |

Mean about 42% first click, 60% success. All the weak spots are tax and AI, which is exactly what the proposal moves.

## 3. Page structure specs

Every page follows the E15 order: page header (question) → KPI strip (`KpiStrip`, max 4) → controls (`SliderField` in `SimulatorSplitLayout` sticky left) → chart → outcome cards → schedules (>8 rows in `CollapsibleDrawer`). Cross-links use one shared "Related" strip (see T-IA-10). Empty states must be honest (no fabricated figures, E2) and offer one action.

| Page | Primary question | Section order | Empty / first run | Cross-links |
| --- | --- | --- | --- | --- |
| **Home** (E15 owns) | Am I on track this month? | KPIs (net worth, monthly surplus, next deadline, one stage metric) → to-do card (log balances, SA due, finish setup) → net-worth trend → module cards (core four, E16 D11-B) | Setup checklist; "Not set" not £0 (R-05); AI connect prompt if empty | Accounts, Budget, Tax and pay, Debt card when debt exists |
| **Accounts** | What do I own and owe today? | KPIs (net worth, assets, liabilities, change this month) → check-in action → trend → account list → monthly history in a drawer | "Add your first account" plus CSV import when it exists (E16 F41) | Home, Debt, Savings |
| **Budget** | Where does my take-home go? | KPIs (income, spend, surplus, savings rate) → categories → spend chart → over/under cards → 12-month ledger in a drawer; emergency-fund-months as one card (E16 F18) | Starter template built from take-home | Tax and pay (take-home), Debt, Savings |
| **Tax and pay: Take-home pay** (new, extracted from Savings) | What do I actually take home, and what can I change before 5 April? | KPIs (take-home, marginal rate, allowance used, days to 5 April) → inputs (salary, region, student loan, pension %) in sticky controls → sections or tabs: take-home, £100k trap, salary sacrifice → outcome "£X saved" → band table in a drawer. One engine call (E16 T-FIX-3). | Salary field only; region and student loan default visible | Pension (salary sacrifice), Self Assessment, Budget |
| **Tax and pay: Self Assessment** (opt-in) | What will I owe HMRC and when? | KPIs (estimated bill, payments on account, next deadline, records logged) → entry → by-category chart → bill estimate → ledger in a drawer | "Do I need to file?" check, then opt-in | Take-home, Accounts, Settings |
| **Savings** | How will my savings and ISAs grow? | KPIs (total, ISA allowance used, weighted rate, projected value) → split layout with sliders → projection chart → goals → year table in a drawer; "Growth forecast" stays a tab, take-home leaves | Goal-first prompt | Pension, Tax and pay (ISA allowance), Budget |
| **Pension** | Will I have enough to retire? | KPIs (pot, contributions, projected income, annual allowance left) → split layout → projection → retirement-age outcome → tax-relief card → schedule in a drawer | "Add your workplace pension" (fold the wizard in, F13) | Take-home (salary sacrifice), Savings, Home |
| **Mortgage** | What if I overpay or rates change? | KPIs (balance, rate, term left, interest saved) → split layout → balance chart → outcome cards → rate-shock card → amortisation in a drawer | "Add mortgage" or a sample; no £0/0% panel (E16 T-FIX-6) | Debt, Budget, Accounts |
| **Debt** | What is the fastest, cheapest way out? | KPIs (total, interest a month, debt-free date, interest saved) → split layout (avalanche or snowball) → payoff chart → outcomes (merge the wealth-bridge card, E16 F09) → schedule in a drawer | "Add a card or loan" | Budget, Mortgage, Accounts |
| **Settings** | How do I control my data? | Account → preferences and module toggles → data export and delete (E16 F40) → danger zone. Split from the 930-line panel. | n/a | Home, Connect AI |
| **Connect AI** (own page or Settings section, deep-linkable) | How do I connect Claude or ChatGPT safely? | Lead with the offline context pack (E16 F32) → token and scopes (when real) → setup steps per client → audit counts | 3-step Claude setup | Settings, Free calculators |
| **Onboarding** | What should I set up first? | Income (the only required field) → housing and one account → hand off to the Home checklist. Each step skippable. | n/a | → Home checklist |

Things that should move or merge between pages:

- Take-home calculator and £100k trap: Savings → Tax and pay (`SavingsContainer.tsx:96`, `components/forecast/UKTaxCalculator.tsx`).
- Salary sacrifice: today split between Pension and the calculator; the interaction lives on Take-home with a read-only summary and link on Pension.
- Emergency runway: Budget card, not a page section of its own (E16 F18).
- Forecast key: delete from `pageConfig.ts`, onboarding and widget lists.
- Free calculators: avatar menu link; the signed-in `/tools` should not bounce to a duplicate (R-13).

## 4. Ease-of-use friction

### 4.1 Taps to complete the top 10 tasks, today vs proposed

Counted on the code (desktop clicks / mobile taps from Home; dropdown hover counts as one click). "n/a" means the task is not possible as a discrete action today. Simulated, not measured.

| # | Task | Today desktop / mobile | Proposed desktop / mobile | Note |
| --- | --- | --- | --- | --- |
| 1 | £100k trap | 3+ / 4+ (hidden tab; often fails) | 1–2 / 1–2 (Tax and pay, then the trap section) | biggest win |
| 2 | Take-home pay | 3 / 4 | 1 / 1 | plain link and bottom tab |
| 3 | Salary sacrifice | n/a / n/a | 1–2 / 1–2 | not surfaced today |
| 4 | Self Assessment deadline | 2 / 3 (only if opted in) | 1 / 1 via Home card, else 2 / 2 | |
| 5 | Mortgage overpayment | 2 / 2 (More, Mortgage) | 2 / 2 (Borrowing, Mortgage; More, Mortgage) | same |
| 6 | Debt-free date | 1 / 1 | 2 / 2 (or 0 via Home debt card) | **regression** on both; Home card mitigates |
| 7 | Will my pension be enough | 2 / 2 | 2 / 2 | same |
| 8 | Add this month's balances | 1 / 1 | 1 / 1 (Accounts, or Home to-do) | same |
| 9 | Monthly surplus | 1 / 1 | 1 / 1 | same |
| 10 | Connect Claude | 2 / 3 (avatar, then tab) | 2 / 2 (avatar menu or More, then page) | |

Net: tax tasks go from mostly failing to one or two taps; Debt costs one tap more. The cost is accepted because Debt is a segment page that Home can surface, while tax is the product's strongest pull.

### 4.2 Onboarding to first value (current-state journey, signed out to first number)

| Phase | What happens | Evidence | Friction |
| --- | --- | --- | --- |
| Discover | Public tools answer with zero inputs (E16 "best experience") | E16 read-first 4 | none; no in-app way back to them |
| Try | `/sandbox` | live | Headline 660px down at 375px; two disclaimers; no bottom bar; "Open" → login wall (R-02, R-07) |
| Sign up | Redirect to staging AuthKit | live | Looks like a test environment (R-14); `/signup` vs `/signUp` |
| Onboard | Three steps, about 15 inputs; Finish needs income only | `app.onboarding.tsx:109,236,429` | Marketing promises "6 numbers, 60 seconds" (R-20); E16 T-FIX-1/2 say Finish was failing and several fields were dropped |
| First value | Home KPIs | | Dead `forecast` module enabled; missing data shows £0 not "Not set" (R-05) |
| Month two | Check-in | E16 F04 | History row not written (T-FIX-5) |

Moment of truth: the click on a sandbox "Open" link. It currently ends in a sign-in wall; the fix is in T-IA-1 (short term relabel and disable, long term sandbox sub-pages, R-02).

### 4.3 Jargon and required inputs

Jargon to replace or explain on first use: "Liab" (use "Liabilities"), "burn rate allowance", "Stage 1: Stabilize & Clear" (R-11; also US spelling), "Runway", "safe-to-spend" (explain once), "AER", "SIPP", "BTL", "wealth bridge", "Wealth forecaster", "Planning". Keep "Section 24" and "Self Assessment" only where the landlord or self-employed persona is already opted in.

Required inputs before first value: today about 15 across three steps of which only income gates Finish. Target (E16 F01): at most 6 required (salary, employment type, region, student-loan plan, one account balance, housing status), rest as "add later" in the Home checklist; fix marketing copy to match.

## 5. Heuristic findings (new in this review)

Severity 0–4 (Nielsen). Each carries the principle, why it matters, and the fix.

| ID | Sev | Finding | Principle | Fix |
| --- | --- | --- | --- | --- |
| N-01 | 4 | The £100k trap and take-home live in the fourth tab of Savings; the only nav entry that promises tax ("Planning > Tax", `common.json:47`) opens the Self Assessment ledger. The strongest-demand job cannot be found. | H2 match, mental model, findability | New "Tax and pay" top-level, extract the calculator (T-IA-3, T-IA-5) |
| N-02 | 3 | Mobile bottom bar has no Home and can shrink when modules are off; the monthly loop has no one-tap entry. | H7, consistency | Home / Accounts / Budget / Tax and pay / More (T-IA-4) |
| N-03 | 3 | "Wealth" holds Mortgage (a liability) and "Planning" holds one item. Both are internal categories. | H2, IA organisation scheme | Regroup into Savings and pension, Borrowing, Tax and pay (T-IA-5) |
| N-04 | 3 | Signed-out sandbox: nav is Home/Sign up/Log in only, no bottom bar, and every "Open" goes to sign-in. The demo cannot demonstrate navigation. | H1, H3, goodwill | Sandbox shell with the same bar; relabel "Sign up to open" now (T-IA-1) |
| N-05 | 2 | AI connections is a tab inside a 930-line profile panel; no entry from anywhere else. | H6 recognition, findability | Avatar menu link and deep-link param (T-IA-6) |
| N-06 | 2 | Disabled modules have no route guard (grep of `enabledPages` in `routes/` finds only onboarding): a direct URL to a hidden page loads it, and hidden pages have no "turn on" path. | H3, H5 | Guard plus "turn on in Settings" page (E16 T-IA-1) |
| N-07 | 2 | Dead `forecast` module key still in `ALL_PAGE_KEYS`, onboarding and widget meta; profile toggles may offer a module that does not exist. | H4 consistency | Remove (T-IA-11) |
| N-08 | 2 | Avatar is a link, not a menu; Profile, AI and Tools have no shared home. | Excise (navigational) | Avatar menu (T-IA-6) |
| N-09 | 2 | Page labels in `pageConfig` are longer and different from nav labels ("Accounts and net worth" vs "Accounts"; "Mortgage tools" vs "Mortgage"). | H4 | One label per concept from the manifest |
| N-10 | 1 | Related pages do not link to each other (salary sacrifice affects take-home, pension and tax; mortgage overpay affects debt and budget). | Dead ends, contextual navigation | "Related" strip component (T-IA-10) |

## 6. Ranked changes

Effort S under 1h, M under 1 day, L multi-day (same scale as the app review). Ranked by user value, then cost.

| Rank | Change | Effort | Where | Overlap |
| --- | --- | --- | --- | --- |
| 1 | Surface take-home, £100k trap and salary sacrifice as "Tax and pay" top-level (extract from Savings; interim link to the Savings tab) | M | `SavingsContainer.tsx:96,237`, `components/forecast/UKTaxCalculator.tsx`, `navConfig.ts:29-67` | E16 T-MERGE-1/T-ADD-2; engine call from T-FIX-3 |
| 2 | Bottom bar: add Home, swap to Home / Accounts / Budget / Tax and pay / More | S | `MobileBottomBar.tsx:27-35` | **E15 T2.8, E12**: settle the tab list |
| 3 | Regroup desktop nav and drawer: Savings and pension, Borrowing, one-item collapse | M | `navConfig.ts`, `NavMenu.tsx:173`, `common.json:37-47` | E15 T3.0 owns the shell; do the manifest, not the visuals |
| 4 | Avatar menu (Settings, Connect AI, Free calculators) plus `?tab=ai_connections` param | S | `Header.tsx:83-89`, `UserProfilePanel.tsx:235` | quick-wins session: none |
| 5 | Signed-out sandbox shell and "Sign up to open" labels | S short, L long | `HomeDashboard.tsx:573-577`, `routes/sandbox.tsx` | R-02/R-07 (quick-wins); E15 owns the dashboard |
| 6 | Relabel and fix descriptions: Wealth/Planning/Tax, `navTaxDesc`, "Settings", page labels | S | `common.json:37-47`, `pageConfig.ts:41-107` | copy only; R-11 sweep |
| 7 | Rename the ledger to "Self Assessment" (route redirect) | S | `app.tax.tsx`, `navConfig.ts:60` | none |
| 8 | Remove the dead `forecast` key from page config, onboarding and widgets | S | `pageConfig.ts:8,37,91-98`, `app.onboarding.tsx:236` | E16 T-MERGE-1 |
| 9 | Route guard for disabled modules plus "turn on" empty page | M | `routes/app.*.tsx` loaders | E16 T-IA-1 |
| 10 | Onboarding: at most 6 required inputs and honest time claim | M | `app.onboarding.tsx` | E16 T-FIX-1/2, R-20; E12 |
| 11 | "Related" cross-link strip across pages | M | `packages/ui` pattern plus per-page | **E15 owns `packages/ui`** |
| 12 | Home surfaces debt, next deadline and AI prompt cards | M | `HomeDashboard.tsx` | **E15 owns the dashboard** |
| 13 | Real tree test (15 per segment) and 3 interviews | S–M | research | E16 D14 |

## 7. Ticket list (small PRs)

Each ticket is one docs-sized or code PR with the four CI checks. Nothing here is built by this PR.

| ID | PR | Effort | Depends on | Overlap and owner |
| --- | --- | --- | --- | --- |
| T-IA-1 | Sandbox: relabel "Open" to "Sign up to open" and disable the sandbox-only links; add the bottom bar and a drawer with the same tabs | S | none | R-02/R-07: quick-wins session if it has the dashboard lines, else **E15**; do not duplicate |
| T-IA-2 | Copy: new labels and descriptions in `common.json`, `pageConfig.ts` labels, "Settings", US spellings in nav | S | none | quick-wins R-11 touches nearby strings: rebase |
| T-IA-3 | Extract the take-home calculator from Savings into its own route `/app/take-home`; Savings keeps the growth forecast tab; redirect `/app/savings#takehome` | M | none | E16 T-MERGE-1; uses one engine call from T-FIX-3 later |
| T-IA-4 | Bottom bar: Home / Accounts / Budget / Tax and pay / More; More lists the rest, filtered | S | T-IA-3 (or interim hash link) | **E12 and E15 T2.8**: coordinate tab list |
| T-IA-5 | Nav manifest regroup: Tax and pay, Savings and pension, Borrowing, one-item collapse, shared by header, drawer and bar | M | T-IA-2 | **E15 T2.8/T3.0**: land the manifest first; E15 reskins |
| T-IA-6 | Avatar menu: Settings, Connect AI (deep link), Free calculators, Log out | S | T-IA-5 | none |
| T-IA-7 | Rename the ledger to Self Assessment: label, route redirect, nav description | S | T-IA-2 | none |
| T-IA-8 | Remove the dead `forecast` key from `pageConfig`, onboarding and widget meta; migrate stored `enabledPages` | S | T-IA-3 | E16 T-MERGE-1 |
| T-IA-9 | Route guard for disabled modules and an in-app "turn on" page | M | T-IA-5 | E16 T-IA-1 |
| T-IA-10 | "Related" cross-link strip and use on Pension, Take-home, Mortgage, Debt | M | T-IA-5 | **E15 owns `packages/ui`**: ask E15 to add the pattern, then adopt |
| T-IA-11 | Onboarding: at most 6 required inputs, "add later" in the checklist, copy matches | M | E16 T-FIX-1/2 | E16, R-20, E12 |
| T-IA-12 | Home: debt, deadline and Connect AI cards | M | T-IA-5 | **E15 dashboard**: hand over as a requirement, do not build here |
| T-IA-13 | Real tree test and interviews | S | T-IA-5 designs | E16 D14 |

Suggested order: T-IA-2, T-IA-1, T-IA-3, T-IA-4, T-IA-5, T-IA-6, T-IA-7, T-IA-8, then T-IA-9 to T-IA-12; T-IA-13 in parallel as soon as a prototype exists.

### Overlap with in-flight work

| Work | Overlap | Rule |
| --- | --- | --- |
| **E15** (owns `packages/ui` and the dashboard) | T-IA-5 shell and manifest (T2.8/T3.0), T-IA-10, T-IA-12, T-IA-1 sandbox dashboard | Land the manifest data and route changes; leave visuals and the dashboard widget set to E15; ask E15 to add the Related strip |
| **Quick-wins session** (app-review fixes) | T-IA-2 copy, T-IA-1 (R-02/R-07), R-11 spellings | Agree who edits `common.json` and `HomeDashboard.tsx`; rebase on whichever lands first |
| **E12** (mobile companion) | Bottom-bar tab list, onboarding inputs | Update E12's tab list to Home, Accounts, Budget, Tax and pay, More |
| **E16** | T-MERGE-1, T-IA-1, T-ADD-2, T-FIX-3 | T-IA-3 is the first slice of the Tax hub; do not fork it |

## 8. What would change these calls

- Beta analytics show Debt visited more than Budget → promote Debt to top-level.
- Savings visited more than Budget → promote Savings.
- Take-home used at a fraction of Savings' rate → swap bar slot four to Savings.
- A real tree test in which "Savings and pension" or "Borrowing" scores under 60% first-click → rename or flatten.
- Owner interviews (E16 D14) contradict the PAYE-first ordering.

## 9. Risks and limits

- All percentages and tap counts are simulated or counted from code, not measured.
- Signed-in screens were not seen running; page specs are proposals against the code and E16 inventory.
- The proposal removes a mobile tab (Debt) that E15's plan wanted reachable; it is reachable in two taps and via Home.
- Route changes need redirects so old bookmarks and the mobile companion links keep working.

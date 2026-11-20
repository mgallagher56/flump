# E42. Marketing site restructure: the site mirrors the app

Decisions: open

> Status: plan for owner approval. No code. Written 2026-11-20 against `origin/main` (`da6284f0c`). Paths are relative to the repository root. All copy in this document is a draft for the owner to react to (E7: the owner signs off all marketing copy).

## 1. Summary

- The owner's brief (20 November 2026): the marketing site feels out of touch with the app. Pages should be geared to the features Flump offers and split the way the app is split. The message: Flump is a whole, 360 degree personal finance manager; it keeps things simple and removes the fog for everyone; it has more depth for people who want or need it.
- Today the site has eight page types and none is about an app area. The app has five navigation entries (Accounts, Budget, Pay, Savings and pension, Debt and borrowing) plus Home, the monthly check-in, calculators and settings. The site names none of them.
- Proposal: a "What Flump covers" hub and five area pages named exactly as the app names them, a rebuilt home page that shows all five areas in one picture, and a top navigation of four links. Existing pages stay, with small corrections.
- Nothing gated is sold as available. Retirement is not mentioned at all (decision RD9). The AI connection stays a labelled preview. Imports and bank connections are not mentioned.
- Eight decisions for the owner are in section 7. Nothing is built until they are answered (AGENTS.md section 13).

## 2. Inventory: what a tester can use today

Sources: `apps/web/app/utils/pageConfig.ts`, `apps/web/app/components/navigation/navConfig.ts`, `apps/web/public/locales/en/common.json` (labels), `apps/web/app/routes/`, `apps/web/app/features/*/components/`, and the backend access guards. "Checked" means the component or guard was found in the code on 2026-11-20; behaviour was not exercised in a browser.

Who can use it:

- **Everyone** means every invited account. Sign-up itself is invite-only (`SIGNUP_MODE` in `apps/marketing/src/utils/site.ts`; the closed-beta allowlist in `apps/backend/src/auth/beta-access.ts`).
- **Friends beta** means the accounts in `RETIREMENT_ALLOWED_USER_IDS`, or everyone while `BETA_OPEN=true` (`apps/backend/src/modules/retirement/retirement.access.ts`).
- **Named users** means an allowlist of user ids (`MCP_ALLOWED_USER_IDS`, `BANK_CONNECTIONS_ALLOWED_USER_IDS`, the imports guard).
- Not verifiable from the repository: which of these switches are set in the deployed environment. This plan assumes the stricter reading in every case.

| App area (app's own name) | Route | What it does today (checked in code) | Who | What the marketing site says now |
| --- | --- | --- | --- | --- |
| Home ("Your money") | `/` | KPI strip (net worth, what you owe, pension pots), "Your sections" with one section per area, a setup checklist, the check-in row, a panel to choose which sections show | Everyone | Home hero shows a sample dashboard (`BaselineSnapshotPreview`); `/preview` has a sample dashboard. Never named as "Home" or described as the place the areas meet |
| Accounts | `/app/accounts`, `/app/accounts/:account` | List of accounts in groups, a quick balance update, joint ownership with your share, the basis of the net worth figure | Everyone | Nothing. The FAQ mentions "net worth" once |
| Monthly check-in and history | Check-in sheet on Home; `/app/accounts/history` | A prefilled monthly check-in, net worth over time, monthly change, changes by account, a chosen check-in day in Settings | Everyone | `/preview` has a "Check-in" section. No page explains it. The reminder email is not built (E30 PR3) |
| Budget | `/app/budget` | Income and spending lists, a setup wizard, what is left over each month, breathing room, housing costs (rent or mortgage) as a linked line, an illustration of income stopping | Everyone | Home: "breathing room and what is left over each month". `/preview` has a "Breathing room" section. The word "Budget" does not appear on the site |
| Pay: Take-home pay | `/app/take-home` | Take-home pay breakdown (Income Tax, National Insurance, pension, student loan), a pay rise tool, the next pound explorer | Everyone | Home pay-rise teaser (a working tool); one "Your pay and pension" card; two public calculators |
| Pay: Self Assessment | `/app/self-assessment`, `/app/tax/*` | Self-employed and rental income and costs by tax year, receipts, a tax bill estimate, payments on account, year comparison. Opt-in: off until switched on in Settings or by onboarding | Everyone (opt-in) | Nothing, apart from the public landlord tax calculator |
| Savings and pension: Savings | `/app/savings` | Savings accounts with AER, an estimate of growth, ISA allowance used, investment returns, a deposit timeline, a pay rise scenario | Everyone | FAQ: "forecast tools" (a name the app retired in E16 D5-B). One calculator (mortgage or ISA) |
| Savings and pension: Pension | `/app/pension` | Pension pots, what you and your employer pay in, salary sacrifice, the effect of a contribution change on take-home pay | Everyone | Half of one home card; one calculator |
| Retirement plan | `/app/retirement` | A target the user sets and an estimated yearly income | Friends beta. Hidden from navigation; refused callers get a 404 (RD9) | Nothing, correctly |
| Debt and borrowing: Cards and loans | `/app/debt` | List of debts, estimated debt-free date, when a 0% deal ends, a pay extra tool comparing highest rate first with smallest balance first, a MoneyHelper line | Everyone | One sentence in a home card; three calculators |
| Debt and borrowing: Mortgage | `/app/mortgage` | Repayment schedule, overpayments, overpay or save comparison, LTV milestones, an estimate for when a fixed rate ends, buy-to-let overview | Everyone | One sentence in a home card; one calculator |
| Calculators | `/tools`, `/tools/:slug` (both sites, shared catalogue `packages/ui/src/tools/toolCatalog.ts`) | Eight public calculators, no sign-in | Public | `/tools` index and one page per calculator. In the top navigation. Not grouped by app area |
| Onboarding | `/app/onboarding` | Three steps (income, housing, savings and debts) with a running summary | Everyone | Home and FAQ: "a few rough numbers". Accurate |
| AI connection | Settings, Security tab (`/app/profile?tab=ai_connections`) | Create an access token and connect an AI assistant over MCP | Named users in production unless `MCP_OPEN_ACCESS=true` (`apps/backend/src/auth/mcp-access.ts`) | `/mcp` page, badge "Preview", top navigation link. "How to turn it on" reads as if every invited user can do it |
| Imports | `/app/imports`, `/app/imports/:id` | Review and confirm figures staged through the AI connection | Named users (`apps/backend/src/modules/imports/imports-access.guard.ts`) | One fixed sentence on `/security` and `/mcp` (`AI_STAGING_SENTENCE`) |
| Bank connections | Settings | Off for everyone except allowlisted owner accounts, and refused at boot until the bank launch gate passes (`apps/backend/src/config/boot-guards.ts`) | Named users | "Flump does not connect to your bank". Accurate, and the guards forbid promising it |
| Settings | `/app/profile` | Tabs: Profile (age and pay, check-in day, net worth choices, which sections are on), Security (how you sign in, AI connection, imports), Data | Everyone | Nothing |
| Data export and deletion | Settings, Data tab; `/account/export` | "Download your data" (JSON checked; a CSV export merged in #754 but was not found in the settings UI in this check), "Delete your financial data", account deletion | Everyone. Deletion answers 503 until the owner sets `DELETION_TOMBSTONE_KEY` (EPICS table row 1); not verifiable here | Nothing. `/security` does not say you can download or delete your data |

## 3. Gap list

**Areas with no page or mention**

1. Accounts and net worth: no page, and the word "accounts" is not used for the app area anywhere.
2. Budget: the site talks about its outputs (left over, breathing room) and never names the area.
3. The monthly check-in and history: one preview section, no explanation of the habit the app is built round (E30).
4. Self Assessment: absent, although it is a whole opt-in area.
5. Savings: absent as an area.
6. Settings, data download and deletion: absent. For a finance product these are trust facts.
7. The Home dashboard as the place where the areas meet: shown as a sample, never explained.

**Described differently from the app**

8. The home FAQ says "tax, debt, mortgage and forecast tools". The app's names are Take-home pay, Self Assessment, Cards and loans, Mortgage and Savings. "Forecast" was retired as a name (E16 D5-B).
9. The home cards are organised by outcome ("Where you stand each month", "What a change would do", "Your pay and pension"). That is good copy and a poor map: a visitor cannot tell from it what areas the app has.
10. The site calls the debt area "debts"; the app calls the group "Debt and borrowing" and the page "Cards and loans".
11. `/mcp` describes setup in the present tense for a feature behind an allowlist. Copy guide 7.4 says copy for an allowlisted feature is not written in the present tense.
12. The Pricing list of what the beta includes names three outputs, not the areas.

**Navigation that does not match the app's groups**

13. Site navigation: Calculators, Pricing, Security, AI connection, Preview, Contact. App navigation: Accounts, Budget, Pay, Savings and pension, Debt and borrowing. No entry is shared.
14. A named-users preview (AI connection) has a top-level link while the five areas every tester uses have none.
15. Calculators are one flat list of eight; nothing ties a calculator to the app area that does the same job with saved figures.
16. `/preview` sections (Dashboard, Check-in, Breathing room) do not link to anything that explains them.

**Missing but out of scope here**

17. Privacy policy, terms, cookie position and accessibility statement pages (EPICS table row 2) wait for text from the owner and legal. The new footer leaves a "Legal" column ready for them; this epic does not write them.

## 4. Proposed site map

One rule: an area page has the same name, order and grouping as the app's navigation, so a visitor who signs in already knows the layout.

### 4.1 Top navigation (four links and the call to action)

`What Flump covers` (menu: the five areas) · `Calculators` · `Preview` · `Pricing` · **Request an invite** · Sign in

Security and privacy, AI connection and Contact move to the footer. The "What Flump covers" menu ends with a link to "Security and privacy", so it is still one press from every page. The mobile drawer lists the five areas under the same heading.

### 4.2 Pages

| Page | Path | Purpose | Covers (app area) | The one thing to understand | Calculators linked | Preview link |
| --- | --- | --- | --- | --- | --- | --- |
| Home | `/` | Carry all three messages and send people to an area, the preview or the invite | Home dashboard, all five areas | Flump puts your whole money picture in one place, from a few rough figures | Pay-rise teaser stays as the one working tool on the page | Sample dashboard in the hero, link to `/preview` |
| What Flump covers (new) | `/features` | The map: five areas, one paragraph each | All | The site and the app are laid out the same way; use one area or all five | Link to `/tools` | Link to `/preview` |
| Accounts (new) | `/features/accounts` | Net worth and the monthly check-in | Accounts, monthly check-in, history | Every account in one list, and a short check-in once a month | None fits today | Dashboard and Check-in sections |
| Budget (new) | `/features/budget` | Left over each month and breathing room | Budget, housing costs | What comes in, what goes out, what is left, whether you rent or pay a mortgage | None fits today | Breathing room section |
| Pay (new) | `/features/pay` | Take-home pay, and Self Assessment for those who need it | Take-home pay, Self Assessment | What you keep from your pay, and a tax bill estimate if you are self-employed or let property | Pay rise take-home; Student loan repayments; Income above £100,000; Landlord tax | Pay-rise tool embedded (it exists) |
| Savings and pension (new) | `/features/savings-and-pension` | Savings growth estimate and pension contributions | Savings, Pension | Your savings and pension sit beside everything else, with estimates you can change | Mortgage or ISA; Income above £100,000 | None today (decision D6) |
| Debt and borrowing (new) | `/features/debt-and-borrowing` | Cards and loans, then mortgage | Cards and loans, Mortgage | What you owe, when it could be paid off, and what a change would do | Debt payoff methods; 0% balance transfer; Overdraft interest; Mortgage or ISA | None today (decision D6) |
| Calculators | `/tools`, `/tools/:slug` | Unchanged. Index gains grouping by the five areas; each calculator page gains "Do this with your own saved figures" linking to its area page | Calculators | Try one without signing in | All eight | n/a |
| Preview | `/preview` | Unchanged, plus a "Read more" link from each section to its area page | Home, check-in, budget | See it working on sample data | n/a | n/a |
| Pricing | `/pricing` | Stays (decision D8). The list of what the beta includes names the five areas | n/a | Free during the beta; the price of any paid plan is not set | Link to `/tools` | n/a |
| Security and privacy | `/security` | Stays, footer and menu link. Adds two facts once verified: download your data, delete your data | Settings, Data tab | What Flump can and cannot do with your money and figures | n/a | n/a |
| AI connection | `/mcp` | Stays at the same path, footer link only. Badge and setup steps reworded (decision D5) | AI connection | A preview for invited testers; Flump does the sums, not the AI model | n/a | n/a |
| Contact | `/contact` | Unchanged | n/a | How to ask for an invite | n/a | n/a |
| Not found | any other path | Unchanged | n/a | n/a | n/a | n/a |

Not on the site: Retirement plan (RD9: people outside the friends beta must not be able to tell it exists), Imports beyond the existing fixed sentence, bank connections.

### 4.3 The area page template

One template renders all five area pages from one data file, so the pages cannot drift apart:

1. **Hero:** area name as a small label, the h1, one lead sentence, "Request an invite" and "Interactive preview".
2. **What you see:** three short facts, each a thing the app shows today.
3. **See it:** a working sample (where a preview or calculator component exists) or an illustration (decision D6).
4. **More detail when you want it:** three or four deeper tools in that area. This is where the third message lives.
5. **Part of one picture:** a strip of all five areas with this one marked, each a link. This is where the first message lives on every page.
6. **Try a calculator:** the calculators mapped to this area, from the shared catalogue.
7. **Final call to action.**

## 5. Message hierarchy

| Message | How the site says it | Where |
| --- | --- | --- |
| 1. One whole view, 360 degrees | By listing the parts, not by adjective: what you own, what you owe, what comes in, what goes out. The five-area strip appears on the home page and every area page | Home hero and second band; "Part of one picture" on every area page; `/features` |
| 2. Simple, and it clears the fog for everyone | "A few rough figures", plain names shared with the app, one headline figure per page, no judgement, renting and a mortgage given equal weight. The tagline "Finance without the fog" stays where the copy guide lists it | Home hero and "Start simple" band; the "What you see" section on every area page |
| 3. Depth for people who want or need it | A named section, "More detail when you want it", always after the simple part and never before it | Home fourth band; section 4 of every area page; Self Assessment on the Pay page |

### 5.1 Home page: three directions

All three keep "Request an invite" in the hero and at the end, the sample dashboard, the pay-rise tool, the security strip and the FAQ.

**Direction A, the whole picture first (recommended).**

- h1: "Your whole money picture in one place"
- Lead: "What you own, what you owe, what comes in and what goes out, side by side. Start with a few rough figures and add detail only if you want it."
- Bands: hero with the sample dashboard; "What Flump covers" (five area tiles); "Start simple" (three steps: enter rough figures, see where you stand, check in once a month); "More detail when you want it"; the pay-rise tool; security strip; FAQ and final call to action.
- Why: it is the owner's first message, it makes the home page the map of the site, and each tile leads with an everyday decision, which keeps the E31 rule.

**Direction B, the monthly picture first (smallest change).**

- h1: "See where you stand each month" (today's)
- Lead: "Accounts, budget, pay, savings, pension and debts in one picture. Start with a few rough figures."
- Bands: as today, with the three outcome cards replaced by the five area tiles and one new "More detail when you want it" band.
- Why: keeps the E31 headline word for word. Weaker on the 360 message, which becomes a list in the lead.

**Direction C, two speeds.**

- h1: "Your money, as simple or as detailed as you like"
- Lead: "A clear monthly picture from a few rough figures. Estimates, schedules and tax workings are there when you want them."
- Bands: hero; a two-column band "Keep it simple" and "Go into detail"; five area tiles; the rest as A.
- Why: puts messages 2 and 3 in the headline. The 360 message drops to third, and the page says less about what Flump covers.

### 5.2 Draft copy per page

Every line below is a draft. Sentences are 25 words or fewer, with no em dashes, ampersands or exclamation marks.

**What Flump covers (`/features`)**

- h1: "Everything Flump covers"
- "Flump is laid out the same way here and in the app: accounts, budget, pay, savings and pension, and debt and borrowing. Use one area or all five. Each starts from a few rough figures. Each has more detail underneath for when you want it. Together they make one picture of your money, on your Home page."
- Carries: (1) the whole list on one page; (2) "a few rough figures"; (3) "more detail underneath".

**Accounts (`/features/accounts`)**

- h1: "Every account and your net worth in one list"
- "Add what you own and what you owe, from current accounts and savings to pensions, cards and loans. Flump adds them up into your net worth. Once a month, a short check-in asks for the new balances. The history page shows how your net worth has changed, month by month. You type the figures in yourself, so no bank login is needed."
- More detail: your share of a joint account; choose what counts towards net worth; changes by account.
- Carries: (1) everything owned and owed in one figure; (2) a short check-in once a month; (3) joint shares and net worth choices.

**Budget (`/features/budget`)**

- h1: "What comes in, what goes out and what is left over each month"
- "List your income and your regular spending. Rent and mortgage payments are counted the same way. Flump shows what is left over each month, or how much you are short. It also shows your breathing room: how long your savings would cover the essentials. Rough totals are enough to start."
- More detail: split spending into essential and flexible; see an illustration of your income stopping; link your housing cost to your saved details.
- Carries: (1) income and spending beside the rest of your figures; (2) two plain figures; (3) the income-stopping illustration.

**Pay (`/features/pay`)**

- h1: "Your take-home pay, and what a change would do to it"
- "Enter your salary to see your take-home pay after Income Tax, National Insurance, pension and student loan. Model a pay rise to see how much of it you would keep. If you are self-employed or let property, switch on Self Assessment. It keeps your income and costs for each tax year and shows an estimate of your tax bill."
- More detail: payments on account; receipts kept with each record; compare one tax year with another.
- Carries: (1) pay feeds the budget and the pension figures; (2) one take-home figure from one salary; (3) Self Assessment as an opt-in area.

**Savings and pension (`/features/savings-and-pension`)**

- h1: "Your savings and pension, beside everything else"
- "See each savings account with its interest rate (AER) and an estimate of how it could grow. Add your pension pots and what you and your employer pay in. See how a change to your contributions, including salary sacrifice, would change your take-home pay. Every future figure is an estimate, and the assumptions are shown."
- More detail: how much of this tax year's ISA allowance you have used; a deposit timeline; investment returns.
- Carries: (1) savings and pension counted in net worth; (2) a list with rates; (3) contribution changes and the deposit timeline.

**Debt and borrowing (`/features/debt-and-borrowing`)**

- h1: "What you owe and when it could be paid off"
- "List your cards, loans and overdrafts with their rates. Flump shows an estimated debt-free date and when any 0% deal ends. Compare paying the highest rate first with paying the smallest balance first. If you have a mortgage, see your repayment schedule and an estimate of what an overpayment would do."
- More detail: an estimate of your payment when your fixed rate ends; overpay or save, compared; loan to value (LTV) milestones.
- The page carries the MoneyHelper line exactly as the app's debt page has it (copy guide 7.3 and 7.5, fixed wording).
- Carries: (1) debts and mortgage in the same net worth figure; (2) one date; (3) the comparison tools, which show both options and pick neither.

**Pricing (`/pricing`)**

- h1: "Pricing" (unchanged). Plan card "Free during the beta" (unchanged).
- What the beta includes: "All five areas of the Flump app: accounts, budget, pay, savings and pension, and debt and borrowing" · "Every calculator on the tools page" · "Your own figures, typed in. No bank login is needed".

**Security and privacy (`/security`)**

- Unchanged facts, plus two once verified in staging: "You can download the figures you have saved as a file, from Settings." and "You can delete your financial data, or your whole account, from Settings."

**AI connection (`/mcp`)**

- Badge: "Preview, by invitation". h1 unchanged: "Ask an AI assistant about your figures".
- Setup section retitled "How it works for testers who have it": "The AI connection is switched on for a small number of testers during the preview. If you would like to try it, say so when you request an invite."

### 5.3 SEO titles and descriptions (draft)

| Path | Title | Description |
| --- | --- | --- |
| `/` | Flump: finance without the fog (fixed, `SITE_TAGLINE`) | Flump: finance without the fog. Your accounts, budget, pay, savings, pension and debts in one picture, under UK rules, from figures you type in. |
| `/features` | What Flump covers \| Flump | The five areas of Flump: accounts, budget, pay, savings and pension, and debt and borrowing. Start with rough figures and add detail when you want it. |
| `/features/accounts` | Accounts and net worth \| Flump | Every account in one list, your net worth, and a short monthly check-in that shows how it changes. You type the figures in; no bank login is needed. |
| `/features/budget` | Budget and breathing room \| Flump | See what is left over each month and how long your savings would cover the essentials, whether you rent or pay a mortgage. |
| `/features/pay` | Take-home pay and Self Assessment \| Flump | See your take-home pay under UK rules and how much of a pay rise you would keep. Self-employed or letting property: see an estimate of your tax bill. |
| `/features/savings-and-pension` | Savings and pension \| Flump | Savings accounts with their rates and an estimate of growth, and your pension pots with what you and your employer pay in. |
| `/features/debt-and-borrowing` | Debt and borrowing: cards, loans and mortgage \| Flump | List what you owe to see an estimated debt-free date, when a 0% deal ends, and what a mortgage overpayment would do. |

Existing titles for `/tools`, `/preview`, `/pricing`, `/security`, `/mcp` and `/contact` stay. Each new path joins `STATIC_PATHS` (sitemap) and the social meta test.

## 6. Constraints check

Guards read: `apps/marketing/src/claims.test.ts` (banned claims, advice lexicon, sign-up path), `apps/marketing/src/copy.test.ts` (never-use words, "free" only as "free during the beta", no bank feed promise), copy guide sections 2, 6 and 7.4. "Code" means the component was found on 2026-11-20; it does not mean the behaviour was exercised.

| Draft claim | Guards | True of the product today | Status |
| --- | --- | --- | --- |
| "Your whole money picture in one place" | Passes the banned lists. "Whole" is a broad claim (guide 2.2, 7.4) | Covers accounts, debts, budget, pay, savings, pension, mortgage. Does not cover insurance, benefits or transactions | **Owner's call (D3).** Safer: "Your money in one picture" |
| "360", "complete", "holistic" | Not banned by a test. Guide 2.2 says no superlatives; "holistic" is not an everyday word | "Complete" cannot be evidenced | **Not used in draft copy.** D3 |
| "clears the fog" in body copy | Guide 2.1: fog wording only where the tagline is listed | n/a | **Not used.** D4 |
| "a few rough figures" | Passes | Onboarding has three steps (`features/onboarding`) | Verified in code |
| "no bank login is needed"; "You type the figures in yourself" | Passes; already on the site | Bank connections refused at boot for all but owner accounts | Verified in code |
| Net worth from accounts; monthly check-in; history by month | "snapshot" avoided | `features/accounts`, `features/snapshot` (`CheckInSheet`, `SnapshotHistoryPage`) | Verified in code |
| "from current accounts and savings to pensions, cards and loans" | Passes | Account kinds not listed one by one in this check | **Unverified: confirm the list when building** |
| Joint account share; net worth choices | Passes | `JointOwnershipFields`, `NetWorthChoices` | Verified in code |
| Left over each month; "how much you are short"; breathing room wording | Approved terms (guide 6.1); the breathing room description is the owner's fixed wording | `BudgetOverview`, `BreathingRoom` | Verified in code |
| "Rent and mortgage payments are counted the same way" | Meets the owner rule on renting | `HousingDetails` feeds one linked budget line for either tenure | Verified in code; wording to confirm against the page |
| "an illustration of your income stopping" | "runway" avoided | `RunwayCalculator` (scenario inputs include severance) | Verified in code |
| Take-home pay after Income Tax, NI, pension and student loan | Passes | `TakeHomeBreakdown`, `TakeHomeCalculator` | Verified in code |
| "how much of it you would keep" (pay rise) | Passes; same wording as the calculator title | `PayRiseTool`; public calculator | Verified in code |
| Self Assessment: income and costs by tax year, tax bill estimate, payments on account, receipts, year comparison | "estimate" used; no "files your return" | `features/tax` (`PaymentsOnAccountCard`, `TaxReceiptDialog`, `TaxYearComparison`) | Verified in code |
| Savings with AER and an estimate of growth; ISA allowance used; deposit timeline; investment returns | "estimate", not "forecast" | `SavingsForecast`, `AnnualAllowancePill`, `DepositTimeline`, `InvestmentReturns` | Verified in code; what each shows to confirm when building |
| Pension pots, employer contributions, salary sacrifice, effect on take-home pay | Passes | `PensionDetails`, `PensionContributionScenario`, `PensionTakeHomeEffect` | Verified in code |
| No mention of a retirement estimate or plan | RD9 | The app's own nav description for Pension says "a retirement estimate" | Left out on purpose; see follow-ups |
| Estimated debt-free date; when a 0% deal ends; highest rate first compared with smallest balance first | Approved terms; "compare", neither option picked (R2) | `DebtSummary`, `PayExtraTool` | Verified in code |
| Mortgage: repayment schedule, overpayment estimate, fixed rate end estimate, overpay or save, LTV | Approved terms | `OverpaymentSimulator`, `RemortgageShockSim`, `OverpayVsSaveCompare`, `LtvMilestones` | Verified in code |
| "Free during the beta" | Exact required form | No payment path | Already approved wording |
| "You can download the figures you have saved" | Passes | JSON export in `features/settings` and `routes/account.export.ts` | Verified in code; **not verified in staging** |
| "You can delete your financial data, or your whole account" | "permanent erasure" is banned and not used | `DataTab`, `DeleteAccountSection`. Deletion answers 503 until `DELETION_TOMBSTONE_KEY` is set | **Unverifiable here. Ship only after the owner confirms it works in staging** |
| AI connection "switched on for a small number of testers" | No present-tense setup promise (guide 7.4) | `McpAllowlistGuard` | Verified in code; whether staging runs open access is unverifiable |
| Any regulatory, security-level or compliance statement | Banned | n/a | **None drafted.** None will be added without the owner's wording |

## 7. Decisions for the owner

| # | Decision | Options | Recommendation |
| --- | --- | --- | --- |
| D1 | Page list and navigation | **A.** A hub (`/features`) and five area pages named as the app names them; top navigation of four links (What Flump covers, Calculators, Preview, Pricing); Security, AI connection and Contact in the footer. **B.** Three combined pages (Everyday money; Pay and tax; Long-term). **C.** One long page with five anchored sections | **A.** It is the only option where the site and the app share names and order. C is the fallback if six pages feels like too much to keep true |
| D2 | Home page direction (section 5.1) | **A.** Whole picture first. **B.** Monthly picture first, today's h1. **C.** Two speeds | **A.** Note it replaces the h1 that E31 and E16 PR 12 set, so it needs the owner's word |
| D3 | The words for the 360 message | **A.** Say it by listing the parts; do not use "360", "complete" or "holistic" in copy. **B.** Allow "whole" in the h1 with the parts listed in the lead. **C.** Use "complete" or "360" as the owner's brief words it | **B.** "Whole" with the list beside it is plain and can be checked against the list. C breaks copy guide 2.2 and cannot be evidenced |
| D4 | Fog wording | **A.** Keep the 14 November ruling: the tagline only, in the places listed. **B.** Allow one body line on the home page | **A.** The plain copy does the clearing; the tagline names it |
| D5 | Gated features | **A.** Retirement: not mentioned. AI connection: stays, labelled "Preview, by invitation", setup steps reworded, footer link only. Imports and bank connections: not mentioned beyond the existing fixed sentence. **B.** As A, but remove the AI connection page until it is open to every tester. **C.** A "Coming later" list | **A.** C is ruled out for bank connections by the claims guard, and for Retirement by RD9 |
| D6 | Working samples or screenshots on area pages | **A.** Working sample components where one exists today (dashboard, check-in, breathing room, pay-rise tool), an illustration on the two pages without one. **B.** As A now, then build two new sample previews (savings and pension; debt and borrowing) as a later slice. **C.** Screenshots of the app | **B.** Screenshots go stale, need four variants each (phone, desktop, light, dark) and are a picture of text for screen readers |
| D7 | SEO titles and descriptions | **A.** The table in 5.3: the app's area name plus a plain descriptor. **B.** Search-led titles (for example "UK take-home pay calculator and budget planner") | **A.** B drifts from the app's names and invites claims the pages cannot back |
| D8 | Pricing while the price is not set | **A.** Keep the page and the navigation link; list the five areas as what the beta includes. **B.** Keep the page, footer link only, until a price is set. **C.** Remove the page; the FAQ answers it | **A.** People look for a pricing link; a clear "free during the beta, price not set" answers it honestly |

Decisions already made that this plan keeps: E7 (owner signs off copy), RD9 (Retirement unseen), E16 D10 b (no example price), E16 D13 (AI connection is a footer link and one FAQ answer on the home page), E24 (invite-only call to action), the tagline ruling. Decisions it would change, only with the owner's yes: the home h1 and the five-band home layout from E16 PR 12 (D2).

## 8. Build slices (after acceptance)

All new components follow AGENTS.md section 1 (colocated directory; the five-file set for anything in `packages/ui`), section 2 (semantic tokens only; at most one tinted section per page) and section 4 (stories in light and dark, no a11y violations). No financial calculation is added, so section 14 has nothing to test by hand.

| Slice | Work | Size |
| --- | --- | --- |
| S1 | `apps/marketing/src/utils/featureAreas.ts`: one data file for the five areas (name, path, h1, lead, facts, depth list, calculator slugs, preview anchor, meta). Area names are checked against `apps/web/public/locales/en/common.json` by a test, so the site cannot drift from the app | S |
| S2 | `FeaturePage` template and `AreaStrip` ("Part of one picture") components; five routes under `/features`; `STATIC_PATHS`, sitemap, 404 handling, `PageMeta`, social meta test | M |
| S3 | `FeaturesIndexPage` (`/features`) | S |
| S4 | Header (the "What Flump covers" menu, mobile drawer) and Footer (Product, Company, room for Legal) | M |
| S5 | Home page in the accepted direction: area tiles, "Start simple", "More detail when you want it"; FAQ answers corrected to the app's names | M |
| S6 | Existing pages: Pricing list, `/mcp` badge and setup wording, `/security` data facts (only once verified), `/preview` and calculator pages cross-linked to area pages, calculator index grouped by area | S |
| S7 | Guards: add every new file to `PR12_SOURCES` in `copy.test.ts`; the claims guard already scans all of `src`. A test that no marketing source names Retirement | S |
| S8 (if D6 is B) | Two sample previews in `packages/ui` (savings and pension; debt and borrowing), sample data only, labelled as sample data | M to L |

Two pull requests: **PR 1** is S1, S2, S3, S4 and S7 (the structure). **PR 2** is S5 and S6 (the home page and existing pages), and S8 if chosen. Each gets an independent `opus` review and a `ui-compliance-reviewer` pass, and screenshots for the owner at phone and desktop widths in light and dark.

Guard changes expected: none loosened. `PR12_SOURCES` grows. Home page tests that pin today's h1 and band order change with D2; they are listed under "Guard changes" in the PR if any numeric limit moves.

Mobile parity: the marketing site is not a flow the mobile app shares, so no parity log row is expected. If a token or shared component changes, a row is added.

## 9. Follow-ups noticed, not part of this epic

- The app's own navigation hint for Pension reads "Pension pots and a retirement estimate" (`navPensionDesc`). Whether that sits right with RD9 is for the E33 owner to check.
- The EPICS summary table still says E38 S1 to S3 are not started; recent commits on `main` show them merged.
- Whether the CSV export from #754 is reachable in the settings UI was not confirmed in this check.

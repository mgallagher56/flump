# E42. Marketing site restructure: the site mirrors the app

Decisions: accepted on 2026-11-20

> Status: built. PR 1 (#848), PR 2 (#850) and S8 (#852) merged on 2026-11-20, and a closing PR records ruling R-a. One item waits for the owner: the two data facts on the Security page (download and delete your data), which ship once the owner confirms both work in staging (section 7.1). Written 2026-11-20 against `origin/main` (`da6284f0c`). Paths are relative to the repository root. All copy in this document is a draft for the owner to react to (E7: the owner signs off all marketing copy).

## 1. Summary

- The owner's brief (20 November 2026): the marketing site feels out of touch with the app. Pages should be geared to the features Flump offers and split the way the app is split. The message: Flump is a whole, 360 degree personal finance manager; it keeps things simple and removes the fog for everyone; it has more depth for people who want or need it.
- Today the site has eight page types and none is about an app area. The app has five navigation entries (Accounts, Budget, Pay, Savings and pension, Debt and borrowing) plus Home, the monthly check-in, calculators and settings. The site names none of them.
- Proposal: a "Flump features" page (navigation label "Features") and five area pages named exactly as the app names them, a rebuilt home page that shows all five areas in one picture, and a top navigation of three links. Existing pages stay, with small corrections.
- Retirement is on the site, inside Savings and pension (owner, 20 November 2026: it should be open to everyone; this supersedes RD9). The AI connection is presented as a feature like the others, with plain words on how a tester gets it (owner, 20 November 2026). Imports and bank connections are not mentioned.
- Calculators leave the top navigation and the marketing site stops having a calculators section. The owner keeps three (D9), each in a short form on the area page it belongs to. All eight stay in the app.
- Ten decisions are in section 7 and the owner has answered all ten (section 7.1). Nothing is built until the coordinator says so: the build is first in line once the other open work has merged.

**Revision 2 (20 November 2026), after the owner read the first version.** Three changes: the home headline has eight snappier options, each checked against the guards (section 5.1, decision D2); Retirement moves from "not mentioned" to part of the Savings and pension page (sections 2, 2.1, 4, 5.2, decision D5); calculators are assessed one by one and demoted (section 4.4, decision D9).

**Revisions 3 and 4 (20 November 2026).** The owner answered every decision (section 7.1). The page is "Flump features"; the AI connection is presented as a feature like the others; the owner kept calculators 1, 5 and 6, each in a short form (section 4.4); and Retirement is open and in the app's navigation, so its copy ships with the Savings and pension page.

## 2. Inventory: what a tester can use today

Sources: `apps/web/app/utils/pageConfig.ts`, `apps/web/app/components/navigation/navConfig.ts`, `apps/web/public/locales/en/common.json` (labels), `apps/web/app/routes/`, `apps/web/app/features/*/components/`, and the backend access guards. "Checked" means the component or guard was found in the code on 2026-11-20; behaviour was not exercised in a browser.

Who can use it:

- **Everyone** means every invited account. Sign-up itself is invite-only (`SIGNUP_MODE` in `apps/marketing/src/utils/site.ts`; the closed-beta allowlist in `apps/backend/src/auth/beta-access.ts`).
- **Friends beta** was the rule for Retirement on `main` at `da6284f0c`: the accounts in `RETIREMENT_ALLOWED_USER_IDS`, or everyone while `BETA_OPEN=true` (`apps/backend/src/modules/retirement/retirement.access.ts`). The owner has since said Retirement should be open to every invited account, and PR 845 changes the rule (section 2.1).
- **Named users** means an allowlist of user ids (`MCP_ALLOWED_USER_IDS`, `BANK_CONNECTIONS_ALLOWED_USER_IDS`, the imports guard).
- Not verifiable from the repository: which of these switches are set in the deployed environment. This plan assumes the stricter reading in every case.

| App area (app's own name) | Route | What it does today (checked in code) | Who | What the marketing site says now |
| --- | --- | --- | --- | --- |
| Home ("Your money") | `/` | KPI strip (net worth, what you owe, pension pots), "Your sections" with one section per area, a setup checklist, the check-in row, a panel to choose which sections show | Everyone | Home hero shows a sample dashboard (`BaselineSnapshotPreview`); `/preview` has a sample dashboard. Never named as "Home" or described as the place the areas meet |
| Accounts | `/app/accounts`, `/app/accounts/:account` | List of accounts in groups, a quick balance update, joint ownership with your share, the basis of the net worth figure | Everyone | No page. "Net worth" appears as a figure in the sample previews and once in the FAQ, never as an area |
| Monthly check-in and history | Check-in sheet on Home; `/app/accounts/history` | A prefilled monthly check-in, net worth over time, monthly change, changes by account, a chosen check-in day in Settings | Everyone | `/preview` has a "Check-in" section. No page explains it. The reminder email is not built (E30 PR3) |
| Budget | `/app/budget` | Income and spending lists, a setup wizard, what is left over each month, breathing room, housing costs (rent or mortgage) as a linked line, an illustration of income stopping | Everyone | Home: "breathing room and what is left over each month". `/preview` has a "Breathing room" section. The word "Budget" does not appear on the site |
| Pay: Take-home pay | `/app/take-home` | Take-home pay breakdown (Income Tax, National Insurance, pension, student loan), a pay rise tool, the next pound explorer | Everyone | Home pay-rise teaser (a working tool); one "Your pay and pension" card; two public calculators |
| Pay: Self Assessment | `/app/self-assessment`, `/app/tax/*` | Self-employed and rental income and costs by tax year, receipts, a tax bill estimate, payments on account, year comparison. Opt-in: off until switched on in Settings or by onboarding | Everyone (opt-in) | Nothing, apart from the public landlord tax calculator |
| Savings and pension: Savings | `/app/savings` | Savings accounts with AER, an estimate of growth, ISA allowance used, investment returns, a deposit timeline, a pay rise scenario | Everyone | FAQ: "forecast tools" (a name the app retired in E16 D5-B). One calculator (mortgage or ISA) |
| Savings and pension: Pension | `/app/pension` | Pension pots, what you and your employer pay in, salary sacrifice, the effect of a contribution change on take-home pay | Everyone | Half of one home card; one calculator |
| Retirement plan | `/app/retirement` | A target the user sets, an estimated yearly income in today's prices before tax, the accounts that count towards it, assumptions shown year by year, and one MoneyHelper guidance line (`RetirementPlanner`, `MoneyHelperGuidance`) | Everyone. On `main` at `9d6cac605` the friends-beta gate is gone (`retirement.access.ts` no longer exists) and Retirement is in the navigation under Savings and pension (`navConfig.ts`). It was friends beta at `da6284f0c` | Nothing. Now a gap (section 3) |
| Debt and borrowing: Cards and loans | `/app/debt` | List of debts, estimated debt-free date, when a 0% deal ends, a pay extra tool comparing highest rate first with smallest balance first, a MoneyHelper line | Everyone | One sentence in a home card; three calculators |
| Debt and borrowing: Mortgage | `/app/mortgage` | Repayment schedule, overpayments, overpay or save comparison, LTV milestones, an estimate for when a fixed rate ends, buy-to-let overview | Everyone | One sentence in a home card; one calculator |
| Calculators | `/tools`, `/tools/:slug` (both sites, shared catalogue `packages/ui/src/tools/toolCatalog.ts`) | Eight public calculators, no sign-in | Public | `/tools` index and one page per calculator. In the top navigation. Not grouped by app area |
| Onboarding | `/app/onboarding` | Three steps (income, housing, savings and debts) with a running summary | Everyone | Home and FAQ: "a few rough numbers". Accurate |
| AI connection | Settings, Security tab (`/app/profile?tab=ai_connections`) | Create an access token and connect an AI assistant over MCP | Named users in production unless `MCP_OPEN_ACCESS=true` (`apps/backend/src/auth/mcp-access.ts`) | `/mcp` page, badge "Preview", top navigation link. "How to turn it on" reads as if every invited user can do it |
| Imports | `/app/imports`, `/app/imports/:id` | Review and confirm figures staged through the AI connection | Named users (`apps/backend/src/modules/imports/imports-access.guard.ts`) | One fixed sentence on `/security` and `/mcp` (`AI_STAGING_SENTENCE`) |
| Bank connections | Settings | Off for everyone except allowlisted owner accounts, and refused at boot until the bank launch gate passes (`apps/backend/src/config/boot-guards.ts`) | Named users | "Flump does not connect to your bank". Accurate, and the guards forbid promising it |
| Settings | `/app/profile` | Tabs: Profile (age and pay, check-in day, net worth choices, which sections are on), Security (how you sign in, AI connection, imports), Data | Everyone | Nothing |
| Data export and deletion | Settings, Data tab; `/account/export` | "Download your data" (JSON checked; a CSV export merged in #754 but was not found in the settings UI in this check), "Delete your financial data", account deletion | Everyone. Deletion answers 503 until the owner sets `DELETION_TOMBSTONE_KEY` (EPICS table row 1); not verifiable here | Nothing. `/security` does not say you can download or delete your data |

### 2.1 Facts that two pull requests changed (both merged on 2026-11-20)

The inventory was first read from `origin/main` at `da6284f0c`, when PRs 838 and 845 were open. Both have merged, and this plan was rebased onto `9d6cac605`. The notes below were written from the open diffs; the Retirement note is corrected from `main`. Re-read the rest from `main` before building.

**PR 838 (dead code removal, `knip` gate).** No visible copy changes. What it changes for the build:

- Default exports are removed from marketing pages and components (`HomePage`, `PreviewPage`, `SecurityPage`, `ToolPage`, `HomeFAQ`, `MarketingSection`, `SecurityPrivacySection`, `BaselineSnapshotPreview`) and `pages/PreviewPage/index.ts` loses its default re-export. New pages and components use named exports only.
- `TOOL_SHORT_LABELS` is removed from `apps/marketing/src/utils/toolSlugs.ts`. After D9 the marketing site no longer lists calculators from the catalogue at all.
- `BETA_INVITE_PATH` and `PRIVACY_EMAIL` stop being exported from `utils/site.ts` (`PRIVACY_EMAIL` is deleted). Pages keep using `signupCta()` for the call to action, as this plan already assumes.
- `apps/marketing/src/app-shell/index.ts` loses its entry re-exports and `react-icons` leaves the marketing package. Neither is used by this plan.
- Unused exports now fail CI. Every export a slice adds must be imported somewhere in the same pull request, so S1's data file lands with the page that reads it (already the case in PR 1).

**PR 845 (invite-only beta with invite links).** It does not touch `apps/marketing`. What it may change in this plan:

- "Everyone" in the inventory: access becomes membership through a redeemed invite link (`beta_members`) or the admin list, next to the existing allowlists. The meaning for marketing is the same: invited accounts only.
- The Settings row: the Security tab and the settings page change, and an admin-only invites page (`/app/invites`) is added. That page is not a feature to market.
- The web app's signed-out pages stop offering "Sign up" while the beta is invite-only. The marketing call to action stays "Request an invite" and still points at `/contact#beta`; this plan adds no link to the web app's sign-up path (the claims guard forbids one outside `utils/site.ts`).
- Draft copy that describes what happens after a request (the `/mcp` line "say so when you request an invite", the Contact page) should match the flow that PR ships: a person asks by email and receives an invite link. Check the final wording of PR 845 before S6.
- The AI connection: PR 845 ties an access token to its owner still being a beta member. That does not change who the AI connection is switched on for (named accounts, which the owner confirmed on 20 November 2026).
- **Retirement.** The owner said on 20 November 2026 that Retirement should be open to everyone, because invites are only for testing. That supersedes RD9. Checked on `main` at `9d6cac605` after PR 845 merged: the Retirement access gate is removed (`apps/backend/src/modules/retirement/retirement.access.ts` no longer exists), `HIDDEN_PAGE_KEYS` is gone from `pageConfig.ts`, and Retirement is a navigation entry under Savings and pension. So the two conditions an earlier version of this plan set (every invited account can open it; it is in the navigation) are met, and the Retirement copy can ship with the Savings and pension page.

## 3. Gap list

**Areas with no page or mention**

1. Accounts and net worth: no page, and the word "accounts" is not used for the app area anywhere.
2. Budget: the site talks about its outputs (left over, breathing room) and never names the area.
3. The monthly check-in and history: one preview section, no explanation of the habit the app is built round (E30).
4. Self Assessment: absent, although it is a whole opt-in area.
5. Savings: absent as an area.
6. Settings, data download and deletion: absent. For a finance product these are trust facts.
7. The Home dashboard as the place where the areas meet: shown as a sample, never explained.

Added in revision 2: the Retirement plan is also absent. That was right under RD9 and is a gap now that the owner has opened it.

**Described differently from the app**

8. The home FAQ says "tax, debt, mortgage and forecast tools". The app's names are Take-home pay, Self Assessment, Cards and loans, Mortgage and Savings. "Forecast" was retired as a name (E16 D5-B).
9. The home cards are organised by outcome ("Where you stand each month", "What a change would do", "Your pay and pension"). That is good copy and a poor map: a visitor cannot tell from it what areas the app has.
10. The site calls the debt area "debts"; the app calls the group "Debt and borrowing" and the page "Cards and loans".
11. `/mcp` describes setup in the present tense for a feature behind an allowlist. Copy guide 7.4 says copy for an allowlisted feature is not written in the present tense.
12. The Pricing list of what the beta includes names three outputs, not the areas.

**Navigation that does not match the app's groups**

13. Site navigation: Calculators, Pricing, Security, AI connection, Preview, Contact. App navigation: Accounts, Budget, Pay, Savings and pension, Debt and borrowing. No entry is shared.
14. A named-users preview (AI connection) has a top-level link while the five areas every tester uses have none.
15. Calculators are one flat list of eight with a top-level link; nothing ties a calculator to the app area that does the same job with saved figures. The owner finds them complex, unclearly named and too many (20 November 2026); section 4.4 assesses each one.
16. `/preview` sections (Dashboard, Check-in, Breathing room) do not link to anything that explains them.

**Missing but out of scope here**

17. Privacy policy, terms, cookie position and accessibility statement pages (EPICS table row 2) wait for text from the owner and legal. The new footer leaves a "Legal" column ready for them; this epic does not write them.

## 4. Proposed site map

One rule: an area page has the same name, order and grouping as the app's navigation, so a visitor who signs in already knows the layout.

### 4.1 Top navigation (three links and the call to action)

`Features` (menu: the five areas, then AI connection) · `Preview` · `Pricing` · **Request an invite** · Sign in

Calculators are not in the top navigation (owner, 20 November 2026). The few that stay are reached from the area page they belong to (section 4.4).

Security and privacy and Contact move to the footer. The AI connection is in the Features menu, on the Flump features page and on the home page, like any other feature (owner, 20 November 2026; this supersedes E16 D13). The Features menu ends with a link to "Security and privacy", so it is still one press from every page. The mobile drawer lists the five areas under the same heading.

### 4.2 Pages

| Page | Path | Purpose | Covers (app area) | The one thing to understand | Calculators linked | Preview link |
| --- | --- | --- | --- | --- | --- | --- |
| Home | `/` | Carry all three messages and send people to an area, the preview or the invite | Home dashboard, all five areas | Flump shows all your money in one picture, from a few rough figures | Pay-rise teaser stays as the one working tool on the page | Sample dashboard in the hero, link to `/preview` |
| Flump features (new; navigation label "Features") | `/features` | The map: five areas and the AI connection, one paragraph each | All | The site and the app are laid out the same way; use one area or all five | None | Link to `/preview` |
| Accounts (new) | `/features/accounts` | Net worth and the monthly check-in | Accounts, monthly check-in, history | Every account in one list, and a short check-in once a month | None fits today | Dashboard and Check-in sections |
| Budget (new) | `/features/budget` | Left over each month and breathing room | Budget, housing costs | What comes in, what goes out, what is left, whether you rent or pay a mortgage | None fits today | Breathing room section |
| Pay (new) | `/features/pay` | Take-home pay, and Self Assessment for those who need it | Take-home pay, Self Assessment | What you keep from your pay, and a tax bill estimate if you are self-employed or let property | The two-slider pay rise tool, on the page (D9) | Pay-rise tool embedded (it exists) |
| Savings and pension (new) | `/features/savings-and-pension` | Savings growth estimate, pension contributions and the retirement plan | Savings, Pension, Retirement plan | Your savings and pension sit beside everything else, and a retirement plan shows an estimate against a target you set | None | None today (decision D6) |
| Debt and borrowing (new) | `/features/debt-and-borrowing` | Cards and loans, then mortgage | Cards and loans, Mortgage | What you owe, when it could be paid off, and what a change would do | "Two ways to pay off debts" and "Mortgage overpayment or ISA, compared", in their short forms, on the page (D9) | None today (decision D6) |
| Calculators | `/tools`, `/tools/:slug` | Removed from the marketing site; every old address redirects to an area page (section 4.4, D9). All eight stay in the web app | Calculators | n/a | n/a | n/a |
| Preview | `/preview` | Unchanged, plus a link from each section to its area page, named for where it goes ("About accounts and the monthly check-in"; guide 5.3 bans "Read more") | Home, check-in, budget | See it working on sample data | n/a | n/a |
| Pricing | `/pricing` | Stays (decision D8). The list of what the beta includes names the five areas | n/a | Free during the beta; the price of any paid plan is not set | None | n/a |
| Security and privacy | `/security` | Stays, footer and menu link. Adds two facts once verified: download your data, delete your data | Settings, Data tab | What Flump can and cannot do with your money and figures | n/a | n/a |
| AI connection | `/features/ai-connection` (`/mcp` redirects) | A feature page like the area pages, in the Features menu and on the home page (decision D5, as the owner changed it) | AI connection | Ask an AI assistant about your saved figures; Flump does the sums, not the AI model; switched on for an account on request during testing | n/a | n/a |
| Contact | `/contact` | Unchanged | n/a | How to ask for an invite | n/a | n/a |
| Not found | any other path | Unchanged | n/a | n/a | n/a | n/a |

Not on the site: Imports beyond the existing fixed sentence, and bank connections. Retirement is on the site, inside Savings and pension (section 2.1).

### 4.3 The area page template

One template renders all five area pages from one data file, so the pages cannot drift apart:

1. **Hero:** area name as a small label, the h1, one lead sentence, "Request an invite" and "Interactive preview".
2. **What you see:** three short facts, each a thing the app shows today.
3. **See it:** a working sample (where a preview or calculator component exists) or an illustration (decision D6).
4. **More detail when you want it:** three or four deeper tools in that area. This is where the third message lives.
5. **Part of one picture:** a strip of all five areas with this one marked, each a link. This is where the first message lives on every page.
6. **Try it with your own numbers:** on the Pay and the Debt and borrowing pages only, the kept calculators in their short forms (section 4.4). The other pages have no calculator section.
7. **Final call to action.**

### 4.4 Calculators: which stay, and where

The owner (20 November 2026): the calculators are not a useful addition to the marketing site as they stand. They are functionally complex, their names do not say what they do, and there are too many.

Each of the eight was put to three tests. Inputs were counted from the component in `packages/ui/src/calculators/` on 2026-11-20; a list of debts counts each row's fields.

1. **Name:** can a visitor tell what it does from its name alone?
2. **Three inputs or fewer:** can they get an answer with three inputs or fewer?
3. **Leads into the app:** does it lead naturally into an app area that does the same job with saved figures?

| Calculator (name today) | Name test | Inputs | Leads into | Owner's decision (D9) |
| --- | --- | --- | --- | --- |
| What you keep from a pay rise | Pass | Fail on the full page: about ten (pay, bonus, region, pension method and amount, student loan plans, Child Benefit, children, tax year, extra pension). **Pass** in the two-slider version already on the home page (`PayRiseTeaser`: salary, pay rise) | Pay (the app's pay rise tool) | **Kept**, two-slider form only |
| When a 0% balance transfer ends | Partly: reads like an article title | Pass: 3 (balance, months left, rate after) | Debt and borrowing (the app shows when a 0% deal ends) | Not kept on the marketing site |
| Overdraft interest cost calculator | Pass | Pass: 2 (balance, rate) | Debt and borrowing (an overdraft is a debt in the list) | Not kept on the marketing site |
| Student loan repayment calculator | Partly: it answers "paid off or written off", which the name does not say | Pass: 3 (plan, salary, balance) | Partly: Pay shows the student loan deduction, not the write-off question | Not kept on the marketing site |
| Debt payoff methods compared | Fail: "methods" means nothing until explained | Fail: three fields for each debt, plus an extra payment | Debt and borrowing (the app's pay extra tool does this with saved debts) | **Kept**, in a short form |
| Mortgage overpayment or Stocks and Shares ISA | Fail: two things joined by "or", no outcome named | Fail: 5 | Debt and borrowing (the app's overpay or save comparison) | **Kept**, in a short form |
| Section 24 landlord tax calculator | Fail: a statute number | Fail: 5 | Pay (Self Assessment), for landlords only | Not kept on the marketing site |
| Pension contributions and income above £100,000 | Fail: describes inputs, not an answer | Pass: 3 | Pay and Pension, for a narrow income band. E31 already moved it out of the lead | Not kept on the marketing site |

**Decided by the owner, 20 November 2026 (decision D9): "keep calculators 1,5 and 6".** From the list of eight the coordinator showed the owner, that is:

- 1: What you keep from a pay rise, in its two-slider form only.
- 5: Debt payoff methods compared (highest rate first against smallest balance first).
- 6: Mortgage overpayment or Stocks and Shares ISA.

Not kept on the marketing site: the 0% balance transfer, overdraft, student loan, Section 24 and income above £100,000 calculators. The three tests above are this plan's assessment; the last column is the owner's decision.

**Keeping the three simple.** The owner cut calculators because they were functionally complex, unclearly named and too many. Calculators 5 and 6 ask for more than the two the plan had picked, so each kept calculator is shown in a short form: three fields or fewer on first view, a name that says what it does, and starting values that give an answer before anything is typed. Starting values are sample data and carry the label "Example" (guide 7.4).

| # | Name on the marketing site | Where | Fields on first view | Starting values | What it shows | Behind "Change the details" |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | "What you keep from a pay rise" (unchanged; the copy guide's own example of a good heading) | Pay page and home page | 2: salary before tax, pay rise a year | As `PayRiseTeaser` has today | An estimate of how much of the rise reaches your pay | Nothing. The ten-field version is not on the marketing site |
| 5 | "Two ways to pay off debts" | Debt and borrowing page | 3: two example debts showing their balances, and one slider, "Extra payment a month" | The component's own: a credit card at £4,500 and a personal loan at £1,500, with £75 extra a month | The estimated debt-free date and the interest for each way, side by side | Each debt's rate and minimum payment (the rows already start closed), and adding or removing a debt |
| 6 | "Mortgage overpayment or ISA, compared" | Debt and borrowing page, in the mortgage part | 3: mortgage balance, mortgage interest rate, extra money a month | The component's own: £240,000, 4.5%, £350 a month | Estimated interest saved by overpaying, estimated ISA growth, and the difference between them | The two assumptions: ISA growth a year (starts at 7%) and years left (starts at 20). Both are stated in a line under the result whether or not the section is open |

Rules that hold for the three:

- **Names.** Each says what the tool shows, in six words or fewer for 5 and 6 (guide 3.1), and none tells the reader what to do with money. "Two ways to pay off debts" replaces "methods", which means nothing until explained. The one line under it names the two ways in the approved words: "Highest rate first or smallest balance first: see an estimated debt-free date and the interest for each." Routine wording: the coordinator approves these names.
- **Calculator 5, no judgement.** The two ways are shown with the same weight, in the same colours, and neither is marked as better (guide 2.3, advice boundary R2). No "high APR" label on a debt; the rate is shown as a figure. The example debts are labelled "Example" and are never worded as the reader's own. No statistic about other people.
- **Calculator 6, compares and does not recommend.** It shows two estimates and the difference, in that order, and picks neither. The ISA figure is "estimated growth at the rate you entered"; the growth rate is an assumption the reader can change, stated beside the result. No "better", "best" or "should". It sits under the page's mortgage part, which opens "If you have a mortgage", so the page reads the same for someone who rents.
- **How it is built.** The names above are headings on the marketing page, held in the marketing features data, so the shared catalogue and the web app's names do not change. Calculators 5 and 6 get a short form through one new prop each on the existing components in `packages/ui/src/calculators/` (the detail fields collapsed, the component's own title hidden), with a story and a test for the short form. No formula changes, so there is nothing new to work out by hand (AGENTS.md section 14).
- **Layout laws (AGENTS.md section 3), as the coordinator ruled on 20 November 2026.** Every slider in a short form is a `<SliderField>`. `<SimulatorSplitLayout>` applies where a short form shows a chart. The short forms of 5 and 6 keep the split layout their components already render in (controls on the left, the outcome on the right). The two-slider pay rise tool has no chart and is exempt: the law exists to stop sliders being stacked full-width above the chart they control, and this tool is two sliders and one result line inside a page section, with no chart to sit beside.
- **The full versions are in-app features (coordinator, 20 November 2026).** The marketing site shows the short form only. Where the app does the same job with saved figures, the section says so in one line and links to that area's page, not to a calculator page: the pay rise tool on the app's Take-home pay page, the pay extra tool on Cards and loans, and the overpay or save comparison on Mortgage.
- `PayRiseTeaser` today links "Open the full calculator" to `/tools/uk-pay-rise-take-home-calculator` (`PAY_RISE_TOOL_PATH`), a page this plan removes. On the home page the link becomes "About pay in Flump", to `/features/pay`. On the Pay page itself the link is removed. `PAY_RISE_TOOL_PATH` is deleted and `PayRiseTeaser.test.tsx`, which asserts that address, is updated.
- None ends with "Continue to sign up", because sign-up is invite-only.

**The five that are not kept, and the full-size pages.**

- The marketing site stops having a calculators section. `ToolsIndexPage` and `ToolPage` are removed from `apps/marketing`, with their links in the header, footer, home page and sitemap.
- Every old address redirects with a 301, so nothing answers 404. Today the marketing server has no redirect layer: `routes.ts` (`isKnownPath`) sends unknown paths to the 404 page, and `server/sitemap.ts` (`canonicalPath`) maps alias slugs to their canonical page. The redirects are a new Express middleware, `apps/marketing/server/redirects.ts`, mounted in `server.ts` after the security headers and `registerOps`, and before the analytics middleware and the SSR handler, in development and production alike. Sitting after the security headers means each 301 still carries HSTS and the other headers. It is one pure function from a path to a target, matched without regard to case or a trailing slash:
  - `/mcp` to `/features/ai-connection`. The web app links to `/mcp#setup` (`apps/web/app/routes/app.profile.tsx`); a browser keeps the fragment across a redirect, so the new page keeps an element with the id `setup`, and that link is updated to the new address in the same pull request.
  - `/tools` and `/tools/` to `/features`.
  - The eight canonical slugs: the pay rise, student loan, Section 24 and income above £100,000 pages to `/features/pay`; the debt payoff, 0% balance transfer, overdraft and mortgage or ISA pages to `/features/debt-and-borrowing`.
  - Every alias slug in `TOOL_SLUG_ALIASES`, resolved through `resolveToolSlug` from `@repo/ui/tools` so an alias cannot be missed, to the same target as its canonical slug.
  - Any other `/tools/...` path still answers 404.
- With the redirects in place, `canonicalPath` and `buildSitemap` in `server/sitemap.ts` and `isKnownPath` in `routes.ts` drop their tool branch, and `utils/toolSlugs.ts` keeps only `STATIC_PATHS`. A test asserts that no marketing source links to `/tools` or `/mcp`.
- The three kept calculators have no full-size page on the marketing site; they live on their area page in the short form. The coordinator confirmed this on 20 November 2026.
- **Nothing in the app is removed.** All eight calculators stay in the web app at its own `/tools` pages (`apps/web/app/routes/tools._index.tsx` and `tools.$slug.tsx`), with the shared catalogue, guides and components in `packages/ui`. The web app's calculators page and its "Calculators" link are outside this epic; the owner's points about names, complexity and number apply there too (section 9).
- Guard changes this brings, each needing sign-off before it is made (AGENTS.md section 15): the "public calculator copy guard" in `claims.test.ts` reads `ToolPage.tsx` and `ToolsIndexPage.tsx`, and `copy.test.ts` checks the marketing tool slugs against the catalogue. With those pages gone, the guard's source list shrinks to the shared files in `packages/ui/src/tools` and the slug check has nothing left to check on marketing.

**Search traffic, honestly.** Unknown, and probably close to nothing today. The marketing server sends `noindex, nofollow` on every response and serves no sitemap unless both `ALLOW_INDEXING` and `FLUMP_LAUNCH` are exactly `true` (`apps/marketing/server/ops.ts`, `sitemap.ts`). Flump is pre-launch, so the pages should not be in search results yet; whether those switches are set in the deployed environment cannot be checked from the repository. Cookieless page counting already exists (`apps/marketing/server/analytics.ts`, E24-T9). It is on only when `ANALYTICS_MODE` is exactly `log` and the published notice address is set; whether it is on in the deployed environment, and any counts, cannot be read from the repository. Its route keys come from `canonicalPath`, so the redirected addresses stop being counted and the new pages are counted in their place. This plan adds no analytics and collects nothing new. After launch, single-purpose calculator pages are the kind of page that can bring search visitors, which is the one cost of redirecting the old addresses. It can be revisited after launch, once page views are counted: the calculators still exist in the web app and a marketing page can be put back.

## 5. Message hierarchy

| Message | How the site says it | Where |
| --- | --- | --- |
| 1. One whole view, 360 degrees | By listing the parts, not by adjective: what you own, what you owe, what comes in, what goes out. The five-area strip appears on the home page and every area page | Home hero and second band; "Part of one picture" on every area page; `/features` |
| 2. Simple, and it clears the fog for everyone | "A few rough figures", plain names shared with the app, one headline figure per page, no judgement, renting and a mortgage given equal weight. The tagline "Finance without the fog" stays where the copy guide lists it | Home hero and "Start with rough figures" band; the "What you see" section on every area page |
| 3. Depth for people who want or need it | A named section, "More detail when you want it", always after the simple part and never before it | Home fourth band; section 4 of every area page; Self Assessment on the Pay page |

### 5.1 Home page: layout and headline

**Layout (one proposal).** Hero with the headline, one subheadline, "Request an invite", "Interactive preview" and the sample dashboard; "Flump features" (the five area tiles and an AI connection tile); "Start with rough figures" (three steps: enter rough figures, see where you stand, check in once a month); "More detail when you want it"; the two-slider pay rise tool; the security strip; FAQ and the final call to action. The first version of this plan called a band "Start simple"; copy guide 2.3 lists "simply", "easy" and "quick" as minimisers, so the band is named for what the reader does.

**Decided by the owner, 20 November 2026 (decision D2).**

- h1: "All your money. One clear picture."
- Lead, the one line under it: "Accounts, budget, pay, savings, pension and debts in one place."
- The owner's words: "I like headline 1 combined with line underneath 2", then, on the lead's ending, "in one place is better".

What follows from it:

- The lead lists six parts, and each is an app area or page a tester has today, so "All" can be checked against the list (decision D3, option A).
- The headline is two short parts, each ending in a full stop. Copy guide 5.1 would call that a slogan, and 5.4 says no full stop on a heading. The owner's choice is read as allowing both for the marketing home h1 only (ruling R-a below); the coordinator should confirm that reading with the owner. The build pull request then adds the exception to the copy guide in the same change, and app headings stay as they are. At six words and 34 characters it is inside the guide's length target (3.1).
- The whole-picture layout above is built round it. The first band after the hero is the five area tiles, so the page shows the list the lead names.
- The options below stay in the plan as considered and not chosen.

**How the options were drawn up.** The owner read the first version's headline ("Your whole money picture in one place") and said it does not grab attention. The options below follow the approach the coordinator put to the owner: a short headline that says what it is, what you get or what you can do, aimed at "you"; a subheadline that carries the detail; a reader should be able to say what Flump is and who it is for within five seconds; any outcome the headline names is shown on the page. Here the sample dashboard in the hero is that proof, labelled as sample data.

Every subheadline is one sentence of 25 words or fewer (copy guide 5.2 allows one sentence under an h1). None uses a time or number claim, and none blames the reader.

Checked against: `claims.test.ts` (banned claims and the advice lexicon), `copy.test.ts` (never-use words, "free", bank promises), and copy guide 2.1 (tagline and fog), 2.2 (no hype), 2.3 (no judgement, no minimisers), 5.1 (headings) and 6.1 (approved terms). No option matches a banned pattern in either test file. The guide rules are review rules, so the flags below are for the owner to rule on.

| # | Headline | Type | Draft subheadline | Flags |
| --- | --- | --- | --- | --- |
| H1 | "All your money. One clear picture." | What you get | "Flump is a UK money app that shows what you own, owe, earn and spend, from a few rough figures you type in." | **Ruling R-a** (slogan-shaped). "All" is a broad claim: true of accounts, savings, pension, debts, mortgage, budget and pay; not of insurance, benefits or individual transactions. The subheadline lists the scope, which is what makes it checkable |
| H2 | "See everything you own and owe. At a glance." | What you can do | "Flump adds up your accounts, savings, pension and debts into one net worth figure, from figures you type in." | **Ruling R-a.** True of the Home page. "At a glance" is not a measured claim; it is backed by one headline figure on the page. Leaves out budget and pay, so it says less than Flump does |
| H3 | "What you own, what you owe, what's left. Sorted." | What you get | "A few rough figures give you your net worth, what is left over each month and your breathing room." | **Ruling R-a, and R-b for "Sorted".** "Sorted" says Flump puts a person's finances in order, which is an outcome Flump does not deliver (it shows figures), and it is jokey against guide 2.1. Without "Sorted" it passes. "What's left" is close to the approved "left over each month" |
| H4 | "Your money, minus the fog." | Neither: it names a feeling | "Flump is a UK money app that shows what you own, owe, earn and spend in plain words, from figures you type in." | **Rulings R-a and R-c.** Fog wording outside the tagline, and in the h1, which the 14 November ruling keeps plain (guide 2.1). On its own it does not say what Flump is, so it fails the five-second check without the subheadline |
| H5 | "Know where you stand. All of it, every month." | What you get | "Check in once a month to see your net worth, what is left over and how each has changed." | **Ruling R-a.** True: the monthly check-in and the history page. Closest to today's h1 and to E31's monthly picture. "Every month" depends on the person checking in; the reminder email is not built |
| H6 | "One place for everything you own, owe, earn and spend." | What it is | "Flump is a UK money app that turns a few rough figures into one picture, with more detail when you want it." | **No ruling needed:** a noun phrase that says what Flump is (guide 5.1). The least snappy of the eight. "Everything" is broad in the same way as "All" in H1 |
| H7 | "Know where you stand with your money." | What you get | "Flump shows what you own, what you owe and what is left over each month, from a few rough figures." | **No ruling needed:** same shape as today's approved h1. Short, plain, and the nearest to the owner's "removes the fog" without the word |
| H8 | "Your money, made clear." | What you get | "Flump is a UK money app that shows what you own, owe, earn and spend, from a few rough figures you type in." | **Ruling R-a.** No fog word, and it sits well beside the tagline. "Made clear" is a soft outcome claim; the plain names and the one-figure pages are its evidence. Does not say what Flump is without the subheadline |

H6 to H8 are this plan's own additions. The other five came from the coordinator.

**Rulings the options needed** (R-a is taken as given by the owner's choice of H1; R-b and R-c no longer arise)

- **R-a. A slogan-shaped h1 on the marketing home page.** Guide 5.1 says no heading is a slogan, 5.4 says no full stop on a heading (H1, H2, H3 and H5 have them), and 2.1 says the home h1 is the plain line that says what Flump does. Guide 3.1 also sets a heading at 2 to 6 words and 40 characters: H2, H3, H5 and H6 are longer, and H7, at seven words, is one over, so "no ruling needed" in the table holds for H7 only on the slogan rule. H1 to H5 and H8 need the owner to allow a short two-part headline on the marketing home page only, with the subheadline doing the plain saying. App headings stay as they are.
- **R-b. "Sorted".** Not recommended: it is the one word here that promises an outcome.
- **R-c. Fog in the h1.** Changes the 14 November tagline ruling. If the owner wants it, the tagline and the h1 become near-duplicates on the same screen.

**Recommendation before the owner chose: H1, "All your money. One clear picture."** It carries the first message (all of it) and the second (clear) in six words, and the subheadline passes the five-second check and lists the scope so "all" can be checked. It needs R-a only. If the owner would rather not relax guide 5.1, **H7** is the best option that needs no ruling. The third message (depth) is carried by the "More detail when you want it" band in every case; no short headline carries all three well.

All of these replace the h1 that E31 and E16 PR 12 set ("See where you stand each month"), so the choice is the owner's. H5 and H7 stay closest to it.

### 5.2 Draft copy per page

Every line below is a draft. Sentences are 25 words or fewer, with no em dashes, ampersands or exclamation marks.

How each block maps to the page: the h1 is 2 to 6 words and at most 40 characters (guide 3.1); the lead is the one sentence under it (guide 5.2); the copy that follows is shown here as one block for reading and is split on the page into the three "What you see" facts, so no paragraph on screen is longer than three sentences (guide 3.1).

**Flump features (`/features`)**

- h1: "Flump features". Lead: "Five areas, laid out the same way here and in the app."
- "Flump is laid out the same way here and in the app: accounts, budget, pay, savings and pension, and debt and borrowing. Use one area or all five. Each starts from a few rough figures. Each has more detail underneath for when you want it. Together they make one picture of your money, on your Home page."
- Carries: (1) the whole list on one page; (2) "a few rough figures"; (3) "more detail underneath".

**Accounts (`/features/accounts`)**

- h1: "Accounts and net worth". Lead: "Every account in one list, added up into your net worth."
- "Add what you own and what you owe, from current accounts and savings to pensions, cards and loans. Flump adds them up into your net worth. Once a month, a short check-in asks for the new balances. The history page shows how your net worth has changed, month by month. You type the figures in yourself, so no bank login is needed."
- More detail: your share of a joint account; choose what counts towards net worth; changes by account.
- Carries: (1) everything owned and owed in one figure; (2) a short check-in once a month; (3) joint shares and net worth choices.

**Budget (`/features/budget`)**

- h1: "Budget and breathing room". Lead: "What comes in, what goes out and what is left over each month."
- "List your income and your regular spending. Rent and mortgage payments are counted the same way. Flump shows what is left over each month, or how much you are short. It also shows your breathing room: how long your savings would cover the essentials. Rough totals are enough to start."
- More detail: split spending into essential and flexible; see an illustration of your income stopping; link your housing cost to your saved details.
- Carries: (1) income and spending beside the rest of your figures; (2) two plain figures; (3) the income-stopping illustration.

**Pay (`/features/pay`)**

- h1: "Take-home pay and Self Assessment". Lead: "Your take-home pay, and an estimate of what a change would do to it."
- "Enter your salary to see your take-home pay after Income Tax, National Insurance, pension and student loan. Model a pay rise to see how much of it you would keep. If you are self-employed or let property, switch on Self Assessment. It keeps your income and costs for each tax year and shows an estimate of your tax bill."
- More detail: payments on account; receipts kept with each record; compare one tax year with another.
- Carries: (1) pay feeds the budget and the pension figures; (2) one take-home figure from one salary; (3) Self Assessment as an opt-in area.

**Savings and pension (`/features/savings-and-pension`)**

- h1: "Savings and pension". Lead: "Your savings and pension, beside the rest of your figures."
- "See each savings account with its interest rate (AER) and an estimate of how it could grow. Add your pension pots and what you and your employer pay in. See how a change to your contributions, including salary sacrifice, would change your take-home pay. Every future figure is an estimate, and the assumptions are shown."
- Retirement plan (its own section on this page): "Set a retirement target of your own. Flump shows an estimate of your yearly income in retirement, in today's prices and before tax, and which accounts count towards it. The assumptions are listed year by year and you can change them. It is an estimate from your figures, not a prediction and not advice."
- Under the retirement section (D10, accepted), the MoneyHelper line exactly as the app has it (owner decision RD11, fixed wording, guide 7.3): "MoneyHelper offers free, impartial guidance on pensions, backed by the government." with the link "Pension guidance from MoneyHelper". Flump sets no target and suggests no contribution (guide 2.3 item 6, advice boundary R1 to R8).
- More detail: how much of this tax year's ISA allowance you have used; a deposit timeline; investment returns.
- Carries: (1) savings, pension and the retirement estimate beside the rest of your figures; (2) a list with rates; (3) contribution changes, the deposit timeline and the retirement plan's assumptions.

**Debt and borrowing (`/features/debt-and-borrowing`)**

- h1: "Debt and borrowing". Lead: "What you owe, and an estimate of when it could be paid off."
- "List your cards, loans and overdrafts with their rates. Flump shows an estimated debt-free date and when any 0% deal ends. Compare paying the highest rate first with paying the smallest balance first. If you have a mortgage, see your repayment schedule and an estimate of what an overpayment would do."
- More detail: an estimate of your payment when your fixed rate ends; overpay or save, compared; loan to value (LTV) milestones.
- The page carries (D10, accepted) the MoneyHelper debt line exactly as the app's debt page has it (copy guide 7.3 and 7.5, fixed wording).
- Carries: (1) debts and mortgage in the same net worth figure; (2) one date; (3) the comparison tools, which show both options and pick neither.

**Pricing (`/pricing`)**

- h1: "Pricing" (unchanged). Plan card "Free during the beta" (unchanged).
- What the beta includes: "All five areas of the Flump app: accounts, budget, pay, savings and pension, and debt and borrowing" · "Your own figures, typed in. No bank login is needed".

**Security and privacy (`/security`)**

- Unchanged facts, plus two once verified in staging: "You can download the figures you have saved as a file, from Settings." and "You can delete your financial data, or your whole account, from Settings."

**AI connection (`/features/ai-connection`; `/mcp` redirects to it)**

Owner, 20 November 2026: "AI connection can be used in places other than the footer. it's a genuine feature that users can access and use, so it should appear in the marketing like any other feature." The owner also confirmed that access stays with the accounts the owner switches on ("Keep it to named accounts"). So every line has to be true for a tester whose account has not been switched on. Draft wording for the owner:

- Where it appears: the Features menu, a sixth tile on the home page and on the Flump features page, and its own page built from the same template as the area pages. The "Part of one picture" strip stays at the five money areas.
- No "by invitation" badge.
- h1: "AI connection". Lead: "Ask an AI assistant about the figures you have saved in Flump."
- Body: "Connect an AI assistant such as Claude Desktop to Flump and ask questions in your own words. Tax and debt figures are calculated by Flump, not by the AI model." Then the fixed sentence the site already uses: "Saving imported figures through the AI connection is off by default, and nothing is saved until you confirm it in Flump."
- Section "How to get it", two versions for the owner to choose between:
  - **Version 1 (recommended):** "While Flump is being tested, the AI connection is switched on one account at a time. Ask us to switch it on for yours. Once it is on, create an access token in Settings and add Flump to your AI assistant."
  - **Version 2:** "While Flump is being tested, we switch the AI connection on for your account when you ask. Then create an access token in Settings and add Flump to your AI assistant." This promises that every request is granted; use it only if that is true.
- Home and features tile (wording decided by the coordinator, 20 November 2026): "AI connection. Ask an AI assistant about your saved figures. Switched on for an account on request during testing."
- Home FAQ answer (replaces "Yes, as a preview."): "Yes. The AI connection lets an AI assistant such as Claude Desktop answer questions from the figures you have saved. During testing it is switched on one account at a time, so ask us to switch it on for yours."
- The collapsed "Technical details" section stays as it is.
- One question for the owner: the page has a small "Preview" badge today, from E17 D1-A (the AI connection is a preview until Phase 5 and the evaluation targets are met). Keep that one word, or drop it now that it is presented as a feature? Recommendation: keep "Preview" as a small label on its own page only, because E17 D1-A still stands, and leave it off the menu and the tiles.

### 5.3 SEO titles and descriptions (draft)

| Path | Title | Description |
| --- | --- | --- |
| `/` | Flump: finance without the fog (fixed, `SITE_TAGLINE`) | Flump: finance without the fog. Your accounts, budget, pay, savings, pension and debts in one picture, under UK rules, from figures you type in. |
| `/features` | Flump features \| Flump | The five areas of Flump: accounts, budget, pay, savings and pension, and debt and borrowing. Start with rough figures and add detail when you want it. |
| `/features/accounts` | Accounts and net worth \| Flump | Every account in one list, your net worth, and a short monthly check-in that shows how it changes. You type the figures in; no bank login is needed. |
| `/features/budget` | Budget and breathing room \| Flump | See what is left over each month and how long your savings would cover the essentials, whether you rent or pay a mortgage. |
| `/features/pay` | Take-home pay and Self Assessment \| Flump | See your take-home pay under UK rules and how much of a pay rise you would keep. Self-employed or letting property: see an estimate of your tax bill. |
| `/features/savings-and-pension` | Savings and pension \| Flump | Savings accounts with their rates and an estimate of growth, and your pension pots with what you and your employer pay in. |
| `/features/debt-and-borrowing` | Debt and borrowing: cards, loans and mortgage \| Flump | List what you owe to see an estimated debt-free date, when a 0% deal ends, and what a mortgage overpayment would do. |
| `/features/ai-connection` | AI connection \| Flump | Ask an AI assistant about the figures you have saved in Flump. Tax and debt figures are calculated by Flump, not by the AI model. |

The home description follows the decided lead (D2): "Flump: finance without the fog. Accounts, budget, pay, savings, pension and debts in one place, under UK rules, from figures you type in." The Savings and pension description gains "and a retirement estimate against a target you set". Existing titles for `/preview`, `/pricing`, `/security` and `/contact` stay. `/mcp` becomes a redirect and the calculators have no pages of their own, so neither has a title. Each new path joins `STATIC_PATHS` (sitemap) and the social meta test.

## 6. Constraints check

Guards read: `apps/marketing/src/claims.test.ts` (banned claims, advice lexicon, sign-up path), `apps/marketing/src/copy.test.ts` (never-use words, "free" only as "free during the beta", no bank feed promise), copy guide sections 2, 6 and 7.4. "Code" means the component was found on 2026-11-20; it does not mean the behaviour was exercised.

| Draft claim | Guards | True of the product today | Status |
| --- | --- | --- | --- |
| The eight home headline options | See the table in 5.1: none matches a banned pattern; six need ruling R-a, one also R-b, one also R-c | "All" and "everything" cover accounts, debts, budget, pay, savings, pension, mortgage. They do not cover insurance, benefits or individual transactions | **Owner's call (D2, D3)** |
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
| Retirement: a target you set, an estimated yearly income in today's prices before tax, accounts that count, assumptions year by year | "estimate", never "forecast", "prediction" or "will" (guide 6.1); no target set by Flump (2.3); no recommendation (R1 to R8) | `RetirementPlanner` (page subtitle "Estimates in today's prices, before tax."; sections "Counted towards retirement", "Assumptions, pots and year by year") | Verified in code. PR 845 has merged: Retirement is open to every tester and in the app's navigation (section 2.1) |
| The MoneyHelper pensions line, word for word | Fixed wording (RD11, guide 7.3). It contains a bare "free", which `copy.test.ts` rejects in marketing sources unless it is "free during the beta" | `MoneyHelperGuidance` in `apps/web/app/features/retirement` | **Owner decision D10.** The fixed line is approved for the Retirement page in the app ("same note, same place", guide 7.3), not yet for a marketing page. Showing it on marketing either puts a bare "free" in a marketing source or moves the string to a shared component the marketing copy test does not read. Both narrow what that guard checks, so either is a guard change needing sign-off first (AGENTS.md section 15) |
| The MoneyHelper debt line on the Debt and borrowing page: "Free, impartial debt help is available from MoneyHelper" | The same: fixed wording (guide 7.3, R3 exception), approved for `DebtHelpLink` in the app, and it starts with a bare "Free" | `DebtHelpLink` in `apps/web/app/features/debt` | **Owner decision D10**, with the pensions line |
| The three kept calculators and their names (D9) | Guide 7.4: a title names only the inputs the tool has and the outputs it shows. "Two ways to pay off debts" and "Mortgage overpayment or ISA, compared" name what is shown and pick no option (R2) | Fields and starting values read from the components (section 4.4) | Verified in code. The short forms do not exist yet; they are slice S6b |
| Estimated debt-free date; when a 0% deal ends; highest rate first compared with smallest balance first | Approved terms; "compare", neither option picked (R2) | `DebtSummary`, `PayExtraTool` | Verified in code |
| Mortgage: repayment schedule, overpayment estimate, fixed rate end estimate, overpay or save, LTV | Approved terms | `OverpaymentSimulator`, `RemortgageShockSim`, `OverpayVsSaveCompare`, `LtvMilestones` | Verified in code |
| "Free during the beta" | Exact required form | No payment path | Already approved wording |
| "You can download the figures you have saved" | Passes | JSON export in `features/settings` and `routes/account.export.ts` | Verified in code; **not verified in staging** |
| "You can delete your financial data, or your whole account" | "permanent erasure" is banned and not used | `DataTab`, `DeleteAccountSection`. Deletion answers 503 until `DELETION_TOMBSTONE_KEY` is set | **Unverifiable here. Ship only after the owner confirms it works in staging** |
| AI connection: "switched on one account at a time. Ask us to switch it on for yours." | Guide 7.4: copy for an allowlisted feature must not read as if every account has it. Version 1 says how a tester gets it and promises nothing; version 2 promises every request is granted | `McpAllowlistGuard`; the owner confirmed access stays with named accounts | Verified in code. **Wording is a draft for the owner (section 5.2)** |
| Any regulatory, security-level or compliance statement | Banned | n/a | **None drafted.** None will be added without the owner's wording |

## 7. Decisions for the owner

### 7.1 The owner's answers (20 November 2026, relayed by the coordinator)

| # | Answer | The owner's words | What changes |
| --- | --- | --- | --- |
| D1 | Structure accepted (option A), with a name change | "'what flump covers' should not be the copy used on the page, FLump features or similar is better." | The navigation label is "Features" and the page title is "Flump features", at `/features`. "What Flump covers" is not used anywhere, including the home band heading and the menu |
| D2 | Decided | "I like headline 1 combined with line underneath 2"; then "in one place is better" | h1 "All your money. One clear picture." Lead "Accounts, budget, pay, savings, pension and debts in one place." |
| D3 | Settled by the headline choice (option A) | As D2 | "All", with the parts listed in the lead |
| D4 | Settled by the headline choice (option A) | As D2 | Fog wording stays in the tagline only |
| D5 | Changed | "AI connection can be used in places other than the footer. it's a genuine feature that users can access and use, so it should appear in the marketing like any other feature." On access: "Keep it to named accounts" | The AI connection is in the Features menu, on the features page and the home page, with its own page. No "by invitation" badge. The copy says how a tester gets it and does not imply every account has it (draft wording in 5.2, for the owner). Supersedes E16 D13. Imports and bank connections as recommended |
| D6 | Accepted as recommended (option B) | "the other decisions are good to go." | Working samples where they exist, two new sample previews as a later slice, no screenshots |
| D7 | Accepted as recommended (option A) | As D6 | The titles in 5.3, with "Flump features" for `/features` |
| D8 | Accepted as recommended (option A) | As D6 | Pricing stays, with its navigation link |
| D9 | Decided | "keep calculators 1,5 and 6" | Kept on the marketing site, each in a short form on its area page: What you keep from a pay rise (two sliders); Debt payoff methods compared, as "Two ways to pay off debts"; Mortgage overpayment or Stocks and Shares ISA, as "Mortgage overpayment or ISA, compared". The other five and every full-size calculator page leave the marketing site, with redirects. All eight stay in the app. This replaces the plan's own pick (section 4.4) |
| D10 | Accepted as recommended (option A) | As D6 | Both MoneyHelper lines appear word for word on marketing pages. The guard change still goes to the coordinator for sign-off when it is built |

**Decided by the coordinator (20 November 2026), no owner decision needed**

- The three kept calculators have no full-size page on the marketing site. It shows the short form only; where the full version exists in the app, the page points to it as an in-app feature.
- AGENTS.md section 3 on the short forms: `<SliderField>` for every slider; `<SimulatorSplitLayout>` where a short form has a chart; a chartless short form is exempt (section 4.4 says why).
- The AI connection tile reads "Switched on for an account on request during testing."
- The plain names for calculators 5 and 6 are routine wording for the coordinator to approve: "Two ways to pay off debts" and "Mortgage overpayment or ISA, compared".
- The AI connection page's "How to get it" is version 1, word for word as section 5.2 has it, with "Ask us" linking to the Contact page (coordinator, 20 November 2026; reported to the owner).
- The small "Preview" label on the AI connection page stays while access is limited to named accounts (coordinator, 20 November 2026; reported to the owner).
- The features page lead keeps "Five areas": the AI connection is a way to use the areas, not a sixth area (coordinator, 20 November 2026).

**Still to confirm.** The build leaves each part alone until its item is settled.

| Item | Who | Part of the build it holds |
| --- | --- | --- |
| ~~The AI connection page's "How to get it" wording~~ | Decided by the coordinator, 20 November 2026: version 1 (above) | Built in PR 2 |
| ~~Whether the AI connection page keeps the small "Preview" label~~ | Decided by the coordinator, 20 November 2026: it stays (above) | Kept |
| ~~That choosing the headline allows its two full stops and slogan shape for the marketing home h1 only (ruling R-a)~~ | Decided, 20 November 2026: the owner's own choice outranks the guide (coordinator ruling on it); copy guide 5.1 and 5.4 record the exception for that one string | Built in the closing PR |
| That downloading and deleting data work in staging | Owner | The two data facts on the Security page |
| The list of account kinds named on the Accounts page | Build lane, checked against the code | One sentence of the Accounts page |
| ~~Names for calculators 5 and 6~~ | Decided by the coordinator, 20 November 2026 (above) | Built in PR 2 |
| Each guard change in section 8, before it is made | Coordinator | The tests named there |

The table below is the record of the options and recommendations as they were put to the owner.

| # | Decision | Options | Recommendation |
| --- | --- | --- | --- |
| D1 | Page list and navigation | **A.** A hub (`/features`) and five area pages named as the app names them; top navigation of three links (the features page, Preview, Pricing); Security, AI connection and Contact in the footer. **B.** Three combined pages (Everyday money; Pay and tax; Long-term). **C.** One long page with five anchored sections | **A.** It is the only option where the site and the app share names and order. C is the fallback if six pages feels like too much to keep true |
| D2 | Home headline (section 5.1) | One of **H1 to H8**, with its subheadline. Six of them need ruling **R-a** (a slogan-shaped h1 on the marketing home page only); H3 also needs R-b ("Sorted"); H4 also needs R-c (fog in the h1). H6 and H7 need no ruling | **Decided, 20 November 2026:** h1 "All your money. One clear picture." with the lead "Accounts, budget, pay, savings, pension and debts in one place." (owner: "I like headline 1 combined with line underneath 2"; "in one place is better"). It replaces the h1 that E31 and E16 PR 12 set |
| D3 | The words for the 360 message | **A.** "All" or "everything" in the headline, with the parts listed in the subheadline beside it; no "360", "complete" or "holistic" in copy. **B.** Say it only by listing the parts, with no "all". **C.** Use "complete" or "360" as the owner's brief words it | **A.** "All" with the list beside it is plain and can be checked against the list. C breaks copy guide 2.2 and cannot be evidenced |
| D4 | Fog wording | **A.** Keep the 14 November ruling: the tagline only, in the places listed. **B.** Allow one body line on the home page. **C.** Fog in the h1 (headline H4, ruling R-c) | **A.** The plain copy does the clearing; the tagline names it |
| D5 | Features not open to every tester | Retirement is no longer part of this decision: the owner has opened it, and it goes on the Savings and pension page once it is in the app's navigation (sections 2.1 and 5.2). For the rest: **A.** AI connection stays, labelled "Preview, by invitation", setup steps reworded, footer link only. Imports and bank connections: not mentioned beyond the existing fixed sentence. **B.** As A, but remove the AI connection page until it is open to every tester. **C.** A "Coming later" list | **A.** C is ruled out for bank connections by the claims guard. One question for the owner inside this: should the AI connection be opened to every invited tester as Retirement was? If yes, the "by invitation" label goes |
| D6 | Working samples or screenshots on area pages | **A.** Working sample components where one exists today (dashboard, check-in, breathing room, pay-rise tool), an illustration on the two pages without one. **B.** As A now, then build two new sample previews (savings and pension; debt and borrowing) as a later slice. **C.** Screenshots of the app | **B.** Screenshots go stale, need four variants each (phone, desktop, light, dark) and are a picture of text for screen readers |
| D7 | SEO titles and descriptions | **A.** The table in 5.3: the app's area name plus a plain descriptor. **B.** Search-led titles (for example "UK take-home pay calculator and budget planner") | **A.** B drifts from the app's names and invites claims the pages cannot back |
| D8 | Pricing while the price is not set | **A.** Keep the page and the navigation link; list the five areas as what the beta includes. **B.** Keep the page, footer link only, until a price is set. **C.** Remove the page; the FAQ answers it | **A.** People look for a pricing link; a clear "free during the beta, price not set" answers it honestly |
| D9 | Calculators (section 4.4) | The options first put to the owner are withdrawn; the owner chose from the list of eight | Superseded: see D9 in section 7.1 |
| D10 | The two fixed MoneyHelper lines (debt help; pension guidance) on marketing pages | **A.** Show both, word for word, on the Debt and borrowing and the Savings and pension pages, from one shared component each, and record the guard change with sign-off. **B.** Leave both off the marketing site; they stay in the app, where they are approved. **C.** Show them with a plain link and no "free" (this rewords fixed wording, so it needs the owner's own words) | **A.** A page that describes debts or a retirement estimate should carry the same signpost the app does. It needs two things from the owner: that the lines may appear on marketing pages, and sign-off for the guard change |

Decisions already made that this plan keeps: E7 (owner signs off copy), RD11 (the MoneyHelper pensions line, unchanged in wording), E16 D10 b (no example price), E24 (invite-only call to action), the tagline ruling. Decisions it would change, only with the owner's yes: the home h1 and the five-band home layout from E16 PR 12 (D2); copy guide 5.1 for the marketing home h1 (ruling R-a); the public calculators index from E16 PR 11 and D11 (D9). Superseded by the owner on 20 November 2026: RD9 (Retirement unseen) and E16 D13 (AI connection as a footer link and one FAQ answer only).

## 8. Build slices (after acceptance)

All new components follow AGENTS.md section 1 (colocated directory; the five-file set for anything in `packages/ui`), section 2 (semantic tokens only; at most one tinted section per page) and section 4 (stories in light and dark, no a11y violations). No financial calculation is added, so section 14 has nothing to test by hand. PR 838 has merged, so unused exports fail CI and every export a slice adds is imported in the same pull request.

The "Affected files" lists were checked against the code on 2026-11-20 at `9d6cac605`, by searching `apps/marketing` and `apps/e2e` for every reference to `/tools`, `/mcp` and the tool slugs. Paths are under `apps/marketing/` unless they say otherwise. Search again before building: other work is merging.

### PR 1: the structure

| Slice | Work | Size |
| --- | --- | --- |
| S1 | One data file for the five areas and the AI connection (name, path, h1, lead, facts, depth list, preview anchor, meta). Area names are checked against the app's labels by a test | S |
| S2 | `FeaturePage` template and `AreaStrip` ("Part of one picture"); the five area pages; routes, sitemap, 404 handling, `PageMeta`, social meta | M |
| S2b | The AI connection page on the same template at `/features/ai-connection`, the redirect middleware, and the `/mcp` redirect. In PR 1 so that the Features menu never links to a page that does not exist | M |
| S3 | `FeaturesIndexPage` (`/features`, "Flump features") | S |
| S4 | Header (the "Features" menu, the mobile drawer; the "Calculators" and "AI connection" top links go) and Footer (Product, Company, room for Legal) | M |
| S7 | Guards: every new source file joins `PR12_SOURCES` in `copy.test.ts` | S |

Affected files, PR 1:

- **S1:** new `src/utils/featureAreas.ts` and its test.
- **S2:** new `src/pages/FeaturePage/` and `src/components/AreaStrip/` (colocated sets); `src/App.tsx` (routes); `src/utils/toolSlugs.ts` (`STATIC_PATHS`); `src/routes.ts`; `server/sitemap.test.ts` and `server/ops.test.ts` (both assert the sitemap body); `server/analytics.test.ts` (route keys; `analytics.ts` itself follows `canonicalPath`); `src/social-meta.ssr.test.tsx`; `src/pages/NotFoundPage/NotFoundPage.test.tsx`.
- **S2b:** new `server/redirects.ts` and its test; `server.ts` (mount it); `src/utils/toolSlugs.ts` (`STATIC_PATHS` contains `/mcp`, which it loses in PR 1, and gains `/features/ai-connection`); `src/pages/McpPage/` (`McpPage.tsx`, `.styles.ts`, `.stories.tsx`, `.test.tsx`, `mcpTools.ts`, `index.ts`: rebuilt on the template, and moved or renamed); `src/App.tsx` (the `/mcp` route goes); `src/copy.test.ts` (its source list pins `pages/McpPage/McpPage.tsx` and `pages/McpPage/mcpTools.ts`); `src/pages/SecurityPage/SecurityPage.tsx` (links to `/mcp`); `src/components/HomeFAQ/HomeFAQ.tsx` and `HomeFAQ.test.tsx` (the test asserts the `/mcp` link and names D13); `src/pages/HomePage/HomePage.test.tsx` (asserts `/mcp` in the footer); `NotFoundPage.test.tsx` (expects `/mcp` to render); `social-meta.ssr.test.tsx`; `apps/web/app/routes/app.profile.tsx` (`aiGuideUrl` points at `/mcp#setup`); `apps/e2e/visual/routes.ts` (`marketing("mcp", "/mcp")`) with its screenshots; `apps/e2e/sweep/sets.ts` and `apps/e2e/sweep/phoneSets.ts` (the marketing path lists that include `/mcp`: in `phoneSets.ts`, `MARKETING_PAGES` and the set named `mkt`).
- **S3:** new `src/pages/FeaturesIndexPage/`; `App.tsx`; `STATIC_PATHS`.
- **S4:** `src/components/Header/Header.tsx` with its test and stories; `src/components/Footer/Footer.tsx` and `Footer.test.tsx`; `HomePage.test.tsx`; the e2e visual baselines for every marketing page, since the header changes on all of them.
- **S7:** `src/copy.test.ts`.

Done for PR 1: the tests above updated and passing; `/mcp` answers 301 to `/features/ai-connection`, with a test; the sitemap lists the new paths and not `/mcp`; no link on the site leads to a 404; visual baselines regenerated; lint, types, `check:laws`, the marketing tests and the build green in CI; an independent `opus` review and a `ui-compliance-reviewer` pass; screenshots for the owner at phone and desktop widths in light and dark.

### PR 2: the home page, calculators, Retirement and existing pages

| Slice | Work | Size |
| --- | --- | --- |
| S5 | Home page with the decided headline and lead: the area tiles and the AI connection tile, "Start with rough figures", "More detail when you want it"; FAQ answers corrected to the app's names | M |
| S6 | Existing pages: the Pricing list, the Security data facts (only once verified), `/preview` sections linked to area pages | S |
| S6b | Calculators as decided in D9: the short forms of 5 and 6 in `packages/ui`, the three placed on their area pages, the marketing calculator pages removed, the `/tools` redirects | M |
| S6c | The Retirement section on the Savings and pension page; `MoneyHelperGuidance` and `DebtHelpLink` promoted to `@repo/ui` so both apps render the one fixed line each (D10) | S |

Affected files, PR 2:

- **S5:** `src/pages/HomePage/` (page, styles, test); `src/components/MonthlyPictureSection/` (replaced by the tiles; the whole directory goes: component, styles, stories, test and `index.ts`, with its link to `/tools`); `src/components/HomeFAQ/HomeFAQ.tsx` and test; `src/components/PayRiseTeaser/PayRiseTeaser.tsx` and test (the link, section 4.4); `src/copy.test.ts` (source lists that name `MonthlyPictureSection.tsx`); the home visual baseline.
- **S6:** `src/pages/PricingPage/PricingPage.tsx` and `PricingPage.test.tsx` (the test imports `TOOL_CATALOGUE` and has a comment about `/tools`); `src/pages/SecurityPage/SecurityPage.tsx`; `src/pages/PreviewPage/PreviewPage.tsx`.
- **S6b:** `packages/ui/src/calculators/DebtSnowballCalculator/` and `MortgageVsIsaCalculator/` (one prop each, a story and a test); `src/pages/ToolPage/` and `src/pages/ToolsIndexPage/` removed (pages, styles, stories, tests); `src/App.tsx`; `src/routes.ts` (`isKnownPath` drops the tool branch); `src/utils/toolSlugs.ts`; `server/sitemap.ts` (`canonicalPath` and `buildSitemap` drop the tool branch) and `sitemap.test.ts`; `server/ops.test.ts` (asserts a tool address in the sitemap); `server/analytics.ts` (a comment names `/tools/<known-slug>`) and `analytics.test.ts`; `server/redirects.ts` and its test (the `/tools` entries); `src/claims.test.ts` and `src/copy.test.ts` (the calculator guards, below); `NotFoundPage.test.tsx` (expects `/tools` to render); `social-meta.ssr.test.tsx`; `Footer.tsx` and test ("All calculators"); `apps/e2e/visual/routes.ts` (`marketing("tools", "/tools")`) with its screenshots; `apps/e2e/sweep/sets.ts` and `phoneSets.ts` (the marketing tool entries only: in `phoneSets.ts` those are in `MARKETING_PAGES` and the set named `mkt`, which use `MARKETING_URL`; the `p("/tools")` entries, including the one at line 414 and the set named `out`, are web app pages and stay).
- **S6c:** `apps/web/app/features/retirement/components/MoneyHelperGuidance/` and `apps/web/app/features/debt/components/DebtHelpLink/` move to `packages/ui` with their importers updated; the "where" column for both lines in copy guide 7.3.

Not affected, checked: `apps/e2e/tests/security-headers.spec.ts`, `phone-nav-current.spec.ts` and `nav-label-fit.spec.ts` use `/tools` on the web app, which keeps its calculators.

Done for PR 2: the tests above updated and passing; `/tools`, `/tools/`, all eight canonical slugs and every alias slug answer 301 to the right page, each tested; the sitemap lists only the new paths; no marketing source links to `/tools` or `/mcp`; the web app's calculators still work; visual baselines regenerated; lint, types, `check:laws`, the marketing and `packages/ui` tests and the build green in CI; an independent `opus` review and a `ui-compliance-reviewer` pass; screenshots for the owner at phone and desktop widths in light and dark.

### Later: sample previews (D6, option B)

| Slice | Work | Size |
| --- | --- | --- |
| S8 | Two sample previews in `packages/ui` (savings and pension; debt and borrowing), sample data only, labelled as sample data. Its own pull request after PR 2 | M to L |

### Guard changes expected

Each needs the coordinator's sign-off before it is made, and goes under "Guard changes" in its pull request (AGENTS.md section 15).

- **Calculator guards (PR 2).** The "public calculator copy guard" in `claims.test.ts` reads `ToolPage.tsx` and `ToolsIndexPage.tsx`; with those removed its source list shrinks to the shared files in `packages/ui/src/tools`. `copy.test.ts` checks the marketing tool slugs against the catalogue and lists `ToolsIndexPage.tsx` in its over-claim check; both lose their subject.
- **The MoneyHelper lines (PR 2, D10 accepted).** The two fixed lines contain a bare "free", which the marketing copy test allows only as "free during the beta". Rendering them from a shared component keeps the string out of the files that test reads, which narrows the check for those two sentences.
- **Home page tests (PR 2).** Tests that pin today's h1 and band order change with D2. They are listed if any numeric limit moves.
- Otherwise none loosened: `PR12_SOURCES` grows.

Mobile parity: the marketing site is not a flow the mobile app shares, so no parity log row is expected. If a token or shared component changes, a row is added.

## 9. Follow-ups noticed, not part of this epic

- The web app's own calculators page and its "Calculators" link read the same catalogue. The owner's points about names, complexity and number apply there too; D9 only decides the marketing site.
- The EPICS summary table still says E38 S1 to S3 are not started; recent commits on `main` show them merged.
- Whether the CSV export from #754 is reachable in the settings UI was not confirmed in this check.

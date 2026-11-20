# E42. Marketing site restructure: the site mirrors the app

Decisions: open

> Status: plan for owner approval. Nine of ten decisions were answered on 2026-11-20 (section 7.1); D9 is open. No code. Written 2026-11-20 against `origin/main` (`da6284f0c`). Paths are relative to the repository root. All copy in this document is a draft for the owner to react to (E7: the owner signs off all marketing copy).

## 1. Summary

- The owner's brief (20 November 2026): the marketing site feels out of touch with the app. Pages should be geared to the features Flump offers and split the way the app is split. The message: Flump is a whole, 360 degree personal finance manager; it keeps things simple and removes the fog for everyone; it has more depth for people who want or need it.
- Today the site has eight page types and none is about an app area. The app has five navigation entries (Accounts, Budget, Pay, Savings and pension, Debt and borrowing) plus Home, the monthly check-in, calculators and settings. The site names none of them.
- Proposal: a "Flump features" page (navigation label "Features") and five area pages named exactly as the app names them, a rebuilt home page that shows all five areas in one picture, and a top navigation of three links. Existing pages stay, with small corrections.
- Retirement is on the site, inside Savings and pension (owner, 20 November 2026: it should be open to everyone; this supersedes RD9). The AI connection is presented as a feature like the others, with plain words on how a tester gets it (owner, 20 November 2026). Imports and bank connections are not mentioned.
- Calculators leave the top navigation. A few plain ones sit inside the area page they belong to; the rest are a numbered decision (D9).
- Ten decisions are in section 7. The owner has answered nine (section 7.1). One is open: which calculators stay (D9), which the owner is choosing. Nothing is built until they are answered (AGENTS.md section 13).

**Revision 2 (20 November 2026), after the owner read the first version.** Three changes: the home headline has eight snappier options, each checked against the guards (section 5.1, decision D2); Retirement moves from "not mentioned" to part of the Savings and pension page (sections 2, 2.1, 4, 5.2, decision D5); calculators are assessed one by one and demoted (section 4.4, decision D9).

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
| Retirement plan | `/app/retirement` | A target the user sets, an estimated yearly income in today's prices before tax, the accounts that count towards it, assumptions shown year by year, and one MoneyHelper guidance line (`RetirementPlanner`, `MoneyHelperGuidance`) | On `main`: friends beta. The owner's intent (20 November 2026): every invited account. PR 845 as read: beta admins and members who joined through an invite link; accounts let in by the older allowlists are not covered (section 2.1). Still hidden from the app's navigation and section lists (`HIDDEN_PAGE_KEYS` in `pageConfig.ts`), which PR 845's diff did not change when read | Nothing. Now a gap (section 3) |
| Debt and borrowing: Cards and loans | `/app/debt` | List of debts, estimated debt-free date, when a 0% deal ends, a pay extra tool comparing highest rate first with smallest balance first, a MoneyHelper line | Everyone | One sentence in a home card; three calculators |
| Debt and borrowing: Mortgage | `/app/mortgage` | Repayment schedule, overpayments, overpay or save comparison, LTV milestones, an estimate for when a fixed rate ends, buy-to-let overview | Everyone | One sentence in a home card; one calculator |
| Calculators | `/tools`, `/tools/:slug` (both sites, shared catalogue `packages/ui/src/tools/toolCatalog.ts`) | Eight public calculators, no sign-in | Public | `/tools` index and one page per calculator. In the top navigation. Not grouped by app area |
| Onboarding | `/app/onboarding` | Three steps (income, housing, savings and debts) with a running summary | Everyone | Home and FAQ: "a few rough numbers". Accurate |
| AI connection | Settings, Security tab (`/app/profile?tab=ai_connections`) | Create an access token and connect an AI assistant over MCP | Named users in production unless `MCP_OPEN_ACCESS=true` (`apps/backend/src/auth/mcp-access.ts`) | `/mcp` page, badge "Preview", top navigation link. "How to turn it on" reads as if every invited user can do it |
| Imports | `/app/imports`, `/app/imports/:id` | Review and confirm figures staged through the AI connection | Named users (`apps/backend/src/modules/imports/imports-access.guard.ts`) | One fixed sentence on `/security` and `/mcp` (`AI_STAGING_SENTENCE`) |
| Bank connections | Settings | Off for everyone except allowlisted owner accounts, and refused at boot until the bank launch gate passes (`apps/backend/src/config/boot-guards.ts`) | Named users | "Flump does not connect to your bank". Accurate, and the guards forbid promising it |
| Settings | `/app/profile` | Tabs: Profile (age and pay, check-in day, net worth choices, which sections are on), Security (how you sign in, AI connection, imports), Data | Everyone | Nothing |
| Data export and deletion | Settings, Data tab; `/account/export` | "Download your data" (JSON checked; a CSV export merged in #754 but was not found in the settings UI in this check), "Delete your financial data", account deletion | Everyone. Deletion answers 503 until the owner sets `DELETION_TOMBSTONE_KEY` (EPICS table row 1); not verifiable here | Nothing. `/security` does not say you can download or delete your data |

### 2.1 Facts that two open pull requests may change

The inventory was read from `origin/main` at `da6284f0c`. Two pull requests were open on 2026-11-20 and touch what this plan relies on. Re-read these facts from `main` before building.

**PR 838 (dead code removal, `knip` gate).** No visible copy changes. What it changes for the build:

- Default exports are removed from marketing pages and components (`HomePage`, `PreviewPage`, `SecurityPage`, `ToolPage`, `HomeFAQ`, `MarketingSection`, `SecurityPrivacySection`, `BaselineSnapshotPreview`) and `pages/PreviewPage/index.ts` loses its default re-export. New pages and components use named exports only.
- `TOOL_SHORT_LABELS` is removed from `apps/marketing/src/utils/toolSlugs.ts`. Slice S1 reads calculator names from `TOOL_CATALOGUE` in `@repo/ui/tools` directly.
- `BETA_INVITE_PATH` and `PRIVACY_EMAIL` stop being exported from `utils/site.ts` (`PRIVACY_EMAIL` is deleted). Pages keep using `signupCta()` for the call to action, as this plan already assumes.
- `apps/marketing/src/app-shell/index.ts` loses its entry re-exports and `react-icons` leaves the marketing package. Neither is used by this plan.
- Unused exports now fail CI. Every export a slice adds must be imported somewhere in the same pull request, so S1's data file lands with the page that reads it (already the case in PR 1).

**PR 845 (invite-only beta with invite links).** It does not touch `apps/marketing`. What it may change in this plan:

- "Everyone" in the inventory: access becomes membership through a redeemed invite link (`beta_members`) or the admin list, next to the existing allowlists. The meaning for marketing is the same: invited accounts only.
- The Settings row: the Security tab and the settings page change, and an admin-only invites page (`/app/invites`) is added. That page is not a feature to market.
- The web app's signed-out pages stop offering "Sign up" while the beta is invite-only. The marketing call to action stays "Request an invite" and still points at `/contact#beta`; this plan adds no link to the web app's sign-up path (the claims guard forbids one outside `utils/site.ts`).
- Draft copy that describes what happens after a request (the `/mcp` line "say so when you request an invite", the Contact page) should match the flow that PR ships: a person asks by email and receives an invite link. Check the final wording of PR 845 before S6.
- The AI connection: PR 845 ties an access token to its owner still being a beta member. That does not change who the AI connection is switched on for (named accounts, which the owner confirmed on 20 November 2026).
- **Retirement.** The owner said on 20 November 2026 that Retirement should be open to everyone, because invites are only for testing. That supersedes RD9. PR 845's diff, read on 20 November, opens the backend rule to beta admins and to active members who joined through an invite link, while the beta is invite-only. Two things to check on `main` before building the Retirement copy:
  - Whether an account let in by the older email or user id allowlists, with no invite link, can open Retirement. In the diff as read, it cannot unless it is also in `RETIREMENT_ALLOWED_USER_IDS`.
  - Whether Retirement is in the app's navigation. In the diff as read, `HIDDEN_PAGE_KEYS` and `navConfig.ts` were unchanged, so the page is open but reachable by URL only. A marketing page should not describe something a tester cannot find. Unhiding it belongs to the app (E33 or PR 845), not to this epic; the Retirement copy ships only once it is in the navigation.

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
| Pay (new) | `/features/pay` | Take-home pay, and Self Assessment for those who need it | Take-home pay, Self Assessment | What you keep from your pay, and a tax bill estimate if you are self-employed or let property | The two-slider pay rise tool, on the page; the student loan calculator, linked only if D9 is answered B | Pay-rise tool embedded (it exists) |
| Savings and pension (new) | `/features/savings-and-pension` | Savings growth estimate, pension contributions and the retirement plan | Savings, Pension, Retirement plan | Your savings and pension sit beside everything else, and a retirement plan shows an estimate against a target you set | None | None today (decision D6) |
| Debt and borrowing (new) | `/features/debt-and-borrowing` | Cards and loans, then mortgage | Cards and loans, Mortgage | What you owe, when it could be paid off, and what a change would do | The 0% deal and overdraft calculators, on the page (D9) | None today (decision D6) |
| Calculators | `/tools`, `/tools/:slug` | No longer a destination. Out of the top navigation and the footer's main links; the home page keeps only the two-slider pay rise tool it has today. See section 4.4 and decision D9 for which stay and what happens to the rest | Calculators | n/a | n/a | n/a |
| Preview | `/preview` | Unchanged, plus a link from each section to its area page, named for where it goes ("About accounts and the monthly check-in"; guide 5.3 bans "Read more") | Home, check-in, budget | See it working on sample data | n/a | n/a |
| Pricing | `/pricing` | Stays (decision D8). The list of what the beta includes names the five areas | n/a | Free during the beta; the price of any paid plan is not set | None | n/a |
| Security and privacy | `/security` | Stays, footer and menu link. Adds two facts once verified: download your data, delete your data | Settings, Data tab | What Flump can and cannot do with your money and figures | n/a | n/a |
| AI connection | `/features/ai-connection` (`/mcp` redirects) | A feature page like the area pages, in the Features menu and on the home page (decision D5, as the owner changed it) | AI connection | Ask an AI assistant about your saved figures; Flump does the sums, not the AI model; switched on for an account on request during testing | n/a | n/a |
| Contact | `/contact` | Unchanged | n/a | How to ask for an invite | n/a | n/a |
| Not found | any other path | Unchanged | n/a | n/a | n/a | n/a |

Not on the site: Imports beyond the existing fixed sentence, and bank connections. Retirement is on the site, inside Savings and pension, once it is in the app's navigation (section 2.1).

### 4.3 The area page template

One template renders all five area pages from one data file, so the pages cannot drift apart:

1. **Hero:** area name as a small label, the h1, one lead sentence, "Request an invite" and "Interactive preview".
2. **What you see:** three short facts, each a thing the app shows today.
3. **See it:** a working sample (where a preview or calculator component exists) or an illustration (decision D6).
4. **More detail when you want it:** three or four deeper tools in that area. This is where the third message lives.
5. **Part of one picture:** a strip of all five areas with this one marked, each a link. This is where the first message lives on every page.
6. **Try it with your own numbers:** on the Pay and the Debt and borrowing pages only, the one or two plain calculators that belong there (section 4.4). The other three pages have no calculator section.
7. **Final call to action.**

### 4.4 Calculators: which stay, and where

The owner (20 November 2026): the calculators are not a useful addition to the marketing site as they stand. They are functionally complex, their names do not say what they do, and there are too many.

Each of the eight was put to three tests. Inputs were counted from the component in `packages/ui/src/calculators/` on 2026-11-20; a list of debts counts each row's fields.

1. **Name:** can a visitor tell what it does from its name alone?
2. **Three inputs or fewer:** can they get an answer with three inputs or fewer?
3. **Leads into the app:** does it lead naturally into an app area that does the same job with saved figures?

| Calculator (name today) | Name test | Inputs | Leads into | Verdict |
| --- | --- | --- | --- | --- |
| What you keep from a pay rise | Pass | Fail on the full page: about ten (pay, bonus, region, pension method and amount, student loan plans, Child Benefit, children, tax year, extra pension). **Pass** in the two-slider version already on the home page (`PayRiseTeaser`: salary, pay rise) | Pay (the app's pay rise tool) | **Keep, the two-slider version only**, on the Pay page and the home page |
| When a 0% balance transfer ends | Partly: reads like an article title | Pass: 3 (balance, months left, rate after) | Debt and borrowing (the app shows when a 0% deal ends) | **Keep**, on the Debt and borrowing page, renamed |
| Overdraft interest cost calculator | Pass | Pass: 2 (balance, rate) | Debt and borrowing (an overdraft is a debt in the list) | **Keep**, on the Debt and borrowing page, renamed |
| Student loan repayment calculator | Partly: it answers "paid off or written off", which the name does not say | Pass: 3 (plan, salary, balance) | Partly: Pay shows the student loan deduction, not the write-off question | **Optional fourth.** Linked from the Pay page, renamed. Leave out if the owner wants three |
| Debt payoff methods compared | Fail: "methods" means nothing until explained | Fail: three fields for each debt, plus an extra payment | Debt and borrowing (the app's pay extra tool does this with saved debts) | **Go.** The app does it better with saved figures; the area page says so in a sentence |
| Mortgage overpayment or Stocks and Shares ISA | Fail: two things joined by "or", no outcome named | Fail: 5 | Debt and borrowing (the app's overpay or save comparison) | **Go** |
| Section 24 landlord tax calculator | Fail: a statute number | Fail: 5 | Pay (Self Assessment), for landlords only | **Go** |
| Pension contributions and income above £100,000 | Fail: describes inputs, not an answer | Pass: 3 | Pay and Pension, for a narrow income band. E31 already moved it out of the lead | **Go** |

**Recommended set: three, or four with the student loan one.** Plain new names (drafts):

| Today | Draft new name | Where it lives |
| --- | --- | --- |
| What you keep from a pay rise | Unchanged: "What you keep from a pay rise" (the copy guide's own example of a good heading) | On the Pay page and the home page, two sliders |
| When a 0% balance transfer ends | "When a 0% deal ends" (the app's own words; the result keeps its label "Estimated monthly payment") | On the Debt and borrowing page |
| Overdraft interest cost calculator | "What an overdraft costs over a year" (the copy guide's wording, 7.4) | On the Debt and borrowing page |
| Student loan repayment calculator (only if D9 is B) | "Student loan: paid off or written off" | Linked from the Pay page |

A name here describes what the page shows and never tells the reader what to do with money (guide 5.1, advice boundary R2). The guide's heading target is 2 to 6 words and 40 characters (3.1); the pay rise and overdraft names run to seven words, as the guide's own examples do.

Names come from the shared catalogue (`packages/ui/src/tools/toolCatalog.ts`), which the web app's own calculators page also reads, so a rename changes both. The web app's calculators page and its "Calculators" link are outside this epic; the owner's point about names applies there too (section 9).

**The rest (four, or five without the student loan one).** Options, decision D9:

- **1. Keep the URL alive, unlinked.** The page still answers at its address. It leaves the navigation, the home page, the footer, the `/tools` index and the sitemap. It gains one line linking to its area page. Nothing is lost if anyone has the address, and it can be removed later with evidence.
- **2. Remove from the marketing site.** The address redirects to the matching area page. Less to keep true; the calculators still exist in the web app for signed-in testers.
- **3. Keep all eight linked from the footer only.** Smallest change; does not answer "too many".

**Search traffic, honestly.** Unknown, and probably close to nothing today. The marketing server sends `noindex, nofollow` on every response and serves no sitemap unless both `ALLOW_INDEXING` and `FLUMP_LAUNCH` are exactly `true` (`apps/marketing/server/ops.ts`, `sitemap.ts`). Flump is pre-launch, so the pages should not be in search results yet; whether those switches are set in the deployed environment cannot be checked from the repository. Page-view counting (E24-T9) is planned and there is no rollup to read. After launch, single-purpose calculator pages are the kind of page that can bring search visitors, which is the case for option 1 over option 2: it keeps that door open at no cost until there are numbers.

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
- Retirement plan (its own section on this page, shown once Retirement is in the app's navigation): "Set a retirement target of your own. Flump shows an estimate of your yearly income in retirement, in today's prices and before tax, and which accounts count towards it. The assumptions are listed year by year and you can change them. It is an estimate from your figures, not a prediction and not advice."
- Under the retirement section, if D10 is A, the MoneyHelper line exactly as the app has it (owner decision RD11, fixed wording, guide 7.3): "MoneyHelper offers free, impartial guidance on pensions, backed by the government." with the link "Pension guidance from MoneyHelper". Flump sets no target and suggests no contribution (guide 2.3 item 6, advice boundary R1 to R8).
- More detail: how much of this tax year's ISA allowance you have used; a deposit timeline; investment returns.
- Carries: (1) savings, pension and the retirement estimate beside the rest of your figures; (2) a list with rates; (3) contribution changes, the deposit timeline and the retirement plan's assumptions.

**Debt and borrowing (`/features/debt-and-borrowing`)**

- h1: "Debt and borrowing". Lead: "What you owe, and an estimate of when it could be paid off."
- "List your cards, loans and overdrafts with their rates. Flump shows an estimated debt-free date and when any 0% deal ends. Compare paying the highest rate first with paying the smallest balance first. If you have a mortgage, see your repayment schedule and an estimate of what an overpayment would do."
- More detail: an estimate of your payment when your fixed rate ends; overpay or save, compared; loan to value (LTV) milestones.
- If D10 is A, the page carries the MoneyHelper debt line exactly as the app's debt page has it (copy guide 7.3 and 7.5, fixed wording).
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
- Home and features tile: "AI connection. Ask an AI assistant about your saved figures. Switched on for your account on request during testing."
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

The home description follows the decided lead (D2): "Flump: finance without the fog. Accounts, budget, pay, savings, pension and debts in one place, under UK rules, from figures you type in." The Savings and pension description gains "and a retirement estimate against a target you set" once Retirement is in the app's navigation. Existing titles for `/preview`, `/pricing`, `/security`, `/mcp` and `/contact` stay; the kept calculators take their new names (D9). Each new path joins `STATIC_PATHS` (sitemap) and the social meta test.

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
| Retirement: a target you set, an estimated yearly income in today's prices before tax, accounts that count, assumptions year by year | "estimate", never "forecast", "prediction" or "will" (guide 6.1); no target set by Flump (2.3); no recommendation (R1 to R8) | `RetirementPlanner` (page subtitle "Estimates in today's prices, before tax."; sections "Counted towards retirement", "Assumptions, pots and year by year") | Verified in code. **Who can open it and whether it is in the navigation: depends on PR 845 and the app (section 2.1)** |
| The MoneyHelper pensions line, word for word | Fixed wording (RD11, guide 7.3). It contains a bare "free", which `copy.test.ts` rejects in marketing sources unless it is "free during the beta" | `MoneyHelperGuidance` in `apps/web/app/features/retirement` | **Owner decision D10.** The fixed line is approved for the Retirement page in the app ("same note, same place", guide 7.3), not yet for a marketing page. Showing it on marketing either puts a bare "free" in a marketing source or moves the string to a shared component the marketing copy test does not read. Both narrow what that guard checks, so either is a guard change needing sign-off first (AGENTS.md section 15) |
| The MoneyHelper debt line on the Debt and borrowing page: "Free, impartial debt help is available from MoneyHelper" | The same: fixed wording (guide 7.3, R3 exception), approved for `DebtHelpLink` in the app, and it starts with a bare "Free" | `DebtHelpLink` in `apps/web/app/features/debt` | **Owner decision D10**, with the pensions line |
| The three or four kept calculators and their new names | Guide 7.4: a title names only the inputs the tool has and the outputs it shows | Inputs counted from the components (section 4.4) | Verified in code; the new names are drafts for D9 |
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
| D9 | **Open** | The owner is choosing the calculators from the list of eight | Section 4.4 stands as the assessment. Nothing about calculators is built until the picks arrive |
| D10 | Accepted as recommended (option A) | As D6 | Both MoneyHelper lines appear word for word on marketing pages. The guard change still goes to the coordinator for sign-off when it is built |

Still to confirm with the owner: the AI connection wording and the "Preview" label (section 5.2), and that choosing the headline allows its two full stops and slogan shape for the marketing home h1 only (section 5.1, ruling R-a).

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
| D9 | Calculators (section 4.4) | Which stay: **A.** Three (pay rise in its two-slider form, 0% deal, overdraft), each on its area page under a plain new name. **B.** Those three and the student loan one. **C.** Only the two-slider pay rise tool. What happens to the rest: **1.** keep the URL alive but unlinked and out of the sitemap; **2.** remove, with a redirect to the area page; **3.** keep all linked from the footer | **A with 1.** Three pass the tests cleanly; the student loan one answers a question the app does not. Keeping the old addresses alive costs nothing and can be undone. Search traffic today is unknown and probably near nothing, because the site is `noindex` until launch; review once page views are counted |
| D10 | The two fixed MoneyHelper lines (debt help; pension guidance) on marketing pages | **A.** Show both, word for word, on the Debt and borrowing and the Savings and pension pages, from one shared component each, and record the guard change with sign-off. **B.** Leave both off the marketing site; they stay in the app, where they are approved. **C.** Show them with a plain link and no "free" (this rewords fixed wording, so it needs the owner's own words) | **A.** A page that describes debts or a retirement estimate should carry the same signpost the app does. It needs two things from the owner: that the lines may appear on marketing pages, and sign-off for the guard change |

Decisions already made that this plan keeps: E7 (owner signs off copy), RD11 (the MoneyHelper pensions line, unchanged in wording), E16 D10 b (no example price), E24 (invite-only call to action), the tagline ruling. Decisions it would change, only with the owner's yes: the home h1 and the five-band home layout from E16 PR 12 (D2); copy guide 5.1 for the marketing home h1 (ruling R-a); the public calculators index from E16 PR 11 and D11 (D9). Superseded by the owner on 20 November 2026: RD9 (Retirement unseen) and E16 D13 (AI connection as a footer link and one FAQ answer only).

## 8. Build slices (after acceptance)

All new components follow AGENTS.md section 1 (colocated directory; the five-file set for anything in `packages/ui`), section 2 (semantic tokens only; at most one tinted section per page) and section 4 (stories in light and dark, no a11y violations). No financial calculation is added, so section 14 has nothing to test by hand.

| Slice | Work | Size |
| --- | --- | --- |
| S1 | `apps/marketing/src/utils/featureAreas.ts`: one data file for the five areas and the AI connection (name, path, h1, lead, facts, depth list, calculator slugs, preview anchor, meta). Area names are checked against `apps/web/public/locales/en/common.json` by a test, so the site cannot drift from the app | S |
| S2 | `FeaturePage` template and `AreaStrip` ("Part of one picture") components; five routes under `/features`; `STATIC_PATHS`, sitemap, 404 handling, `PageMeta`, social meta test | M |
| S3 | `FeaturesIndexPage` (`/features`) | S |
| S4 | Header (the "Features" menu, mobile drawer) and Footer (Product, Company, room for Legal) | M |
| S5 | Home page with the accepted headline: area tiles, "Start with rough figures", "More detail when you want it"; FAQ answers corrected to the app's names | M |
| S6 | Existing pages: Pricing list, the AI connection page rebuilt on the feature template at `/features/ai-connection` with a redirect from `/mcp` and the wording the owner approves, the home FAQ answer, `/security` data facts (only once verified), `/preview` sections linked to area pages | S |
| S6b | Calculators as decided in D9: new names in the shared catalogue (this renames them in the web app too), the kept ones placed on their area pages, the rest unlinked and dropped from the index, footer and sitemap, each with one line linking to its area page. Tool slugs and the copy test that ties slugs to the catalogue stay | S to M |
| S6c | Retirement section on the Savings and pension page, only once Retirement is in the app's navigation. If D10 is A: promote `MoneyHelperGuidance` and `DebtHelpLink` to `@repo/ui` (five-file set each) so both apps render the one fixed line each | S |
| S7 | Guards: add every new file to `PR12_SOURCES` in `copy.test.ts`; the claims guard already scans all of `src` | S |
| S8 (if D6 is B) | Two sample previews in `packages/ui` (savings and pension; debt and borrowing), sample data only, labelled as sample data | M to L |

Two pull requests: **PR 1** is S1, S2, S3, S4 and S7 (the structure). **PR 2** is S5, S6, S6b and S6c (the home page, existing pages, calculators and Retirement), and S8 if chosen. Each gets an independent `opus` review and a `ui-compliance-reviewer` pass, and screenshots for the owner at phone and desktop widths in light and dark.

Guard changes expected: one, if D10 is A. The two fixed MoneyHelper lines contain a bare "free", which the marketing copy test allows only as "free during the beta"; showing them on marketing narrows that check for those two sentences, whichever way it is built. It needs sign-off before the change is made and goes under "Guard changes" in the PR. Otherwise none loosened: `PR12_SOURCES` grows. Home page tests that pin today's h1 and band order change with D2; they are listed under "Guard changes" in the PR if any numeric limit moves.

Mobile parity: the marketing site is not a flow the mobile app shares, so no parity log row is expected. If a token or shared component changes, a row is added.

## 9. Follow-ups noticed, not part of this epic

- Retirement is still hidden from the app's navigation and section lists (`HIDDEN_PAGE_KEYS` in `pageConfig.ts`, the comment in `navConfig.ts`), and the code comments still cite RD9. Now that the owner has opened it, unhiding it and updating those comments belongs to E33 or PR 845. The marketing Retirement section waits for it.
- Accounts let in by the older email or user id allowlists may not get Retirement under PR 845's rule as read (section 2.1). For the PR 845 lane to confirm.
- The web app's own calculators page and its "Calculators" link read the same catalogue. The owner's points about names, complexity and number apply there too; D9 only decides the marketing site.
- The EPICS summary table still says E38 S1 to S3 are not started; recent commits on `main` show them merged.
- Whether the CSV export from #754 is reachable in the settings UI was not confirmed in this check.

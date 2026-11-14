# E16 polish: re-score after PRs 1 to 12 (PR 13)

2026-11-14. This is the "Result" of [PLAN.md](./PLAN.md) section 2: every row of the scorecard scored again, on both axes, after polish PRs 1 to 12 had merged.

**Short version.** The programme worked: every row rose, most by 1.5 to 3 points. Nothing is a 10 yet. The independent scores sit 1 to 2 points below what the page sessions gave themselves. The gap is mostly things that only show with real data in the account (the first audit and the page sessions judged mainly empty or freshly set-up states). Section 4 lists what is left as round-2 PRs.

## 1. Method

- **Data.** Two seeded households, written through the app's own API by `apps/e2e/support/personas.ts`: a renting user (29, £32,000, rent £950, cash £4,500, pension £9,000, a credit card, a student loan, a budget, six months of history) and a home-owning user (44, £58,000, home £310,000, a complete mortgage, cash and an ISA, pension £96,000, a car loan and a credit card, a budget, six months of history). Neither has recorded the current month yet, which is the usual state between monthly check-ins.
- **Sweep.** `bun run sweep:design` (`apps/e2e/sweep/`): 614 frames at 375 and 1280, light and dark, full page and first view, for both households (every page and secondary tab), 12 dialogs and sheets, the 5 onboarding steps, the signed-out web pages (tools index, 8 tool pages, 3 sandbox households, 404, error shell) and the marketing site. DOM counts are in [`after/metrics-*.json`](./after/), in the same shape as the first audit's. The frames are not committed (35 MB); run the sweep to recreate them. The sweep ran on `main` at `43574c59`, before the strings-only copy sweep (#692) merged, so a few labels have since changed.
- **Scoring.** Two reviewers (one for the signed-in app, one for signed-out, marketing and the design system) scored each row out of 10 in halves from the frames, against principles P1 to P13 and the N1 and N targets, with the `design-critique` heuristics. They did not see the page sessions' reasoning, only that those sessions had scored themselves 8.5 to 9.5. A 10 means the reviewer would change nothing.
- **Counts.** N1 is distinct figures in the first view at 1280 by 800; N is the whole page before any disclosure is opened. The automatic count misses table rows on accounts and history; where it does, the reviewer counted from the frame and says so.

## 2. Scorecard

Visual / simplicity. "Before" is the plan's scorecard. "Claimed" is the page session's own score when its PR merged.

| Page                     | Before              | Claimed               | Re-score      | N1 / N measured (target)             | What holds it below 10                                                                                                                                                                     |
| ------------------------ | ------------------- | --------------------- | ------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dashboard `/app`         | 6.5 (5.5 owner) / 4 | 9 / 9.5               | **8 / 7.5**   | 6 / 8 (4 / 10)                       | First view is 2 figures over; "Choose what shows here" sits above the hero at 375; KPI cards uneven; card figures differ from Accounts; check-in row always shown                          |
| Accounts                 | 6.5 / 5.5           | 9 / 9.5               | **7.5 / 7**   | 1 / 3 plus rows (3 / 3 plus rows)    | Rows do not add up to the totals; header buttons wrap at 375; "Connected banks" block for a feature that does not exist; student loan listed but not in the total                          |
| Account detail           | not scored          | not scored            | **7 / 7**     | not measured                         | Hero shows last month's balance with no date; Edit account opens empty                                                                                                                     |
| Net worth history        | 7.5 / 8             | 9 / 9.5               | **7 / 6**     | about 4 / 30 or more (2 / 6)         | Hero names the wrong month; chart ends on a different net worth from the dashboard; flat line from a £0 axis; two tables open                                                              |
| Budget                   | 6 / 5               | 8.5 / 9               | **7 / 5.5**   | 6 / 21 renter, 5 / 25 owner (4 / 4+) | Scenario zone has about 16 toggles, each with a figure; income listed as a category; two figures shown three times; 4,700px at 375                                                         |
| Debt (with debts)        | 5.5 / 4.5           | 9 / 9.5               | **7.5 / 7**   | 3 / 6 (4 / 10)                       | Gutters narrower than other pages; KPI value sizes differ; three figures per row; debt-free date four times; clipped chart label                                                           |
| Debt (empty)             | 8.5 / 9             | 9 / 9.5               | not shot      |                                      | Both seeded households have debts                                                                                                                                                          |
| Mortgage (complete)      | 4.5 / 3.5           | 9 / 9                 | **7 / 6**     | 6 / 10 (4 / 9)                       | Hero is the balance, not the payment; payment shown as £1,250 and £1,258; "18.2 years"; "Year 1 to 18" axis with a legend; one tool depends on another tab                                 |
| Mortgage (no mortgage)   | not scored          | 9.5 / 10              | **6.5 / 8.5** | 0 / 0                                | Half-width card with no illustration; copy assumes the reader owns a home                                                                                                                  |
| Pension                  | 6 / 3               | 9 / 9                 | **8 / 8**     | 3 / 5 (4 / 12)                       | Chart heading words run together; 2,457px at 375 against 2,400; pot row has no figure; projection to the pound                                                                             |
| Savings                  | 6 / 4               | 9 / 8.5               | **8 / 8**     | 3 / 7 renter, 4 / 8 owner (3 / 10)   | Balances differ from Accounts; heading spacing; the two tools use different inputs                                                                                                         |
| Take-home                | 7 / 5.5             | 9.5 / 9.5             | **7.5 / 7**   | 4 / 7 to 8 (4 / 9)                   | KPI strip with one card; four hues on the pay split; "next £1,000" tab shows £580 three times                                                                                              |
| Self assessment          | 5.5 / 3.5           | 9.5 / 9.5             | **8 / 9**     | 0 / 0                                | Opt-in screen only (see section 6): sunken slab, loud illustration in dark                                                                                                                 |
| Settings                 | 7 / 7.5             | 9.5 / 9.5             | **7 / 7**     | 0 / 0                                | Narrow column; two save models on one tab; "baseline" and "MCP SDK" on the Security tab; tabs clipped at 375                                                                               |
| Onboarding               | 6.5 / 7             | 9.5 / 9.5             | **8 / 7.5**   | 0 to 3 / 0 to 4 (1 / 6)              | A whole step for bank connection, which does not exist; three notices on review; skipped steps marked "Complete"                                                                           |
| Dialogs and sheets       | not scored          | not scored            | **7 / 7**     |                                      | Edit account opens empty; "Edit budget" opens the first-run wizard; native select and clipped Cancel in Add debt                                                                           |
| App chrome               | not scored          | 9.5 / 9.5 (with PR 9) | **7 / 7**     |                                      | "Tax and …" truncates at 375; "Debt" for one household, "Borrowing" for the other; uppercase headings in the More drawer; indigo avatar                                                    |
| Sandbox                  | 6.5 / 4             | 9.5 / 9.5             | **8 / 8.5**   | 5 to 6 / 5 to 8 (4 / 10)             | The household switcher does not show (bug); three "Sign up" buttons; first view 1 to 2 figures over                                                                                        |
| Web `/tools` index       | 7 / 7.5             | 9 / 9.5               | **8.5 / 9**   | 1 / 5 (0 / 0)                        | Narrower grid than marketing; forced breaks in card titles; figures in card copy                                                                                                           |
| Web tool pages (8)       | 5.5 / 5.5           | 8.5 / 9               | **7.5 / 7**   | 2 to 9 / 4 to 28 (3 / 8)             | Calculator bodies repeat the page title and description; left column empty at 1280; over the number budget on 6 of 8                                                                       |
| Error, 404               | 8 / 9               | 9.5 / 9.5             | **8.5 / 9**   | 0 / 0                                | Web and marketing 404 are two designs; error page offers three actions                                                                                                                     |
| Marketing home           | 7 / 6               | 9.5 / 9               | **8.5 / 8.5** | 3 / 6 (3 / 6)                        | Six bands against five; "Request an invite" three times; apricot band is a heavy brown in dark                                                                                             |
| Marketing `/tools`       | 7.5 / 8             | 9 / 9.5               | **9 / 9**     | 1 / 5 (0 / 0)                        | Figures in card copy; 3,124px at 375                                                                                                                                                       |
| Marketing tool pages (8) | 6 / 6               | 8.5 / 9               | **7.5 / 7**   | 2 to 9 / 4 to 27 (3 / 8)             | The same calculator bodies as web                                                                                                                                                          |
| Marketing pricing        | 6 / 5               | 9.5 / 9.5             | **9 / 9**     | 0 / 0 (1 / 2)                        | Two primary buttons; "free" said three times. Capped at 9 until a price exists (D10)                                                                                                       |
| Marketing security       | 7 / 8               | 9.5 / 9.5             | **8.5 / 8.5** | 0 / 0                                | Placeholder-address note in body copy; five "please" bullets                                                                                                                               |
| Marketing MCP            | 6.5 / 5             | 9 / 9.5               | **9 / 9**     | 0 / 0                                | Developer terms in the lead paragraph; nav label differs from the heading                                                                                                                  |
| Marketing contact        | 7 / 7.5             | 9.5 / 9               | **8.5 / 8.5** | 0 / 0                                | A four-sentence card; a whole card for one link                                                                                                                                            |
| Design system            | 7 / 6               | 9 / 9.5               | **8 / 7.5**   |                                      | Scored before this PR's clean-up. Unused exports, `SectionBand` duplicated by `MarketingSection`, no dark mode with JavaScript off (D30), KPI value sizes, chart defaults, heading spacing |

Per-tool scores (the same body serves web and marketing): overdraft 8.5 / 8.5; 0% balance transfer 8 / 7.5; Section 24 8 / 7.5; mortgage or ISA 7.5 / 7; student loan 7.5 / 7.5; pay rise 7.5 / 6; debt payoff methods 7 / 6.5; income above £100,000 7 / 5.5.

### PR 13 acceptance criteria

| Criterion                                              | Result                                                                                                                                                   |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Every page inside its N1 and N targets                 | **Not met.** Over on first view: dashboard (6 against 4), mortgage (6 against 4), sandbox (5 to 6 against 4). Over on the page: budget, history, 6 tools |
| 0 `FLP*` imports                                       | **Met.** `apps/web/app/components/core/` is deleted and a law test keeps it out                                                                          |
| No page with more than one hero                        | **Met** on every page in the sweep                                                                                                                       |
| No page over its notices                               | **Met** on app pages (one projection notice and one note). Not met on onboarding review (three) and the sandbox mortgage household (two in one)          |
| Every row re-scored, each row under 10 has a follow-up | **Met**, apart from the states in section 6                                                                                                              |

## 3. What recurs

1. **Two sources for a balance (bug).** Account rows show the last recorded month; group totals, the dashboard, savings, debt and the budget zone show the saved balance; the history chart ends on a third figure. For the home-owning household, net worth is £231,400 on the dashboard and £228,825 at the end of the history chart. It shows whenever the current month has not been recorded, which is most of every month. It is the largest single blocker, on six rows.
2. **KPI values change size inside one strip** (debt, mortgage, dashboard): dates and plain numbers render larger than values with a unit.
3. **Charts** (history, mortgage, debt, take-home, savings, pay rise): legends instead of direct labels, "Year N" axes, a clipped last tick, y-axes from £0 that flatten the line.
4. **Heading words run together** on chart titles (pension, savings, pay rise) and empty-state titles: the heading word-spacing fix does not reach them.
5. **Scenario zones over budget** (budget, mortgage rate change, take-home next £1,000, debt): more than one outcome, nested cards, saved figures repeated.
6. **Features that do not exist are still shown:** connected banks (accounts), the "Connect a bank" tab (add account), the bank step (onboarding), "transactions" and "bank connections" (delete dialog, Data tab).
7. **Calculator bodies** repeat the tool page's title and description and leave the input column empty at 1280.
8. **Selected tab shows a focus ring after a mouse click** (settings, savings, mortgage, take-home).
9. **Precision drift:** "18.2 years", "4.50%", "2.7 months" beside "7 months", a projection of £388,007.
10. **Indigo avatar** on every signed-in page.
11. **Accessibility findings that only show with data.** With the seeded household the accessibility gate records new contrast findings (2 to 4 a page on accounts, history, budget, debt, pension and take-home) and touch targets under 24px (2 a page on three pages). They are in `apps/e2e/a11y/baseline.json`; each wave-2 PR clears its own.

## 4. Round 2: PRs to reach 10

Appendices A and B hold the exact changes per row, with files and frames. The PRs below group them so that no two PRs in a wave touch the same files. Each PR follows the same rules as round 1 (shared brief, `AGENTS.md`, copy guide, `expectPageRules` tests, 375 and 1280 frames in light and dark) and re-scores its own rows against this document.

### Wave 1 (three PRs in parallel, before any page PR)

**R2-1. One balance source and the data bugs.**

- Scope: one "current balance" rule used by account rows, group totals, dashboard cards, savings, debt, the budget zone, the account detail hero and the end of the history chart (item 3.1); mortgage payment £1,250 against £1,258 on the rate-change tool; check the home-owning household's pension "Going in each month £1,258"; the dashboard bug where any widget toggle drops saved `dashboardWidgets` entries for switched-off pages; Edit account opening empty; the history hero naming the wrong month.
- Files: `packages/finance-engine/src/picture/`, `apps/web/app/containers/accounts/` (row builder only), route loaders, `apps/web/app/components/dialogs/addEditAccountsDialog/`, `apps/web/app/features/snapshot/components/SnapshotHistoryPage/` (hero figure only), `apps/web/app/features/mortgage/components/RemortgageShockSim/` (payment source only), the dashboard widget save path.
- Acceptance: for both seeded households, every page shows the same balance for the same account and one net worth; a test per bug; no layout change.
- Model: opus. Needs the `security-reviewer` only if a backend route changes.

**R2-2. Design-system round 2 (`packages/ui` and Panda configs only).**

- Scope: `KpiCard` one value size per strip and even card heights; `ChartFigure` defaults (direct labels, at most 6 ticks, last tick inside the plot, "Sep", y-axis near the data range) and a heading style for chart and `EmptyState` titles that carries the word spacing; `Tabs` focus ring on `:focus-visible` only; `HeroFigure` disc quieter in dark and its 2 forced-colours findings; `MobileBottomBar` label fit at 375 and lock alignment; `SimulatorSplitLayout` sticky input column; dark mode with JavaScript off (D30: a `prefers-color-scheme` condition in all three Panda configs); `surface.tint.apricot` in dark; give `SectionBand` sage and apricot and move `MarketingSection` onto it, or delete `SectionBand`; decide `DataList`, `Spinner`, `Toast` and `AppSectionDivider` (adopt or delete); `InfoTip` ready for "figures that explain themselves" (UX extra PR C); clear the 14 `fontSize` and 6 duration literals in `packages/ui`.
- Files: `packages/ui/src/{primitives,patterns,tokens}`, `packages/tokens`, the three `panda.config.ts`, `scripts/*baseline*`.
- Acceptance: stories in light and dark with no accessibility findings; style-literals baseline for `packages/ui` at 0; visual baselines regenerated; design system re-scored at 9.5 or more on both axes.
- Model: opus, with the `ui-compliance-reviewer`.

**R2-3. Calculator bodies and tool pages.**

- Scope: an `embedded` prop on every calculator that hides its own title and description, passed by both tool pages; the call to action under the headline result; per-tool changes in appendix B (debt defaults that give different answers and collapsed debt rows; mortgage or ISA and student loan lead with the answer; pay rise onto `ChartFigure`, each figure once; income above £100,000 table behind "Show details"; captions without figures); one top spacing and one sign-up label on web and marketing tool pages; the web tools index on the marketing grid width. Copy goes through the copy check (D15).
- Files: `packages/ui/src/calculators/`, `packages/ui/src/patterns/{MarginalRateChart,TakeHomeDeltaPanel}`, `packages/ui/src/tools`, `apps/web/app/routes/tools.*`, `apps/web/app/components/tools/`, `apps/marketing/src/pages/{ToolPage,ToolsIndexPage}/`.
- Acceptance: every tool at N1 3 or fewer and N 8 or fewer in `metrics-out.json` and `metrics-mkt.json`; no tool page repeats its title; each tool re-scored at 9.5 or more.
- Model: opus.

### Wave 2 (seven page PRs in parallel, after wave 1)

Each takes its rows from appendix A or B, the rows for its files in `docs/copy/COPY-AUDIT.md` "Final sweep" that need markup or logic, and, in its own files only, UX extra PRs A (the currency input in place of `type="number"` for money), C (`InfoTip` on figures that need explaining) and E (one save feedback pattern) from `docs/ux/UX-ASSESSMENT-2026-11.md` section 7.

| PR    | Rows                                                 | Files it owns                                                                                                          | Acceptance beyond "re-score 9.5 or more on both axes"                                                                                                                                                                                |
| ----- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R2-4  | Dashboard, sandbox, app chrome                       | `features/dashboard`, `routes/sandbox.tsx`, `features/signed-out`, `components/navigation`                             | N1 4 on dashboard and sandbox; the household switcher shows at 375 and 1280; one nav label for debt; no truncated label at 375; 768 to 1023 checked                                                                                  |
| R2-5  | Accounts, account detail, history, their dialogs     | `containers/accounts`, `components/accounts`, `components/dialogs/addEditAccountsDialog` (layout), `features/snapshot` | Rows add up to totals on screen; one header action at 375; no bank-connection surface while it is unavailable; history N 6                                                                                                           |
| R2-6  | Budget                                               | `containers/budget`, `features/budget`, `features/housing`                                                             | N1 4, N 4 plus one per category row; scenario zone with at most 3 inputs and one outcome; under 2,600px at 375; "Edit budget" opens an edit view; housing cost shown once for renters and owners, and for someone living with family |
| R2-7  | Debt, mortgage                                       | `containers/debt`, `features/debt`, `containers/mortgage`, `features/mortgage`                                         | Mortgage hero is the monthly payment, N1 4; debt-free date once outside the zone; no button-pair toggle; empty states use `EmptyState` and do not assume ownership                                                                   |
| R2-8  | Pension, savings, take-home, self assessment         | `features/pension`, `features/savings`, `features/take-home`, `containers/{takeHome,tax}`                              | Pension under 2,400px at 375 and the assumed retirement age stated; one "Unverified estimate" per page; take-home strip of 3 or none                                                                                                 |
| R2-9  | Settings, onboarding, web error and 404              | `features/settings`, `features/ai-connections`, `features/onboarding`, `routes/$.tsx`, error shell                     | One save model per tab; no bank step while it is unavailable; one notice on review; skipped steps say "Skipped"                                                                                                                      |
| R2-10 | Marketing home, pricing, security, MCP, contact, 404 | `apps/marketing/src/pages` (except tool pages), `apps/marketing/src/components`                                        | Five bands on home; one 404 design shared with web; copy through the copy check and listed for the owner (D15)                                                                                                                       |

### Wave 3 (alone)

**R2-11. Verify again.** Extend the sweep to the states in section 6, regenerate visual and accessibility baselines, re-score every row with this method, and append the result here.

## 5. Ruling D2: what a labelled estimate in a hero would change

D2 says a hero never holds an estimate, so four pages lead with a fact that is not the page's one answer. If the owner allowed a clearly labelled estimate in a hero:

- **Take-home** would lead with "Monthly take-home (estimate)" instead of "Salary before tax". The single-card KPI strip goes, the first view falls from 4 figures to 3, and the page answers its question in the hero. About +0.5 visual and +1 simplicity.
- **Self assessment** would lead with the estimated bill instead of income. About +1 simplicity for opted-in users.
- **Debt** would lead with the debt-free date and **pension** with estimated monthly income at retirement, which is what the plan names as each page's one figure. About +0.5 simplicity each.

Without that, these four pages can still reach 9.5; a 10 on simplicity for take-home and self assessment is doubtful, because the answer sits one level below the hero.

## 6. Not covered

- Debt empty state: both households have debts.
- Self assessment after opting in, the payslip and cost forms and the receipt dialog: opting in saves the profile, and the sweep never saves.
- Buy-to-let mortgage tab: needs a saved let property.
- Account detail page on its own: seen only behind the Edit account dialog.
- Onboarding with figures entered: frames show the skip path, so "one take-home figure, stable across steps" is not judged.
- Widths 768 to 1023, where the legacy mobile styles were reported to apply.
- Login and sign-up: hosted by WorkOS; `/signup` answers 500 locally, so the frame shows the error shell.
- Marketing privacy and terms: both answer 404.
- Motion, skeletons while loading, focus order and screen-reader output: not visible in still frames. The accessibility gate covers contrast, focus and reflow.
- Storybook was not re-shot: the design-system row is scored from source and from how the pages apply it.

## 7. What PR 13 itself changed

- Deleted the legacy `FLP*` layer (`apps/web/app/components/core/`, 58 files) and added a law test that keeps it out.
- Deleted components no app renders: `McpSpotlightSection`, `HousingCostCard`, `AllowanceProgressPill`, `GlobalBaselineBar`, `PersonalAllowanceTaperBanner`, `DebtToWealthChart`.
- Retitled 112 web stories and the marketing stories into the six groups ("1. Foundations" to "6. Pages").
- Seeded the visual and accessibility jobs with the home-owning household and gave the visual job a renter pass, so CI now shoots pages with data, not empty states.
- Added the design sweep (`bun run sweep:design`).

## Appendix A. Signed-in app: changes to reach 10, per row

Frames are under `after/` once the sweep has run (`renter/`, `mortgage/` for the home-owning household, `dialogs/`, `onboarding/`). R is the renting household, H the home-owning one.

### Dashboard (`features/dashboard`)

1. Move "Choose what shows here" out of the header column at 375 into an icon button in the `PageHeader` actions slot, or below the section cards ("Change what shows here" text link). Frame: `renter/home-375-light-fold.jpg`. File: `apps/web/app/features/dashboard/components/HomeDashboard/HomeDashboard.tsx`. Layout.
2. Bring N1 at 1280 to 4: drop the delta sub-line date or one KPI so first view holds hero, one delta and at most 2 KPIs, or accept 4 by counting the delta as the hero's sub-figure and removing "Months of cover" (owned by Budget; P6 allows one KPI, but N1 is still 6). Frame: `mortgage/home-1280-light-fold.jpg`. File: `HomeDashboard.tsx`. Component/data.
3. Even the KPI cards: either give every card a one-line caption or none; today two cards have an empty bottom third. Frame: `renter/home-1280-light.jpg`. File: `packages/ui/src/patterns/KpiStrip/KpiStrip.styles.ts` (align-items, min-height) and `HomeDashboard.tsx`. Layout.
4. Fix the source mismatch: section cards show £3,200 savings and £9,000 pension (R) while Accounts rows show £3,050 and £8,740; H mortgage card £186,000 vs Accounts £186,550. One selector for "current balance" across Dashboard, Accounts, Savings, Debt and Budget. Frames: `renter/home-1280-light.jpg` vs `renter/accounts-375-light.jpg`. File: `packages/finance-engine/src/picture/selectors/portfolio-totals.ts` and the dashboard loader in `apps/web/app/routes/_index.tsx`. Data bug.
5. Show the Monthly check-in row only when due and make it one line ("November balances not recorded yet" plus button). Frame: `renter/home-1280-light.jpg`. File: `apps/web/app/features/dashboard/components/MonthlyCheckInCard/`. Copy/component.
6. Use one precision for months of cover ("2.7 months" R vs "7 months" H). File: shared formatter used by `HomeDashboard.tsx` and Budget. Copy.
7. Dark 375: the hero's decorative disc covers half the block at high contrast. Lower its alpha in dark. Frame: `renter/home-375-dark-fold.jpg`. File: `packages/ui/src/patterns/HeroFigure/HeroFigure.styles.ts`. Visual.

### Accounts (`containers/accounts/accountsContainer`)

1. Make group totals equal the sum of their rows (H: rows sum to £425,205 own and £196,380 owe, totals say £427,000 and £195,600; R: rows £13,070, total £13,500). Frame: `mortgage/accounts-1280-light.jpg`. File: `apps/web/app/containers/accounts/accountsContainer/AccountsContainer.tsx` plus the totals selector. Data bug, highest priority on this page.
2. At 375 keep one primary ("Add account") in the header; move "View history" and "Update balances" into a single overflow menu or below the list. Frame: `renter/accounts-375-light.jpg`. File: `AccountsContainer.tsx`, `packages/ui/src/patterns/PageHeader/`. Layout.
3. Remove the "Connected banks" block and its "Connect a bank" primary while bank connect is unavailable (D8). Frame: `mortgage/accounts-1280-light.jpg`. File: `apps/web/app/components/accounts/BankConnectionsList/BankConnectionsList.tsx` (gate on the feature flag). Component.
4. Put the renter's student loan in its own "Not counted in net worth" group below the totals, with the explanation as its caption, so the "What you owe" rows add up. Frame: `renter/accounts-375-light.jpg`. File: `AccountsContainer.tsx`. Layout/copy.
5. Drop the repeated "Type" when it equals the name ("Current account / Current account") and the per-row "Balance" label at 375 (the group header says it once). File: `AccountsContainer.tsx` mobile row. Copy.

### Account detail and Edit account (`containers/accounts/accountDetailContainer`)

1. Prefill the Edit account dialog with the account's name, type and balance. Frame: `dialogs/edit-account-1280-light.jpg`. File: `apps/web/app/components/dialogs/addEditAccountsDialog/AddEditAccountsDialog.tsx` (initial values from the opened account) and the caller in `apps/web/app/features/accounts/components/AccountYourDetails/AccountYourDetails.tsx`. Bug.
2. Label the hero by date: "Balance at October 2026" or show the carried-forward state. File: `apps/web/app/containers/accounts/accountDetailContainer/AccountDetailContainer.tsx`. Copy/data.
3. Shoot the account detail page on its own (currently only visible behind the dialog). Evidence gap.

### Net worth history (`features/snapshot`)

1. Make the hero match its label: if November is carried forward, the hero is "Change since October: £0, November not recorded yet" with the check-in button, or label it "Change in October: +£2,575". Today "Since September 2026" uses `previous.month`. Frame: `mortgage/accounts_history-1280-light.jpg`. File: `apps/web/app/features/snapshot/components/SnapshotHistoryPage/SnapshotHistoryPage.tsx:146`. Bug/copy.
2. End the chart on the same net worth the Dashboard and Accounts show (£231,400 vs £228,825). Same selector as Dashboard item 4. Data bug.
3. Start the y-axis near the data range (or use a zero-baseline break) so the H line is not flat; label the end point directly and drop the 2-item legend (P10.2). Fix ticks: include Aug, use "Sep", keep "Nov 26" inside the plot. File: `packages/ui/src/patterns/ChartFigure/` and the history chart in `SnapshotHistoryPage.tsx`. Chart.
4. Put "Change by account" and "Change by month" behind one `Tabs` or a quiet drawer; at 375 they make the page 2,609px of triple-labelled cards. Frame: `renter/accounts_history-375-light.jpg`. File: `SnapshotHistoryPage.tsx`. Layout.
5. Header: one primary ("Update balances"); "Add earlier months" as a text link. File: same. Component.

### Budget (`features/budget`, `containers/budget`)

1. Cut the "Model a change to your budget" zone to P1.7: one tool, at most 3 inputs ("Lump sum", "Spending you would cut", "Income you would keep" as one toggle), one outcome (months of cover) and 2 supporting figures. Move per-entry toggles behind "More options". Frame: `renter/budget-1280-light.jpg`. File: `apps/web/app/features/budget/components/RunwayCalculator/`. Component.
2. Remove the teal tint from the toggle rows (use the zone surface plus a hairline); P9.4 forbids tint inside a `ScenarioZone`. File: `RunwayCalculator/*.styles.ts`. Visual.
3. Take "Income" out of the category list (it is not spending, and its 100% bar dwarfs the rest) or show bars as share of income only for spending rows. File: `apps/web/app/features/budget/components/BudgetCategoryList/`. Layout/data.
4. Remove repeated figures: "Money in £2,085" is also the Income row and the scenario's "Salary after tax"; R "Rent £950" appears in "Your details", Housing row and the zone. Keep one each in the default view (P6). File: `apps/web/app/containers/budget/` and `HousingDetailsCard/`. Simplicity.
5. Reconcile the zone's numbers: "2.7 months" vs "2 of 24 months" in the same block; "Current account £1,300 / Easy access £3,200" vs Accounts £1,280 / £3,050; "Credit card payment £60" listed as an essential bill and "Minimum debt payments not in your budget £60" both shown. File: `RunwayCalculator/`. Data bug.
6. Drop the "Each month" caption under every KPI (the label can say "a month"). File: budget KPI strip in `apps/web/app/containers/budget/`. Copy.
7. Target 375 height under about 2,600px once items 1 and 4 land (now 4,673 R, 4,737 H). Layout.

### Debt with debts (`features/debt`)

1. Wrap the page in `PageBody` so gutters match (24px now vs 56px elsewhere). Frame: `mortgage/debt-1280-light.jpg`. File: the debt container in `apps/web/app/containers/debt/`. Layout.
2. Use `numeric.kpi` for every KPI value: "December 2029" renders much larger than "£305" in the same strip. File: `apps/web/app/features/debt/components/DebtSummary/DebtSummary.tsx` and `packages/ui/src/primitives/KpiCard/KpiCard.styles.ts`. Component (recurs on Mortgage).
3. One figure per debt row; move "7.9% APR, £265 a month minimum" to the row detail or edit dialog (P1.4). File: `apps/web/app/features/debt/components/DebtAccountsList/`. Simplicity.
4. Stop repeating the debt-free date: KPI, zone "Debt-free date", chart label and summary line. In the zone, show only the change ("Debt-free 8 months sooner"). File: `PayExtraTool/PayExtraTool.tsx`. Simplicity.
5. Chart: move the "Debt remaining" label off the line end; keep the last x label inside the plot ("Dec 2029", not "Dec 202"); "Sep" not "Sept". File: `packages/ui/src/patterns/ChartFigure/` axis formatter. Chart.
6. Use the same balances as Accounts (£8,400/£1,200 here vs £8,610/£1,220). Data bug (shared selector).
7. Replace inline trash icons per row with delete inside the edit dialog (error prevention, Fitts). File: `DebtAccountsList/`. Component.

### Debt empty

Not shot. Shoot `/app/debt` for a persona with no debts before scoring.

### Mortgage, complete (`containers/mortgage/MortgageContainer.tsx`)

1. Make the hero "Monthly payment £1,250" with sub-line "Paid off by Jan 2045" (section 5), and the strip 3 cards: balance, rate with fix end, loan to value. This also brings N1 from 6 to 4. Frame: `mortgage/mortgage-1280-light.jpg`. File: `apps/web/app/containers/mortgage/MortgageContainer.tsx`. Layout.
2. One payment figure: KPI £1,250 vs Rate change "Current payment (estimate) £1,258". Frame: `mortgage/mortgage--rate-change-1280-dark.jpg`. File: `apps/web/app/features/mortgage/components/RemortgageShockSim/RemortgageShockSim.tsx`. Data bug.
3. "Years left 18.2 years" to "18 years 2 months" (P8); rate "4.50%" to "4.5%" as entered. File: `apps/web/app/features/mortgage/components/MortgageSummary/MortgageSummary.tsx`. Copy.
4. Chart: x-axis as calendar years ("2030") with at most 6 ticks; direct labels, drop "(solid)/(dashed)" legend; when the overpayment is £0 draw one line, not two identical ones. File: mortgage payoff chart under `apps/web/app/features/mortgage/components/`. Chart.
5. Rate change: one outcome ("+£70 a month from Jul 2028") with at most 2 supporting figures; move the LTV band block behind "More options". File: `RemortgageShockSim.tsx`. Simplicity.
6. Overpay or save: do not depend on the Overpay tab; give it its own overpayment input. Frame: `mortgage/mortgage--overpay-or-save-375-light.jpg`. File: overpay-or-save tool under `features/mortgage/components/`. Component (H6 recognition over recall).
7. Restore the notice text to `PROJECTION_NOTICE_TEXT` only; move the ERC sentence into the Overpay tool body. File: `MortgageContainer.tsx` zone footer. Copy (P4.1).
8. 375: the KPI grid becomes 2x2 with "Jan 2045" wrapping at a larger size than £1,250. Same fix as Debt item 2. Frame: `mortgage/mortgage-375-light-fold.jpg`.

### Mortgage, renter empty

1. Use `EmptyState` with the illustration, full width, button spaced from the heading (P12.2). Frame: `renter/mortgage-1280-light.jpg`. File: `apps/web/app/containers/mortgage/MortgageContainer.tsx` empty branch. Component.
2. Copy that does not assume ownership: "If you have a mortgage, add it to see your payment and payoff date." Button "Add a mortgage". Copy (owner rule on renting).

### Pension (`features/pension`)

1. Fix the chart heading letter-spacing (words run together). Frame: `renter/pension-1280-light.jpg`, `mortgage/pension-375-dark.jpg`. File: `apps/web/app/features/pension/components/ForecastChart/ForecastChart.tsx` title (use `heading.sm` textStyle without the negative tracking) or the shared title recipe in `packages/ui/src/patterns/ChartFigure/ChartFigure.styles.ts`. Visual bug.
2. Show the pot balance on the "Workplace pension" row and keep one edit affordance (today: "Edit details" button, pencil and trash). File: `apps/web/app/features/pension/components/PensionDetails/`. Component.
3. Round long projections: "About £388,000" and "£97,000" (P8 spirit; precision implies certainty). File: pension scenario outcome component. Copy.
4. Add a quiet hint on the retirement-age KPI or zone when it is the default ("Using your State Pension age. Change it below."). File: `apps/web/app/features/pension/components/PensionSummary/PensionSummary.tsx`. Copy.
5. Verify H "Going in each month £1,258": it equals the mortgage's £1,258 and looks high for £58,000 at 8% plus employer. Data check.
6. Trim 60px at 375 (2,457 to 2,400): the "Change in monthly income: No change" line is empty information at defaults; hide it until an input moves. Layout.

### Savings (`features/savings`)

1. Use the same account balances as Accounts. Frame: `mortgage/savings-1280-light.jpg` vs `mortgage/accounts-1280-light.jpg`. Data bug (shared selector).
2. Fix chart heading tracking (same as Pension item 1).
3. Make "Time to a target" use `SliderField` like "How it could grow", or both use inputs; and give the empty-target state a default (for example, the next round thousand). Frame: `renter/savings--time-to-a-target-375-light.jpg`. File: time-to-target tool under `apps/web/app/features/savings/components/`. Component.
4. Lighten the sage area fill and start the y-axis near the data so the line, not the fill, reads. File: savings forecast chart. Chart.

### Take-home (`features/take-home`, `containers/takeHome`)

1. Replace the single full-width "Monthly take-home" card with a 3-card strip or fold it into the hero's sub-line; a strip of one wastes the row. Frame: `renter/take-home-1280-light.jpg`. File: `apps/web/app/containers/takeHome/`. Layout.
2. Add the take-home row to the "Where your pay goes" table and drop the one-item legend; use neutral tones plus teal for take-home (P9.3), not green, orange, purple and pink. File: take-home breakdown component in `apps/web/app/features/take-home/components/`. Chart/visual.
3. Next £1,000 tab: one outcome (£580), at most 2 supporting figures, no nested cards, one "Unverified estimate" on the page, and remove the second "The next £1,000 of pay" card that restates £580, £400 and £20. Frame: `mortgage/take-home--the-next-1-000-375-light.jpg`. File: next-£1,000 tool in `apps/web/app/features/take-home/components/`. Simplicity.
4. Step chart: direct-label "Your pay", drop the 3-item legend, fewer threshold markers. File: `packages/ui/src/patterns/MarginalRateChart/`. Chart.
5. "Income Tax" to "Income tax" consistently (also in onboarding). Copy.

### Self assessment

1. Judged only the opt-in screen. Put the empty state on the canvas or a card, not a sunken slab, and soften the illustration's orange disc in dark. Frames: `renter/self-assessment-1280-light.jpg`, `renter/self-assessment-375-dark.jpg`. File: `packages/ui/src/patterns/EmptyState/` and the tax route container under `apps/web/app/containers/tax/`. Visual.
2. Shoot the opted-in page (H with SA turned on) before scoring the real page.

### Settings (`features/settings`, `features/ai-connections`)

1. Use the standard `PageBody` width or justify the narrow column once in `PageBody` as a "form" variant (now 896px vs 1168px). Frame: `renter/profile-1280-light.jpg`. Layout.
2. One save model per tab: either everything saves on change with a toast, or the toggle joins "Save changes". Today the Save button sits between a form and a section that "is saved straight away". Frame: `renter/profile-375-light.jpg`. File: settings Profile tab under `apps/web/app/features/settings/`. Interaction (H4).
3. Security tab: remove "baseline" ("sample/baseline data", banned P7.1), "Official MCP SDK v1.0", and collapse the six sunken fact boxes into a short list; make the "Run it yourself / Active tokens (0)" tabs fit at 375. Frame: `renter/profile--security-375-light.jpg`. File: `apps/web/app/features/ai-connections/components/McpConnectionCard/McpConnectionCard.tsx`. Copy/layout.
4. Last name placeholder "Last name" reads as a value; leave it empty. Copy.
5. Data tab: "transactions" and "connected banks" are listed as deleted though neither exists for these users; list what exists. File: settings Data tab. Copy.
6. Tabs: the selected tab shows a focus ring after mouse click (Security, Data) instead of the white pill; use `:focus-visible`. File: `packages/ui/src/primitives/SegmentedTabs/SegmentedTabs.styles.ts`. Component (recurs).

### Onboarding (`features/onboarding`)

1. Re-shoot with data entered so the live take-home summary and its stability across steps can be judged (all frames show "Not set").
2. Merge or drop the Bank step while bank connect is unavailable; a whole step that says "No bank connected" is excise. Frame: `onboarding/onboarding-4-bank-connection-1280-light.jpg`. File: `apps/web/app/features/onboarding/components/OnboardingFlow/OnboardingFlow.tsx`. Simplicity.
3. Review: one notice, not a warning box plus a session note plus the projection notice; mark skipped steps "Skipped", not "Complete". Frame: `onboarding/onboarding-5-review-what-will-be-saved-375-light.jpg`. File: `OnboardingFlow.tsx` and `packages/ui/src/primitives/Stepper/Stepper.tsx`. Copy/component.
4. Housing step: show the follow-up field for the chosen option (not visible in shots). Evidence gap.

### Dialogs and sheets

1. Edit account: prefill (see Account detail item 1). Bug.
2. Budget "Edit budget" opens the first-run wizard ("Set up your budget", Step 1 of 8) for a user who already has a budget; open an edit view instead. Frame: `dialogs/budget-wizard-1280-light.jpg`. File: `apps/web/app/features/budget/components/BudgetSetupWizard/BudgetSetupWizard.tsx`. Bug/copy.
3. Add a debt: replace the native `<select>` (renders grey in dark) with `@repo/ui` `Select`; unify optional marking ("Interest rate (APR) (optional)" vs the "Required" tag); keep Cancel inside the sheet at 375. Frame: `dialogs/add-debt-375-dark.jpg`. File: `apps/web/app/features/debt/components/AddDebtDialog/AddDebtDialog.tsx`. Component.
4. Choose what shows here: say the rule once, show which 4 of the 6 checked sections will appear (order or a counter), and remove "AER", "salary sacrifice" and "0% deal" from descriptions. Frame: `dialogs/dashboard-widgets-375-light.jpg`. File: `apps/web/app/features/dashboard/components/WidgetVisibilityPanel/WidgetVisibilityPanel.tsx`. Copy/interaction.
5. Monthly check-in: say "Not updated since October 2026" once in the header, not on every row. Frame: `dialogs/check-in-1280-dark.jpg`. File: `apps/web/app/features/snapshot/snapshotCopy.ts` and the sheet. Copy.
6. Add account: hide the "Connect a bank" tab while unavailable. Frame: `dialogs/add-account-375-light.jpg`. Component.
7. Add budget category: "Health & Fitness" to "Health and fitness". File: `apps/web/app/features/budget/components/AddCategoryModal/AddCategoryModal.tsx`. Copy.
8. Delete account and Add savings account: no change needed beyond removing "transactions" and "bank connections" from the delete list when absent.

### App chrome

1. Bottom bar: shorten the label to "Tax" or "Pay" so it never truncates at 375. Frame: any 375 frame. File: `apps/web/app/components/navigation/navConfig.ts:162`. Copy.
2. One nav label for the debt area for everyone ("Borrowing" for H, "Debt" for R today). File: `navConfig.ts` / `buildNavManifest.tsx`. Copy (H4).
3. More drawer: remove uppercase eyebrows (P7.3), do not repeat the four bar items, and give Settings, Connect AI and Calculators the same row style as the rest. Frame: `dialogs/mobile-nav-more-375-light.jpg`. File: `apps/web/app/components/navigation/NavMenu/NavMenu.styles.ts:14` and `packages/ui/src/patterns/NavDrawer/`. Visual/copy.
4. Avatar: replace the indigo gradient with a semantic token (P9 colour). File: `apps/web/app/components/navigation/UserAvatar.tsx`. Visual.
5. Confirm the page has bottom padding equal to the bar height at 375 (full-page captures show the bar over content; may be a capture artefact). File: `packages/ui/src/patterns/AppShell/AppShell.styles.ts`. Layout check.

## Appendix B. Signed-out, marketing and design system: changes to reach 10, per row

Frames are under `after/out/` and `after/mkt/`.

### Sandbox

1. **Persona tabs are invisible in every frame (bug).** `SandboxBar` renders `<Tabs aria-label="Sample household">` with three personas, but nothing shows at 1280 and an empty band about 60px tall shows at 375 between the title and "Sign up". Likely cause: `personaTabs` (`minWidth: 0, maxWidth: 100%`) inside the wrapping flex `barGroup` lets the tab scroller shrink to zero width. Give the tabs `flex: 1 1 auto` and a minimum width, or put them on their own row. Files: `apps/web/app/features/signed-out/components/SandboxBar/SandboxBar.styles.ts` (`personaTabs`, `barGroup`), `SandboxBar.tsx`. Frames: `out/sandbox-1280-light` (bar at y 146), `out/sandbox-375-light-fold` (gap at y 130 to 180). Add a test that the three persona tabs are visible. Bug.
2. **Three sign-up buttons.** Header "Sign up", bar "Sign up", page-end "Sign up". Plan says one in the bar and one at the end. Hide the header "Sign up" on `/sandbox` (keep "Sign in"). File: the signed-out header in `apps/web/app/features/signed-out/` (the `SignedOutPage` top bar). Frame: `out/sandbox-1280-light`. Layout.
3. **N1 over budget** (5, 6 for the mortgage persona, against 4). The fourth figure is the section-card row entering the fold. Reduce the gap between the h1 row and the hero (about 56px of empty space at 1280, y 250 to 305) only if it does not pull cards up; otherwise drop "Months of cover" from the strip for the sandbox (it is the budget page's figure, P6). File: `apps/web/app/routes/sandbox.tsx`. Frame: `out/sandbox--high-1280-light-fold`. Layout.
4. **"Self Assessment" in title case** on the mortgage persona's card (P7.3). Change to "Self assessment". File: the section-card label source used by the dashboard cards (`apps/web/app/features/snapshot/` card config). Frame: `out/sandbox--high-1280-dark` (card at y 913). Copy.
5. **One notice holding two disclaimers** on the mortgage persona: "Unverified estimate..." and "Guidance, not advice..." run as one 2-line paragraph. Keep it, but put the badge beside the tax figure and shorten to one sentence each (P4.3). File: `apps/web/app/routes/sandbox.tsx` footer notice. Frame: `out/sandbox--high-1280-dark` (y 1130). Copy.
6. **Orphan third card** for the debt persona leaves a hole at 1280. Let the last card span both columns when the count is odd. File: the dashboard section-card grid styles in `apps/web/app/features/snapshot/components/`. Frame: `out/sandbox--debt-1280-light` (y 908 to 1124). Layout.
7. **Bottom bar at 375:** lock icons sit under four labels but not under "More", so the labels do not share a baseline. Put the lock inline after the label or reserve the slot. File: `packages/ui/src/patterns/MobileBottomBar/MobileBottomBar.styles.ts`. Frame: `out/sandbox-375-light-fold` (y 750 to 800). Component.

### Web `/tools` index

1. **Grid narrower than marketing** (976px against 1120px) and the h1 sits about 25px lower; the two indexes should look the same. Use the same container width as `ToolsIndexPage`. File: `apps/web/app/routes/tools._index.tsx` / `SignedOutPage`. Frames: `out/tools-1280-light` against `mkt/tools-1280-light`. Layout.
2. **Forced breaks in card titles** ("Mortgage overpayment / or Stocks and Shares ISA", "Pension contributions and / income above £100,000") at 1280 and awkward two-line titles at 375 ("Debt payoff / methods compared"). Remove `text-wrap: balance` or the max-width on the card title. File: the web tools card component in `apps/web/app/components/tools/`. Frames: `out/tools-1280-light` (y 614, 1137), `out/tools-375-light`. Component.
3. **Figures in descriptions** (£1,000, 20%, £100,000, £125,140) give N 5 against 0. Drop the numbers: "Estimate how much of a pay rise you keep after tax", "Estimate how a pension contribution changes your take-home pay above £100,000" (one figure kept in the title is enough). File: the shared catalogue in `@repo/ui/tools` (`packages/ui/src/` tools data). Frame: `out/tools-1280-light`. Copy.
4. **Web footer lists 4 of 8 calculators** plus "All calculators", while marketing lists none. Pick one rule for both footers. File: `packages/ui/src/patterns/SiteFooter/` or the web footer config. Frame: `out/tools-1280-light` (y 1407). Copy.

### Web tool pages and marketing tool pages (same calculators, one list)

Shared, all eight tools:

1. **Calculator body repeats the page header (confirmed).** `tools.$slug.tsx` renders `PageHeader` with the tool title and description, then each calculator renders its own `h2` title and description inside the card (for example `OVERDRAFT_COPY.title` "Arranged overdraft cost calculator" under h1 "Overdraft interest cost calculator", with the same description word for word). Add a `showHeader={false}` (or `embedded`) prop to every calculator and pass it from both tool pages; keep the header in the dashboard and story uses. Files: `packages/ui/src/calculators/*/[Name].tsx` (title block around `overdraftTitle()` and equivalents), `apps/web/app/routes/tools.$slug.tsx`, `apps/marketing/src/pages/ToolPage/ToolPage.tsx`. Frames: every `out/tools_*-1280-light` and `mkt/tools_*-1280-light` (y 370 to 460). Component.
2. **Empty left column at 1280 (confirmed).** Inputs end after 2 or 3 sliders and the result column runs on for 300 to 900px, leaving the CTA stranded at the bottom-left. Make the input column `position: sticky` (as `SimulatorSplitLayout` prescribes) and move the CTA under the headline result, or after the notice in the right column. Files: `packages/ui/src/patterns/SimulatorSplitLayout/SimulatorSplitLayout.styles.ts` and each calculator's CTA placement. Frames: `out/tools_uk-pay-rise-take-home-calculator-1280-light` (y 580 to 1500 empty), `out/tools_uk-100k-tax-trap-calculator-1280-light` (y 760 to 1360). Layout.
3. **Captions that restate or add figures** (P1.5, P1.6): "Pays off the £3,600 balance in 18 months...", "Assumes a minimum of 2% of today's balance (at least £25)", "Includes £99,388 of growth at the 7% a year you entered", "£6,400 tax before the credit, minus a £1,600 credit", "9% of pay above £29,385 a year", "Estimate: repayments of £775 a year do not pay off the £45,000 balance". Rewrite each caption without figures or move the working into "How this is worked out". Files: the copy objects at the top of each calculator in `packages/ui/src/calculators/`. Frames: the 1280 light tool frames. Copy.
4. **Web CTA wording.** Web calculators say "Continue to sign up" and the web header says "Sign up", but sign-up is invite-only (contact page) and marketing says "Request an invite". Use the marketing label on web too, or route web tools to the invite request. Files: `DEBT_SNOWBALL_DEFAULT_CTA` and the other `*_DEFAULT_CTA` constants in `packages/ui/src/calculators/`, `apps/web/app/routes/tools.$slug.tsx`. Frame: `out/tools_overdraft-cost-and-payoff-calculator-1280-light` (y 898) against `mkt/tools_overdraft-cost-and-payoff-calculator-1280-light` (y 797). Copy.
5. **Top spacing differs** between web (h1 at y 225) and marketing (h1 at y 152) for the same page. Use one `PageBody` top value. Files: `apps/web/app/features/signed-out/` `SignedOutPage` styles, `apps/marketing/src/pages/ToolPage/ToolPage.styles.ts`. Layout.

Per tool:

- **Debt payoff methods** (`packages/ui/src/calculators/DebtSnowballCalculator/DebtSnowballCalculator.tsx`)
  1. Default debts (credit card £3,500 at 24.9%, loan £5,000 at 8.5%, line 125 to 126) are both highest-rate-first and smallest-first in the same order, so both methods show £1,900 and the same date: the tool's one question is answered "no difference" on arrival. Pick defaults where the orders differ (for example a small low-rate debt and a large high-rate one). Frame: `out/tools_uk-debt-snowball-vs-avalanche-calculator-1280-light` (y 700). Copy (data).
  2. Eight inputs visible against 3 (P1.7). Collapse each debt row to one line (name, balance) with rate and minimum behind "Edit", or show the first debt open and the rest collapsed. Frame: same, y 484 to 975. Component.
  3. At 375 the answer appears about 1,300px down (fold N1 0). Put the result block above the debt list on narrow screens. Frame: `out/tools_uk-debt-snowball-vs-avalanche-calculator-375-light`. Layout.
  4. "Minimum payment a month" wraps to two lines and leaves the right half of each debt card empty; nested card inside card inside card. Put minimum payment beside balance and remove the inner card border. Frame: 1280 light, y 625 to 710. Layout.
- **0% balance transfer** (`ZeroPercentCliffCalculator`)
  1. Fold N1 9 against 3: two supporting cards each carry two figures in label and caption ("at 24.9% APR", "2% ... £25"). Remove figures from labels and captions. Frame: `out/tools_0-percent-balance-transfer-payoff-calculator-1280-light-fold`. Copy.
- **Overdraft** (`OverdraftCostCalculator`)
  1. Remove the body title and description (shared item 1); that alone makes this tool close to 10. Then make "Estimated interest a month" a caption under the headline instead of a second card. Frame: `out/tools_overdraft-cost-and-payoff-calculator-1280-light`. Component.
- **Mortgage or ISA** (`MortgageVsIsaCalculator`)
  1. Headline is "Extra money set aside over 20 years £84,000", which is the input times the term, not the answer. Make the headline the comparison ("Overpaying saves £36,349; the ISA might grow by £99,388"), or lead with the larger of the two and show the difference. Frame: `out/tools_mortgage-overpayment-vs-isa-calculator-1280-light` (y 436 to 563). Layout.
  2. "Paid off about 5.3 years sooner" breaks P8: write "5 years 4 months sooner". Copy.
- **Student loan** (`StudentLoanCalculator`)
  1. The question is "paid off or written off first", but the headline is "£65 a month" and the answer sits in a small card. Make "Written off after 30 years" (or "Paid off in Mar 2041") the headline and demote the monthly figure. Frame: `out/tools_uk-student-loan-overpay-or-invest-calculator-1280-light` (y 460 to 830). Layout.
  2. "Written off after 30 years" is set in the KPI number style and wraps with a very tall line gap; "£775 a year" card is two-thirds empty. Use a text style for word answers and equal-height content. Frame: same, y 650 to 710; `mkt/tools_uk-student-loan-overpay-or-invest-calculator-1280-dark-fold`. Component.
- **Pay rise** (`MarginalRateExplorer`, `MarginalRateChart`, `TakeHomeDeltaPanel`)
  1. £720, £200 and £80 each appear three times: KPI card, the sentence "Of the next £1,000 of pay, an estimated £720 is take-home: £200 Income Tax and £80 National Insurance", and the table (P6 within a page). Keep the KPI and the table; drop the sentence. Frame: `out/tools_uk-pay-rise-take-home-calculator-1280-light` (y 1097 to 1310). Copy.
  2. Chart summary has four figures (P10.1 at most 2) and the chart title is repeated as the axis label and the legend entry. Cut the summary to "At your pay, an estimated 28% of the next £1,000 is deducted", drop the axis label line. Frame: same, y 548 to 620. Copy.
  3. Legend for two series plus thresholds; P10.2 wants direct labels. Move the chart onto `ChartFigure` with `directLabels` (it is the only signed-out chart not on `ChartFigure`). File: `packages/ui/src/patterns/MarginalRateChart/MarginalRateChart.tsx`. Frame: same, y 925 to 955. Component.
  4. The chart title reads with run-together words ("deductedfromthe") at 1280 and 375. The heading word-spacing fix in `packages/tokens/src/typography.ts` (`HEADING_WORD_SPACING`) is not reaching this title; give it a heading textStyle that carries `wordSpacing`, or apply it. Frames: same y 548; `out/tools_uk-pay-rise-take-home-calculator-375-dark` (y 990). Bug.
  5. "Model a pension contribution" is a second full button beside "More options"; put it inside "More options". No calculator CTA on either app; add the same CTA the other tools have. Frame: same, y 532 to 575. Component.
  6. N 19 against 8: after 1 and 2 the table and three KPIs remain, about 9. Hide the "Estimated take-home a year" card (it answers a different question). Copy.
- **Section 24** (`Section24Calculator`)
  1. "Unverified estimate" badge but the notice under the result is only "Guidance, not advice"; P4.3 wants the full sentence in the page's single notice. Frame: `out/tools_section-24-landlord-tax-calculator-1280-light` (y 360 and y 972). Copy.
  2. Caption figures (£6,400, £1,600, £267, £16,000) give N 12 against 8. Copy.
- **Income above £100,000** (`TaxTrapCalculator`)
  1. N 28: the before/after table adds 8 figures and the prose adds 6 more. Keep three KPIs and move the table into a "Show details" `CollapsibleDrawer` (quiet). Frame: `out/tools_uk-100k-tax-trap-calculator-1280-light` (y 716 to 922). Layout.
  2. Headline "Estimated change in take-home pay -£3,800" frames a £10,000 pension contribution as a loss. Lead with "£10,000 reaches your pension for £3,800 less take-home". Frame: same, y 488 to 578. Copy.
  3. Four paragraphs (taper rule, childcare support, how it is worked out) between results and the notice; move childcare and taper text into the guide drawer and keep one factual line (P7.5). Frame: same, y 945 to 1265. Copy.

### Error, 404, login/signup shell

1. **Two 404 designs.** Web: card, illustration, "Not found" badge, h1, "Error 404", "Go to Flump". Marketing: centred "Page not found", text link. Pick one (the web card is better) and use it in both. Files: `apps/marketing/src/pages/NotFoundPage/`, web `apps/web/app/routes/$.tsx`. Frames: `out/nope-404-375-dark`, `mkt/nope-404-375-light`. Component.
2. **Web 404 says "not found" three times** (badge, h1, "Error 404"). Drop the badge. Frame: `out/nope-404-1280-light` (y 298 to 402). Copy.
3. **Error page offers three actions** ("Try again", "Go to Flump", "Report this problem"); P12.3 says one way back. Keep "Try again" as primary and "Report this problem" as a link; drop "Go to Flump" (the header has Home). Frame: `out/signup-1280-light`. Copy.
4. **EmptyState titles** read with tight word gaps at 600 weight ("We cannot find that page"), same cause as the pay-rise chart title. File: `packages/ui/src/patterns/EmptyState/EmptyState.styles.ts` (`heading.sm`/`heading.md` slots). Frame: `out/nope-404-1280-light` (y 336). Bug.
5. **`/signup` returns 500 in the capture environment** (WorkOS not configured; `/login` has a dev-session branch, `/signup` has none). Not a production bug, but the sweep cannot show the sign-up shell. Add the same `isDevSessionEnabled` short-circuit (or a stub page) so the design sweep can capture it. File: `apps/web/app/routes/signup._index.tsx`. Frame: `out/signup-1280-light`. Bug (test environment).

### Marketing home

1. **Six bands against five** (hero, "What you can see", pay-rise teaser, security strip, FAQ, final CTA). Fold the final CTA into the FAQ band or the security strip into "What you can see". File: `apps/marketing/src/pages/HomePage/HomePage.tsx`. Frame: `mkt/home-1280-light`. Layout.
2. **"Request an invite" three times** (header, hero, end; plan says hero and end). Hide the header button while the hero CTA is on screen, or accept 3 and record it. File: `apps/marketing/src/components/Header/`. Frame: `mkt/home-1280-light-fold`. Layout.
3. **Apricot band in dark** reads as a heavy brown slab (`surface.tint.apricot` dark). Lower its chroma or use `surface.subtle` in dark. File: `packages/ui/src/tokens/index.ts` (dark `surface.tint.apricot`) or `apps/marketing/src/components/MarketingSection/MarketingSection.styles.ts`. Frame: `mkt/home-1280-dark` (y 830 to 1360). Component.
4. **"Example" three times in the preview** (title "Example monthly picture", badge "Example", caption "Example figures for one household"). Keep the badge and the caption, title "Monthly picture". File: `apps/marketing/src/components/MonthlyPictureSection/` or `BaselineSnapshotPreview/`. Frame: `mkt/home-1280-light` (y 236 to 414). Copy.
5. **Teaser carries two footnotes** ("Uses the 2026 to 2027 tax year..." and the notice). Move the first into the notice. File: `apps/marketing/src/components/PayRiseTeaser/`. Frame: `mkt/home-1280-light` (y 1053 to 1085). Copy.

### Marketing `/tools`

1. Drop figures from card descriptions (shared catalogue, as web item 3). Frame: `mkt/tools-1280-light`. Copy.
2. At 375 the eight cards make a 3,124px page; consider a two-line card (title and link, description hidden below `sm`). File: `apps/marketing/src/pages/ToolsIndexPage/`. Frame: `mkt/tools-375-light`. Layout.

### Marketing pricing

1. Two primary buttons (header and card). Make the header button secondary on this page or accept it. Frame: `mkt/pricing-1280-light`. Layout.
2. "Nothing is charged during the beta" (intro), "Free during the beta" (card), "nothing is charged" (paid card). Say it once in the card; intro: "One plan today." File: `apps/marketing/src/pages/PricingPage/`. Copy. (Score capped at 9 by D10 until a price exists.)

### Marketing security

1. The placeholder-address parenthesis is still body copy; plan wants one line with the address as a link. File: `apps/marketing/src/pages/SecurityPage/` or `DisclosurePolicySection/`. Frame: `mkt/security-1280-light` (y 568 to 592). Copy.
2. Five bullets, four starting "Please"; cut to three ("Describe what you found and how to reproduce it", "Give us time to respond before sharing it", "Do not access other people's data or degrade the service"). Copy.

### Marketing MCP

1. Lead paragraph: "Flump MCP (short for Model Context Protocol)... Claude Desktop or Cursor" is developer language for a household reader; move the acronym and client names into "Show technical details". Step 3 "runs from source code, with no installer" also belongs there. File: `apps/marketing/src/pages/McpPage/`. Frame: `mkt/mcp-1280-light` (y 236 to 300, y 747). Copy.
2. Nav says "AI connection", footer "AI connection (MCP)", h1 "Ask an AI assistant about your figures": align the nav and footer labels. Copy.

### Marketing contact

1. General card is one four-sentence block mixing invite, questions, placeholder status and a privacy warning. Split into a one-line address and one short note. File: `apps/marketing/src/pages/ContactPage/`. Frame: `mkt/contact-1280-light` (y 283 to 405). Copy.
2. Security card holds only one link; make it a line under the general card rather than a card. Layout.
3. Intro "Flump is free during the beta" is off-topic; "Email us. We read every message." Copy.

### Design system

PR 13 has since closed part of item 1 (four of the nine exports are deleted) and item 3 (marketing stories are retitled). The rest is in R2-2 and R2-3.

1. **Delete or adopt the nine unrendered exports** (see section 3). Component.
2. **`SectionBand` vs `MarketingSection`.** `SectionBand` has canvas, subtle, tinted (`primary.subtle`) and contrast tones, no sage or apricot, and no app uses it; marketing built `MarketingSection` with sage and apricot. Give `SectionBand` the sage and apricot tones and make `MarketingSection` use it, or delete `SectionBand`. Its story copy "Master Your Financial Timeline" is title case, and its styles hold the only `fontWeight` literal in the baseline. Files: `packages/ui/src/patterns/SectionBand/`, `apps/marketing/src/components/MarketingSection/`. Component.
3. **Seventh Storybook group.** The composed web Storybook loads `apps/marketing/src/**/*.stories.tsx`, whose 18 files use "Marketing/...". Retitle them into "3. Patterns" / "6. Pages". Files: `apps/marketing/src/components/*/*.stories.tsx`, `apps/marketing/src/pages/*/*.stories.tsx`. Component.
4. **D30, JavaScript-off dark mode.** None of `apps/web/panda.config.ts`, `apps/marketing/panda.config.ts`, `packages/ui/panda.config.ts` (line 23: `dark: ".dark &, [data-theme='dark'] &"`) or the preset has a `prefers-color-scheme` condition; dark depends on `packages/ui/src/hooks/themeScript.ts`. Add `@media (prefers-color-scheme: dark)` scoped to `:root:not([data-theme=light])`. Bug (known gap).
5. **Pay-rise chart off `ChartFigure`** (`MarginalRateChart`), so it has a legend, no `directLabels` and an extra axis label. Component.
6. **Remaining toggle outside `Tabs`:** `apps/web/app/features/debt/components/PayoffStrategyControls/PayoffStrategyControls.tsx` lines 77 to 90 is a two-button `aria-pressed` pair (P5.1 bans button-pair toggles). Use `Tabs` or `RadioCardGroup`. Component.
7. **Style literals:** clear the 39 `fontSize`, 20 duration, 4 inline `style=` and 1 `fontWeight` entries (section 3). Component.
8. **Skeleton:** `PageSkeleton` is mounted once in `apps/web/app/root.tsx:136` for pending navigations, so P12.1 is met globally, but no route has a shaped skeleton and the `Skeleton` primitive is rendered by no app file directly. Acceptable; a 10 would add per-template skeletons (simulator, list). Component.

## Appendix C. Design-system counts

- **Style-literals baseline** (`scripts/style-literals-baseline.json`; `bun scripts/check-style-literals.ts` passes): `fontSize` 39 in 16 files (25 in `apps/web`, 14 in `packages/ui`); `fontWeight` 1 (`packages/ui/src/patterns/SectionBand/SectionBand.styles.ts`); duration literals 20 in 12 files (14 web, 6 ui); inline `style=` 4 in 3 files (`AccountDetailChart.tsx` 1, `UserAvatar.tsx` 2, `root.tsx` 1). Total 64.
- **Tabs:** one `Tabs` component (`packages/ui/src/primitives/Tabs/Tabs.tsx`; `SegmentedTabs` is an alias at line 252, still imported by name in `McpConnectionCard.tsx`). No `FLPTabs`, no other `role="tablist"`. One button-pair toggle left (`PayoffStrategyControls`). 10 app files import `Tabs`.
- **ChartFigure:** used by 7 app charts (net worth history, savings forecast, pension forecast, debt pay-extra, mortgage overpayment simulator, overpay vs save, account detail). `directLabels` used by 2 (`NetWorthHistoryChart`, `PayExtraTool`); `annotation` used by 3 (`NetWorthHistoryChart`, `ForecastChart`, `PayExtraTool`). Not used by `MarginalRateChart` (pay rise).
- **Skeleton / PageSkeleton:** `PageSkeleton` rendered in 1 app file (`apps/web/app/root.tsx`, route-pending fallback). `Skeleton` primitive rendered by 0 app files directly (used inside `KpiCard` and `PageTemplates`). `PageBody` used in 13 app files.
- **`packages/ui` exports rendered by no app and no other component** (9): `DataList`, `Spinner`, `Toast`, `AllowanceProgressPill`, `AppSectionDivider`, `DebtToWealthChart`, `GlobalBaselineBar`, `PersonalAllowanceTaperBanner`, `SectionBand`. Rendered only inside other `packages/ui` parts, not by apps directly (fine): `FlumpLogo` (HomeLogo), `InfoTip` and `Popover` (Tooltip), `Skeleton`, `MarginalRateChart` and `TakeHomeDeltaPanel` (calculators), `SideNav` (AppShell). `CoachCard` only in the `DirectionCSignoff` foundations page. Named suspects: `AllowanceProgressPill`, `GlobalBaselineBar`, `PersonalAllowanceTaperBanner`, `DebtToWealthChart` all have zero importers.
- **Panda dark condition for JS-off (D30):** absent in all three configs and the preset. Open.
- **Story group titles:** `packages/ui` and `apps/web` use exactly the six groups (counts: 1. Foundations 8, 2. Primitives 38, 3. Patterns 115, 4. Charts 8, 5. Calculators 16, 6. Pages 13). The composed Storybook also loads 18 marketing stories titled "Marketing/...", so seven groups appear.
- **`SectionBand` tones:** canvas, subtle, tinted (`primary.subtle`), contrast. No sage, no apricot. `MarketingSection` has canvas, subtle, sage, apricot.

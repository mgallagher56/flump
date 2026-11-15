# E16 polish: re-sweep and re-score after rounds 2 and 3 (R2-11)

2026-11-15, on `main` at `eb816fac`, after PRs #697 to #728. This follows [RESCORE.md](./RESCORE.md), the round-1 re-score.

**Short version.** The pages are now inside their number budgets, the pages agree on balances and net worth, and the flows work end to end with no console errors. Scores have levelled off at about 8 on both axes: two scorers who wrote none of the code put almost every row between 7.5 and 8.5, and neither confirms the 9s the page sessions reported. More scoring rounds will not move this. What is left is a short list of real defects (one of them a wrong calculation), about ten small house rules that scorers keep pulling in different directions, and a set of owner decisions.

## 1. Method

- **Sweep.** `bun run sweep:design` for both seeded households (a renting user and a home-owning user), at 375 and 1280, light and dark, full page and first view: 574 frames. Metrics are in [`after-r3/`](./after-r3/); frames are not committed (41 MB), see the README there.
- **Flows in a real browser**, 240 frames: new-user setup with figures, the monthly check-in (short path with "No change to the rest", and the full path), editing a budget in place, modelling a change on debt and mortgage, net worth choices in Settings, and the states the last sweep missed (debt empty, Self Assessment after opting in, buy-to-let, account detail, 320, 768 and 1024 widths, the check-in by keyboard only).
- **Scoring.** Two scorers, A and B, each scored every row alone, from the same frames, against PLAN.md principles P1 to P13, `docs/ux/UX-GUIDELINES.md` and `docs/ux/STYLE-GUIDE.md`. Neither saw the other's scores, the earlier re-score or the page sessions' hand-overs. Each kept defects, rule breaches and taste apart. Scores are out of 10 in halves; 10 means "I would change nothing".
- **First view.** Counted under the new rule: a figure counts only if its whole card is in the viewport.

## 2. Scores

Visual / simplicity. "Round 1" is RESCORE.md (one scorer). A and B are this round's two scorers. Their scores are shown side by side, not averaged.

| Page                       | Round 1    | Now, scorer A | Now, scorer B | First view / page figures (target) |
| -------------------------- | ---------- | ------------- | ------------- | ---------------------------------- |
| Dashboard                  | 8 / 7.5    | 8.5 / 8.5     | 8 / 8         | 4 / 7 (4 / 10)                     |
| Accounts                   | 7.5 / 7    | 8 / 7.5       | 7.5 / 7.5     | 5 to 6 / 7 to 11 (3 / 3 plus rows) |
| Account detail             | 7 / 7      | 8 / 8.5       | 8 / 8.5       | not counted                        |
| Net worth history          | 7 / 6      | 8 / 8.5       | 8 / 8.5       | 1 / 1, tables not counted (2 / 6)  |
| Budget, and edit in place  | 7 / 5.5    | 7.5 / 7.5     | 7.5 / 7       | 4 / 6 (4 / 4 plus rows)            |
| Debt (with debts)          | 7.5 / 7    | 7.5 / 7.5     | 8 / 7.5       | 2 / 3 (4 / 10)                     |
| Debt (empty)               | not shot   | 9 / 9.5       | 9 / 9.5       | 0 / 0                              |
| Mortgage (complete)        | 7 / 6      | 7 / 7.5       | 7 / 7         | 4 / 6 to 10 (4 / 9)                |
| Mortgage (no mortgage)     | 6.5 / 8.5  | 8.5 / 9.5     | 8.5 / 9.5     | 0 / 0                              |
| Mortgage (buy-to-let)      | not shot   | 6.5 / 6       | 6 / 5.5       | not counted                        |
| Pension                    | 8 / 8      | 8 / 8         | 7.5 / 7.5     | 3 / 4 (4 / 12)                     |
| Savings                    | 8 / 8      | 8 / 8         | 7.5 / 8       | 3 to 4 / 5 to 6 (3 / 10)           |
| Take-home                  | 7.5 / 7    | 8.5 / 8.5     | 7.5 / 8       | 4 / 5 to 6 (4 / 9)                 |
| Self Assessment (opt-in)   | 8 / 9      | 8 / 9         | 8.5 / 9       | 0 / 0                              |
| Self Assessment (opted in) | not shot   | 8 / 8         | 8 / 8         | not counted                        |
| Settings                   | 7 / 7      | 8.5 / 8.5     | 7.5 / 8       | 0 / 0                              |
| Onboarding (new user)      | 8 / 7.5    | 8.5 / 8       | 8.5 / 8.5     | within target                      |
| Monthly check-in           | in dialogs | 8 / 8         | 8 / 7.5       |                                    |
| Other dialogs and sheets   | 7 / 7      | 7.5 / 8       | 7.5 / 8       |                                    |
| App chrome                 | 7 / 7      | 8 / 8         | 8 / 8         |                                    |
| Sandbox                    | 8 / 8.5    | 8 / 8         | 7.5 / 7.5     | 3 / 4 to 7 (4 / 10)                |
| Web tools index            | 8.5 / 9    | 8.5 / 9       | 8 / 9         | within target                      |
| Web tool pages             | 7.5 / 7    | 8 / 8         | 7.5 / 7.5     | 2 to 4 / 2 to 4 (3 / 8)            |
| Error and 404              | 8.5 / 9    | 8 / 9         | 7.5 / 9       | 0 / 0                              |
| Marketing home             | 8.5 / 8.5  | 8 / 7.5       | 8 / 7.5       | 3 / 6 (3 / 6)                      |
| Marketing tools index      | 9 / 9      | 8.5 / 9       | 8 / 9         | within target                      |
| Marketing tool pages       | 7.5 / 7    | 8 / 8         | 7.5 / 7.5     | as web                             |
| Pricing                    | 9 / 9      | 8.5 / 9       | 8.5 / 9       |                                    |
| Security                   | 8.5 / 8.5  | 8.5 / 9       | 8.5 / 9       |                                    |
| MCP                        | 9 / 9      | 8 / 8.5       | 8 / 8.5       |                                    |
| Contact                    | 8.5 / 8.5  | 8 / 8.5       | 8 / 9         |                                    |
| Design system              | 8 / 7.5    | 7.5 / 7.5     | 8 / 7.5       |                                    |

### How to read this

- **Where the scorers disagree by a point:** take-home visual (8.5 against 7.5) and settings visual (8.5 against 7.5). On take-home, B marks down the phone KPI strip (one wide card over two half cards) and the uneven captions; A accepts both. On settings, B marks down the dark selected tab, which is close to its container, and the narrow column; A accepts both. Every other row is within half a point.
- **Half a point is noise.** Three different scorers across two rounds give the same page scores half a point apart with no change to the page. Marketing rows read half a point lower than in round 1 for this reason, and because both scorers this time marked down the placeholder addresses and company number, which are owner items.
- **Real movement since round 1** (a point or more, both scorers): history, account detail, budget simplicity, mortgage with no mortgage, settings, chrome, and tool pages. The rows that did not move are mortgage (complete), pension, savings and the design system.
- **The page sessions' own scores were higher** (R2-5 round 3: accounts 9 / 9, history 9 / 9, account detail 9 / 9.5; R2-8 round 3: pension and savings 8.5 / 8.5). Neither scorer here reaches those.
- **Number budgets are met** on every app page except accounts (5 to 6 in the first view against 3, because the hero, its totals and the first rows all fit).

## 3. Defects

These are things that are wrong, not matters of taste. Appendix C holds the counts, the figures compared across pages and the flow notes behind them.

### Broken

1. **A debt payment entered as a budget bill is counted twice.** A row such as "Car loan payment £265" under Bills counts once as an essential bill and again inside the debts' minimum payments. Pressing "Move to debts" changes nothing the user spends, yet safe to spend goes from £39 to £101 a week and months of cover from 7 to 7.7. Source: `packages/finance-engine/src/picture/selectors/commitments.ts:39-49`, mirrored in `apps/web/app/features/budget/components/RunwayCalculator/RunwayCalculator.tsx:134-136, 184-188`.

**The reported "inconsistent months of cover" on Budget is this defect.** Months of cover now appears in one place only, the Budget scenario zone, and the scenario figure matches the saved one. It moves without reason only through the double count. The precision also differs between households ("7 months" beside "2.7 months") because a trailing ".0" is dropped (`BudgetWidget.tsx:23-28`).

### Inconsistent between pages

2. Setup creates a debt account named "Cards and loans baseline", so every new user sees "baseline" on Accounts (`apps/web/app/services/onboarding-seed.ts:73`).
3. Two take-home figures: Budget "Money in each month" is the typed budget row (£3,450, £2,085); Take-home shows £3,451 and £2,087. Nothing links them.
4. With a let property, the dashboard mortgage card adds both mortgages (£336,000) under "From your mortgage account"; the mortgage page splits them.
5. A newly added account counts as growth: after adding the let property the dashboard says "Up £72,575 since October".
6. Account detail says "No change on October 2026" for a home up £500 and a mortgage down £550, because the change is a whole percentage. History and the check-in give pounds.
7. The buy-to-let tab leads with the balance where the residential tab leads with the payment, and shows pence ("+£450.00"), "6.00%" and "68.2%".
8. The buy-to-let tab reads the profile; net worth and accounts read account rows matched by name. Nothing reconciles the two.
9. A signed-in user on a web tool page sees "Request an invite", "Sign up" and "Sign in".
10. Settings says Self Assessment "Adds a tax page to your menu and dashboard"; no dashboard card appears.
11. Two spending totals: the dashboard card says "Spending each month £1,810" (without savings), Budget says "Going out each month £1,960" (with savings).
12. Four wordings for the same change: "since October" (dashboard), "Change in October 2026" (history), "Up £2,800 on October 2026" (check-in), "Up 6% on October 2026" (account detail).

Found by the scorers, same kind:

- The mortgage chart uses the debt colour (apricot) where the account detail chart and the dashboard card use teal (`OverpaymentSimulator.tsx:103-152`); the accounts list tile for a mortgage is apricot too.
- "Update balances" is a filled primary on history and an outline button on the dashboard and accounts.
- Three link styles within one block on accounts.
- The nav says "Borrowing" and "Pay"; the pages say "Your debts" and "Take-home pay". Three names for the AI connection.
- A KPI strip of three stacks into one tall column at 375 on mortgage and pension, and into one wide card over two halves on take-home (`KpiStrip.styles.ts`).
- Dialogs at 375: some are centred and inset, others are bottom sheets. A "Saved" toast sits over the add-category sheet.
- "Choose what shows here" shows six ticked items with two marked "Not showing".
- Onboarding step names differ between the stepper, the card title and the review.

### Minor

13. Hyphens widen where tabular figures are applied to words ("interest - only", "take - home").
14. "Health & Fitness" in the add-category suggestions (`AddCategoryModal.tsx:24`).
15. On Self Assessment the "Add income" menu also holds "Cost"; a separate "Add a cost" button appears after the first record.
16. At 320 the savings tab label is cut off ("Time to a targe…").
17. On the check-in summary, keyboard focus reaches "Change a balance" before "Done", which is drawn first.
18. Budget and the sandbox carry two notes plus the projection notice.
19. Tooling: `applyPersona` re-seeds every time, because the proxy does not serve `GET /user-profile`, so each run spends a reset.
20. Tooling: three sweep selectors are out of date (add account, add category, the onboarding set).
21. The buy-to-let overpay tool asks for "balance, interest rate and years left" when only years left is missing.

### What works

No console errors or failed requests in any flow. After a check-in every page shows the same net worth and balances. Edit account opens filled in. Scenario inputs save nothing (checked by reloading). Net worth choices apply to the dashboard, accounts and history at once and survive a reload. The check-in can be done by keyboard alone with a visible focus ring throughout, and focus returns to "Update balances" on close. Nothing scrolls sideways at 320, 375, 768 or 1024. In setup the take-home figure changes once, with a line that says why.

## 4. House rules for the owner to settle

Scorers and page sessions have been marking the same small things in opposite directions. Each needs one rule, written into `docs/ux/STYLE-GUIDE.md`. Both scorers gave a position on each; where they agree, that is the recommendation.

| #   | Question                                                    | Scorer A                                     | Scorer B                                        | Recommendation                                                                                          |
| --- | ----------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1   | Captions on KPI cards                                       | Only when it adds a fact; then all or none   | Every card, one line, no figure                 | **They disagree.** Recommend: all cards in a strip or none, never a mix; a caption never holds a figure |
| 2   | Balance on a pot or account row when the hero has the total | Show with two or more rows; hide for one     | Same                                            | Show with two or more rows; hide when a single row equals the hero                                      |
| 3   | A KPI strip of two cards                                    | Fine                                         | Fine, as equal halves; no strip for one         | Two is fine; never pad to three; no strip for a single card                                             |
| 4   | Focus ring on a tab after a mouse click                     | No                                           | No                                              | Ring on keyboard focus only                                                                             |
| 5   | Link styles                                                 | In-sentence underlined; standalone not       | Same, standalone at weight 600                  | Two styles, one per job, both teal, on app and marketing                                                |
| 6   | Phone drawer repeating the bottom bar items                 | No                                           | No                                              | Drawer holds only what the bar does not                                                                 |
| 7   | "Debt" or "Borrowing"                                       | Debt                                         | Debt; group "Debt and mortgage"                 | "Debt" everywhere                                                                                       |
| 8   | Dates in tables, axes and figures                           | "Nov 2026"; full month in sentences          | Same                                            | "Nov 2026" as data; "15 November 2026" in a sentence                                                    |
| 9   | Rounding projections                                        | Yes, more than a year ahead                  | Yes; differences that answer the question exact | "About £388,000" (three significant figures) for anything more than a year ahead                        |
| 10  | Illustration on empty states                                | Whole-page empty states only                 | Same; the scene must match the subject          | Whole-page empty states only, with a scene for the subject                                              |
| 11  | Marking required fields                                     | Mark only "(optional)"                       | Same                                            | Mark only "(optional)"                                                                                  |
| 12  | "Estimate" in the label and as a badge                      | Noted as a defect on pension                 | Badge only                                      | The badge only                                                                                          |
| 13  | Edit control                                                | Pencil with "Edit" on rows; outline on cards | Not stated                                      | One per place: pencil with "Edit" on a row, outline "Edit" on a details card                            |
| 14  | "More options", "Show data", "Guide" triggers               | One style                                    | One style: small teal text with a chevron       | One style                                                                                               |
| 15  | Invite wording while sign-up is invite-only                 | "Request an invite"                          | Same, at every width                            | "Request an invite" everywhere, signed out                                                              |
| 16  | Hero width at 1280                                          | A deliberate token, full or half             | Reads unfinished at half width                  | Owner's eye needed: half width with nothing beside it, or full width                                    |
| 17  | Weight of "Update balances"                                 | Noted as inconsistent                        | Outline, except where it is the page's only job | Outline everywhere; primary only on history, and write that down                                        |
| 18  | Net worth as the hero on Accounts                           | P6 and P13 pull both ways                    | P6 allows it only as the list total             | Rules conflict: P13 wants a hero on every page, P6 wants each figure owned by one page. Owner to pick   |

## 5. Round 4

### An agent can fix (no decision needed)

| Group                   | Items                                                                                                                                                                                                                                                 | Files                                                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| R4-1 Engine and figures | Defect 1 (double count); defect 6 (pounds, not a whole percentage); defect 5 (a new account is not growth); defect 11 (one spending total); defect 12 (one wording for a change); months-of-cover precision                                           | `packages/finance-engine/src/picture/selectors`, `RunwayCalculator`, `AccountDetailContainer`, dashboard hero and card |
| R4-2 Buy-to-let         | Defects 4, 7, 8 and 21: same hero as residential, whole pounds, one source of truth with accounts, the dashboard card split, a prompt that names only what is missing                                                                                 | `containers/mortgage`, `features/mortgage`, `features/dashboard/components/MortgageWidget`                             |
| R4-3 Shared components  | KPI strip on phones; dialog presentation at 375 and toast above a sheet; dark selected tab; hyphens (defect 13); chart colour by domain and chart titles; hero-to-strip spacing set once in `PageBody`; whichever house rules in section 4 are agreed | `packages/ui/src/{primitives,patterns}`                                                                                |
| R4-4 Page tidy-up       | Defects 9, 10, 14, 15, 16, 17; widgets dialog state; onboarding step names; drawer icons matching dashboard tiles; pension and savings row balances per rule 2; "Estimate" once per rule 12                                                           | page containers and features, one PR per parallel-safe group as in round 2                                             |
| R4-5 Tooling            | Defects 19 and 20; add the flow walk-through to the sweep so it does not need a throwaway script                                                                                                                                                      | `apps/e2e/support/personas.ts`, `apps/e2e/sweep/`                                                                      |

R4-1 and R4-2 touch figures: each fix needs a test that fails first. R4-3 should wait for the owner's answers in section 4, or it will be done twice.

### Only the owner can settle

1. The 18 house rules in section 4 (1, 16 and 18 are real choices; the rest have an agreed recommendation to confirm).
2. **Ruling D2** (no estimate in a hero). It still caps take-home and Self Assessment at about 8.5 for simplicity, because the answer sits below the hero.
3. **Budget income against take-home** (defect 3): should Budget's "Money in" follow the take-home estimate, or stay a typed figure with a line saying it differs?
4. **"Cards and loans baseline"** (defect 2): the name for new users can change at once; renaming existing users' accounts needs a migration and the owner's word.
5. **Placeholders on public pages:** `support@example.invalid`, `security@example.invalid` ("Not monitored yet"), company number 00000000, "Registered office address to be confirmed". Privacy and terms pages answer 404.
6. **Two notes on Budget and the sandbox** (the guidance note and the MoneyHelper line are fixed wording): accept two, or merge.
7. **Four rulings recorded on 14 November with terms to confirm** (`docs/audit/plans/DECISIONS.md` round 10): the owner-only bank path, the net worth defaults, "No change to the rest", and the calculated-balance rule.
8. **Pension:** whether a workplace pot's own monthly contribution adds to the salary percentages (left open by the net worth PR).
9. **Self Assessment on the dashboard:** add a card, or change the Settings sentence (defect 10)?

## 6. What the owner's pending choices would change

The owner is about to choose accent colours, more illustrations and micro-animations, and is considering replacing the sandbox with real components on the marketing site. Do not start these findings until those choices are made:

- **Accent colours:** chart colour by domain (the mortgage chart in apricot), tile tones on the accounts list, the link colour in house rule 5, the dark selected tab, the apricot band on the marketing home page in dark.
- **Illustrations:** house rule 10; the one scene reused for the debt, mortgage and Self Assessment empty states; the left-aligned 404 with a small illustration; the two 404 designs.
- **Micro-animations:** nothing in this report depends on motion, which still frames cannot judge. A cue for a skipped row in the check-in and the toast-over-sheet fix should be designed with them.
- **Removing the sandbox:** every Sandbox finding goes (household tabs wrapping at 375, a strip that differs from the real dashboard, two notices), and so does "Months of cover" in the marketing home preview, which the real dashboard no longer shows. The sandbox row should not be worked on in round 4.

## 7. Not covered

Login and sign-up (hosted by WorkOS; `/signup` answers 500 locally). The Self Assessment receipt upload and payslip form. Screen-reader output, motion and loading skeletons. Dark mode at 768 and 1024. Storybook. An onboarding run for a home-owning new user. The design-system row is scored from source and from the pages, not from Storybook.

## Appendix A. Scorer A: notes per row

D is a defect, R a rule breach, T taste. Frame names are under `after-r3/`.

### Dashboard

- D: Section card date "December 2029" (`mortgage/home-1280-light`) while savings uses "Nov 2027" and P8 says "Mar 2030". Source: dashboard debt card formatter, likely `apps/web/app/features/dashboard/...` using a long month format.
- D: Nav item "Borrowing" (`renter/home-1280-dark`, no chevron for the renter) leads to h1 "Your debts", card "Debt", "Open debt". Source: `navConfig.ts` group label used as a link label when the group has one child.
- R: KpiStrip outer edges do not line up with the hero, which stops at half width (`mortgage/home-1280-light`), STYLE-GUIDE KpiStrip anatomy. Source: `packages/ui/src/patterns/HeroFigure/HeroFigure.styles.ts` (fixed max width).
- T: 2-card strip feels thin beside the half-width hero. T: teal underline under the logo at 375 duplicates the bottom-bar Home state.

### Accounts

- R: Net worth shown in `surface.hero` on accounts as well as the dashboard (`mortgage/accounts-1280-light`); P6 and H5 allow it here "once, as the list total". Source: `apps/web/app/routes/app.accounts*` HeroFigure use. (P13 asks every page for a HeroFigure, so the rules pull both ways; small cost.)
- D: Three link treatments in one cluster: grey underlined "Change what counts", bold teal no underline "See how it has changed", teal underlined "See your ISA allowance" (`mortgage/accounts-1280-light`). Source: mixed `Button variant="link"` and raw anchors in the accounts route and `AccountsGroupList.tsx`.
- D: "Update balances" is outline on accounts and dashboard, filled primary on history (`mortgage/accounts_history-1280-light`).
- D: Row subtitles: "Current account" has no type line, others do.
- T: Two header buttons at 1280; at 375 the h1 squeezes beside "Add account".

### Account detail

- D: Mortgage balance line is teal here (`flows/f-account-detail/02-...-1280-light`) and apricot on the mortgage page. Source: `MonthLinePlot.tsx` vs `OverpaymentSimulator.tsx`.
- R: Hero £186,000 printed again as the chart end label (P6 "within a page a figure appears once"; history has an explicit exception, account detail does not).
- T: "Last updated October 2026" in the hero while the chart says this month's balance is saved.

### Net worth history

- R: Chart has a summary but no title stating the takeaway (C1) (`mortgage/accounts_history-1280-light`). Source: history route `ChartFigure` props.
- R: "This month is not recorded yet" in the hero sub-line and again in the chart summary (P1.6).
- T: x-axis "May ... Nov" with no year; fine for six months.

### Budget and edit in place

- R: Two standing notices: projection note in the zone and a filled MoneyHelper box (`renter/budget-1280-light`, metrics note 2). P4 one notice per surface, note style has no fill. Source: budget route MoneyHelper signpost component (fill on `surface.subtle`).
- D: "Saved" toast sits over the add-category sheet and its chips (`flows/c-budget-edit/04-add-category-dialog-375-light`), A3/R5. Source: `Toast` z-index vs `Sheet`.
- R: Chip "Health & Fitness" (ampersand, title case, copy guide) and "Required" beside the category name (F1). Source: `AddCategoryModal`.
- R: Scenario inputs show "£ 0" rather than empty (S7). Source: budget `ScenarioZone` inputs.
- R: Homeowner budget lists "Mortgage payment £1,250" while the mortgage page owns housing cost for owners (P6). Source: budget housing row.
- T: Hero sub-line adds a second figure ("£60 a week"); category icons are bare, accounts uses tiles; "Essential" label repeated on every edit row.

### Debt with debts

- R: Order tabs shown for a single debt (`renter/debt-375-light`) and with the line "Both orders give the same result" (P5.2 hide when one option). Source: `PayExtraTool.tsx`.
- R: Chart has no title or summary; "Move the slider to see what changes" stands in (C1).
- D: Hero to KPI strip gap about 16px on debt and mortgage, about 32px on dashboard and budget (`mortgage/debt-1280-light` vs `renter/budget-1280-light`). Source: `DebtContainer.styles.ts` and mortgage container setting their own stack gap instead of `PageBody`.
- D: "Update your details" in the zone footer is bold body text with no link or button affordance (also on mortgage). Source: `ScenarioZone` footer slot usage.
- T: Empty left column under the slider at 1280; three trailing items after the zone (compare link, calculators disclosure, MoneyHelper).

### Debt empty

- T: Same credit-card scene as mortgage and self assessment; light frame loses the ground shadow visible in dark.
- T: MoneyHelper box below the EmptyState (fixed signpost, fine by T9).

### Mortgage complete

- R: Balance chart uses `chartColor("debt")` (apricot); mortgage is teal (P9.3, STYLE-GUIDE 2.4). Source: `apps/web/app/features/mortgage/components/OverpaymentSimulator/OverpaymentSimulator.tsx:103-152`.
- R: Three KPI cards stack in one column at 375 (`mortgage/mortgage-375-light-fold`), R3. Source: `packages/ui/src/patterns/KpiStrip/KpiStrip.styles.ts` (`columns: 3` base is one column).
- R: Order is hero, strip, zone, then "Your details" (H14 wants details before the zone).
- D: No captions on any card here, captions on dashboard, budget, debt cards.
- T: Big empty left column under the overpayment text; dates "Jul 2028" in hero but "15 November 2026" in the saved line.

### Mortgage with no mortgage

- D: Uses the credit-card illustration (`renter/mortgage-1280-light`). Source: `Illustration` scene choice in the mortgage empty state; STYLE-GUIDE lists four scenes, none is a home.

### Mortgage buy-to-let

- R: "+£450.00" pence and "6.00%" two decimals (P8) (`flows/f-buy-to-let/02-...-1280-light`). Source: buy-to-let properties summary formatter.
- R: A second row of three KPI-style cards nested in a card, making six KPI cards and about seven figures in the first view (P1.1, P1.5).
- D: Overpay tool says "Add your balance, interest rate and years left" while balance and rate are on screen; only years left is missing (P3.2 name what is missing). Source: `OverpaymentSimulator.tsx` empty prompt.
- D: Three edit controls: "Edit your details" text, "Update your details" text, "Edit" button.
- T: Hero switches from monthly payment (residential) to balance (buy-to-let); explained by the estimate ruling.

### Pension

- R: "About £405,000" outcome and "Reaches about £405,000" in the chart summary (P1.6) (`mortgage/pension-1280-light`). Source: `ForecastChart.tsx` summary.
- R: Chart title "Pot each year" does not state the takeaway (C1). C5 range band absent (owner decision pending, not marked down).
- D: "Estimated income at retirement" plus an "Estimate" badge on the same card.
- R: Three KPI cards stack at 375 (R3). Source: `KpiStrip.styles.ts`.
- D: "Add pension pot" has a plus icon; "Add a debt" and "Add account" (accounts) do not.

### Savings

- D: Account rows show balances (H) but the pension pot row does not, and the renter's single savings row does not (`renter/savings--time-to-a-target-375-dark`). Source: savings and pension list components.
- R: KPI caption "since 6 April" carries a date (P1.5).
- D: "Reached by Nov 2027" vs "December 2029" on debt and dashboard.
- T: "4%" for one account, "4.1%" average for two.

### Take-home

- R: Nav label "Pay", h1 "Take-home pay", settings link "Tax and take-home pay" (N1, N4). Source: `navConfig.ts`.
- D: KpiStrip at 375 is one wide card plus two half cards, unlike the one-column stack on mortgage and pension (`mortgage/take-home--the-next-1-000-375-light`).
- R: "£580" outcome repeated in the summary sentence (P1.6).
- T: One of three cards has a caption.

### Self assessment opt-in screen

- D: Empty state on `surface.card` with a border, while debt and mortgage use the sunken tray (`renter/self-assessment-1280-light`). Source: self-assessment route `EmptyState` wrapper.
- T: Credit-card illustration for tax.

### Self assessment opted in

- R: "Estimated bill" caption runs to two lines (P1.5) (`flows/f-self-assessment/06-after-cost-1280-light`).
- R: P4.3 wants a neutral "Unverified estimate" badge beside the headline; the badge says "Estimate" and sits on a KPI card.
- T: Income source row shows "2 records" and no figure, which is fine but makes the list read as navigation.

### Settings

- D: Selected tab thumb in dark is close to the container fill (`mortgage/profile--data-1280-dark`); only weight separates it. Source: `packages/ui/src/primitives/Tabs` dark selected token.
- T: Download your data on Data, summary export on Security; button heights differ (Change password vs Create token); card heights unequal in the profile grid.
- D: Names have no visible save state; net worth card says "saved straight away". Could not confirm behaviour.

### Onboarding

- R: "Required" markers on salary and tax country (F1) (`flows/a-new-user/02-step1-filled-1280-light`). Source: `FormField` required hint.
- D: Stepper labels "Housing", "Savings" vs review sections "Housing and spending", "Savings and debt"; card title "You and income" vs step "Income".
- R: Review shows about ten figures vs target 6 (PLAN onboarding row); salary chips add three figures to step 1.
- Good: take-home change explained ("Now includes your 5% pension and student loan"), O3 met; "Save and exit" present.

### Monthly check-in

- R: At 1280 each row has a filled "Update" button in a disabled look (metrics: 8 primary buttons) (`flows/b-check-in-short/03-two-updated-1280-light`); H13, and a disabled state with no reason (STYLE-GUIDE 12.1). Source: check-in sheet row component.
- T: Opening from the dashboard lands on the history page behind the sheet.
- Good: summary states the change since last month and the new net worth.

### Other dialogs and sheets

- D: "Choose what shows here": all six ticked, two marked "Not showing" (`dialogs/dashboard-widgets-375-light`). Source: dashboard widgets dialog.
- D: At 375 the widgets and delete dialogs are inset, rounded on all corners and centred; add category is a full-width bottom sheet (STYLE-GUIDE 12.3). Source: `Dialog.styles.ts` phone variant vs `Sheet.styles.ts`.
- R: Add debt marks "Required" and "(optional)" both (F1) (`dialogs/add-debt-1280-light`).
- D: Drawer icons differ from dashboard tiles (Debt trending arrow vs card, Pension coins vs briefcase, Mortgage building vs house) (`dialogs/mobile-nav-more-375-light`). Source: `navConfig.ts` icons vs dashboard section config.
- Good: delete account names consequences, Cancel safe, danger only on confirm.

### App chrome

- R: N1 label drift: Borrowing / Debt / Your debts; Pay / Take-home pay; Connect AI (drawer) / AI connections (settings) / AI connection (marketing). Source: `navConfig.ts`, settings and marketing header config.
- D: At 768 the top bar drops "Home" and relies on the logo underline (`flows/f-widths-homeowner/01-dashboard-768-light`).
- T: Logo underline at 375 duplicates the bottom-bar Home state. Bottom bar phone-only and drawer not repeating bar items are right.

### Sandbox

- D: Household tabs wrap to two rows inside the sample bar at 375 (`out/sandbox-375-light-fold`). Source: `SandboxBar` using `Tabs` without overflow handling.
- R: Lock icons with no words on cards and bottom-bar items (A2, Iconography: icon alone only for listed actions).
- D: Strip shows "Pension pots" where the real dashboard shows "What you owe" (O1 same components).
- T: Two "Sign up" CTAs.

### Web tools index

- D: Footer "Company number 00000000. Registered office address to be confirmed." (`out/tools-1280-light`). Source: `SiteFooter` config.
- R: Signed-out web footer has no Security or Contact link (N8). Source: web `SiteFooter` links.
- T: Content column narrower than the header gutter.

### Web tool pages

- Debt payoff methods: R H11, two totals £1,864 and £2,131 with no difference stated; R T1, highest rate first leads the headline; result below the first view at 375 (R2) (`out/tools_uk-debt-snowball-vs-avalanche-calculator-*`).
- 0% balance transfer: 4 / 4, within budget (metrics only).
- Overdraft cost: 2 / 2 (metrics only).
- Mortgage overpayment or ISA: result outside the 375 first view (metrics fold 0).
- Student loan: 2 / 2 (metrics only).
- Pay rise: D title says pay rise, result is "from the next £1,000"; "More options" is an outlined box, the app uses a text disclosure (`out/tools_uk-pay-rise-take-home-calculator-1280-light`).
- Section 24: 3 / 3 (metrics only).
- £100,000: 3 / 3 (metrics only); P7.5 not checked visually.
- Row: D "Request an invite" in tools vs "Sign up" in the web header; result cards nested inside the tool card.

### Error and 404

- D: Web 404 card left-aligned with small illustration, unlike centred empty states; web 404 has no footer, tool pages do (`out/nope-404-1280-light`).
- Not marked: `/signup` 500 is a local WorkOS setting.

### Marketing home

- R: Three filled CTAs (H13), six sections vs five (PLAN marketing row) (`mkt/home-1280-light`).
- D: "support@example.invalid" and placeholder company number in footer. Source: marketing `SiteFooter` config.
- D: Preview KPI "Months of cover" is not on the real dashboard strip (CROSS-PLATFORM parity).

### Marketing tools index and tool pages

- Same footer placeholders; two filled buttons per tool page (header plus in-tool); H11 issue on the debt tool repeats.

### Pricing

- T: Two filled "Request an invite" in one view. Paid plan row as ruled.

### Security

- D: "security@example.invalid. Not monitored yet." (`mkt/security-1280-dark`); trust page states its own reporting route is unmonitored (T10 spirit).

### MCP

- D: Question cards are styled like clickable cards (shadow, radius) but do nothing (`mkt/mcp-1280-light`).
- D: "Create an access token in your profile"; the app calls it Settings, Security, "Create token".
- T: "Show technical details" bold large trigger vs app's small teal disclosure.

### Contact

- D: Placeholder email; header "Request invite" at 375 vs "Request an invite".
- D: In-sentence links are `text.primary` underlined on marketing, teal underlined in the app (`mkt/contact-375-light` vs `renter/budget-1280-light`).

### Design system

- R: `KpiStrip` `columns: 3` stacks one per row at phone width (`KpiStrip.styles.ts`), against R3; take-home builds its own 1 plus 2 layout, so pages disagree.
- D: Hero to strip spacing differs by page (debt and mortgage containers vs `PageBody` gap).
- D: Chart colour misuse (mortgage apricot) and chart title and summary coverage uneven across `ChartFigure` users.
- D: Three link treatments, two "More options" treatments, three edit treatments (pencil icon, pencil plus "Edit", outline "Edit", bold text "Edit your details").
- D: One illustration scene for debt, mortgage and self assessment empties; EmptyState surface varies (sunken, card, left-aligned 404).
- D: Hyphens render with extra space in labels ("Debt‑free", "fixed‑rate", "Interest‑only") on several frames, likely tabular numeral features applied to label text. Source: `KpiCard` label and helper text styles (`fontVariantNumeric` on non-figure text); not confirmed.
- Unused exports in apps: `CoachCard` (only in a foundations sign-off story), `SideNav` (only inside `AppShell`), `Popover` (only inside `InfoTip`), `PageSkeleton` (templates only; E2 ruling removed page skeletons, so the export should go).
- Baselines are small: style literals 25 entries in 13 files, design tokens 2, react icons 0, input types 1, judgement 29, copy 14. Good.
- Dark parity is strong overall; dark tab thumb is the weak spot.

## Appendix B. Scorer B: notes per row

### Dashboard

- D: hero sub-line "↑ £2,575 since October" (mortgage/home-1280-light) while history says "Change in October 2026, against September" for the same £2,575 (mortgage/accounts_history-1280-light). Same figure, two meanings. Source: dashboard hero delta label, `apps/web/app/features/dashboard`.
- R: P6. The "What you owe £9,600" KPI and the Debt card's "Debt-free date December 2029" put both debt-owned figures on the dashboard; P6 allows one of the two (mortgage/home-1280-light). Source: dashboard KPI and section card config, `apps/web/app/features/dashboard`.
- R: N1. Top bar says "Borrowing", the card and page say "Debt" / "Your debts" (renter/home-1280-light). Source: `navConfig.ts`.
- T: hero is 536px wide on a 1168px page with nothing to its right (all app pages at 1280). The strip below spans the full width, so the hero reads as unfinished. STYLE-GUIDE says the strip edges line up with the hero; arguably that implies a full-width hero.
- T: the renter's "Not counting your student loan. Change what counts" sits between hero and strip, which pushes the strip down 53px; fine, but it could be the hero sub-line.

### Accounts

- R: P6 and H5. Net worth is the hero on accounts as well as the dashboard (mortgage/accounts-1280-light). P6 allows it here only as the list total. Source: `apps/web/app/containers/accounts/accountsContainer/AccountsContainer.tsx`.
- D: three link styles in one 400px band: "Change what counts" (dark, underlined), "See how it has changed" (teal, bold, no underline), "See your ISA allowance" (teal, underlined) (mortgage/accounts-1280-light). Source: same container.
- D: the residential mortgage tile is apricot on accounts but teal on the dashboard Mortgage card; P9.3 makes mortgage teal (mortgage/accounts-1280-light vs mortgage/home-1280-light). Source: account-type to tile tone map in the accounts list.
- T: at 375 "Update balances" becomes a full-width outline button squeezed between the hero links and the list (mortgage/accounts-375-light).

### Account detail

- R: C1. The chart has a summary but no title (flows/f-account-detail/02-detail-residential-mortgage-1280-light). Source: `apps/web/app/components/accounts/AccountDetails/AccountDetails.tsx`.
- R: P6 (within page). The end label prints £186,000 again under the hero.
- D: "See your mortgage" sits at x=61 against a 56px gutter, far below the chart with a gap of about 60px (same frame).
- T: the dashed end means "not yet recorded"; dashing is otherwise reserved for forecasts (P10.7). A hollow end point would avoid the overload.

### Net worth history

- R: C1. No chart title (mortgage/accounts_history-1280-light). Source: history route chart, `apps/web/app/features/...history`.
- D: "Update balances" is the filled primary here and an outline button on the dashboard and accounts. Same action, three weights.
- D: "Next check-in: 1 December 2026" and "Saved. Last updated 15 November 2026" next to "May", "Nov", "October 2026" (flows/b-check-in-short/09-history-after-1280-light). See house rule 8.
- T: hero sub-line breaks to leave "yet." alone (1280).

### Budget (and edit in place)

- D (highest severity, T7): budget "Money in each month £3,450" vs take-home "Monthly take-home pay £3,451" for the same household (mortgage/budget-1280-light vs mortgage/take-home-1280-light); renter £2,085 vs £2,087. The new-user flow shows £2,087 on both, so the gap is the persona's typed "Salary after tax" line (dialogs/budget-wizard-1280-light). P6 says budget shows take-home "as the income line"; either derive it or say why it differs. Source: budget income line in `apps/web/app/features/budget`, take-home selector in `@flump/finance-engine`.
- D: the "Saved" toast uses the neutral `InlineAlert` "Note" icon (`MessageSquare`), while the onboarding toast uses a tick (flows/c-budget-edit/03-groceries-changed-1280-light vs flows/a-new-user/09-dashboard-375-light). Source: `packages/ui/src/primitives/InlineAlert/InlineAlert.tsx:33` and the budget save call site.
- D: "Health & Fitness" suggestion chip: ampersand and title case (flows/c-budget-edit/04-add-category-dialog-375-light). Source: `apps/web/app/features/budget/components/AddCategoryModal`.
- D: new user budget shows Bills, Expenses and Savings rows with chevrons and no amount, plus both "Living" and "Expenses" (flows/a-new-user/11-budget-1280-light). Source: onboarding seed `apps/web/app/services/onboarding-seed.ts` and the budget group list.
- R: F1. "Category name Required" (required is the default and is not marked).
- R: P4.1. Two notices: the projection note in the zone and the MoneyHelper band (metrics notes 2). MoneyHelper belongs on debt (T9 example); on budget it is a second standing notice.
- R: S7. Redundancy and spending-cut inputs show "£ 0" as a value rather than empty (mortgage/budget-1280-light).
- T: months of cover "7 months" for one household, "2.7 months" for the other. A rule on decimals would help (house rule 9).
- T: the in-list "Car loan payment, move to debts?" prompt is useful but adds a figure and two buttons inside the list card.

### Debt with debts

- D: hero to KPI strip gap is 18px on debt and mortgage, 32px on dashboard, budget, pension and savings (mortgage/debt-1280-light 353 to 371 vs mortgage/home-1280-light 327 to 359). Source: debt and mortgage containers render the strip outside the `PageBody` gap.
- D: "Update your details" in the zone footer is bold black text with no link or button styling (mortgage/debt-1280-light, also mortgage and buy-to-let). Source: `packages/ui/src/patterns/ScenarioZone`.
- R: C3. The scenario chart uses a legend for 2 series (flows/d-scenarios/02-debt-extra-200-375-light). Source: debt payoff chart in `apps/web/app/containers/debt/DebtContainer.tsx` area.
- R: C1. At £0 the chart has "Move the slider to see what changes" instead of a summary.
- R: P5.2 in spirit. "Smallest balance first / Highest rate first" stays when the page says both give the same result.
- T: the zone's left column is empty below one slider and a button at 1280.

### Debt empty

- D: the illustration has its ground ellipse in dark but not in light (flows/f-debt-empty/01-debt-empty-1280-light vs -375-dark). Source: `packages/ui/src/primitives/Illustration/Illustration.styles.ts:20` (`surface.sunken` on a sunken empty-state well vanishes).
- T: the "empty-accounts" card scene for debt is acceptable but generic.

### Mortgage complete

- D: the balance chart is apricot `chartColor("debt")`; P9.3 and the account detail chart make mortgage teal (mortgage/mortgage-1280-light vs flows/f-account-detail/02). Source: `apps/web/app/features/mortgage/components/OverpaymentSimulator/OverpaymentSimulator.tsx:103,152,438`.
- R: R3. Three KPI cards stack into a 330px tall column at 375 (mortgage/mortgage-375-light-fold). Source: `packages/ui/src/patterns/KpiStrip/KpiStrip.styles.ts` (`3: base minmax(0,1fr)`), which contradicts UX R3.
- R: PLAN figure and H1 example: "Monthly payment, with the finish date beside it". The hero sub-line is "Fixed until Jul 2028"; the payoff date appears nowhere in the default view ("Years left 18 years 2 months" is in Your details at y=1490).
- R: H14. "Your details" comes after the scenario zone.
- R: S6. Overpay or save shows 4 inputs (amount, rate, tax select, years) (flows/d-scenarios/11-mortgage-overpay-or-save-moved-1280-light), and prints "Savings interest rate after tax 4.8%" twice.
- D: KPI cards have no captions here while dashboard, budget, debt and pension cards do.
- D: same 16px hero to strip gap as debt.
- T: the chart has a gradient area fill; nothing else in the app does.

### Mortgage with no mortgage

- D: the credit card "empty-accounts" scene on a mortgage page (renter/mortgage-1280-light). Source: mortgage container empty state.
- Copy is neutral to renters; good.

### Mortgage buy-to-let

- R: P8. "+£450.00" and "6.00%" (flows/f-buy-to-let/02-mortgage-buy-to-let-1280-light). Source: buy-to-let properties card in `apps/web/app/features/mortgage`.
- D: zone text "Add your balance, interest rate and years left" while £150,000 and 5.2% are on screen; the real gap is years left.
- D: hero is "Monthly payment" on Residential and "Remaining balance" on Buy to let; the page's one figure changes meaning with a tab.
- R: P1.5 and P2. A second three-card strip nested inside a card ("Your buy to let properties"), giving 7 figures above the zone.
- D: three edit routes: "Edit your details", "Update your details", "Edit".
- R: P5.1 spirit. Two tab rows (property type, then tool), five tabs in reach of each other.
- T: "Overpay" offered on an interest-only loan with no note.

### Pension

- R: R3. KPI cards stack at 375 (mortgage/pension--take-home-pay-375-light). Source: `KpiStrip.styles.ts`.
- R: P1.6 and P6 within page. "About £405,000" as the outcome, then "Reaches about £405,000 at retirement" in the chart summary (mortgage/pension-1280-light).
- D: "Estimated income at retirement" also carries an "Estimate" badge; take-home and self assessment do the same. Pick one (house rule 11).
- T: three x ticks over 25 years; the dashed forecast has no range band (C5 is pending an owner decision, so not marked).

### Savings

- D: x-axis labels collide as "20302031" at 375 (renter/savings-375-dark). Source: savings forecast chart, ticks not using `xTickAnchor` or the 6-tick cap at phone width.
- R: R3. Homeowner's three cards stack at 375 (mortgage/savings-375-light-fold).
- D: rows show a balance for the homeowner's 2 accounts and none for the renter's 1 (renter/savings-375-dark). Consistent with house rule 2 below only if that rule is adopted.

### Take-home

- D: £3,451 vs budget £3,450 (see Budget).
- D: only the first KPI card has a caption; the other two leave a blank band (mortgage/take-home-1280-light).
- D: at 375 the strip is one full card plus two halves (renter/take-home--the-next-1-000-375-light); no other page lays out a strip this way. Source: take-home container passes its own grid.
- R: P1.6. "£630" then "Of the next £1,000, about £630 reaches your pay".
- R: N4. Nav "Pay", h1 "Take-home pay".
- T: hero has no sub-line, every other hero has one.

### Self assessment opt-in screen

- D: the empty state sits on a white card with a shadow (renter/self-assessment-1280-light); debt and mortgage empty states use a sunken well with no edge. Source: `apps/web/app/containers/tax/TaxContainer.tsx:159` vs `packages/ui/src/patterns/EmptyState/EmptyState.styles.ts`.
- T: card scene reused a third time.

### Self assessment opted in

- R: P1.5. "Estimated bill" caption runs to two lines (flows/f-self-assessment/06-after-cost-1280-light).
- R: R3. Cards stack at 375 (flows/f-self-assessment/08-sa-end-375-dark).
- T: the tax year select and "..." menu in the header plus "Add income" in the body is a lot of controls for one figure; within the 6-button cap.

### Settings

- D: Profile and Security end flush with the last card at 1280 (page height 819 and 1042, card bottoms at 817 and 1040) (mortgage/profile-1280-light, profile--security-1280-light). Source: settings route not using the `PageBody` bottom gap, `apps/web/app/features/settings/settings.styles.ts`.
- D: first and last name fields have no save button or "saved" line; only the net worth card says "Changes are saved straight away" (H1 visibility).
- D: "Tax and take-home pay / Your pension / Your mortgage" link row: teal bold, no underline, a fourth link style.
- Net worth choices flow is right: property off moves Home and the mortgage into "Not counted in net worth" and the £107,400 hero matches on dashboard, accounts and history (flows/e-net-worth-homeowner, metrics-flows heroes).

### Onboarding

- D: stepper label "Savings" vs step title "Savings and debt" (flows/a-new-user/06-step3-filled-1280-light).
- D: "Leave a box empty if you do not know" and "Enter 0 if you owe nothing" in one step: two rules for blanks (F4 is clear that blank means not given; the second sentence is fine but should sit only under the debt field, which it does; marked minor).
- T: the take-home tile is a nested card inside the step card. O3 is met: "Now includes your 5% pension and student loan" explains £2,194 to £2,087.
- D: "Details saved" toast covers the Debt card's link after Finish (flows/a-new-user/09-dashboard-375-light).

### Monthly check-in

- R: H13. Each unanswered row carries a filled "Update" button and an outline "No change": 8 primary-styled buttons in view (metrics-dialogs check-in 1280 pb 8; flows/f-keyboard-check-in/03). Source: check-in sheet row component.
- D: summary "Up £2,800 on October 2026." ("against" or "since" elsewhere) (flows/b-check-in-short/05-summary-1280-light).
- T: summary rows show "£3,400 to £3,150", two figures per row; acceptable for a change log.
- Keyboard: inputs show a 2px teal border on focus, which is visible though the probe reported ring=false. Escape returns focus to "Update balances". Good.

### Other dialogs and sheets

- D: "Choose what shows here" opens as a top-anchored card at 375, not a bottom sheet (dialogs/dashboard-widgets-375-dark). STYLE 12.3. Source: dashboard widgets dialog, `apps/web/app/features/dashboard`.
- D: all six rows ticked while two say "Not showing" (same frame); the 4-section cap is explained but the state is contradictory.
- R: F1. "Required" beside fields while others say "(optional)" (dialogs/edit-debt-1280-light, add-savings-account-375-light).
- R: STYLE 12.1 Disabled: "Add account", "Add category" and "Delete my account" are disabled until filled with no reason shown.
- D: placeholder "For example, easy access savings or Ca" truncated at 375.
- Delete account confirm is good (consequences listed, Cancel safe).

### App chrome

- R: N1 and N4. "Borrowing" and "Pay" in the bar; pages say "Your debts" and "Take-home pay".
- D: drawer icons (trending-down for Debt, building for Mortgage, coins for Pension) differ from dashboard tiles (card, house, briefcase) (dialogs/mobile-nav-more-375-light vs mortgage/home-375-light). Source: `packages/ui/src/patterns/NavDrawer` vs dashboard card icons.
- D (doc): UX N2's rule says the menu button and "More" open the same drawer; its "Don't" column forbids "a hamburger and a bottom bar together at 375", which is exactly what ships. The document needs fixing, not the app.
- 768 and 1024 are clean: logo as home with an underline, compact bar, no bottom bar.

### Sandbox

- D: persona tabs wrap to two lines inside the bar at 375 (out/sandbox--debt-375-light-fold). Source: `SandboxBar` in `apps/web` using `SegmentedTabs` with long labels.
- D: two "Sign up" buttons (bar outline, footer filled) on one page (out/sandbox-1280-light).
- R: STYLE 7. Lock icons on every card and on the bottom bar items carry no label.
- D: "From your budget", "From your accounts" on sample figures that the bar calls "not yours".
- R: P1.2. The sample-data bar sits above the h1. P4.4 accepts the bar as the notice, so this is minor.

### Web tools index

- D: logo at x=49, grid at x=88, footer at x=128: three left edges (out/tools-1280-light). Source: signed-out layout in `apps/web` vs `packages/ui/src/patterns/SiteFooter`.
- R: N8. The web footer has no Security or Contact link; the marketing footer has both.
- D: "Company number 00000000. Registered office address to be confirmed." on every signed-out page.

### Web tool pages

One line each (1280 light unless stated):

- Debt payoff methods: R H11, interest £1,864 vs £2,131 and July vs August 2029 with no difference stated; result below the fold at 375 (F 0). 7.0 / 7.0.
- 0% balance transfer: three clear result cards, F 4; tidy. 8.0 / 8.0.
- Overdraft cost: 2 figures, short; fine (not opened full size). 8.0 / 8.5.
- Mortgage overpayment or ISA: result to the pound over 18 years (£63,039, £99,388; see house rule 9); result below the fold at 375; method and labels differ from the app's "Overpay or save" tab. 7.5 / 7.5.
- Student loan: clear; heading word spacing looks loose in "Written off after 30 years". 8.0 / 8.5.
- Pay rise: h1 asks what you keep from a rise but the result is the next £1,000; chart with 4 threshold markers plus "Your pay" (P10.3 at most one annotation). 7.0 / 7.0.
- Section 24: three result cards; "Tax share of taxable profit 30%" is a third figure few will need. 7.5 / 7.5.
- Income above £100,000: two results that add to the contribution; clear. 8.0 / 8.5.
- Row-wide D: "More options" here is a large bordered button; in the app it is a small teal text trigger. Guide and FAQ use a third disclosure style. Source: `packages/ui/src/tools` and `packages/ui/src/calculators`.
- Row-wide T: "Request an invite" sits between the result and the chart, splitting the answer.

### Error and 404

- D: 404 puts the scene top-left inside a card with the h1 inside the card (out/nope-404-375-light, mkt/nope-404-1280-dark); app empty states centre the scene under a page h1. Source: `apps/web/app/features/feedback/components/RouteErrorState/RouteErrorState.tsx`.
- Web 404 keeps the signed-out shell with one way back; good. Signup 500 is a local WorkOS setting, not judged.

### Marketing home

- R: PLAN target 5 sections; there are 6 (hero, what you can see, pay rise, security, FAQ, closing CTA) (mkt/home-1280-light).
- R: H13. Three filled "Request an invite" buttons (metrics pb 3). Marketing may repeat a CTA, but three in 3,500px is one too many.
- R: R3. The preview's KPI cards stack at 375 (mkt/home-375-light-fold).
- D: header button "Request invite" at 375, "Request an invite" everywhere else.
- D: footer placeholders (company number, support@example.invalid).
- T: the apricot band directly under the hero is the loudest colour on the page; sage further down is calmer.

### Marketing tools index

- D: same three-edge alignment as web (mkt/tools-1280-light-fold). Domain tile colours follow P9.3.

### Marketing tool pages

- As web tool pages.
- D: the home page's pay-rise block answers "£1,440 a year from the rise" while the pay-rise tool answers "£720 from the next £1,000". The same story gives two different answers.

### Pricing

- Clean. The paid row "Price not set" follows the owner ruling. Footer placeholders only.

### Security

- D: "security@example.invalid. Not monitored yet." It is honest but reads as unfinished on a trust page.

### MCP

- D: the three example questions are drawn as raised cards and look tappable (mkt/mcp-375-light).
- D: "Create an access token in your profile"; the app says Settings, Security, "Create token".
- D: "Show technical details" trigger is larger and dark, unlike teal drawer triggers elsewhere.

### Contact

- Clean; placeholder email is labelled as one.

### Design system

- Good: design-token baseline 2 entries, style-literals baseline 25 counts across 13 files, react-icons 0, input-types 1, copy 14. Semantic tokens hold in both themes in every frame I looked at; dark mode follows Direction C with no indigo slab. `EmptyState` and `Illustration` set `_systemDark` beside `_dark`.
- R: UX R3 vs `KpiStrip.styles.ts` (3 cards stack in one column below `sm`). The component's comment says this is deliberate; the guideline says never. One of them must change.
- D: one component, many applications: KPI captions (all, some, none), empty states (sunken well, white card, 404 card), link styles (4), "Update balances" (filled and outline), hero to strip gap (16 and 32), disclosure triggers (3), drawer vs tile icons.
- R: C1 adoption. Charts without a title on account detail and history; charts whose summary is "Move the slider to see what changes" on debt and mortgage.
- R: E2. `Skeleton` and `PendingReveal` are not imported anywhere in `apps/web` or `apps/marketing`. Also unused by the apps: `CoachCard`, `SideNav`, `TakeHomeDeltaPanel`, `Popover` (some may be used inside `packages/ui`; not traced).
- T: the hero is fixed at about 536px on every page; the card grid would look more resolved if the hero spanned the strip width or shared a row with one supporting card.

## Appendix C. Evidence log: counts, figures across pages, flows

### 1. Counts per page and household (1280 light)

N1 is the first-view count under the whole-card rule. "Any" is `foldDistinctAnyPart`, the old count. N is distinct figures on the whole page. Notices are given as projection notices plus `role="note"` elements. H375 is the page height at 375 wide. No page scrolls sideways at 375 or 320.

### Renter

| Page                      | N1  | Any | N   | Heroes | Notices | Not set | Primary | H375 |
| ------------------------- | --- | --- | --- | ------ | ------- | ------- | ------- | ---- |
| Dashboard                 | 4   | 4   | 7   | 1      | 1+1     | 0       | 0       | 1877 |
| Accounts                  | 6   | 6   | 7   | 1      | 0       | 0       | 1       | 1191 |
| History                   | 1   | 1   | 1   | 1      | 0       | 0       | 1       | 889  |
| Budget                    | 4   | 4   | 6   | 1      | 1+2     | 0       | 0       | 2060 |
| Debt                      | 2   | 2   | 3   | 1      | 1+1     | 0       | 1       | 2060 |
| Debt, smallest first      | 2   | 2   | 3   | 1      | 1+1     | 0       | 1       | 2112 |
| Mortgage (none)           | 0   | 0   | 0   | 0      | 0       | 0       | 1       | 812  |
| Pension                   | 3   | 3   | 4   | 1      | 1+1     | 0       | 1       | 2160 |
| Pension, take-home tab    | 3   | 3   | 4   | 1      | 1+1     | 0       | 1       | 1663 |
| Savings                   | 3   | 3   | 5   | 1      | 1+1     | 0       | 1       | 1856 |
| Savings, time to a target | 3   | 3   | 5   | 1      | 1+1     | 0       | 1       | 1401 |
| Take-home                 | 4   | 5   | 5   | 1      | 1+1     | 0       | 0       | 1373 |
| Take-home, next £1,000    | 4   | 6   | 6   | 1      | 1+1     | 0       | 0       | 1739 |
| Self assessment (opt-in)  | 0   | 0   | 0   | 0      | 0       | 0       | 1       | 812  |
| Settings, profile         | 0   | 0   | 0   | 0      | 0       | 2       | 0       | 1672 |
| Settings, security        | 0   | 0   | 0   | 0      | 0       | 0       | 1       | 1475 |
| Settings, data            | 0   | 0   | 0   | 0      | 0       | 0       | 0       | 988  |

### Homeowner

| Page                      | N1  | Any | N   | Heroes | Notices | Not set | Primary | H375 |
| ------------------------- | --- | --- | --- | ------ | ------- | ------- | ------- | ---- |
| Dashboard                 | 4   | 5   | 7   | 1      | 1+1     | 0       | 0       | 1803 |
| Accounts                  | 5   | 10  | 11  | 1      | 0       | 0       | 1       | 1304 |
| History                   | 1   | 1   | 1   | 1      | 0       | 0       | 1       | 889  |
| Budget                    | 4   | 4   | 6   | 1      | 1+2     | 0       | 0       | 2060 |
| Debt                      | 2   | 2   | 3   | 1      | 1+1     | 0       | 1       | 2134 |
| Mortgage, overpay         | 4   | 5   | 6   | 1      | 1+1     | 0       | 0       | 2401 |
| Mortgage, rate change     | 4   | 7   | 8   | 1      | 1+1     | 0       | 0       | 2189 |
| Mortgage, overpay or save | 4   | 4   | 10  | 1      | 1+1     | 0       | 0       | 2447 |
| Pension                   | 3   | 3   | 4   | 1      | 1+1     | 0       | 1       | 2160 |
| Savings                   | 4   | 4   | 6   | 1      | 1+1     | 0       | 1       | 2205 |
| Take-home                 | 4   | 5   | 5   | 1      | 1+1     | 0       | 0       | 1373 |
| Take-home, next £1,000    | 4   | 6   | 6   | 1      | 1+1     | 0       | 0       | 1739 |
| Self assessment (opt-in)  | 0   | 0   | 0   | 0      | 0       | 0       | 1       | 812  |
| Settings, profile         | 0   | 0   | 0   | 0      | 0       | 2       | 0       | 1704 |

Signed out and marketing: the web tools are at N1 2 to 4 and N 2 to 4; the sandbox at N1 3, any 4 to 5, N 4 to 7, notices 1+2; marketing home N1 3, N 6, 3 primary buttons, 4,865px at 375; marketing tools 2 primary buttons each. Console errors appear only on the two 404 pages and `/signup` (500). Under the new rule, every app page is at or under N1 4 except accounts (renter 6, homeowner 5). The automatic count still misses table rows on history.

### 2. Cross-page figure tables

"=" means the same as the first column. Sandbox is left out.

### Homeowner, after seeding

| Figure               | Dashboard                          | Accounts                 | History                                                 | Budget                   | Debt                     | Mortgage      | Pension | Savings | Take-home  | Account detail                       |
| -------------------- | ---------------------------------- | ------------------------ | ------------------------------------------------------- | ------------------------ | ------------------------ | ------------- | ------- | ------- | ---------- | ------------------------------------ |
| Net worth            | £231,400 (up £2,575 since October) | =                        | chart end £231,400; hero is the October change, +£2,575 |                          |                          |               |         |         |            |                                      |
| Total owned          |                                    | £427,000                 |                                                         |                          |                          |               |         |         |            |                                      |
| Total owed           | £9,600 (cards and loans)           | £195,600 (with mortgage) |                                                         |                          | £9,600                   |               |         |         |            |                                      |
| Current account      |                                    | £3,400                   |                                                         |                          |                          |               |         |         |            | £3,400 ("Last updated October 2026") |
| Easy access savings  |                                    | £7,600                   |                                                         |                          |                          |               |         | £7,600  |            | =                                    |
| Cash ISA             |                                    | £10,000                  |                                                         |                          |                          |               |         | £10,000 |            | =                                    |
| Savings total        | £17,600                            |                          |                                                         |                          |                          |               |         | £17,600 |            |                                      |
| Home                 |                                    | £310,000                 |                                                         |                          |                          | LTV 60%       |         |         |            | £310,000                             |
| Mortgage balance     | £186,000                           | =                        |                                                         |                          |                          | =             |         |         |            | =                                    |
| Mortgage payment     |                                    |                          |                                                         | £1,250 (housing)         |                          | £1,250 (hero) |         |         |            |                                      |
| Car loan             |                                    | £8,400                   |                                                         | £265 a month (bills row) | £8,400                   |               |         |         |            | =                                    |
| Credit card          |                                    | £1,200                   |                                                         |                          | £1,200                   |               |         |         |            | =                                    |
| Pension              | £96,000                            | =                        |                                                         |                          |                          |               | £96,000 |         |            | =                                    |
| Months of cover      |                                    |                          |                                                         | 7 months (scenario zone) |                          |               |         |         |            |                                      |
| Left over each month | £135                               |                          |                                                         | £135 (hero)              | "Use the £135 left over" |               |         |         |            |                                      |
| Monthly take-home    |                                    |                          |                                                         | £3,450 (money in)        |                          |               |         |         | **£3,451** |                                      |
| Debt-free date       | December 2029                      |                          |                                                         |                          | December 2029            |               |         |         |            |                                      |
| Minimum payments     |                                    |                          |                                                         |                          | £305                     |               |         |         |            |                                      |

### Homeowner, after the short check-in (4 typed balances)

Net worth is £231,625 on the dashboard, accounts, history (chart end and hero "Change in November 2026 +£2,800") and the check-in summary ("Up £2,800 on October 2026"). Total owned £427,105, owed £195,480 (dashboard £9,480). Current £3,150, easy access £7,820, ISA £10,135, savings total £17,955 on the dashboard and on Savings. Card £1,080 on accounts and Debt. Months of cover 7.1 months. Debt-free date December 2029 (unchanged). All pages agree. Account detail compares with October as a percentage: Home "No change on October 2026" (it is up £500) and mortgage "No change" (it is down £550). See defect 6.

### Renter, after seeding

| Figure               | Dashboard                                           | Accounts                                                     | History                       | Budget                                                    | Debt                     | Pension | Savings | Take-home  |
| -------------------- | --------------------------------------------------- | ------------------------------------------------------------ | ----------------------------- | --------------------------------------------------------- | ------------------------ | ------- | ------- | ---------- |
| Net worth            | £11,700 (up £465), "Not counting your student loan" | = with the same line                                         | chart end £11,700; hero +£465 |                                                           |                          |         |         |            |
| Total owned          |                                                     | £13,500                                                      |                               |                                                           |                          |         |         |            |
| What you owe         | £1,800                                              | card £1,800; student loan £38,500 "Not counted in net worth" |                               |                                                           | £1,800                   |         |         |            |
| Current account      |                                                     | £1,300                                                       |                               |                                                           |                          |         |         |            |
| Savings              | £3,200                                              | £3,200                                                       |                               |                                                           |                          |         | £3,200  |            |
| Pension              | £9,000                                              | =                                                            |                               |                                                           |                          | £9,000  |         |            |
| Months of cover      |                                                     |                                                              |                               | 2.7 months                                                |                          |         |         |            |
| Left over each month | £125                                                |                                                              |                               | £125                                                      | "Use the £125 left over" |         |         |            |
| Spending             | **£1,810** "Spending each month"                    |                                                              |                               | **£1,960** "Going out each month" (includes £150 savings) |                          |         |         |            |
| Monthly take-home    |                                                     |                                                              |                               | **£2,085**                                                |                          |         |         | **£2,087** |
| Debt-free date       | November 2030                                       |                                                              |                               |                                                           | November 2030            |         |         |            |

### Months of cover

It appears in one place only: the Budget scenario zone outcome, `apps/web/app/features/budget/components/RunwayCalculator/RunwayCalculator.tsx:400-409` (`data-figure="monthsOfCover"`). The dashboard KPI strip no longer shows it (`DashboardKpiStrip.tsx:46`). History, savings and the onboarding copy only mention the words. The saved figure comes from `packages/finance-engine/src/picture/selectors/months-of-cover.ts:21-38`, through `essentialCommitments` (`selectors/commitments.ts:31-58`). The scenario outcome is worked out again at `RunwayCalculator.tsx:134-136, 183-190, 288-315`.

Values: renter 2.7 months; homeowner 7 months, then 7.1 after the check-in. The scenario outcome matches the saved figure, and switching any option off and on again returns to it (`metrics-flows.json`, kind `cover`). The real inconsistency is this: a debt payment entered as a Bills row (homeowner "Car loan payment" £265, renter "Credit card payment" £60) is counted twice. It counts once as an essential row and again inside the account minimums: `commitments.ts:39-49` adds every essential non-debt-category row, then adds `max(accountMinimums, budgetDebtPayments)`. The page itself says the payment "is already counted with your debts". Pressing "Move to debts" changes nothing financially (going out stays £3,315, left over stays £135), yet months of cover moves from 7 months to 7.7 months and safe to spend from £39 to £101 a week (`flows/f-months-of-cover-move-to-debts/01-before-move` and `02-after-move`). Switching off only that row gives 2.8 months (renter) and 7.7 months (homeowner). The precision differs as well ("7 months" beside "2.7 months"), because `formatMonthsOfCover` (`BudgetWidget.tsx:23-28`) drops a trailing ".0".

### 4. Flows

- **a. New-user setup** (`flows/a-new-user/`, 15 taps): step 1 (age 29, £32,000, England, Plan 2) shows take-home £2,194. It holds through step 2 (renting, £950 rent, £800 other spending). At step 3 it changes once to £2,087, when the 5% pension is entered, with the line "Now includes your 5% pension and student loan". The review shows £2,087, and the take-home page later shows the same. So the take-home figure is stable apart from that labelled change. After Finish, a "Details saved" toast appears over the dashboard: net worth £11,700, left over £337, owed £1,800, debt-free "Not set, add your rates". No check-in card shows, because setup records this month. Confusing: the "Cards and loans baseline" account (defect 2). The student loan plan creates no student loan account.
- **b. Check-in** (`flows/b-check-in-*`): the short path is 11 taps at both widths (4 typed balances, then "No change to the rest"). The summary lists the 4 changes and net worth £231,625, up £2,800, and every page agrees afterwards. The full path is 14 taps; the summary lists only the typed changes and shows £233,495. The order at 375 is current, easy access, ISA, card, car loan, pension, home, mortgage. At 1280 "No change to the rest" sits below all 8 rows. No calculated figure was offered (by rule (b): the saved and recorded balances differ in the seed).
- **c. Budget edit** (`flows/c-budget-edit/`, 10 taps): edit in place saves as you go. Groceries £520 to £560 and Pets £25 take left over from £135 to £70, and safe to spend from £39 to £24 a week. The new category is listed after Savings. Everything is kept after a reload.
- **d. Scenarios** (`flows/d-scenarios/`, 8 taps): debt £200 extra shows "Debt-free 16 months sooner", "£879 less", and "Both orders give the same result". Mortgage £300 overpay shows "4 years 10 months" sooner and £25,060 less interest. Rate change shows "+£132 a month from Jul 2028" with its own fixed-rate end date picker. Overpay or save gives "Saving ... £1,022" over 10 years. After a reload both inputs read £0 and the hero is unchanged (£1,250, fixed until Jul 2028): nothing was saved.
- **e. Net worth choices** (`flows/e-net-worth-*`): the homeowner with property off shows £107,400 on all three heroes, each with "Not counting your property or mortgage". The renter with the student loan on shows -£26,800 everywhere; the basis line goes when nothing is left out. The settings save straight away and survive a reload.
- **f.** Debt empty state: a clean card with "Add a debt". The dashboard swaps "What you owe" for "Pension pots £9,000". Account detail is fine. Buy-to-let: defects 4, 5, 7, 8 and 21. Self assessment: £600 a month self-employed income gives £7,200 and an estimated bill of £2,480 (higher rate after the £1,000 trading allowance, so the R2-8 bug where a record replaced the salary looks fixed). Bill due 31 Jan 2028. Take-home is unchanged at £3,451. At 768 and 1024 nothing scrolls sideways; at 768 no item marks Home (it is the logo, as before). Keyboard: 15 Tabs (1280) or 8 (375) reach "Update balances". Enter opens the sheet with focus in the first balance. Typing then Enter moves to the next account each time. Focus never left the dialog in 40 Tabs. After saving, focus goes to the "Check-in saved" heading. Escape closes the sheet and returns focus to "Update balances". There is a visible ring on every stop. 26 to 40 key presses in all. Nothing trapped focus or lost it.

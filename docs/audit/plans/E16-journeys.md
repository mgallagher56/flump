# E16 journey maps (phase 2)

Method: I drove the web app on `main` at `e4ff6c3` in a browser against a local dev stack (local Postgres container, dev auth bypass, local hosts only). Screenshots are in [e16-screenshots/](e16-screenshots/). Timings are the scripted browser's, so treat them as lower bounds, not human times. Click and input counts are exact.

**Limits.** One persona fixture was driven through the UI (Sam, 29, £38k, Plan 2). Priya (£112k) was set up by a local API write and viewed. Personas P3 to P6 were not driven. Because Finish failed, I seeded accounts and budget rows through the local API using the correct field names. These are heuristic walkthroughs, not usage data.

**Environment note.** On the dev server the Accounts page did not hydrate (`node:crypto` from `@flump/banking/server` leaking into the client bundle). **Confirmed dev-server only:** in a production build the page is interactive and the check-in drawer opens. The check-in then fails on save because it PATCHes `/accounts/:id` (404). The J2 table below was written from code; the production run adds that save failure.

## Headline findings

1. **J1 is broken at the last step, and account edits are broken everywhere.** Re-verified on a fresh database and a production build at origin/main `e4ff6c3` (equal to this worktree's HEAD, so the base is not stale): Finish setup returns "We couldn't save your details." via `POST /accounts` 500 (x2) and `POST /budget-entries` 500 (x3). Separately `PATCH /accounts/:id` returns 404 ("Cannot PATCH"; stacked `@Put`/`@Patch` leave only PUT registered, `finance.controller.ts:130-131`), which is what Accounts update, the check-in, Pension, Debt and the mortgage-rate save all call. The backend log shows `null value in column "name" of relation "budget_entries"` and `null value in column "currency" of relation "accounts"`. The web sends `title` and no `currency` (`app.onboarding.tsx:339-356`); the backend entities need `name` and `currency`. Net effect on main: a new user never reaches the dashboard through the UI. (An independent reviewer confirmed it; see evidence/E16-review-factcheck.md.)
2. **Same question, different answers.** For one £112k salary: Pension page says 60% marginal rate, £106,400 adjusted income, £3,840 extra tax; Forecast says 62%, £6,000 allowance lost, £7,440 saved on £12k; Home shows take-home £2,382/mo (stale budget income from the £38k setup) while the Forecast widget says £5,916/mo and the profile stores £6,200. Screenshots: `j4-*-priya.png`.
3. **The most valuable result needs no account.** The public £100k trap tool opens pre-filled and shows an answer with zero inputs. The signed-in app takes 8 typed inputs and still fails to save.
4. **The AI journey fails at token creation.** "Create Token" mints a `flump_pat_…` string with `Math.random()` in the browser (`McpConnectionCard.tsx:108-114`), shows "Active Tokens (1)", while `GET /mcp-tokens` returns `[]`. The copy now says "preview", which is honest about intent but the token is still fake.
5. **Region and student loan are asked or needed but never stored**, so Scottish and Plan 2 users get England-rate, no-loan figures after the first screen (`user_profiles` has no such columns).

---

## J1 First run to first insight

| Stage | Doing | Thinking | Feeling | Touchpoint | Pain | Opportunity |
|---|---|---|---|---|---|---|
| Arrive | Open `/` | "What does this do for me?" | Curious | With dev bypass, `/` redirects straight to `/app/onboarding` (could not render the signed-out home) | Signed-out web home duplicates marketing (2,881 LOC) | One public home |
| Step 1 | Age, employment, salary, student loan | "Fast, I get a number" | Positive | Live card shows **£2,509/mo take-home after 2 fields** (`j1-04`) | Region missing; student-loan answer not stored | Aha is here: show take-home plus trap proximity |
| Step 2 | Housing status, rent, outgoings | "Why do you need this?" | Neutral | Surplus appears (+£609/mo) | Two more fields | Make optional |
| Step 3 | Savings, pension pot, contribution, debt | "Rough numbers only" | Mild fatigue | Debt prefilled with 0 | Fields drop out later (not persisted) | Defer to checklist |
| Finish | Click Finish | "Show me my dashboard" | **Frustrated** | Error banner: "couldn't save your details" (`j1-07`) | 500 from the backend; user is stuck on step 3 with no retry path other than the same click | Fix payloads; add a contract test across web and backend |
| Dashboard (after seeding) | Look at Home | "Is this right?" | Mixed | Net worth £16,000, surplus £482, safe-to-spend £111/wk | Take-home stale after a salary change; 4 / 5 checklist | One take-home source |

- **Inputs:** 8 typed values plus 2 selects (age, salary, plan, housing status, rent, outgoings, savings, pension pot, pension %, debt = 10 fields, 3 pages). Plan target: at most 6.
- **Clicks to Finish:** 3 Next/Finish clicks plus field focus.
- **Time to first value:** first personalised number after 2 fields (a few seconds, onboarding step 1). Time to a saved dashboard through the UI: **never** on main. Signed-out tool: **0 inputs** (pre-filled).
- **Drop-off risk:** Finish (hard stop), then step 2.
- **Options:** A minimal: fix the payload mismatch, add retry copy. B merge: collect region, age, loan plan on step 1 and persist; cut to 6 inputs; show first-insight card. C rethink: land signed-up users in the trap tool pre-filled from the seed (the tool is the best first experience).

## J2 Monthly check-in

| Stage | Doing | Pain | Opportunity |
|---|---|---|---|
| Remember | No prompt exists | Nothing brings the user back | A monthly nudge (email is out of scope; in-app banner) |
| Open Accounts | Click "60-Sec Balance Check-In" | Hidden on Accounts only; did not open in the dev server | Make it the Home primary action |
| Update balances | Edit each balance | `handleSaveAll` submits N times on one fetcher; only the last may save; success shows after 1.2s regardless (`MonthlyBalanceCheckInDrawer.tsx:50-68`) | One batched write |
| See result | Read the outcome | No history row is written, so no "up £N since last month" | Write history; show the delta |

- **Aha to engineer:** "Net worth up £N since last month; surplus £S, put it here."
- **Measured:** not driven (see environment note). Code path is 1 click to open, N edits, 1 save.
- **Options:** A fix the batching and add feedback. B write a history row and show the delta on Home. C merge with CSV import for history.

## J3 Overpay the mortgage or invest

| Stage | Observation |
|---|---|
| Public tool | `/tools/mortgage-overpay-vs-isa` opens with £240k, 4.5%, £350/mo, 7%: "Save £36,349 / shaves ~5.3 years" vs "ISA pot £183,388, spread +£63,039". 0 inputs to first answer. The calculator does not import the engine. |
| Signed-in Mortgage page | For a user with no mortgage it shows "Remaining Balance £0, Interest Rate 0%, Remaining Term 0 years" instead of an empty state. Own local maths (`OverpayVsSaveCompare.tsx:57-58`). |
| MCP | `compare_mortgage_overpay_vs_isa` uses the engine function. |

- **Friction:** three implementations; the tool is not prefilled from the user's mortgage; the CTA claims "syncs your live balance and monitors fixed-rate renewal dates automatically", which does not exist.
- **Time to first value:** public tool 0 inputs; signed-in page requires entering a mortgage first.
- **Options:** A fix the CTA copy and the empty state. B one engine function behind all three, prefilled. C drop the page and keep the tool plus MCP.

## J4 Tax-year planning (Priya, £112k)

| Stage | Observation |
|---|---|
| Home | Take-home £2,382/mo (stale) vs Forecast widget £5,916/mo. |
| Pension | Trap banner: 60% marginal, adjusted income £106,400, £3,840 extra tax, suggests raising contribution to 11%. |
| Forecast | Trap banner: 62% marginal, £6,000 allowance lost, £7,440 saved on a £12,000 sacrifice. Slider recommends £12,000. |
| Tax | SA ledger at £0.00; no link to the trap or a deadline. |
| Tool | £115k default shows 62% and "£5,000 of £7,500 reclaimed" for a £10k sacrifice. |

- **Friction:** five surfaces, two answers, no "before 5 April" view; childcare is a one-line claim ("All funded hours revoked"); no region; student loan not applied.
- **Aha to engineer:** "Sacrifice £X to recover £Y and keep childcare."
- **Time to first value:** the Pension page shows the trap alert immediately once salary and pension % exist (1 page view).
- **Options:** A make all five surfaces call one engine function. B Tax-year hub (top-3 add). C a single guided "before 5 April" checklist.

## J5 Connect AI via MCP

| Stage | Observation |
|---|---|
| Find it | Profile, then "AI & MCP Access" tab (`j5-01`). Honest "preview" copy and a safety strip (anonymised names, no payments, rate limit). |
| Generate token | "+ Generate New AI Connection Token", name, expiry, Create Token. Success banner shows a `flump_pat_…` string (`j5-03`). |
| Verify | "Active Tokens (1)", but `GET /mcp-tokens` returns `[]`: the token was minted in the browser and never stored. |
| Use | "Setting up Flump MCP (preview): Setup guide coming soon." No working path to a first tool call. |
| Alternative | "Copy Context Pack / Download .md / .json" works without a token. |

- **Clicks:** 4 to a (fake) token. **Time to first AI answer:** never.
- **Aha to engineer:** Claude answers "can I afford X" from real data.
- **Options:** A hide the token card, lead with the context pack. B wire the card to `/mcp-tokens` after E1, show real tokens. C ship the stdio server publicly with a guided setup.

---

## Cross-journey pattern

The product's best moments (take-home after two fields, the trap answer, overpay vs ISA) are computed instantly from a few numbers, and are mostly in the signed-out tools. The signed-in path adds persistence, which is where it breaks: payload mismatches, dropped fields, stale derived figures and duplicate calculations. Fix persistence and consistency before adding features.

---

# Populated state (second pass)

Added at the owner's request: the same journeys walked with a heavy dataset. **Dataset ("heavy", local dev database only):** £118k employee with salary sacrifice, £400/mo side income, one BTL (£260k, £150k interest-only mortgage, £1,200/mo rent), 17 accounts (2 current including a -£640 overdrawn one, 3 savings, 2 investments, 3 pensions, 2 mortgages, a PCP loan, a Plan 2 student loan, 3 cards including a 0% balance transfer), 22 budget entries (£7,950 income), and 28 tax records over four tax years. Screenshot names follow the E15 convention `<page>--<state>--<width>--<theme>.png`; mine use state `heavy` (and the earlier first-run set uses ad-hoc `j1-*`, `j4-*`, `p-*` names). Light 1280 for 9 pages, light 375 for 7, dark 1280 for home, debt, tax.

**Environment notes.** The finance-engine `dist/` in this worktree was stale, so Home first returned a 500 (`isHighInterestDebt is not a function` in `debtSummary.ts:44`). I rebuilt the package (gitignored build output) and the page rendered; that was my environment, not a main bug. The Accounts page did not hydrate in the dev server (dev-only, see above), so month two is assessed from the data layer plus one production-build check-in attempt, which failed on save.

## What changes when the app is full

| Journey | Empty or first-run | Populated | Verdict |
|---|---|---|---|
| J1 First value | Take-home after 2 fields; Finish fails | Not applicable. Reaching this state needed API seeding because Finish fails | Same blocker |
| Home insight | £0 KPIs, gentle | Eight-card layout holds (1,505px) but the numbers mislead: net worth **-£210,070** (mortgages count, homes do not: there is no property asset), surplus **-£88** (the £900/mo saved is counted as spending), safe-to-spend **£0** on Home vs **£774/week** on Budget, take-home £7,950 vs £5,984 vs £6,350 | Value breaks |
| J2 Monthly check-in / month two | Hidden on Accounts; writes no history | With 17 accounts the check-in is 17 edits on one fetcher. `monthlyHistory` stays empty after seeding, so month two has no trend, no delta and no reason to return | Does not hold up |
| J3 Overpay vs invest | Mortgage page shows £0 / 0% / 0 years | With a real mortgage account it still shows term 0 and payment £0. Term is labelled "Not saved — enter each visit" and Save returned "Could not save your mortgage details". Page overflows horizontally at 375px | Unusable until fixed |
| J4 Tax year | Trap on 5 surfaces, 2 answers | Real data makes it valuable: Pension says £108,560 adjusted income, SIPP £8,560, £5,136 back; Forecast says £9,000 allowance lost at 62%; tool says £5,000 of £9,000 reclaimed. Pension double counts contributions (profile 13% plus £1,480 per-pot = £2,758/mo). Region and student loan still unused | Most valuable populated, still inconsistent |
| Debt | Honest empty state | Best populated page: avalanche £9,091 vs snowball £9,365 vs minimum £10,796, 0% tracker (304 days), bridge +£105,529. But the income-contingent Plan 2 student loan is treated as a payable debt (est. minimum £785/mo), the debt budget becomes £1,505/mo and the total £58,150, and the -£640 overdraft is not in the total | Valuable but wrong inputs |
| Tax and SA | £0.00 | Four years of "annual" salary records stack in 2026/27 (+£446,714); Home widget shows est. tax due £146,466 on +£541,266; page KPI shows £0.00 SA due and £38,000 gross from a stale browser baseline (the unscoped localStorage key survived the database reset: G-10 observed). Frequency "annual" means recurring each year, which a multi-year entry does not expect | Breaks with multi-year data |
| Forecast | Invented £250/£375 savings | Still £250/mo for a user saving £900/mo | Still invented |
| Budget | Plan-only | 22 entries render fine; "deficit -£88, spending exceeds income" contradicts the saver; safe-to-spend differs from Home | Labels break |
| J5 MCP | Fake token | Unchanged; the context pack would be most useful here (not exported in this run) | Same |

**Screens that only feel valuable populated:** Debt, Pension (trap banner), Savings growth, Accounts grouping, the dashboard module cards. **Screens that only work empty:** none. **Where larger or messier data breaks value:** net worth for any homeowner, anything derived from the student loan, mortgage simulators (term never stored), multi-year tax records, per-pot versus profile contribution double counting, overdrafts outside the debt total.

**Populated time to first value.** For a returning user the dashboard paints in about 2.4s in dev and the first insight is immediate; the problem is trust, not speed. A heavy user sees four conflicting figures within one scroll.

Screenshots: `home--heavy--1280--light.png`, `accounts--heavy--1280--light.png`, `budget--heavy--1280--light.png`, `debt--heavy--1280--light.png`, `savings--heavy--1280--light.png`, `pension--heavy--1280--light.png`, `mortgage--heavy--1280--light.png`, `mortgage-edit--heavy--1280--light.png`, `forecast--heavy--1280--light.png`, `tax--heavy--1280--light.png`, `tool-trap--heavy--1280--light.png`, 375px versions (`*--heavy--375--light.png`) and dark (`home|debt|tax--heavy--1280--dark.png`).

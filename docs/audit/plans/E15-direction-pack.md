# E15 phase 0: visual direction pack and owner decisions

Status: decision pack, nothing implemented. Evidence is in [E15-phase0-critique.md](./E15-phase0-critique.md) (screens, journeys, measured baseline) and [`docs/design/e15/benchmark.md`](../../design/e15/benchmark.md) (market patterns, sources attributed, unverified items marked). Plan: [E15-plan-draft.md](./E15-plan-draft.md).

## 1. Recommendation in one paragraph

**Adopt Direction A "Calm ledger" as the base, and borrow B's density for simulators and tables** (the plan's own provisional lean, now supported by evidence). Reasons: (1) the token system already passes contrast in both themes (88 of 88 pairs), so a refinement of the current indigo is cheapest and lowest risk across 12 screens; (2) the benchmark found that UK consumer apps crowd the warm/friendly end and no verified product combines planner-grade charts with a calm UK voice and stated assumptions, which is the gap Flump can own; (3) the app's real problems are inconsistency, mobile structure and zero-for-unknown, none of which need a new personality, they need one system applied; (4) a trust product that tells people about debt and mortgages is better served by quiet, editorial type and plain assumptions than by playfulness. Keep C's best idea (the "next best step" coach card) as a component in A. Do not choose B as the whole-app look: dark-first and mono numerals would make a calm first run harder, and the audit's worst mobile problems get worse at higher density.

## 2. The three directions

Mockups are standalone HTML artifacts (D12 option A), identical **Sample data** in all three, four frames each (Dashboard, Mortgage simulator, Onboarding step, Empty and error states), light and dark, with a 1280/375 width toggle, a live contrast table, a token sketch and a trade-offs section. Repo token names are used as CSS variables; new tokens carry a `--new-` prefix. Source files: `docs/design/e15/directions/{a,b,c}/index.html`; shared content brief: `docs/design/e15/directions/BRIEF.md`.

Artifact links (private, owner only; sharing is from each page's Share menu):

| Direction | Artifact | Source file |
|---|---|---|
| A Calm ledger | https://claude.ai/artifact/WNyDwhgqd92wkd8tvMru6N | `docs/design/e15/directions/a/index.html` |
| B Instrument panel | https://claude.ai/artifact/PpHJ9y88AmWx2ZoQUwNVbo | `docs/design/e15/directions/b/index.html` |
| C Warm guide | https://claude.ai/artifact/VjvVzjiPTWiAZz9nZHq5Gd | `docs/design/e15/directions/c/index.html` |

Each has five frames: **Dashboard, Mortgage, Onboarding, Empty and error, Heavy data** (34 accounts, long names, overdrawn and owed rows, a 15-category budget as a sorted bar list, a collapsed 24-row schedule). Toggle Light / Dark / System and 1280 / 375 in the page header. The Heavy data frame uses the same numbers as my local heavy seed (net worth £648,794). Budget and schedule amounts in that frame are invented sample figures, not from the app.

### Side by side

| | A Calm ledger | B Instrument panel | C Warm guide |
|---|---|---|---|
| Character | Editorial, quiet, rules and space instead of boxes | Dense, mono numerals, 1px grid, small-caps captions | Friendly, large soft shapes, plain-language headings |
| Primary and neutrals | Indigo kept (`primary` unchanged), cool paper neutrals; dark = ink-blue | Violet-indigo plus cyan data accent; dark-first, graphite | **Deep teal-green primary (`#0F6B5E` light, `#5CC4AE` dark)**, sand neutrals; dark = warm charcoal |
| Type | Serif display for titles and KPI figures plus Inter; tabular lining figures | IBM Plex Mono for numbers and labels plus Plex Sans | Bricolage Grotesque headings plus Figtree body and numbers |
| Radius, elevation | About 8px; one-layer shadow on overlays only | 4px; borders only, no shadows | 16 to 24px; soft layered shadows in light |
| Density | Comfortable | Compact (32 to 36px controls, 44px at 375) | Comfortable to spacious |
| Motion | 160 to 240ms ease-out | 90 to 140ms linear | 200 to 320ms spring-ish |
| Dashboard order | KPI strip, next-step card, net worth chart | KPI strip with sparkline and split bars, next-step, chart | **Coach card first**, then KPIs below the fold at 1280 |
| Liabilities in charts | Amber (owed), never red for paydown | Amber | Apricot |
| 375 KPI strip | 2x2 compact grid with hairlines | 2x2 compact grid | 2x2 grid; bottom tab bar |
| Contrast (live table in each page) | All pairs pass, both themes (computed by the agent from hex; the page table not run by the agent) | 58 of 58 pass | 35 of 35 pass |
| New tokens needed | `--new-font-display`, `chart-projection`, `surface-scrim`, `shadow-overlay`, `dur`, `dur-fast`, `ease` | `chart-projection`, `chart-area-wealth`, `chart-crosshair`, `surface-scrim`, `font-mono`, `radius-sharp`, `motion-fast` | `surface-coach`, `surface-coach-end`, `chart-projection`, `chart-area-opacity`, three illustration tints, shadow 1 to 3, radius sm to xl, `ease-spring`, `dur-1`, `dur-2` |
| Build cost over 12 screens | **S to M.** Mostly type and spacing, no hue change | **M.** New density tier, mono numerals everywhere, sparkline KPI cell, dark-first QA | **L.** Hue change to teal means a full contrast and chart re-test, illustration slots, shadow system, new coach component |
| Mobile fit | Good: restrained, easy to stack | Weakest: density needs the most re-thinking at 375 | Good: large targets, but taller screens |
| Fit to "calm by default, detail on demand" | Strongest | Detail on demand yes, calm no | Calm yes; "every number traceable" less visible |
| Risk | Can read as plain; the serif is the only personality | Intimidating for a nervous first-time user | Crowded market (benchmark); hue change touches D2; coach-first hides the numbers at 1280 |

### What I would take from each
- **A:** the whole base: tokens unchanged where possible, editorial type for titles and KPI figures, rules over boxes, the next-step card as a single quiet banner.
- **B:** the compact density tier for simulators, tables and the accounts list (D9-C), the mono-or-tabular numeric style for ledgers, the assets-versus-owed bar and the grouped accounts list with filters (all three do this, B's is the densest), small sparklines in KPI cells where a real series exists.
- **C:** the coach-style next-step content ("No pressure. You can change the plan any time."), friendly empty-state illustration slots, plain-language section headings ("Where you stand"). Not the teal hue unless D2 says so.

### Things all three agree on (so they are decisions already made by the evidence)
Assets versus owed split with group totals on accounts; "Overdrawn" and "Owed" as words with an icon (not colour only); amber or apricot for owed, never red for paydown; full names on focus and hover for truncated labels; sorted bar list instead of a donut past 6 categories; compact currency on axes (£1.2m, not £1800k); a collapsed schedule with "Show all 24"; 2x2 KPI grid at 375.

### Honest limits of the mockups
They are static HTML (no app code). Fonts come from Google Fonts in these files only; production would self-host (D5). The Heavy data numbers other than the account rows are invented. B and C report their own live contrast tables; A's contrast was computed from the hex values by its author and the page table was not run by them (I loaded the page with no script errors). I looked at one or two frames per direction at full size, not every theme and width combination.


## 3. What the benchmark says (digest)

Full detail and URLs: `docs/design/e15/benchmark.md`.
- Adopt: a short KPI strip of at most 4; one net-worth line with assets and liabilities as secondary series; two-line scenario comparison for simulators; presets in empty states; assumptions stated beside the result (MSE style); GOV.UK rules for money inputs and the error summary; progressive accuracy in onboarding (Boldin) and no account linking required (ProjectionLab).
- Avoid: a Calculate button (live recalculation with Reset instead); a legal-style disclaimer as the only disclosure; playful or roast tones on projections.
- Not verified (so decide internally): dark mode and density across the market, mobile navigation patterns, how products colour liabilities. MoneyHelper, MSE mortgage calculator, Monzo budgeting, Moneyhub consumer UI and ProjectionLab help could not be fetched. Fetches returned model summaries of marketing pages, not the live apps.
- Market positions: warm/friendly (Snoop, Monzo, Starling, Emma, Copilot, YNAB); dense/instrument (ProjectionLab, Boldin); calm/editorial (MSE, MoneyHelper, GOV.UK). Gap: calm UK voice plus instrument-grade charts.

## 4. Owner decisions D1 to D14 (updated) and two additions

For each: recommendation, what I need from the owner. "Evidence" cites the critique.

| # | Decision | Recommendation | What I need from you | Evidence |
|---|---|---|---|---|
| **D1** | Visual direction | **A (Calm ledger) as base, B's compact density for simulators and tables (via D9-C).** Pull C's coach card into A. | Open the three artifacts, pick one or name the hybrid. Say which frame decided it. | Critique section 1; section 1 above |
| **D2** | Brand colour | **A: keep indigo, refine neutrals.** Contrast is not a reason to change hue. If you pick C, a hue shift to teal needs a full re-test (semantic names stay). | Confirm. Also see D15 (the logo). | 88/88 token pairs pass |
| **D3** | Web adopts packages/ui; E15 absorbs E9 | **C**: ui primitives everywhere, 5-file rule for ui and shared parts, lighter rule for feature-internal parts. Needs AGENTS.md Law 1 wording edit. | Approve the Law 1 edit. | 23 to 158 inline-styled nodes per route; 7 to 29 contrast nodes from raw hex |
| **D4** | Pilot screen | **B: Mortgage first (with the app shell in parallel).** It is where the worst mobile overflow, zero-for-unknown and the 5-up grid live, so a fix there proves tokens, KpiStrip, SliderField, chart kit and the empty state together. | Confirm; tell me if E16 plans to cut or merge the mortgage tabs. | Critique 3.4 |
| **D5** | Typography | **A or B, self-hosted.** For direction A: keep Inter for UI and numerals with `tabular-nums`, and replace Plus Jakarta display with a single editorial serif for page titles and KPI figures only if you pick A; otherwise Inter + Plus Jakarta, self-hosted. Drop Poppins from Storybook. | Pick after viewing A's type. | Mono numerals appear only on mortgage today (inconsistent) |
| **D6** | Icon set | **A: Lucide.** It removes the FA/Feather mix and emoji. | Confirm. | X3 in critique |
| **D7** | Visual regression tool | **A: Vitest browser-mode screenshots, PR-only, never on `main`** (Railway `checkSuites`), verify APIs first. | Nothing now; revisit at Phase 8. | Plan section 8 |
| **D8** | Default theme | **A: follow system, user override.** Also give `html` the `surface.canvas` background (transparent root today). | Confirm. | Lighthouse h1 1.04:1 artefact |
| **D9** | Density | **C: contextual** (comfortable for dashboard, onboarding and forms; compact for tables, ledgers, simulator controls). This is what makes the A+B hybrid possible. | Confirm. | Dashboard KPI cards at 375 take 4 screens; accounts page 70% empty |
| **D10** | New colour token keys | **A: approve one batch.** Direction mockups list the `--new-*` tokens each would need; the common set is a scrim, projection and band chart roles and series 6 to 8. | Approve the batch once the direction is picked, so AGENTS.md section 2 changes once. | Section 2 per-direction lists |
| **D11a** | Marketing expression | **B: same tokens and type, more expressive layer** (larger display type, one illustration style). | Confirm. | Marketing is already coherent; pricing has layout faults |
| **D11b** | Duplicate public home in web | **A: delete and redirect signed-out `/` to marketing.** | Confirm; I could not capture web signed-out pages in dev bypass, so I cannot judge their quality. | Plan section 2 |
| **D12** | Mockup format | **A: standalone HTML artifacts (done).** Rebuild the chosen one as Phase 1 foundation stories. | None. | This pack |
| **D13** | Language scope | **A: en-GB only.** | Confirm. | |
| **D14** | Review cadence | **B: you review the pilot, then a batch at each phase end; A for dashboard and onboarding.** | Confirm. | |
| **D15 (new)** | Brand mark | The neon mint square logo is the loudest object on every screen and clashes with indigo (and with all three directions). Options: (a) keep, (b) recolour to the brand indigo or a calm tint, (c) redraw. **Recommend (b)**, a one-asset change; logo redesign stays out of scope. | Say if you own the mark and are happy to recolour it. | Critique X11 |
| **D16 (new)** | Unknown values rule | Make "Not set" (with an action) the single rendering for unknown or unset numbers; zeros only for real zeros. This is a product-and-visual rule that cuts across E2 and every KPI. **Recommend yes**, as a Phase 2 rule (`Money`/`KpiCard` empty state). | Confirm; E16 should confirm per screen. | Critique X4 |

What I need from you, in order: (1) look at the three artifacts and name D1, (2) approve D3's Law 1 wording edit, (3) D10 batch once D1 is known, (4) D15 and D16, (5) confirm the rest by exception: anything you do not object to follows the recommendation.

## 5. Phase 1 starting task list (refined from the plan)

Order matters: the first five items do not depend on D1 and remove evidence-backed defects at the root.

**Before Phase 1 (no direction needed; route to E8/E9 since they edit `apps/web`, so wait for the E8 merge):**
- P0.a `html` and `body` background from `surface.canvas`; document `<title>` per route (8 of 11 routes empty); `<h1>` on onboarding. Small, high value, fixes one Lighthouse artefact and 8 `document-title` failures.
- P0.b Fix `/app/mortgage` 375 px overflow (565 px document width) and the clipped debt strategy cards at 1280.
- P0.c Raw colour sweep for the specific failing values listed in critique section 2.2 (`#94a3b8`, `#6b7280`, `#8b5cf6`, `#818cf8` as text or on white, `#fb2c36`). These are exactly what the E8 T35 text-token sweep targets; confirm with E8 before duplicating.
- P0.d Make `bun run dev` robust: document or script building `packages/finance-engine` first (stale dist produced a 500 on the dashboard in this worktree).

**Phase 1 tasks, first sprint (after D1 and D10):**
1. T1.1 Token architecture note and preset wiring: include a prop vocabulary and the plain-values rule for E12. Add the **unknown-value rule (D16)** to the note.
2. T1.8-first: extend `tokens.a11y.test.ts` to the full matrix I computed (88 pairs plus chart 3:1 and `border.input`); this is a quick win and locks the property that the tokens are already sound before any value changes. Land it before touching values.
3. T1.2 Type scale and textStyles, fonts self-hosted (D5); numeric textStyles carry `tabular-nums`; kill the mono-versus-proportional split.
4. T1.7 Icon wrapper with Lucide plus a `check:laws` rule counting `react-icons` and emoji-as-icon baselines (X3).
5. T1.3 and T1.4 Density (D9 contextual), elevation parity for dark, scrim, zIndex.
6. T1.6 Data-viz palette and the "colour by entity not outcome" rule (X5); fix green-for-deficit by role (chart and status tokens), with a CVD test.
7. T2.3 `Money`/`Num` (unknown state) and T2.4 `KpiStrip`/`KpiCard` (empty value, delta with arrow and text) pulled forward ahead of the rest of Phase 2, because X4 and X5 are the S1 findings.
8. Then T2.5 to T2.10 as planned; do T2.8 (shell, mobile bottom bar with Home and Debt, I-12) and T2.10 (simulator split with the mobile summary bar plus Sheet) before the mortgage pilot.

**Pilot sequence (D4 B):** T3.4 Mortgage plus T3.0 shell in parallel, owner review (D14), then T3.3 Debt (shares the simulator pattern and the clipped-card fix), then T3.1 Dashboard once E16 settles the widget set.

**Plan changes I would make from the evidence:**
- Add a **page-level responsive check at 375 px with horizontal-overflow assertion** to the Phase 8 gate (one Playwright test per route: `scrollWidth <= innerWidth`). It would have caught mortgage today.
- Add a **document-title assertion** per route to the same suite.
- Add a **contrast ratchet for raw colour values** in components (not only token names): extend `check-design-tokens.ts` so any new hex colour fails; the baseline shrinks as screens migrate.
- Move the **persona script (T0.1)** to the front of Phase 1: it was not built in phase 0 (I seeded the Typical persona by API), and it is needed to retake screenshots for before/after pairs. It must stay dev-only per the plan.
- Re-run T0.9 on a **production build** (dev Lighthouse performance is not valid).

## 6. Where everything is

| What | Path |
|---|---|
| Critique, journeys, measured baseline | `docs/audit/plans/E15-phase0-critique.md` |
| This pack | `docs/audit/plans/E15-direction-pack.md` |
| Benchmark | `docs/design/e15/benchmark.md` |
| Screenshots (160 PNGs, 27 MB, naming `route--persona--width--theme.png`) | `docs/design/e15/baseline/` |
| Direction mockups | `docs/design/e15/directions/{a,b,c}/index.html` and `BRIEF.md` |
| Shared hand-over note | `/Users/marcgallagher/Library/Application Support/Claude/side-session-notes/local_ead0c249-3d2a-4f8e-a827-c061356870eb/E15-phase0-handover.md` |

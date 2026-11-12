# Flump product review, November 2026 (pre-beta)

Date: 2026-11-12. Scope: live marketing site and web app, signed out. Read-only: no code was changed, nobody signed in, no accounts created.

## Method and limits

- Live checks: `https://marketing-production-d21f.up.railway.app` and `https://web-production-845e6c.up.railway.app` (home, `/tools`, one calculator, `/pricing`, `/security`, `/sandbox` with all three personas, light and dark, 1280px and 375px).
- Tools: Lighthouse 12 (mobile, simulated throttling), axe-core 4.10 (WCAG 2.0/2.1/2.2 A and AA, run on the sandbox only: the marketing CSP blocks the injected script, so marketing relies on Lighthouse's axe), curl for headers and SEO, Playwright for DOM probes and screenshots.
- Code: a Sonnet subagent read the module routes and components (greps and spot reads; counts are lower bounds). I re-checked the three claims marked "(re-verified)".
- **Not covered:** every signed-in screen. `/sandbox` shows the dashboard only; each "Open" link goes to the login wall (R-02). So net worth, accounts, tax, pension, debt, mortgage, savings, budget, ledger and onboarding were reviewed from code, not seen running. I did not run local `origin/main` (needs backend and auth), so unreleased E15 mortgage screens were not seen. Keyboard focus rings and screen-reader output were not tested by hand (programmatic `.focus()` does not trigger `:focus-visible`, so the result would mislead).
- Tax figures were not independently verified against HMRC. Where I quote an expected figure it is my own arithmetic on 2026/27 rules assuming unchanged bands, and is labelled as such.
- Builds on the static audit in `docs/audit/` (tracks A to N, `SUMMARY.md`). Prior IDs are cited rather than repeated; this review adds what only shows at runtime.

Severity: P1 fix before inviting friends, P2 soon, P3 backlog. Effort: S under 1h, M under 1 day, L multi-day. Overlap tags: **E15** (visual/UX, mortgage and dashboard rebuild), **E12** (mobile companion), **E21** (backend contract).

## Scorecard

| Page (mobile, Lighthouse) | Perf | A11y | Best practice | SEO | LCP | Weight |
| --- | --- | --- | --- | --- | --- | --- |
| Marketing `/` | 97 | 96 | 96 | 66 | 2.1 s | 249 KiB |
| Web `/tools` | 71 | 96 | 96 | 66 | 9.5 s | 1,667 KiB |
| Web `/sandbox` | 73 | 88 | 96 | 58 | 9.2 s | 1,687 KiB |

CLS 0 and TBT under 40 ms everywhere. SEO 58 to 66 is mostly the intentional `noindex` (R-13); the real gaps are listed there.

What already works well: skip link and `main` landmark, `lang`, no horizontal scroll at 375px, honest "Guidance, not advice" banner and "Sample data" label, security page that says "bank connection: coming soon" instead of pretending, marketing page weight, HSTS and a tight CSP.

## Quick wins (each S, do these first)

1. Replace the 1.3 MB `flump_logo.png` with a 100px WebP/SVG and cache it (R-04).
2. Fix dark-mode invisible dashboard heading and button (R-01).
3. Replace the `£X` and `[... PLACEHOLDER]` strings or hide them until real (R-09).
4. Add the missing 2026/27 student-loan table entry so the silent 2025/26 fallback stops (R-06).
5. Drop "exact", "Guaranteed immediate relief" and "Gross take-home" from copy (R-10).
6. UK spellings: Customize, Stabilize (R-11); "Liab" to "Liabilities".
7. Remove the duplicated disclaimer banner in the sandbox (R-07).
8. Put `role="dialog"`/shared Dialog on `AddDebtDialog` (R-15).
9. Make marketing unknown URLs return 404 and delete the duplicate static `<title>` (R-13).
10. Label take-home and safe-to-spend as estimates with the tax year (R-05).

## Findings, ranked

### R-01 P1 S: Dark mode hides the dashboard heading and "Customize Dashboard"
- Evidence: sandbox in dark mode (screenshot described: header bar and cards are dark, but "Welcome back, Sam Jordan" and the Customize button render near-white on a near-white panel, and the Stage 1 banner stays light pink). axe: 14 contrast failures in dark, `h1` contrast 1.14:1, muted sample-data label 2.6:1, "Save my numbers" button 2.4:1.
- Where: `apps/web/app/components/dashboard/HomeDashboard.tsx:327` (h1), `:363` (button), `:479-524` (stage banner). **E15 overlap** (dashboard being rebuilt): fix inside E15, not separately, but confirm E15 covers dark.
- Fix: use semantic text/surface tokens only; add a dark-mode Storybook story plus axe in CI for the dashboard.
- WCAG 1.4.3.

### R-02 P1 L: The sandbox is one screen; every "Open" goes to a login wall
- Evidence: sandbox cards link to `/app/debt`, `/app/accounts`, `/app/budget`; `GET /app/tax` returns 302 to WorkOS AuthKit. Marketing promises a "live interactive demo". A friend who taps "Open" lands on a sign-in page and loses the demo and persona.
- Where: `apps/web/app/components/dashboard/HomeDashboard.tsx:573-577` (links), `apps/web/app/routes/sandbox.tsx`. **E15 overlap.**
- Fix: short term (S) disable or relabel the links in sandbox ("Sign up to open"); proper fix (L) sandbox sub-routes using `demoData` for debt, tax, mortgage, pension.
- Heuristics: H3 user control, H1 status, Goodwill.

### R-03 P1 M: Demo figures contradict each other and are hard-coded
- Evidence (Persona C, £100k): budget take-home £6,680/mo, forecast take-home £5,480/mo, "Est. tax due £26,800", 10-year projection £2,050,711 shown to the pound. My own arithmetic for £100,000 on 2026/27 rules (assuming unchanged bands) gives income tax about £27.4k and NI about £4.0k, so net about £68.6k, roughly £5.7k/mo before pension: £6,680 cannot be right and £26,800 does not match. Persona A: "Liquid cash & buffer £0" while a £950 current account exists; "Debt-free September 2028" assumes minimum payments only while the card says £600 monthly surplus. The header says "Welcome back, Sam Jordan ... your live financial snapshot" on fake data.
- Where: `apps/web/app/utils/demoData.ts:553` (6680), `:492` and `:590` (5480), `:597` (26800); liquid cash uses savings accounts only at `apps/web/app/components/dashboard/HomeDashboard.tsx:92`; welcome copy `:327`.
- Fix: derive demo numbers from `@repo/finance-engine` at build time instead of literals; include current accounts in liquid cash or rename the card; "Example snapshot" instead of "Welcome back" in sandbox. Related: audit C-01 to C-03, I-02.

### R-04 P1 S: 1.3 MB logo on every web page, uncached; LCP 9 s on mobile
- Evidence: `flump_logo.png` is 1,352,124 bytes, shown at 50x50, response `cache-control: public, max-age=0`. It is 79% of the 1.69 MB page weight. Lighthouse LCP 9.2 s (sandbox) and 9.5 s (tools); FCP is 2.3 s, so content paints then waits. The PNG also has a solid mint background, visible as a green square in both themes. `flump_logo_circle.png` is another 833 KB.
- Where: `apps/web/app/components/navigation/HomeLogo.tsx:3-8`; assets in `apps/web/public/images/`.
- Fix: export an SVG or 2x WebP under 10 KB with transparency, serve static assets with long `immutable` caching (hashed filename), re-run Lighthouse. Hypothesis: this removes most of the LCP gap; measure after.

### R-05 P1 M: Tax and take-home numbers shown as exact, with fallbacks that hide staleness
- Evidence (code): take-home labelled "Monthly Take-Home Pay"/"Net Take-Home" with no "estimate", tax year or assumptions. Safe-to-spend invents a 60/40 split of living costs. Pension card hardcodes allowances and a 4% drawdown. Net worth shows £0 when data is missing, not "Not set".
- Where: `apps/web/app/components/forecast/UKTaxCalculator.tsx:413,426,588,729`; `apps/web/app/components/dashboard/HomeDashboard.tsx:105` (re-verified: `calculateSafeToSpend(income, living * 0.6, minDebt, living * 0.4)`), `:388-392` (`netWorth ?? 0`, re-verified); `apps/web/app/components/pension/PensionForecasterCard.tsx:49-54,395`; partial caveat only at `apps/web/app/containers/tax/TaxContainer.tsx:659` (not repeated at `:682,:726,:1174`); `apps/web/app/routes/app.onboarding.tsx:1242`.
- Fix: one shared "Estimate for {taxYear}, based on the figures you entered" line on every tax-derived KPI; render "Not set" instead of £0 when null; label 4% and 60/40 assumptions next to the figure. **E15 overlap** for the dashboard lines.

### R-06 P1 S: Silent fall-back to 2025/26 student-loan thresholds
- Evidence: today is November 2026 (tax year 2026/27). If the 2026/27 key is missing the calculator quietly uses last year's plan thresholds.
- Where: `apps/web/app/components/forecast/UKTaxCalculator.tsx:65` (re-verified). The engine tests already reference 2026/27 (`packages/finance-engine/src/debt-payoff.test.ts:346`), so check the web table.
- Fix: add the entry; if a year is missing, show a visible "using {year} rates" warning rather than falling back. This overlaps the tax-year work on this branch (E22).

### R-07 P2 S: Sandbox mobile chrome and duplicate disclaimer
- Evidence: at 375px about 350 px of banner, persona picker and "Sample data" text sit above the h1; the "Guidance, not advice" banner appears twice (route and dashboard, both `data-testid="projection-notice"`). Lighthouse LCP element is that banner.
- Where: `apps/web/app/routes/sandbox.tsx` and the dashboard disclaimer. Fix: one banner; collapse persona picker into a compact segmented control; sticky "Save my numbers" CTA. **E12/E15 overlap.**

### R-08 P2 M: Hydration error on every page, both apps
- Evidence: console shows "Minified React error #418" on marketing and web on load (Lighthouse "errors in console" fails on all three pages). Likely server and client output differ (candidate: a second `<title>` rendered inside `<div id="root">`, see R-13, or a locale/date value). Cause unconfirmed.
- Where: `apps/web/app/entry.client.tsx:41`; marketing `apps/marketing/src`. Fix: reproduce in dev for the full message; fix the mismatch. Hydration errors force a client re-render and can drop focus and state.

### R-09 P2 S (P1 before public launch): Placeholders live in production
- Evidence: pricing page shows "£X per month" and "Placeholder price: not final"; every page footer shows "[Company name PLACEHOLDER]. [Company number PLACEHOLDER]. [Registered office address PLACEHOLDER]"; security page says no contact exists yet. Honest, but a friend will see it. UK company websites must show name, number and registered office.
- Where: `apps/marketing/src/utils/placeholders.ts:8-13`. Fix: owner supplies values; until then hide the price card and footer legal line behind a flag. Not code-only: needs the owner. Audit M-06 to M-10.

### R-10 P2 S: Over-claiming copy
- Evidence: "calculate the exact pension salary sacrifice" and "exact monthly repayment"; "Know your exact weekly allowance"; "Guaranteed immediate relief" next to a tax estimate; example card says "Gross take-home" (contradiction in terms).
- Where: `apps/marketing/src/pages/ToolsIndexPage.tsx:96,110,341`; `apps/marketing/src/components/FeaturePillars.tsx:412`; `packages/ui/src/calculators/TaxTrapCalculator/TaxTrapCalculator.tsx:266`. Fix: "estimate", "typical", "likely"; "Estimated tax and NI saved". Conflicts with the page's own disclaimer today.

### R-11 P2 S: US spellings, abbreviations, title case
- Evidence: "Customize Dashboard", "Done Customizing", "Stabilize & Clear" (UK: Customise, Stabilise), "Liab £8,000", "Sal Sacrifice", "burn rate allowance" jargon. Marketing says "Customised", the app says "Customize". The sandbox files already use UK spellings.
- Where: `HomeDashboard.tsx:363,391,524` (**E15**); `DashboardWidgetCard.tsx:150-151`; widgets `AccountsWidget.tsx:84`, `TaxWidget.tsx:70`, `ForecastWidget.tsx:82`, `MortgageWidget.tsx:94`. Fix: grep for `ize|izing` in UI strings; add a lint-like test.

### R-12 P2 M: Contrast and primitive-token leaks
- Evidence: axe light mode 5 nodes: raw `success.500` on white 2.53:1 at 18pt, "positive solid" button 4.23:1 (9pt), muted label 2.6:1; marketing "UK" badge 3.44:1 at 11px. Code counts: 45 primitive colour tokens across 12 files, raw hex in six files, rgba literals in four.
- Where: `apps/web/app/components/forecast/UKTaxCalculator.tsx:227,415,709`; `components/tax/CopyTaxYearModal.tsx:648,700`; `components/setup/SetupChecklist.tsx:354`; `containers/tax/TaxContainer.tsx` (8 hits); `containers/pension/PensionContainer.tsx:405-474`; `containers/accounts/accountsContainer/AccountsContainer.tsx:148-191` (account colours not themed for dark); `components/forecast/UKTaxCalculator.tsx:123-139` (chart hex); `components/core/typography/FLPHeading.tsx:43` (remaps `blue.500`, hiding leaks); `routes/app.onboarding.tsx:521` (inline rgba). No leaks under `features/mortgage`. Fix: token sweep with an ESLint/Biome-style ban rule. AGENTS.md section 2.

### R-13 P2 S/M: Marketing SEO basics
- Evidence: `robots.txt` is `Disallow: /` and `x-robots-tag: noindex` on both hosts (intentional and env-gated via `isIndexingAllowed`; make flipping it a launch checklist item). `sitemap.xml` returns the HTML home with 200. Unknown URLs (`/nope`) return 200 with the home page (soft 404). `index.html` has a static `<title>Flump Finance</title>` and Helmet adds a second, page-specific `<title>` inside `<div id="root">`, so `document.title` and crawlers see the generic one first (verified: tool page title reads "Flump Finance"). No Open Graph or Twitter tags. Canonical points at `https://flump.co.uk/...`, which is not live. Favicon is `/vite.svg`. The web app serves its own `/tools` and `/` that duplicate marketing content.
- Where: `apps/marketing/index.html:8`; `apps/marketing/server/ops.ts:26`; `apps/marketing/src/App.tsx:20` (`path="*"` renders HomePage). Fix: remove static title (keep the `<!--head-meta-->` slot), real 404 route and status, generate `sitemap.xml`, OG tags, real favicon. Audit M track overlaps.

### R-14 P2 S: Sign-up and auth journey
- Evidence: Sign up and Log in redirect through `api.workos.com` to `profound-flower-73-staging.authkit.app`: the production-looking deploy uses a *staging* AuthKit tenant (hosted page not viewed). Marketing CTAs use `/signUp`, the app nav uses `/signup`. Unknown web URLs redirect to login instead of showing a 404.
- Where: `apps/web/app/routes/signUp._index.tsx`, `apps/web/app/components/navigation/UserLogin.tsx:37-38`. Fix: confirm the AuthKit tenant, branding and email templates are what friends should see; one casing; real 404.

### R-15 P2 S: Modal accessibility
- Evidence: `AddDebtDialog` is a clickable `div` overlay, no `role="dialog"`, `aria-modal`, Escape handler or focus trap (re-verified: no match in file); Biome a11y rules are suppressed. `WidgetSettingsModal` and `CopyTaxYearModal` use fixed overlays with no dialog role found.
- Where: `apps/web/app/components/debt/AddDebtDialog.tsx:141-150`; `components/dashboard/WidgetSettingsModal.tsx:18`; `components/tax/CopyTaxYearModal.tsx:193,202`. Fix: migrate to the shared `@repo/ui` dialog. WCAG 2.1.2, 4.1.2.

### R-16 P2 S: Heading and live-region semantics
- Evidence: KPI values are `h3`/`h2` (five on the dashboard; also pension and tax pages), producing heading-order failure (Lighthouse) and a noisy outline. Zero `aria-live`/`status` regions on the sandbox, so switching persona and slider results announce nothing; only 18 uses repo-wide, 8 charts with 4 text alternatives. Lighthouse also flags three links with no discernible name (inline-flex `fs_xs` primary links) and the logo link is adjacent to a duplicate "Home" link.
- Where: `HomeDashboard.tsx:387` (**E15**); `components/pension/PensionSummaryCards.tsx:107,130,160,187`; `containers/tax/TaxContainer.tsx:661,682,726`; `UKTaxCalculator.tsx:415,731`; `components/navigation/HomeLogo.tsx:8`. Fix: `<p>`/KpiStrip values; `role="status"` on result summaries; `aria-label` plus hidden data summary for charts.

### R-17 P2 S: Touch targets and mobile
- Evidence at 375px: no horizontal scroll (good), but 14 controls under 44px: persona chips 31px high, theme buttons 32px, card "Open" links 22x18 (below the WCAG 2.2 AA 24px minimum, 2.5.8), widget settings buttons 24x24.
- Where: `routes/sandbox.tsx:198`; widgets `PensionWidget.tsx:127`, `SavingsWidget.tsx:135`, `AccountsWidget.tsx:154`, `BudgetWidget.tsx:180`. Fix: 44px hit area via padding. `CopyTaxYearModal.tsx:541` has a 500px min-width table; `UKTaxCalculator` and `BudgetDashboard` tables show no overflow wrapper. **E12 overlap** for mobile web parity.

### R-18 P3 S: Locale formatting
- Evidence: bare `toLocaleString()` for pounds in onboarding and debt (browser-locale dependent, no tabular-nums); 3 sandbox money figures lack `tabular-nums`.
- Where: `apps/web/app/routes/app.onboarding.tsx:770,1157,1242,1267,1292`; `containers/debt/DebtContainer.tsx:222`. Fix: `useFormatCurrency()`.

### R-19 P2 M: Layout laws not followed outside mortgage and debt
- Evidence (grep): `SimulatorSplitLayout`, `SliderField` and `KpiStrip` appear only in `features/mortgage`, `features/debt/PayoffStrategyControls` and the sandbox. Pension, savings, tax and forecast calculators use their own sliders (`unsetSliderStyle` in `UKTaxCalculator`) and card rows. `CollapsibleDrawer` is used only in the mortgage container and sandbox; 16 files render `<table>`, with at least `DebtToWealthBridgeCard.tsx` and `UKTaxCalculator.tsx` not collapsed. This is the E15 phase 3 direction of travel (not yet enforced).
- Fix: track under E15; this review adds the file list above.

### R-20 P2 M: Onboarding promise vs reality
- Evidence (code, not seen live): marketing says "Enter 6 rough numbers" and "60 seconds", onboarding is three steps in a 1,300-line route with about 15 inputs and local `useState` only. Audit I-01 notes fictional defaults. Needs a runtime check once signed in.
- Where: `apps/web/app/routes/app.onboarding.tsx:108-135,429`. Fix: either shrink to six fields with "add more later", or change the copy to "about 3 minutes".

## Overlap with in-flight work

| Epic | Findings that land in its area | Advice |
| --- | --- | --- |
| E15 (mortgage, dashboard) | R-01, R-02, R-03 (dashboard lines), R-05 (dashboard lines), R-07, R-11, R-16, R-19 | Pass R-01, R-11 and the dashboard lines of R-03/R-05/R-16 to the E15 dashboard session rather than fixing separately. Add dark-mode and axe checks to its definition of done. Mortgage code had no token leaks. |
| E12 (mobile companion) | R-07, R-17, R-20 | Use R-17 targets as the mobile baseline; the sandbox gap (R-02) matters if the companion reuses the demo. |
| E21 (backend contract) | None found signed out. R-05 "£0 for missing data" depends on null-vs-zero in API responses (audit C-20, I-04) | Ask E21 to make nullable fields explicit so the UI can render "Not set". |
| Other | R-04, R-06, R-08, R-09, R-10, R-13, R-14, R-15, R-18 | Independent; R-06 fits E22 (tax year). |

## Suggested order before the friends beta

1. R-04, R-01, R-06, R-10, R-11, R-07, R-15 (all S, about a day total).
2. R-03 and R-05 (trust in numbers), with R-02's short-term relabel.
3. R-09 and R-14 (owner inputs: company details, AuthKit tenant).
4. R-08, R-12, R-13, R-16, R-17, then R-19 and R-20 inside E15.

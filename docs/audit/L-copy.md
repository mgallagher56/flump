# Track L: Copy, content and i18n

Audited against `docs/copy-style-guide.md`, `GLOSSARY.md` and AGENTS.md. Static read and grep only; no runtime pass, no Spanish-locale walkthrough.

## Headline numbers

| Measure                                                                                                            | Value                                                                                    |
| ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Web component files (non-test, non-story)                                                                          | 146                                                                                      |
| Files using `useTranslation`                                                                                       | 15 (all listed in the sweep; most use 1 to 3 keys)                                       |
| Distinct static `t("...")` keys used in code                                                                       | 18 (17 defined, 1 undefined: `more`, which carries an inline default)                    |
| English keys defined (`public/locales/en/common.json`)                                                             | 55                                                                                       |
| Spanish keys defined (`es/common.json`)                                                                            | 19 (35%); 37 English keys missing; 1 orphan (`Contact`)                                  |
| English keys defined but never referenced                                                                          | 37 of 55 (many are dead copies of strings that are still hardcoded)                      |
| Hardcoded user-visible strings (heuristic: JSX text lines and label/title/placeholder/description props, web only) | at least 1,130 across 117 files. Lower bound; multi-line and template strings are missed |
| `home` namespace                                                                                                   | `en/home.json` and `es/home.json` are both `{}` yet registered in `i18n.ts`              |

Hardcoded strings by area (same heuristic): components/home 134, components/budget 125, components/debt 101, containers/tax 93, components/dashboard 85, components/pension 69, routes 51 (onboarding 28), components/dialogs 50, components/savings 48, components/mortgage 45, containers/mortgage 35, components/tax 42, components/forecast 41, features/ai-connections 41, features/sandbox 35, accounts 42, everything else under 20.

Where i18n exists: the nav (`NavMenu`, `MobileBottomBar`, `UserLogin`) and the Accounts add/edit dialog and a few containers. Where it does not: onboarding, dashboard, budget, debt, tax, mortgage, pension, every error, empty state and confirmation.

## Findings

### [L-01] Projection pages carry no "not advice" framing; disclaimers are on tax pages only

- Severity: P1
- Location: `apps/web/app/components/forecast/UKTaxCalculator.tsx:691`, `apps/web/app/containers/tax/TaxContainer.tsx:503` (the only two renders of `TaxDisclaimerButton`; `UserProfilePanel.tsx:182` is only a code comment); absent from `app.mortgage.tsx`, `app.pension.tsx`, `app.debt.tsx`, `app.savings.tsx`, `app.forecast.tsx`, the dashboard and onboarding.
- Evidence: `grep -rln "TaxDisclaimerButton|TAX_DISCLAIMER" apps/web/app` returns only the tax calculator, the tax container, the button itself and a comment. The logged-in app has no persistent disclaimer outside tax. The only other framing is the logged-out marketing footer (`HomeFooter.tsx:224-228`). Mortgage, pension and debt pages show projections, "interest saved" and "reclaimed" figures with no caveat.
- Impact: Flump gives personalised-looking guidance ("Potential annual pension or SIPP tax savings", payoff orders, overpayment comparisons) on pages with no illustrative-only or not-advice statement at the point of use. Regulatory and trust risk.
- Recommendation: add a single `<ProjectionNotice>` (one sentence plus link to the full text) to the shared page layout or `KpiStrip` footer for every `/app/*` calculator page. Example: "Estimates for illustration, based on the figures you entered. Not financial advice." Keep `TAX_DISCLAIMER` for tax.
- Effort: M

### [L-02] Absolute and guarantee language on mortgage, overdraft and MCP claims

- Severity: P1
- Location: `apps/web/app/components/mortgage/OverpayVsSaveCompare.tsx:438,585`; `apps/web/app/components/home/InteractiveFinancialTeaser.tsx:543`; `apps/marketing/src/components/InteractiveFinancialTeaser.tsx:565`; `apps/web/app/routes/tools.$slug.tsx:104,199,270`; `apps/web/app/routes/tools._index.tsx:142`; `apps/marketing/src/pages/ToolsIndexPage.tsx:124`; `apps/marketing/src/components/McpSpotlightSection/McpSpotlightSection.tsx:65`
- Evidence: "Mortgage interest savings are tax-free and guaranteed"; "Mortgage Interest Rate (Guaranteed Return)"; "Guaranteed interest eliminated by overpaying"; "clearing an overdraft delivers an immediate guaranteed 40% tax-free return"; "Mortgage overpayment yields a guaranteed, tax-free return"; "guaranteeing zero hallucinations on UK tax rules"; Avalanche "guarantees you pay the least total interest". Also `tools.$slug.tsx:104` quotes a historic "7% to 9% nominal annualized" equity return as fact (and "annualized" is US spelling).
- Impact: these read as personal recommendations and overstate certainty. The savings are not guaranteed: rates change at remortgage, early repayment charges and overpayment limits apply, and "zero hallucinations" is an unverifiable absolute claim. The tax-free statement is also incomplete (it is not an investment return you can compare like-for-like). Regulatory exposure for a finance tool.
- Recommendation: replace with "at your current rate", "estimated" and "if your rate stays the same". Drop "zero hallucinations" (the deterministic-calculation point stands on its own). Add the ERC and overpayment-allowance caveat beside the comparison. Cite a source and date for any historic return figure or remove it.
- Effort: S

### [L-03] Regulatory status claims are inconsistent and possibly misleading

- Severity: P1
- Location: `apps/web/app/components/home/HomeFooter.tsx:224-228` vs `apps/marketing/src/components/Footer.tsx:160-170`; `apps/web/app/components/home/HomeCTA.tsx:79`; `HomeHero.tsx:242`; `AddEditAccountsDialog.tsx:494` ("FCA regulated Open Banking"); `BudgetDashboard.tsx:632` ("UK FCA Priority Debt Guardrail Active"); marketing `Header.tsx:326`, `ComparisonMatrix.tsx:77`
- Evidence: web footer says "not an authorised or regulated financial advisory firm" and mentions "certified tax accountant (CTA)"; the marketing footer says Flump "connects ... via regulated Open Banking ... (AISP)" and "does not provide regulated financial, tax, or investment advice". Elsewhere the app badges itself "FCA Open Banking" or "FCA regulated Open Banking" with no statement of who holds the AISP authorisation (Flump or its provider). The budget banner labels an in-app rule "FCA Priority Debt Guardrail" although the FCA does not publish such a rule; the content ("Never skip Priority Bills ... to pay credit cards") is general guidance, not an FCA requirement. "Certified tax accountant (CTA)" is wrong: CTA is Chartered Tax Adviser.
- Impact: a reader can take "FCA regulated" to mean Flump is authorised, while the footer says it is not. Attributing a rule to the FCA without a source is a misstatement risk.
- Recommendation: one canonical regulatory sentence in a shared constant, used by web and marketing: name the AISP (provider, FRN) or say "connections are provided by [provider], authorised by the FCA". Rename the banner to "Priority bills come first". Replace CTA with "Chartered Tax Adviser (CTA)". Needs legal sign-off; this audit cannot verify Flump's actual status.
- Effort: S

### [L-04] Mutation failures never reach the user; one generic "Oops" crash page

- Severity: P1
- Location: `apps/web/app/root.tsx:136-160` (the only `ErrorBoundary`); route actions `apps/web/app/routes/app.accounts._index.tsx:39-73`, `app.tax.tsx:33-137`, `app.pension.tsx:51-175`, `app.accounts.$account.tsx:24-70` throw `new Error("Failed to ...")`
- Evidence: 30+ `throw new Error("Failed to ...")` in route actions and no route-level `ErrorBoundary`; `grep ErrorBoundary apps/web/app/routes` returns nothing. Those messages are developer strings that will never be seen, because a throw in an action lands in the root boundary. The root boundary renders `<title>Oops! Something went wrong</title>` and "Uh oh... Something went wrong", with an exclamation mark and a trailing ellipsis (both against style guide section 6), a hardcoded `lang="en"`, no retry or home link, and drops the app shell.
- Impact: a failed account save or a 500 on tax records replaces the whole app with a dead-end page and the user loses unsaved work. This is a broken-journey edge, not only a copy issue.
- Recommendation: return `json({ error })` from actions and render inline field or toast errors in the containers, with specific copy ("We couldn't save your account. Your changes are still on this page. Try again."). Add route-level boundaries that keep the shell, plus a "Try again" button. Rewrite the root text: "Something went wrong" / "Reload the page, or go back to your dashboard."
- Effort: M

### [L-05] Deprecated and banned names still shipped in user-visible copy

- Severity: P2
- Location: `apps/web/app/routes/_index.tsx:15` (page title "UK Wealth, Tax Optimization & Net Worth Engine"); `ComparisonMatrix.tsx:152` ("Engineered for UK reality"); `HomeFooter.tsx:113` ("engineered for clarity and privacy"); `WebBaselineSnapshotPreview.tsx:225` ("Guilt-free cash buffer"); `PayoffStrategyControls.tsx:41` ("mathematical engine ... financial psychology"); `FeaturePillars.tsx:194,235` ("engine", "unlock"); `ComparisonMatrix.tsx:106,118` ("trap engine", "comparison engine"); `InteractiveFinancialTeaser.tsx:307` ("calculation engines"); `WealthCheckHeroWidget.tsx:678` ("unlock your forecast"); `SetupChecklist.tsx:330` ("Widget unlocked"); `marketing/SecurityPrivacySection.tsx:156` ("Analytics & Tax Modeling Engine"); `PromoCliffTracker` and `UkDebtInstrumentsCard` tab "cliff" (identifier and tab name; check the visible tab label)
- Evidence: the style guide section 7 bans "Engineered for UK rules", and section 4 retires "Guilt-Free Cash Allowance", "Promotional Cliff" and "Safe-to-Spend". Hits above are all rendered strings, not comments.
- Impact: brand voice drift; the guide's own rules fail on the highest-traffic page (the root page title is the search snippet).
- Recommendation: edit strings per the guide ("Built for UK rules", "Safe to spend", "Promotional expiry alert"). Add a lint or test grep for the banned list so it stays fixed.
- Effort: S

### [L-06] Terminology is inconsistent for the same concept

- Severity: P2
- Location: repo-wide; counts from a whole-app grep (web, marketing, mobile; comments excluded)
- Evidence: "Safe-to-Spend" 8 and "Safe to Spend" 1 (title case) vs canonical "Safe to spend" 12; "Take-Home" 15 vs "Take-home" 2; "Login" 10 vs "Log in" 2 vs "Sign in" 9 (`en/common.json` itself uses "Log in" and the sign-up verb "Sign up"; sign-in and log-in both appear); "Net Worth" 10 vs "Net worth" 2; "Debt Payoff" 1 vs "Debt payoff" 10; "self-assessment" 2 vs "Self Assessment" 14; "personal allowance" 4 vs "Personal Allowance" 29; "Stocks & Shares" 12 vs "Stocks and Shares" 7; "60 second"/"60-Second" 8 vs canonical "60-second baseline" 5. "Runway" appears 73 times and "Emergency runway" only 8. GLOSSARY.md has no consumer vocabulary at all: it defines code seams (FinancialBaseline, BankSyncOrchestrator) and none of the terms users see, so there is no source of truth for them.
- Impact: users see "Take-Home Pay" in one card and "take-home" in the next; harder to translate later.
- Recommendation: add a "User-facing terms" section to GLOSSARY.md (or link the style guide) and normalise by search and replace. Choose one verb pair (Log in / Sign up) and apply it. Then move the terms into `common.json`.
- Effort: S

### [L-07] Title Case and US spellings in labels, messages and the mobile app

- Severity: P2
- Location: US spelling in visible strings: `apps/web/app/components/navigation/GlobalBaselineScenarioBar.tsx:53` ("Build & Optimize"), `AddDebtDialog.tsx:91` ("optimization"), `PensionAccountsList.tsx:340` ("modeled"), `tools.$slug.tsx:104,262` ("annualized", "standardized"), `routes/_index.tsx:15` ("Optimization"), marketing `SecurityPrivacySection.tsx:156` ("Modeling"); mobile `RootNavigator.tsx:223`, `MortgageScreen.tsx:445,500`, `ForecastScreen.tsx:225`, `DashboardScreen.tsx:377` ("Amortization", "optimize"). Title Case: about 54 `label`/`title`/`text` props in web, e.g. `PayoffStrategyControls.tsx:52` ("Monthly Debt Overpayment"), `SandboxTemplates.tsx:39-148`, `SavingsAccountsList.tsx:664` ("Confirm Delete"), `McpConnectionCard.tsx:610,966` ("Create Token", "Copy Context Pack to Clipboard"), `BankConnectionsList.tsx:247` ("Sync Now").
- Evidence: the guide requires sentence case and en-GB (sections 2 and 5). Mobile (React Native) has US spelling in several user-facing strings. The web app has 4 more in code identifiers only (`amortization` variables), which are fine.
- Impact: inconsistency; mobile reads as a different product.
- Recommendation: fix the strings listed; add a cspell or eslint rule for en-US variants in JSX text.
- Effort: S

### [L-08] Punctuation rules broken: em dashes, exclamation marks, ellipses, `->`

- Severity: P3
- Location: em dashes in visible text: `UKTaxCalculator.tsx:381`, `BudgetSetupWizard.tsx:71,601`, `RunwayCalculator.tsx:938`, the whole `TAX_DISCLAIMER` (`packages/finance-engine/src/tax-rules.ts:39,43`, also tax year descriptions at `:93-845` if rendered); exclamation marks: `McpConnectionCard.tsx:966` ("Copied to Clipboard!"), `UserProfilePanel.tsx:380,401` ("changed successfully!"), `app.onboarding.tsx:987` ("A rough total is fine!"), mobile `ProfileScreen.tsx:412`; ellipsis: `HomeFooter.tsx:322`, `AddEditAccountsDialog.tsx:715-720`, `ConnectBankWizard.tsx:398,598-601`; arrow in copy: `AddEditAccountsDialog.tsx:719` ("Settings -> API")
- Evidence: guide section 6 requires spaced en dashes, no exclamation marks, no trailing ellipses except pending states. Pending ("Generating...", "Syncing...") is allowed. Em dash use is 13 in app/marketing/mobile source files, mostly comments, so this is small; the disclaimer is the main visible case.
- Impact: low; style drift.
- Recommendation: batch fix; add the rule to the same lint as L-07.
- Effort: S

### [L-09] Disclaimer text itself has problems

- Severity: P2
- Location: `packages/finance-engine/src/tax-rules.ts:29-56`
- Evidence: the "full" text opens with "Disclaimer — Indicative Figures Only" and talks about "Revenue Commissioners (Ireland)" and links to revenue.ie although the product states UK-only (the engine does carry Irish rates, see `:599-845`, so confirm whether Ireland is supported before editing). It says "should not be relied upon for making financial decisions" which contradicts the product's purpose and weakens the legitimate framing; "self-assessment" is lower case; sentences run 40+ words with a 16-item exclusion list in one paragraph; the short version is 18 words and fine. Plain "Rules used may be out of date" in the mobile variant gives no date of last update; there is no "rules last updated" stamp.
- Impact: a legal text users do not read; and where it is read it is hard to parse. Missing a visible "rules last verified" date is a trust gap for a tax tool.
- Recommendation: restructure as short headed sections (What this is / What it does not include / Check before you file); add "Rules last updated: <month year>" sourced from the tax config; get legal review of the contradictory "should not be relied upon" sentence.
- Effort: M

### [L-10] Native `confirm()` dialogs and weak confirmation copy

- Severity: P2
- Location: `BankConnectionsList.tsx:63`, `BudgetCategoryTable.tsx:209` ("Delete this entry?"), `TaxContainer.tsx:311,327`; Spanish-and-English-free; mobile `TaxScreen.tsx:208`
- Evidence: 4 native `window.confirm` calls on web. Messages are good in places (the tax-year delete says what and "This cannot be undone"; the bank disconnect says what is removed) but "Delete this entry?" names nothing, and the buttons are the browser's OK and Cancel, not "Delete entry" and "Keep". The reset flow (`UserProfilePanel.tsx:410-411,1295`) uses typing "RESET", which is good, but the error "Please type RESET to confirm." is fine. Other places use a custom modal titled "Confirm Delete" (`SavingsAccountsList.tsx:664`).
- Impact: inconsistent, un-themed, un-translatable, not styled in dark mode, and the verb buttons are unclear.
- Recommendation: one `<ConfirmDialog>` taking a title, consequence and verb ("Delete 12 records", "Keep them"); replace the 4 calls.
- Effort: M

### [L-11] Pluralisation is hand-rolled and missed in places

- Severity: P3
- Location: bug cases: `UkDebtInstrumentsCard.tsx:261,270` ("1 days remaining"), `AnnualAllowancePill.tsx:121` and `PaymentsOnAccountCard.tsx:132` ("1 days left"), `WealthCheckHeroWidget.tsx:421`, `DebtSummaryCards.tsx:132`, `PayoffStrategySwitcher.tsx:237`, `PayoffStrategyControls.tsx:49` ("1 months"). Handled by hand: `SavingsSummaryCards.tsx:134`, `SavingsForecasterCard.tsx:562`, `BudgetWidget.tsx:82`, `OverpaymentSimulator.tsx:466`.
- Evidence: `grep -rn "count:" apps/web/app` finds no i18next plural keys and the locale files contain no `_one` or `_other` forms. Sampled sites show "N days left" with no singular branch in 8 places and a `=== 1 ? "" : "s"` pattern in 4.
- Impact: "1 days left" reads as a bug; it will also not work in Spanish or any language with different plural rules.
- Recommendation: use `Intl.PluralRules` in a small `pluralise()` helper now, or i18next `count` keys when strings move to the catalogue.
- Effort: S

### [L-12] i18n infrastructure is a stub and the Spanish locale is misleading

- Severity: P2
- Location: `apps/web/app/i18n.ts`; `apps/web/app/entry.client.tsx:43-55`; `apps/web/public/locales/es/common.json`; `en/home.json`, `es/home.json`; `MobileBottomBar.tsx:140`; `NavMenu.tsx:272`
- Evidence: language detection is `order: ["htmlTag"]`, taken from the server locale; there is no language switcher (`grep changeLanguage|LanguageSwitch` finds none). `es` has 19 of 55 keys, so a Spanish visitor sees a mostly English UI with a Spanish nav. Specific defects: `es.Contact` is capitalised where English uses `contact` (so the Spanish string is never found); `home` is translated "Hogar" (a house) where "Inicio" is the usual label; `navDebtDesc` in Spanish ("transición a ahorro") and `navSavingsDesc` ("metas") do not match the English meaning ("0% transfer alerts", "AER"); `t("more", "More")` uses a key that is in neither file; `t(child.description, child.description)` passes the English sentence as both key and default so those 6 `navXDesc` keys in the catalogue are never used (all 6 appear in the unused list). `home` namespace is empty in both languages. The error boundary (`root.tsx:138`) hardcodes `lang="en"`. The product is explicitly UK-only (tax, AER, ISA, HMRC); it is not clear Spanish is a goal.
- Impact: a half-translated UI is worse than a consistent English one; dead keys hide that the catalogue and the code have drifted.
- Recommendation: make an explicit product decision. If en-GB only: remove `es`, `home`, the unused 37 keys and the detector, and keep `lang="en-GB"`. If multilingual: first add a catalogue check to CI (missing, unused and orphan keys), then migrate the top strings in the L-14 list. Either way fix `lang` to `en-GB` rather than `en`.
- Effort: M (decision plus clean-up), L (full migration)

### [L-13] Date and number formatting is inconsistent with the en-GB rule

- Severity: P2
- Location: `toLocaleString()` with no locale: `WealthCheckHeroWidget.tsx:660`, `GlobalBaselineScenarioBar.tsx:115`, `DebtContainer.tsx:193`, `app.onboarding.tsx:443,721,1023,1102,1174,1196,1218`; month name from `"default"` locale: `AccountDetails.tsx:94`; duplicated `formatGBP`: `AnnualAllowancePill.tsx:38`, `PaymentsOnAccountCard.tsx:29`, `TaxTrapAlertBanner.tsx:36`, `RemortgageShockSim.tsx:31`, `WealthCheckHeroWidget.tsx:156`, `ScenarioLayersWidget.tsx:68`; mobile has 14 separate `Intl`/`toLocaleString` uses
- Evidence: 15 non-en-GB calls in web; a user whose browser is `de-DE` sees "100.000" in onboarding and "100,000" elsewhere. Several negative-value formatters print "-£1,200" while others print "£-1,200". This repeats the Phase 1 sweep lead and it holds up; the number is a few over the "~10" in the sweep.
- Impact: wrong digit grouping for non-UK browsers, on the very first journey (onboarding).
- Recommendation: route all through `useFormatCurrency` (or one shared `formatGBP`); pass `"en-GB"` explicitly everywhere; one date helper (`d MMM yyyy`). Note: the L-12 decision about locale feeds this.
- Effort: M

### [L-14] Marketing and mobile have no i18n at all and mobile has weak alerts

- Severity: P3
- Location: `apps/marketing/index.html:2` (`lang="en"`, no hreflang); `apps/mobile-companion/src/**` (no i18n library); `TaxScreen.tsx:105-219`, `ProfileScreen.tsx:412-415`
- Evidence: no `i18n`/`useTranslation` import in marketing or mobile. Mobile alerts use one-word titles ("Success", "Error") and "Failed to ..." bodies with no next step ("Failed to save transaction.").
- Impact: if the product stays UK English this is fine; the alert copy is the real issue.
- Recommendation: leave i18n out of scope until L-12 is decided; rewrite alert copy to "[What happened]. [What to do]".
- Effort: S

### [L-15] Jargon and reading level on first-run and marketing surfaces

- Severity: P3
- Location: `HomeFAQ.tsx:79` / `marketing/HomeFAQ.tsx:43` ("Account Information Services (AISP)"), `McpSpotlightSection.tsx:65` ("deterministic financial simulation tools", "PII-scrubbed resources"), `UkDebtInstrumentsCard.tsx:423` ("Sinking Fund"), `FeaturePillars.tsx:235` ("Target LTV milestone tracker"), `PayoffStrategyControls.tsx:41`, `app.onboarding.tsx:552,791,1011` ("compound", "emergency runway", "net worth")
- Evidence: terms such as AISP, LTV, PII, deterministic and balloon appear without a gloss. The onboarding copy itself is short, friendly and concrete (for example "Exclude your mortgage. Enter £0 if debt-free." at `:1121`, and "A rough total is fine" at `:987`), so the first-run tone is good; the issue is the product and marketing blocks around it. I did not measure reading grade programmatically.
- Impact: mismatch with the "direct, grounded" voice for a general UK audience.
- Recommendation: gloss on first use ("read-only access to your account data (AISP)"); replace "sinking fund" with "money set aside for a known bill".
- Effort: S

## Leads from Phase 1 that did not hold up or need qualifying

- "Never refer to sliders": no visible user-facing "slider" text found; hits are element ids, aria-labels ("Starting savings slider", `SavingsForecaster.tsx:226`) and icon names. Screen readers read the aria-labels, which describe a range input, so this is arguably accurate; treat as a judgment call, not a defect.
- "Only 15 of 146 components use `useTranslation`": confirmed (15 files), but the count understates the gap: the 15 files use about 18 distinct keys between them.
- Spanish "extra" key: it is a casing bug (`Contact` vs `contact`), not a different feature.

## Prioritised list of the highest-visibility strings to fix first

1. Root page title, `routes/_index.tsx:15`: "UK Wealth, Tax Optimization & Net Worth Engine" (US spelling, banned "Engine", shows in search results).
2. Mortgage overpay compare note and label, `OverpayVsSaveCompare.tsx:438,585` ("guaranteed") and the teaser on the home page (`InteractiveFinancialTeaser.tsx:543`).
3. Disclaimers: add a short in-app "illustrative, not advice" line to non-tax pages (L-01); fix "certified tax accountant (CTA)" in `HomeFooter.tsx:227`.
4. `McpSpotlightSection.tsx:65` "guaranteeing zero hallucinations".
5. "FCA regulated Open Banking" lines in `AddEditAccountsDialog.tsx:494`, `HomeCTA.tsx:79`, and the "UK FCA Priority Debt Guardrail" banner, `BudgetDashboard.tsx:632`.
6. Root error page, `root.tsx:136-160`, and the missing inline error states on every action (L-04).
7. Onboarding numbers formatted without a locale, `app.onboarding.tsx:443-1218` (first journey for every user).
8. Hero and feature copy with banned wording: `ComparisonMatrix.tsx:152`, `HomeFooter.tsx:113`, `WebBaselineSnapshotPreview.tsx:225`, `FeaturePillars.tsx:194,235`.
9. "1 days left" and "1 months" on the dashboard and debt cards (L-11).
10. Native `confirm()` for deleting records (L-10), starting with `BudgetCategoryTable.tsx:209`.

## Limits

- No runtime pass: I did not load the app, so strings assembled from data (API messages, `err?.message`) were not seen; the Spanish UI was not walked through.
- The hardcoded-string count is a regex heuristic (JSX text lines and a set of props); it misses multi-line template strings and counts some non-translatable labels (brand names, units). Treat 1,130 as a floor.
- Legal and regulatory status (FCA, AISP) cannot be verified from the code; L-03 flags inconsistency only.
- Marketing copy was sampled (footer, FAQ, spotlight, tools index), not read end to end; mobile was grepped, not read.
- Reading grade was assessed by reading, not by scoring tool.

## Quick wins

- Fix the root page title (`routes/_index.tsx:15`) to the guide wording.
- Delete "guaranteed" and "zero hallucinations" in the 7 strings in L-02.
- Replace "certified tax accountant (CTA)" with "Chartered Tax Adviser".
- Add the missing `contact` key casing fix or drop `es` entirely; fix `lang="en"` to `en-GB`.
- Add `"more"` to `en/common.json` or drop the `t()` call; delete the 37 unused keys.
- Pass `"en-GB"` to the 10 bare `toLocaleString()` calls in onboarding and widgets.
- Add a one-line `pluralise()` helper and apply it to the "days left" and "months" strings.
- Rename "Safe-to-Spend" (9) to "Safe to spend", and "Take-Home" (15) to "Take-home", with one search and replace.
- Add a CI grep for the banned list in style guide section 7 and en-US spellings in JSX text.

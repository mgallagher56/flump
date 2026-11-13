# E22 ledger: tax-year and rates maintenance

## Done (phase 1)

- PR 411: `getUkTaxYearContext` (`isFallback`), `classifyUkTaxYear`, one strict resolver; silent 2024/25 and 2026/27 fallbacks removed.
- PR 413: calendar guard (`check:tax-calendar`), owner sign-off tooling (`tax:signoff`), update runbook.
- PR 415: `TaxRatesStatusBanner` on the tax page; owner checklist for the 2027/28 figures.
- No 2027/28 table added. No vector signed off.

## Follow-ups (not done)

1. **Banner coverage.** The stale-rates banner shows on the tax page only. Add it to the pension, forecast/savings, budget and onboarding pages (and the home teaser), ideally via one shared place that is not the app header/nav owned by E15. Until then those pages use 2026/27 rates after 6 April 2027 without saying so.
2. **Unsupported-year state on the tax page.** Records dated outside 2020/21 to 2026/27 are listed but have no computed year view. Add an explicit empty state ("Tax for 20XX/YY isn't supported").
3. **Future-clock CI job.** Run the test suite with the clock set to 6 April 2027 to find crash paths and clock-dependent tests.
4. **Hard-coded years and figures outside the engine** (copy, MCP defaults `2024/25`, baseline `2025/26`): see the E22 plan section 10 (E17 and E23 interplay).
5. **2027/28 table.** Only after the owner completes `docs/runbooks/tax-2027-28-verification-checklist.md`; load as provisional with a source per figure.
6. **Rates registry refactor** (one sourced table per year) and the GOV.UK drift workflow: plan sections 3.1 and 7. **Registry half DONE by E25-T1** (`uk-rule-sources.ts`: per-figure source URL and status per year; `sources` and `unverified` are derived from it). The GOV.UK drift workflow is still open.

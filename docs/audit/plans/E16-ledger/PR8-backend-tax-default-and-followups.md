# E16 execution ledger: PR 8 (backend agrees Self Assessment is off by default, plus follow-ups)

## Changes
- `apps/backend/src/user-profile.service.ts`: removed `"tax"` from the fallback values (used only when a stored list is missing or not an array) and from the new-profile defaults for `enabledPages`, `dashboardWidgets` and `dashboardWidgetOrder`. Existing stored profiles are not touched and nothing is backfilled.
- `packages/finance-engine/src/profile.ts`: the baseline inference no longer switches `tax` on for a salary of £95k or more; only `SELF_EMPLOYED` does, matching onboarding. `DEFAULT_FINANCIAL_BASELINE.enabledModules` (line 36) never listed tax, so no change there.
- Main was red after PRs 405, 408 and 409 merged separately; fixed here: regenerated the `Header` snapshot (Forecast nav entry gone, Tax off by default), updated the baseline-store test that expected tax from salary alone, lowered the backend route-inventory call-site floor from 54 to 51 and emptied `KNOWN_MISSING` (the three G-04 account-detail calls were removed with the history edit UI).

## Left on purpose
- `apps/web/app/utils/demoData.ts` still lists `tax`: these are sandbox personas (self-employed and property investor) that are meant to show Self Assessment, and the sandbox is read-only demo data. No change.
- The backend lists omit `debt` in its fallbacks while the web default includes it. Not changed here (would alter behaviour); worth aligning when the profile defaults move into one shared source.

## Already done earlier (no new work)
- The stale non-UK banners in `TaxContainer` and `UKTaxCalculator` were removed in PR 405; the mobile-companion IE country option and Irish USC/PRSI maths are out of scope of E16, still able to write IE/EUR, and the recommendation to remove them is recorded in `PR4-forecast-merge-redirect.md`.

## Recommendation: correcting a mistaken earlier-month balance (history edit UI is gone)
Context: account history is now read-only; history comes from the monthly check-in (D12-B), which writes the current month.
1. **Allow a back-dated check-in, not a free-form editor.** Let the check-in drawer take a month selector limited to past months of the current and previous tax year, writing the same one value per account per month through the existing check-in path. One audited code path, no per-cell grid.
2. **Last write wins per account and month, and keep the previous value** (an `account_details` row with a `corrected_at` timestamp, or an append-only history table) so a correction is visible and reversible. Do not allow editing future months.
3. **Show it.** In the history table mark corrected months with a small "corrected" tag and offer undo for the last correction, so nobody rewrites history silently.
4. **Do not recreate delete-year or add-year.** Rows appear when a check-in is made. Removing a bad month is a correction to the real value, or 0 if the account did not exist yet.
5. **Prerequisites:** the check-in save works end to end (PATCH vs PUT on `/accounts/:id` was fixed in PR 387), and a backend endpoint for a dated balance write exists. That endpoint does not today, which is why the old edit UI could never work; it is the one new backend change this needs.
Interim for the owner: until that ships, a wrong past month can only be fixed in the database. Given production data is test data this is acceptable.

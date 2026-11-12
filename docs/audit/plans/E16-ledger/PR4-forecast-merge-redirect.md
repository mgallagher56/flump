# E16 execution ledger: PR 4 (Forecast merged into Savings; F21 / D5-B)

- `/app/forecast` is now a loader-only route that returns a 301 to `/app/savings#forecast` (test added).
- Deleted `containers/forecast/ForecastContainer` (+ test) and `components/forecast/SavingsForecaster` (+ test). Savings already had its own forecaster (`SavingsForecasterCard`), so the second implementation went rather than being merged.
- Moved the UK take-home and pay-rise calculator (`UKTaxCalculator`) to a new "Take-home & pay rise" tab on Savings. Its "Apply to forecaster" button now adds the monthly pay-rise to the Savings forecaster's contribution (previously it fed the deleted component). Deviation from the plan: the pack suggested the Tax hub, but the Tax page is the Self Assessment ledger, which becomes an opt-in module (PR 6), so Savings is the more stable home.
- Navigation: removed the Forecast item from desktop and mobile nav; `$feature` shortcut, setup checklist and budget CTA point at `/app/savings#forecast`.
- Kept the `forecast` module key (enabledPages, dashboard widget, checklist step) so no profile data needs a migration; its widget now links to the Savings forecaster. Retiring the key is part of the widget reduction (PR 5).
- Dropped the old page's invented defaults (250 a month and a fixed 5% growth) with the deleted component.
- No ratchet changes. Backend route-inventory unaffected (web route only).
- Ratchets re-baselined (the cut is the reason): token baseline entries for the deleted SavingsForecaster/ForecastContainer and the removed Header icon import.

## Follow-up from review of PR 403 (included here because the same files are touched)
- Removed the stale "non-UK" notices in `TaxContainer` and `UKTaxCalculator` (they rendered for any stored `country` other than GB, which the UI can no longer set).
- **Mobile companion is out of scope of E16 PR 3 and was not changed.** `apps/mobile-companion` still offers an IE country option and its own local Irish USC/PRSI maths, and can still write `country`/`currency` such as IE/EUR to the backend. The web UI now ignores those values (always GB/GBP). Recommendation: remove the IE option and the Irish maths in a small follow-up PR (or leave it to the E12 rebuild, which drops the old app); stored non-GB values can be normalised to GB/GBP with a one-line migration if desired.

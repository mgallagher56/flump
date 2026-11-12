# E16 execution ledger: PR 3 (UK only, no Irish tax; F37 / D6-B)

- `packages/finance-engine/src/tax-rules.ts`: removed `IRELAND_INCOME_TAX`, `IRELAND_USC`, `IRELAND_PRSI`, `calculateIrishTakeHome`, `getCurrentIrishTaxYear`, `getAvailableIrishTaxYears`, `getIrishTaxYearForDate` and their types (about 380 lines) plus tests. Header comment updated.
- `TAX_DISCLAIMER.full`: removed the single "Revenue (Ireland)" source link line. **Owner sign-off needed** on this copy change (E7 rule: owner signs off copy).
- Web profile panel: removed the Country and Currency selectors (15 countries, 11 currencies). The form always saves `country: "GB"`, `currency: "GBP"`; the DB columns are kept.
- `calculateNetTakeHome` is UK-only (country parameter and Irish branch removed). `_index.tsx` take-home gating no longer branches on country.
- `useFormatCurrency` is GBP/en-GB only; `getCurrencySymbol` and the multi-currency locale table removed.
- Not touched: `apps/mobile-companion` (E12 rebuilds it; it has its own local maths), backend columns, existing stored `country`/`currency` values (ignored by the UI).
- Behaviour note: users who had stored a non-GB country now get UK take-home and GBP formatting instead of "Take-home is only available for the UK".
- No routes removed; no ratchet changes; docs do not describe country support.

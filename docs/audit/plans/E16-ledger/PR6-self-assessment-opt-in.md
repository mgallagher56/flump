# E16 execution ledger: PR 6 (Self Assessment as an opt-in module; F19 / D3-B)

- `tax` is now an opt-in page key (`OPT_IN_PAGE_KEYS`). `DEFAULT_ENABLED_PAGES`, `DEFAULT_DASHBOARD_WIDGETS`, the default profile lists and the empty-list fallback in `isPageEnabled` exclude it, so new users get no Tax menu entry or dashboard widget.
- Onboarding enables it only for self-employed users (the old "salary of £95k or more" trigger is dropped; the £100k trap warning is a separate surface). A rental-income trigger is not added because onboarding has no rental-income field yet.
- Profile page has a "Self Assessment module" switch that adds or removes `tax` from `enabledPages`, `dashboardWidgets` and `dashboardWidgetOrder`.
- **Existing users keep what they have**: stored `enabledPages` lists that already include `tax` are untouched, so there is no data migration. The `/app/tax` route still exists and works by URL; only discovery (nav, dashboard, setup checklist) is opt-in. No code or data is deleted, so the ledger and its records are intact.
- Tests: `pageConfig.test.ts`, and a profile toggle test. No ratchet changes, no routes removed, so no inventory floor change.
- Not done here: decide whether to hide the `TaxContainer` route itself when the module is off (needs owner view on deep links), and add a rental-income onboarding question.

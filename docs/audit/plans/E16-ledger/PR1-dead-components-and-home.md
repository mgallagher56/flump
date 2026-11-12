# E16 execution ledger: PR 1 (dead components and duplicate signed-out home)

Authority: owner round 2 and 3 in [DECISIONS.md](../DECISIONS.md) (E16 D10-B, D11b-A; rows F34, F44).

## Removed (all had zero non-test importers)
- Duplicate web public home (F34, D11b-A): `components/home/*` except `HomeFooter` (still used by the tools pages), including `LoggedOutHome`, `HomeHero`, `HomeFAQ`, `HomeCTA`, `ComparisonMatrix`, `FeaturePillars`, `SecurityPrivacySection`, `InteractiveFinancialTeaser`, `WebHowItWorksSection`, `WebBaselineSnapshotPreview`, `WealthCheckHeroWidget` (also F44).
- Dead components (F44): `GlobalBaselineScenarioBar`, `state/scenario.store`, `ScenarioLayersWidget`, `SavingsQuickStartWizard`, `PromoCliffTracker`, `useDebtPayoffSchedule`, `FLPSlider`, `FLPSpinner`, `FLPTable`, `AccountDetailsStyles`, and the unimported barrels `features/debt/index.ts`, `features/sandbox/index.ts`, `state/index.ts`.
- Tests, stories and snapshots of the above.

## Kept on purpose
- `PayoffStrategyControls` and `SandboxTemplates` (F45, D10-B: adopt, not delete). Wiring them onto Debt is in PR 5.

## Behaviour change
- Signed-out `GET /` on the web app now redirects (302) to the marketing site (`VITE_MARKETING_URL`, else `http://localhost:3001` locally, else `https://flump.co.uk`). `?demo=true` still goes to `/sandbox`. The helper `utils/marketingUrl.ts` is shared with logout.

## Ratchets re-baselined (the cut is the reason)
- `scripts/design-token-baseline.json`, `tabular-baseline.txt`, `react-icons-baseline.json`: only entries for deleted files were removed (29 lines, no additions).
- `architecture.laws.test.ts`: dropped allowlist entries for `PromoCliffTracker` and `FLPSlider`; debt feature minimum lowered from 2 to 1 component.

## Not changed
- No routes removed, so no route-inventory floor change. `docs/app_functionality.md` has no reference to the cut surfaces; `docs/pages_and_features.md` now states the signed-out redirect.

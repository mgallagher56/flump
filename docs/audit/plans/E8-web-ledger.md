# E8 web sweeps ledger (untracked)

Branch: claude/e8-web-sweeps-8f92e9 (worktree e8-ui-tokens-6af1eb). Source: E8-plan-draft.md. Decisions: D1 A, D2 A, D3 A, D4 A, D5 A (per DECISIONS.md); D6 dropped (E12).

## Already delivered on main (verified by grep)
T01 matrix, T03 border.input, T05 danger/warning tokens, T06 primary.solid, T10 SliderField, T12 VisuallyHidden, T13 LiveRegion, T22 SimulatorSplitLayout, T26 Table scope/caption, T28 ChartFigure.

## Remaining plan
Batch A (disjoint files)
- A1 T04+T14+T15: FLPInput/FLPSelect/FLPCheckbox (border.input, useId, error association, danger token, checkbox solid fill); McpConnectionCard border.input.
- A2 T07 bare-primary background sweep + ratchet; auth.callback; index.css (focus T09, scroll-padding T24, reduced motion T25 css, checkbox block).
- A3 T16-T20: keyboard gaps, radiogroup, wizard buttons, dialog titles, tax edit button.
Then A4 T21 HomeFAQ + biome rules to error.
Batch B: B1 T23 landmarks, T27 icon-button labels, T11 focus styles, T25 hook/spinner; B2 T29 ChartFigure adoption, T30 live regions; B3 T35 status hex text.
Batch C: Storybook a11y gate T31-T34 (feasibility first).
Final: baselines, four gates, check:laws, coverage, whole-branch review, PRs.

## Log
- Batch A done+committed (A1 fields, A2 primary sweep+css, A3 keyboard). Deviations: toHaveAccessibleDescription unavailable (no jest-dom); Panda class is bg-c_primary.solid; FLPSelect gained error prop; --header-height on :root; data-focus-managed opt-out; AccountsCard ignores inner-element events instead of stopPropagation.
- Batch B committed (landmarks T23, ChartFigure T29 x9, LiveRegion T30, T25/T27/T11, T21 biome rules error). Deviations: ratchets in apps/web/app/ratchets (vitest include); VisuallyHidden gained as=a/href; ChartFigure shows visible h3 title (follow-up: hideTitle prop); mortgage/pension containers announce container-level headlines only; forecast announces on load.
- Storybook build failure was marketing stories importing MemoryRouter missing from .storybook/react-router-mock.tsx; fixed (re-export). Gate T31-34 delegated.
- Review A+B findings to fix: (1) LiveRegion announces on load in Forecast/Mortgage containers; (2) DebtToWealthBridgeCard summary invents "debt-free after N months" when never debt-free; (3) DebtContainer headline ignores minimumEstimated; (4) index.css native checked checkbox border-color must stay primary (2.77:1); FLPCheckbox fill solid is a deliberate plan deviation (white tick on indigo.600; border stays primary); (5) SetupChecklist lost h4 heading + padding target; (6) div in button in ConnectBankWizard; (7) double focus ring on FLPInput/FLPSelect/AccountsCard -> data-focus-managed; (8) stories missing for VisuallyHidden skip link, FLPSelect error, FLPInput/FLPCheckbox error; (9) id change from label text to useId (checked consumers); (10) role=alert on first-render errors: accepted, noted.
- T35 committed: 118 color sites + 8 props -> status.*.text; ratchets added; baselines shrank (1044->939). Left: icon props, stroke/fill hex, ternary props (E14 follow-up).
- Round 2 (PR 386): rule-scoped waivers (29), tab-order sweep guard, storybook/test alias, FLPSpinner label/decorative, HomeDashboard text.primary revert, CI date for required job 2026-11-25. Reviewer note: filtering the storybook project by directory runs side-by-side theme and shows false landmark violations; the real gate (test:storybook light/dark, full) passes 180/180. Follow-ups: multi-line `!test` tags and assignment-form waivers not detected by the ratchet; dead WAIVER consts; FLPSpinner with children is decorative (caller owns live region); arrow keys on payoff radios select (native radiogroup).

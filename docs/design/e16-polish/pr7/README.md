# E16 PR 7 screenshots: pension and savings

Before: the audit's onboarded user (salary £58,000, 8% and 3%, pot £96,000, savings £21,000) on the live app, from the E16 audit sweep. After: each page's Storybook "Filled" story with similar data (no app header), Playwright (Chromium), JPEG, full page, at 375 and 1280, light and dark. Files: `<pension|savings>-<375|1280>-<light|dark>-<before|after>.jpg`. The CI visual baselines in `apps/e2e/visual/__screenshots__` show the seeded e2e user (empty pension).

What changed:

- **Pension:** hero on the saved pot total (ruling D2); KPI strip of 3 with the estimated income first, tagged "Estimate"; one "Your details" card with the pots and the four saved facts behind a quiet drawer; one ScenarioZone with two tools ("At retirement", "Take-home pay"), 3 sliders, the pot at retirement as the outcome with 2 supporting figures, one chart with the retirement age marked; the one notice in the zone footer; "Assumptions and UK rules" in a quiet drawer. Growth chips and the PLSA bar are gone (D6). The £100,000 line is one sentence, uses saved figures only and shows only for adjusted net income of £90,000 to £125,140.
- **Savings:** hero "Total savings"; KPIs only when they hold a real value (no £0 or 0.0%); accounts list with one figure per row and the ISA allowance bar as its footer (an estimate, labelled); the forecast sliders, today's-money toggle, own goal and the deposit timeline are inside one ScenarioZone; no chart when the line would be flat; milestone tiles, result cards, top banner and the second zone are gone (D4).

Re-score (visual / simplicity, design-critique skill):

| Page    | Before    | After     |
| ------- | --------- | --------- |
| Pension | 6.0 / 4.0 | 9.0 / 9.0 |
| Savings | 5.5 / 3.5 | 9.0 / 8.5 |

The last critique round (single pot repeating the hero, the details toggle label, rate precision, the ISA note's second figure, account rows at 375) was applied after that score. Page height at 375 in Storybook: pension 2,568px (from 4,017px live), savings 2,592px, including Storybook's padding.

# E16 PR 10 screenshots: calculator bodies

Before (`origin/main` before #666 and this PR) and after (this PR), marketing tool pages at 375 and 1280, light and dark, Playwright (Chromium) against a local production build. JPEG, full page.

Files: `<tool>-<width>-<theme>-<before|after>.jpg` for `debt-snowball`, `zero-percent`, `overdraft`, `mortgage-vs-isa`, `student-loan`, `pay-rise`, `100k-trap`, `section-24`. No page scrolls horizontally at 375 in either set.

What changed: every calculator is on `SimulatorSplitLayout` with `SliderField` inputs, one outcome card and at most two supporting cards, a short explainer and exactly one notice inside the tool (the page-level notice is removed on web and marketing). No result uses danger or warning colours. Money inputs that are not sliders use `CurrencyInput`/`PercentInput`.

Re-score (visual / simplicity, calculator body; page shell is PR 11):

| Tool            | Before    | After   |
| --------------- | --------- | ------- |
| Overdraft       | 5.5 / 5.5 | 9 / 9.5 |
| 0% deal end     | 5.5 / 5.5 | 9 / 9   |
| Debt snowball   | 5.5 / 5   | 8.5 / 8 |
| Mortgage vs ISA | 6 / 5.5   | 9 / 8.5 |
| Student loan    | 5.5 / 5.5 | 9 / 9   |
| Section 24      | 5.5 / 5.5 | 9 / 9   |
| £100k taper     | 6.5 / 6   | 8.5 / 8 |
| Pay rise        | 7 / 6.5   | 8 / 7.5 |

Below 9.5 because of: the page shell repeating the card's title and intro plus the category badge (PR 11); two notices on the pay-rise tool from `TakeHomeDeltaPanel` (patterns, PR 2); the debt list's six visible fields (a list-based tool, kept deliberately); the £100k tool's table, childcare section and method list all shown at once.

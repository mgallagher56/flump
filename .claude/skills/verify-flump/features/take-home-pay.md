# Take-home pay

The Take-home pay page works out monthly take-home pay from the saved salary, pension and student loan at the current tax year's rates. A strip shows monthly pay before tax and what comes off it, and a what-if zone shows the change a pay rise would make. Nothing on the page is saved; the salary is edited in Settings.

## Sub-features

- `thp-hero` the "Monthly take-home pay" hero, labelled as an estimate.
- `thp-strip` monthly pay before tax, less tax and National Insurance, less pension (or student loan), equals the hero to within £2.
- `thp-pay-rise` the "A pay rise" what-if shows the change in take-home pay a month.
- `thp-shared` the same take-home figure shows on Mortgage estimates.

## How to get to it (user POV)

- Open `/app/take-home`.
- Choose `Show what-if: change your pay` to open the zone, then tab `A pay rise` or `The next £1,000`.

## Driving it with verify-flump

Preconditions:

- Baseline `homeowner` persona (£58,000, England, 8% pension by net pay, no student loan). Shipped journey: `take-home-pay` (`V drive take-home-pay <run-id>`).

- **Hero.** Open `/app/take-home`. `getByRole("group", { name: "Monthly take-home pay" })` shows `£3,451` for the homeowner in 2026/27.
- **Strip.** In `[data-kpi-card]` filtered by label, read `[data-kpi-value]`: `Monthly pay before tax` £4,833, `Tax and National Insurance` £995, `Pension` £387.
- **Pay rise.** Choose button `Show what-if: change your pay`, type `10000` into textbox `Pay rise a year, before tax input`. `getByTestId("pay-rise-outcome")` shows `+£443`.
- **Second view.** Open `/app/mortgage-estimates`; the `Take-home pay` KPI shows `£3,451`.

## Gotchas

- Each card is rounded to the pound and any rounding gap goes into the largest card, so the three cards add up exactly to the hero (4,833 − 995 − 387 = 3,451).
- The hero is always labelled `Unverified estimate`, whatever the tax year; that is intended, not a year-verification notice.
- Figures follow the tax year on the machine's date; re-work any pinned figure by hand when the year changes.
- Type into slider pills by clicking, selecting all and typing; `fill()` appends.

# Student loan calculator

The public student loan calculator shows the repayment a UK student loan plan takes from a salary each month, and whether those repayments are estimated to pay off the balance before it is written off. It uses the current tax year's threshold and works signed out. Nothing is saved.

## Sub-features

- `sl-repayment` a plan, salary and balance give the monthly repayment and the estimated outcome.
- `sl-working` "How this is worked out" states the plan's rate and threshold.
- `sl-below-threshold` a salary under the threshold shows £0 a month.
- `sl-no-unverified` no "Unverified estimate" notice for a signed tax year (#906, #912).

## How to get to it (user POV)

- Open `/tools/uk-student-loan-overpay-or-invest-calculator`, or choose it from `/tools`.

## Driving it with verify-flump

Preconditions:

- Any run; drive it signed out (`journey(..., { signedIn: false })`). Shipped journey: `student-loan-plan5` (`V drive student-loan-plan5 <run-id>`).

- **Plan.** In `getByTestId("student-loan-tool")`, select `plan5` in combobox `Student loan plan`.
- **Figures.** Type into textboxes `Yearly salary before tax input` and `Student loan balance input`. For Plan 5 at £40,000 the `Estimated repayment a month` card in `getByTestId("student-loan-outcomes")` shows `£113` and the outcome `Written off after 40 years` with a £45,000 balance.
- **Working.** Choose button `How this is worked out`: `Repayments on this plan are 9% of pay above £25,000 a year.`
- **Notice.** `getByText("Unverified estimate")` has count 0; `getByTestId("projection-notice")` shows.
- **Below threshold.** Salary £24,000 shows `£0` a month.
- **Not saved.** Reload: the plan is back to `plan2`.

## Gotchas

- There is no tax year picker: the "No Plan 5 repayments were due" line for 2023/24 to 2025/26 cannot be reached from the app. Report it as unreachable, not verified.
- The monthly repayment is shown in whole pounds (£112.50 shows as £113).
- When a plan has no published threshold for the year, `getByTestId("student-loan-refusal")` replaces the figures.
- Type into slider pills by clicking, selecting all and typing; `fill()` appends.

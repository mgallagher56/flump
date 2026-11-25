# Mortgage estimates

The Mortgage estimates page shows what is left each month before housing and lets the user model a loan from a monthly payment, from income, or with a rate change. Once the user says where the property is (and, where the tax has a first-time buyer relief, whether all buyers are first-time buyers), the stamp duty estimate is taken off the deposit with other buying costs, so the property price falls by the tax. Nothing typed in the scenario is saved.

## Sub-features

- `me-left` the "Left each month before housing" hero and the take-home pay, essentials and debt payments strip.
- `me-income` the "From income" tool: a borrowing range from yearly income and a multiple, and a property price once a deposit is added.
- `me-stamp-duty` the stamp duty estimate on the tool's property price, taken off the deposit (PR #905).
- `me-not-saved` a reload puts the scenario back to the saved figures.

## How to get to it (user POV)

- Open `/app/mortgage-estimates`, choose button `Mortgage estimates` in the Mortgage page header (`/app/mortgage`), or link `See mortgage estimates` on Savings.
- Inside the `Model a mortgage` region, choose a tab in `Mortgage estimate tools`, then open `Stamp duty estimate` below the tools.

## Driving it with verify-flump

Preconditions:

- Baseline `homeowner` persona (salary £58,000 prefills the income). Shipped journey: `mortgage-estimates` (`V drive mortgage-estimates <run-id>`).

- **Tool.** Choose tab `From income`; scope to `getByRole("tabpanel", { name: "From income" })`.
- **Income.** Type into textbox `Yearly income before tax input` (click, select all, type, blur), and fill textboxes `Lower multiple of yearly income` and `Upper multiple of yearly income`. `getByTestId("income-multiple-result")` shows the range, for example `~£200,000` for £50,000 at 4 to 4.
- **Deposit.** Choose button `Deposit and buying costs`, fill textbox `Deposit`. The result row reads `With a £50,000 deposit` and `Property price ~£250,000 to ~£250,000, loan to value 80% to 80%`.
- **Stamp duty.** Choose button `Stamp duty estimate`. In `#stamp-duty-panel`, check radio `England or Northern Ireland` in group `Where is the property?`, then `No` or `Yes` in the group starting `Are all the buyers first-time buyers`.
- **Result.** `getByTestId("stamp-duty-result")` shows `Estimated stamp duty: ~£2,450` for not first-time buyers and the result row drops to `~£248,000`, loan to value 81%. `Yes` shows `~£0` and the price goes back to `~£250,000`.
- **Not saved.** Reload: the income pill shows `£58,000` again and the result has no property price.

## Gotchas

- Filling a slider's value pill with `fill()` appends to the selected text; click, select all with `ControlOrMeta+a`, type, then blur.
- The deposit row's label shows the deposit less other buying costs only; the stamp duty shows in the property price, not in that label.
- The stamp duty section asks for its own property price only when the active tool has no price; with a deposit in the tool it says it uses the estimate above.
- The `Unverified estimate.` lead in the scenario notice appears whenever a stamp duty figure shows. That is intended.
- Figures are rounded to 3 significant figures (`~£248,000`); pin the stamp duty line for an exact check.

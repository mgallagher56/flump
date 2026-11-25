# Retirement plan

The Retirement page turns the saved plan details, the accounts that count towards retirement and the State Pension into an estimated yearly income in today's prices, after income tax. A what-if zone changes the retirement age, plan-to age, contributions, growth case and how tax-free cash is taken without touching the saved plan; the saved plan changes only when the user selects Save plan.

## Sub-features

- `ret-save` filling the plan details and selecting `Save plan` shows an estimate from the saved retirement age.
- `ret-after-tax` the headline and the year-by-year table show income after income tax; where tax is due, the After tax column is below Before tax.
- `ret-lump-sum` the what-if `Lump sum at retirement` shows a tax-free lump sum of 25% of the pensions, up to the lump sum allowance.
- `ret-persist` a saved change is still there after a reload.

## How to get to it (user POV)

- Open `/app/retirement`, or find Retirement under the `Savings and pension` menu in the primary navigation.
- The `Add your plan details` link in the empty headline jumps to `Your plan details`.

## Driving it with verify-flump

Preconditions:

- `retiree` persona (`V seed retiree <run-id>`): no saved plan, Northern Ireland, pensions of £142,000, £63,000 and £37,000. Shipped journey: `V drive retirement <run-id>`.

- **Empty start.** Open `/app/retirement`. Group `Estimated yearly income in retirement` shows `Not set`.
- **Save a plan.** In `#retirement-plan-details`, fill textboxes `Retirement age` (66), `Plan to age` (90), `State Pension age` (67) and `State Pension forecast (pounds a year)` (12000), then choose button `Save plan`. `Retirement plan saved.` shows and group `Estimated yearly income from age 66` shows a `~£` figure.
- **After tax.** Choose button `Show what-if: change your plan`, then the button whose name starts `Assumptions, pots and year by year`. In the table with column `After tax`, each row with `Income tax` above £0 has After tax below Before tax.
- **Lump sum.** Choose button `Lump sum at retirement` (it becomes pressed). Focus slider `Retirement age` (exact) and press Home. `#retirement-scenario-outcome` reads `Tax-free lump sum at age <min>: ~£60,500.` (25% of £242,000, with no years of growth).
- **Persist.** Choose `Reset to saved figures`, change `Retirement age` to 65 and save. Reload: the saved fields read 65, 90, 67 and 12,000, and the headline names age 65.

## Gotchas

- The retirement plan is not on the `/api` allow-list: prove a save by reloading and reading the fields back.
- `Retirement age` is both a slider (what-if) and a textbox (saved plan). Scope by role, and the textbox by `#retirement-plan-details`.
- A what-if never saves. A tax region of Scotland can switch income tax off with a notice; the headline then says before tax.
- Estimates are rounded to three significant figures with a `~`. Pin only figures you can work by hand, such as the lump sum at today's age.

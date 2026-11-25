# Self Assessment

The Self Assessment page records income outside PAYE and its expenses for each tax year, groups them by income source, and shows an estimated tax bill in a Summary. Each income source has its own page. It is opt-in: someone who has not turned it on sees an offer instead.

## Sub-features

- `sa-add-income` add a record from `Add income or expense` and see the Summary's estimated bill.
- `sa-add-expense` add an expense from the Summary and see the bill fall.
- `sa-source-page` the income source's page lists its records.
- `sa-old-path` `/app/tax` opens `/app/self-assessment`.

## How to get to it (user POV)

- The `Self Assessment` page in navigation (when switched on), or open `/app/self-assessment`.
- `/app/self-assessment/<source>`, for example `/app/self-assessment/self-employed`.
- Old links to `/app/tax` land on the page.

## Driving it with verify-flump

Preconditions:

- `selfemployed` persona (`V seed selfemployed <run-id>`): Self Assessment on, Wales, no tax records. Shipped journey: `V drive self-assessment <run-id>`.

- **Empty start.** Open `/app/tax`. The URL ends `/app/self-assessment` and region `Add income outside PAYE to see an estimated tax bill` shows.
- **Add income.** Choose button `Add income or expense`, then menu item `Self-employed income`. In dialog `Add a record` fill textbox `Name`, textbox `Amount` (40000), select `Yearly` in combobox `How often`, then choose `Add record`. Region `Summary` shows `£40,000` and `getByTestId("hero-figure")` shows the bill: £6,872 in 2026/27 (39,000 profit after the trading allowance; Income Tax 5,286 plus Class 4 NI 1,585.80).
- **Add an expense.** In `Summary` choose button `Add an expense`, add a Yearly record of 3000. `Summary` shows `£37,000` and the bill falls by £520 (2,000 less profit at 20% plus 6%).
- **Source page.** Open `/app/self-assessment/self-employed`: both record names show.
- **Persist.** Open `/app/self-assessment` again: the bill and `£37,000` are unchanged.

## Gotchas

- Tax records are not on the `/api` allow-list: prove a save by a second page view.
- The Summary region only shows once a record exists; before that the page shows its empty state.
- The bill follows the tax year's rules. Pin a figure only with the working in a comment, and only inside that tax year.
- `Figures to check` offers estimates worked out from accounts (savings interest, buy-to-let mortgage interest); adding one changes the bill.
- Deletes count towards the backend's 10 destructive calls an hour; reseed rather than delete records.

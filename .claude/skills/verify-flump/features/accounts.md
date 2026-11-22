# Accounts

The Accounts page lists everything the user owns and owes from saved balances, in two lists, "What you own" and "What you owe". Adding an account saves it straight away, lists it with its type and balance, and changes the net worth everywhere it shows.

## Sub-features

- `acc-add` the Add account dialog saves a named account with a type and balance.
- `acc-list` the new account shows in the right list with its type label and balance.
- `acc-persist` it is still there after a reload and in `GET /api/accounts`.
- `acc-net-worth` the dashboard net worth rises by an asset's balance.

## How to get to it (user POV)

- Choose `Accounts` in the primary navigation, then the `Add account` link in the page header.
- Open `/app/accounts` directly.
- From a page with no accounts yet, the empty state's `Add account` link.

## Driving it with verify-flump

Preconditions:

- Any persona with at least one account. The baseline `homeowner` is fine; the journey reads net worth first, so earlier changes do not break it.

- **Whole recipe.** Run `V drive accounts-add`. It prints `PASS accounts-add` and six `ok` steps, and saves `api-account.json` and `net-worth.json`.
- **Read net worth.** Open `/`. Read the number in `[data-figure="netWorth"]`.
- **Open the dialog.** Open `/app/accounts` and choose `getByRole("main").getByRole("link", { name: "Add account", exact: true })`. `getByRole("dialog", { name: "Add account" })` shows.
- **Fill and save.** In the dialog, fill textbox `Name`, select `Current` in combobox `Account type`, fill textbox `Balance` with `2500`, then choose button `Add account` (exact). The dialog closes and `getByRole("list", { name: "What you own" })` has a listitem with the name, `Current account` and `£2,500`.
- **Persistence.** Reload. The same listitem shows.
- **Read-back.** `api("/accounts")` returns the account with `balance` 2500.
- **Dependent page.** Open `/`. `[data-figure="netWorth"]` shows the earlier figure plus £2,500.

## Gotchas

- The `Add account` name matches both the header link and the dialog's submit button: scope the link to `main` and the button to the dialog, with `exact: true`.
- The account name is made unique per run (`Verify current <id>`), so repeat runs add more rows rather than failing; restore with `V seed homeowner`.
- Debts are entered as positive balances and land in "What you owe"; the net worth then falls, not rises.

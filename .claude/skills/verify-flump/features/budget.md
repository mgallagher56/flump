# Budget

The Budget page shows money in each month, spending by category and what is left over each month. Entries are added and changed in place in edit mode, and each change saves as the user goes.

## Sub-features

- `bud-add` add a spending entry to Expenses in edit mode.
- `bud-left-over` the "Left over each month" figure falls by the entry's amount.
- `bud-persist` the entry is still there after a reload and in `GET /api/budget-entries`.

## How to get to it (user POV)

- Choose `Budget` in the primary navigation, or open `/app/budget`.
- Choose `Edit budget` to add or change entries, then `Finish editing`.

## Driving it with verify-flump

Preconditions:

- Baseline `homeowner` persona. Shipped journey: `V drive budget-add-entry <run-id>` (it names the entry `Gym <suffix>`). Run `V seed homeowner <run-id>` afterwards.

- **Read left over.** Open `/app/budget`. The `getByRole("group", { name: "Left over each month" })` group shows `£135` and the `Expenses` button `£1,040` (homeowner: 3,450 in, less 1,250 + 725 + 1,040 + 300).
- **Edit mode.** Choose button `Edit budget`, then button `Add to expenses`.
- **Add entry.** Fill textbox `New entry name in Expenses` with `Gym` and textbox `New entry amount in Expenses` with `40`, then choose button `Add to Expenses`. `getByLabel("Amount for Gym")` shows.
- **Finish.** Choose `getByRole("button", { name: "Finish editing" }).first()`. The button whose name starts `Expenses` contains the new total.
- **Left over.** The `Left over each month` group shows `£95` (£135 less £40) and `Expenses` shows `£1,080`.
- **Persistence.** Reload, then `api("/budget-entries")` and check an entry named `Gym` with amount 40.

## Gotchas

- `Add to expenses` (opens the row) and `Add to Expenses` (saves it) differ only in case. Use the exact names.
- There are two `Finish editing` buttons (top and bottom); take the first.
- Some budget lines are linked to accounts or the salary (mortgage payment, rent, take-home pay) and are not edited here; pick a plain expense for the proof.

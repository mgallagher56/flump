# Monthly check-in

Once a month the user records each account's balance. The dashboard shows a check-in card while the current month is unrecorded; the check-in runs account by account in a dialog on the history page, saves each row as it is confirmed, and the history page then shows the month.

## Sub-features

- `chk-card` the dashboard's Monthly check-in card opens the check-in.
- `chk-row-save` confirming a row saves it at once ("Updated £…").
- `chk-history` after closing, Net worth history shows the recorded month.

## How to get to it (user POV)

- The `Start monthly check-in` (or `Continue check-in`) link on the dashboard card.
- The `Start monthly check-in` button on the Accounts page header.
- Open `/app/accounts/history?checkIn=1`.

## Driving it with verify-flump

Preconditions:

- Baseline `homeowner` persona with the current month unrecorded (a fresh `V up` or `V seed homeowner`; seeding writes only past months). Shipped journey: `V drive monthly-check-in <run-id>`. Run `V seed homeowner <run-id>` afterwards.

- **Open from the card.** Open `/`. In `#monthly-check-in-card`, the heading `Monthly check-in` shows; choose the link matching `/^(Start monthly|Continue) check-in$/`. The URL ends `/app/accounts/history?checkIn=1`.
- **Record a balance.** In `getByRole("dialog", { name: "Monthly check-in" })` (it names the current month), fill textbox `New balance in pounds, Current account` with `3,600` and press Enter. `Updated £3,600` shows.
- **Close.** Press Escape. The dialog closes and heading level 1 `Net worth history` shows.
- **History.** Text matching `/^(Net worth recorded for |Up £|Down £|No change since )/` shows, and `api("/accounts")` has `Current account` at 3600. Reload `/app/accounts/history`: `getByTestId("snapshot-history")` names the current month.
- **Part done.** Back on `/`, the card still shows (one row saved does not finish the check-in) and its link reads `Continue check-in` (Rule B17): one step holds a figure and at least one is still empty.

## Gotchas

- A second run on the same data starts from this month's part-done (or finished, when the card no longer shows) check-in. Restore with `V seed homeowner` first (the seed resets the user's data, which removes the current month).
- Only a finished check-in hides the card: saving one row leaves it showing, with `Last check-in` still naming last month.
- Recording the seeded balance unchanged (`3,400`) still saves the month but proves no change; use a different figure.
- From the md breakpoint up the check-in is one list; on a phone viewport it is one account per screen.

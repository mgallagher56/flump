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

- Baseline `homeowner` persona with the current month unrecorded (a fresh `V up` or `V seed homeowner`; seeding writes only past months). No shipped journey: write one from the template in `SKILL.md`.

- **Open from the card.** Open `/`. In `#monthly-check-in-card`, the heading `Monthly check-in` shows; choose the link matching `/^(Start monthly|Continue) check-in$/`. The URL ends `/app/accounts/history?checkIn=1`.
- **Record a balance.** In `getByRole("dialog", { name: "Monthly check-in" })` (it names the current month), fill textbox `New balance in pounds, Current account` with `3,600` and press Enter. `Updated £3,600` shows.
- **Close.** Press Escape. The dialog closes and heading level 1 `Net worth history` shows.
- **History.** Text matching `/^(Net worth recorded for |Up £|Down £|No change since )/` shows, and `api("/accounts")` has `Current account` at 3600.

## Gotchas

- Once the current month is recorded the card no longer shows, so a second run on the same data fails at the first step. Restore with `V seed homeowner` (the seed resets the user's data, which removes the current month).
- Recording the seeded balance unchanged (`3,400`) still saves the month but proves no change; use a different figure.
- From the md breakpoint up the check-in is one list; on a phone viewport it is one account per screen.

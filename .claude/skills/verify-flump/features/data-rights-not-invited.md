# Data rights when not invited

While the beta is invite-only, a signed-in person who is not in it (never invited, or removed) sees one "not invited" page instead of the app. That page still lets them download their data as one JSON file and delete their account, then lands them on the account-deleted page; after that the app stays closed to them.

## Sub-features

- `dr-gate` every app page shows the "This account has not been invited yet" page, with no main navigation.
- `dr-export` `Download your data` saves a `flump-export-YYYY-MM-DD.json` file holding the person's user id and data sections.
- `dr-delete` `Delete account` opens a type-to-confirm dialog; confirming with `DELETE` erases the account and opens `/account-deleted`.
- `dr-closed` after deletion, app pages and signing in again lead to the account-deleted page, never to the app.

## How to get to it (user POV)

- Sign in with an account that is not in the beta: any app page, or `/login`, shows the not-invited page.
- The page's `Download your data` and `Delete your account` sections are the only ways on, besides signing out.

## Driving it with verify-flump

Preconditions:

- An invite-only run whose user is not invited. Start it with a beta admin who is someone else: `BETA_ADMIN_USER_IDS=verify_other_admin V up --skip-build --no-seed` (seeding would fail with 403, since the user cannot write data). The journey signs in itself. Shipped journey: `V drive data-rights-not-invited <run-id>`. It erases the run's user, so run `V down <run-id>` afterwards.

- **Gate.** `page.goto("/login")`. Heading level 1 `This account has not been invited yet` and `getByTestId("not-invited-data-actions")` show; `getByRole("navigation", { name: "Main navigation" })` is absent. `/app/accounts` shows the same page.
- **Export.** In `#export-data-section`, wait for the `download` event while choosing button `Download your data`; save it. The status reads `Your download has started.` The file parses as JSON and contains `dev_user_123`.
- **Delete.** Choose button `Delete account`. The `alertdialog` `Delete your account?` has button `Delete my account` disabled until its textbox holds `DELETE`; choose it.
- **Landing.** The URL becomes `/account-deleted`. Locally it is `/account-deleted?state=pending` with heading `Finish deleting your account` and `Your data has been deleted.`; with WorkOS configured it is heading `Your account has been deleted`.
- **Closed.** `/app/accounts` and `/login` both end on the account-deleted page; no not-invited actions, no dashboard.

## Gotchas

- Locally the beta is open unless an allowlist or a beta admin is set, and there is only one user (`dev_user_123`), so a persona cannot be seeded for a not-invited user: the export holds the user id and empty sections.
- No WorkOS client locally, so removing the login always stays pending; `Remove my login` repeats the request and stays pending too.
- The not-invited and refused pages answer 403 by design, so `problems.jsonl` lists those document loads as console errors.
- A deleted user stays deleted: a second run of the journey needs a fresh `V up`.

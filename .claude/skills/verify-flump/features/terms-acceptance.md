# Terms acceptance

A signed-in person agrees to the terms of use and is shown the privacy notice before using Flump: after sign-up and the invite, before setup, and again when a version comes into force. A change to the privacy notice alone asks them only to read it and continue. Until they agree, every app page sends them to the acceptance page, which still lets them download their data, delete their account or sign out.

## Sub-features

- `ta-first` a new person lands on `/terms-acceptance` (heading `Please read and agree to our terms`) before setup; `Agree and continue` opens setup.
- `ta-gate` any app page sends someone who has not agreed to `/terms-acceptance?next=<that page>`.
- `ta-rights` without agreeing: `Download your data`, `Delete account` and `Sign out` work from the page.
- `ta-privacy` a changed privacy notice alone: heading `Our privacy notice has changed`, button `Continue`, never "agree".
- `ta-done` once agreed, `/terms-acceptance` goes straight on to the next page.

## How to get to it (user POV)

- Sign in for the first time: the page shows before anything else.
- Visit any app page without an agreement to the versions in force (after a version change).

## Driving it with verify-flump

Preconditions:

- New user: `V up --skip-build --no-seed` (seeding agrees). `V drive terms-new-user <run-id>`.
- Existing user: `V up`, then `docker exec flump-verify-<run-id>-pg psql -U postgres -d flump_e2e -c 'DELETE FROM terms_acceptances'`, wait 31 seconds, `V drive terms-existing-user <run-id>`. It signs out at the end; `V seed homeowner <run-id>` agrees again.
- Version change: `V seed homeowner <run-id>`, then `docker exec ... -c "UPDATE terms_acceptances SET privacy_notice_version = '0.1'"`, wait 31 seconds, `V drive terms-version-change <run-id>`.

- **First visit.** `page.goto("/login")` ends on `/terms-acceptance?next=...`; heading level 1 `Please read and agree to our terms`; no checkbox; text `You do not need to agree to it.`; button `Agree and continue` ends on `/app/onboarding`.
- **Gate.** `/app/accounts` ends on `/terms-acceptance?next=%2Fapp%2Faccounts`.
- **Rights.** `#export-data-section` button `Download your data` starts a download; `getByTestId("delete-account-trigger")` opens `alertdialog` `Delete your account?`; button `Sign out` leaves the app.
- **Privacy only.** Heading `Our privacy notice has changed`, button `Continue`, no `Agree and continue`; continuing ends on `/`.

## Gotchas

- The backend trusts a saved agreement for 30 seconds, so after changing `terms_acceptances` by hand wait 31 seconds before driving.
- `V seed` agrees to the terms on the way (apps/e2e `agreeToTermsIfAsked`), so a seeded run never shows the page until the row is removed or changed.
- The privacy notice 0.1 to 0.2 change is real history in `LEGAL_PAGES`; a terms change cannot be shown locally without a newer terms version in the code.

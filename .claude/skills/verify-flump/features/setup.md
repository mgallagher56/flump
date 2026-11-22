# Setup for a new user

A user with nothing saved is sent to setup ("Set up Flump"), a focused flow without app navigation: income, housing and spending, then savings and debt (skippable), then a review of what will be saved. Finishing saves the details and opens the dashboard.

## Sub-features

- `setup-redirect` a user who has not finished setup lands on `/app/onboarding` from `/`.
- `setup-steps` income, housing (renting) and a skipped savings step reach the review.
- `setup-review` the review shows the answers as typed and a take-home estimate.
- `setup-finish` `Finish and open dashboard` saves and lands on the dashboard.

## How to get to it (user POV)

- Sign in as a user with no saved details; `/` redirects to setup.
- Open `/app/onboarding`.

## Driving it with verify-flump

Preconditions:

- An empty user. In your journey, call `clearToNewUser(page)` from `apps/e2e/support/personas.ts` (absolute import) after sign-in: it calls the reset endpoint the web app itself uses (`POST /user-profile/reset-financial-data`) and spends one of the 10 resets an hour. Afterwards run `V seed homeowner` to restore the baseline.

- **Redirect.** Open `/` and wait for network idle. The URL ends `/app/onboarding`, heading level 1 `Set up Flump` shows, and `getByRole("navigation", { name: "Primary" })` has a count of 0.
- **Income.** In region `You and income`: fill textbox `Your age` with `31`, check the radio matching `/^Employed/`, fill textbox `/^Yearly salary before tax/` with `36,000`, select `England` in combobox `/^Where do you pay tax/`, choose button `Next` (exact).
- **Housing.** In region `Housing and spending`: check radio `Renting` (exact), fill textbox `/^Monthly rent/` with `900` and `/^Other monthly spending/` with `600`, choose `Next`.
- **Savings.** In region `Savings and debt`, choose button `Skip this step`.
- **Review.** Heading `Review what will be saved` shows, with definitions `£36,000`, `Renting`, `£900 a month` and `£600 a month`, and text starting `Monthly take-home pay (estimate)`.
- **Finish.** Choose button `Finish and open dashboard`. Text `Details saved` (exact) shows, the URL is `/`, and the `Net worth` group shows `Not set`.

## Gotchas

- The take-home estimate follows the current tax year's rules: read it, never pin it.
- `Details saved` also appears in a screen-reader status line (`Success: Details saved`); match it with `exact: true`.
- Renting creates no account, so the dashboard shows no net worth until an account is added.

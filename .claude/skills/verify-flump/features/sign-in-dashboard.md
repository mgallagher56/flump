# Sign in and the dashboard

A user signs in and lands on the dashboard ("Your money"), whose headline is their net worth from saved balances, shown once. Signing out from the account menu returns them to the public marketing site, and the app no longer lets them in.

## Sub-features

- `dash-sign-in` the `/login` route signs in and lands on `/`.
- `dash-net-worth` the hero figure shows net worth, once on the page.
- `dash-sign-out` the account menu's Sign out ends the session and lands on the marketing site.
- `dash-signed-out` a signed-out visit to `/` goes to the marketing site.

## How to get to it (user POV)

- Open `/login` (locally the test-only dev session stands in for WorkOS).
- Open `/` when signed in.
- Choose the `Account menu` button, then the `Sign out` menu item.

## Driving it with verify-flump

Preconditions:

- Baseline `homeowner` persona, unchanged (net worth £231,400). If another journey changed it, run `V seed homeowner` first, or set `VERIFY_NET_WORTH` to the expected figure.

- **Whole recipe.** Run `V drive dashboard`. It prints `PASS dashboard` and four `ok` steps.
- **Sign in.** Signed out, go to `/login`. The URL becomes `/` and `heading` level 1 `Your money` shows.
- **Net worth.** `[data-tone="hero"]` filtered by `Net worth` contains `£231,400`, and `[data-figure="netWorth"]` has a count of 1.
- **Sign out.** After hydration, choose `getByRole("button", { name: "Account menu" }).first()`, then `getByRole("menuitem", { name: "Sign out" })`. The URL is the run's marketing URL.
- **Signed out.** Go to `/`. The URL is the marketing URL again.

## Gotchas

- The hero also says how net worth moved since last month (for example `Up £5,075 since October`). Match the figure as a substring, not the whole text.
- The journey starts signed out on purpose (`signedIn: false`). Signing out there does not end the run's saved session, so later journeys stay signed in.
- Clicking the account menu before hydration does nothing; the journey waits for `html[data-hydrated]`.

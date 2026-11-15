# E16 round 3: app-wide verification sweep (R2-11)

2026-11-15, on `main` at `eb816fac85dd432557553bc3af53acdfb38090e7` (branch `claude/e16-r3-rescore`), after rounds 2 and 3 of the polish programme merged. The findings (counts per page, cross-page figure tables, defects and flow notes) are kept outside the repository; this folder holds the frames and the metrics.

The frames are not meant to be committed (41 MB). Note: the root `.gitignore` ignores `docs/design/e16-polish/after/**/*.jpg` only, so the JPEGs here show as untracked files.

## How it was run

- Build: `lockf /tmp/flump-gate.lock bun run build` (all 14 tasks from cache at this commit).
- Database: a fresh `flump_e2e_r3` in the `flump-e2e-pg` container (port 5433). Servers: the built backend, web app and marketing site on `E2E_BACKEND_PORT=4123`, `E2E_WEB_PORT=3123`, `E2E_MARKETING_PORT=3124`, started by hand with the same environment as `apps/e2e/support/servers.ts`, so the sweep reused them and they stayed up for part 2. Real clock (macOS has no libfaketime): month labels are November 2026, and October 2026 is the last recorded month.
- Part 1: `SWEEP_OUT=docs/design/e16-polish/after-r3 bun run sweep:design`, every set (renter, mortgage, dialogs, onboarding, out, mkt), 375x812 and 1280x800, light and dark, full page and first view. 6 passed in 8.1 minutes.
- Part 2: throwaway Playwright scripts (not in the repository) that drive the built app with clicks and typing and save a numbered JPEG at each step. Each flow re-seeds the persona first with `applyPersona` from `apps/e2e/support/personas.ts`. Each flow runs once at 1280 and once at 375 (light). The 375 run also takes a dark frame of the end state. Frame numbers can differ between the two widths, because the check-in has one step per screen at 375 and one list at 1280.
- New-user setup (flow a) ran on its own stack: database `flump_e2e_r3a`, backend 4127, web 3127. Ports 3125 and 4124 were taken by another worktree's dev server.
- Seeding: `applyPersona` resets the user on every call, because its "already seeded" check reads `GET /user-profile`, which the `/api` proxy does not allow (it answers 404). So every seed uses up one of the ten resets allowed an hour. Instead of recreating the database each time, the scripts cleared the `rate_limit_buckets` row in the throwaway `flump_e2e_r3` database before each seed. The effect is the same.

## What each folder holds

| Path                             | Contents                                                                                                                                                                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `renter/`, `mortgage/`           | Every signed-in page and secondary tab for the renting and the home-owning household (`<page>[--<tab>]-<width>-<theme>[-fold].jpg`)                                                                                                  |
| `dialogs/`                       | Viewport frames of the dialogs, sheets and menus the sweep could open (homeowner)                                                                                                                                                    |
| `onboarding/`                    | Shows the dashboard: a finished user is sent there from `/app/onboarding`. Setup with figures is in `flows/a-new-user/`                                                                                                              |
| `out/`, `mkt/`                   | Signed-out web pages (tools index, 8 tools, 3 sandbox households, 404, signup, login) and the marketing site                                                                                                                         |
| `metrics-<set>.json`             | DOM metrics per frame: `foldDistinct` (N1 under the whole-card first-view rule), `foldDistinctAnyPart` (the old count), `pageDistinct` (N), `heroes`, `notices`, `notSet`, `primaryButtons`, `pageHeight`, `hscroll`, console errors |
| `unreachable-<set>.json`         | What the sweep could not open (see below)                                                                                                                                                                                            |
| `flows/a-new-user/`              | A brand-new user: setup steps 1 to 4 with a renter on £32,000, Finish, then the dashboard, accounts, budget and take-home pages                                                                                                      |
| `flows/b-check-in-short/`        | Homeowner check-in from the dashboard: 4 typed balances, "No change to the rest", the summary, then the dashboard, accounts and history pages                                                                                        |
| `flows/b-check-in-full/`         | The same, stepping through all 8 accounts (4 typed, 4 "No change")                                                                                                                                                                   |
| `flows/c-budget-edit/`           | Homeowner budget: change Groceries from £520 to £560, add a "Pets" category with a £25 entry, finish, reload, dashboard                                                                                                              |
| `flows/d-scenarios/`             | Debt extra payment (typed and slider), both payoff orders; mortgage overpay, rate change, overpay or save; reload to check nothing was saved                                                                                         |
| `flows/e-net-worth-<household>/` | Settings: property off and student loan on, then the dashboard, accounts and history heroes (the 375 run switches them back)                                                                                                         |
| `flows/f-debt-empty/`            | A renting household with no debts: debt empty state and dashboard                                                                                                                                                                    |
| `flows/f-account-detail/`        | Account detail for current account, mortgage and pension                                                                                                                                                                             |
| `flows/f-buy-to-let/`            | Homeowner with a let property: mortgage Residential and Buy to let tabs, dashboard, accounts                                                                                                                                         |
| `flows/f-self-assessment/`       | Opt in, add one self-employed income record and one cost, the page after each, dashboard                                                                                                                                             |
| `flows/f-widths-<household>/`    | 768 and 1024: dashboard, accounts, budget, debt; for the homeowner also the web pay-rise tool, marketing home and marketing pay-rise tool                                                                                            |
| `flows/f-320-<household>/`       | Every signed-in page at 320 by 640                                                                                                                                                                                                   |
| `flows/f-keyboard-check-in/`     | Keyboard only (Tab, Enter, typing, Escape) from the dashboard through the check-in                                                                                                                                                   |
| `flows/f-months-of-cover-*/`     | The Budget scenario zone with its options open, and before and after "Move to debts"                                                                                                                                                 |
| `flows/f-dialogs-sweep-missed/`  | Add account and Add budget category, which the sweep's selectors no longer reach                                                                                                                                                     |
| `metrics-flows.json`             | Per flow frame: URL, horizontal overflow, focused element; plus the logged take-home per setup step, taps, keyboard trail, net worth heroes, months-of-cover probes                                                                  |

Frames: 574 from the sweep and 240 from the flows, 814 in all.

## What could not be reached, and why

- Sweep `dialogs`: "Add account" is now a link, not a button (`sets.ts` looks for a button), and "Add category" shows only in budget edit mode. Both are captured in `flows/f-dialogs-sweep-missed/`.
- Sweep `onboarding`: a finished user is sent to the dashboard, so the four frames show the dashboard. Setup is covered by flow a, on a new user.
- Marketing privacy and terms: both answer 404. Web `/signup` answers 500 locally (WorkOS is not configured), so its frame shows the error page.
- Not run: login through WorkOS, screen-reader output, motion and loading skeletons, the self assessment receipt upload (it needs a file picker), and Storybook. The 768 and 1024 frames are light only.

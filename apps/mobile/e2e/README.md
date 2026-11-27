# Mobile end-to-end tests (`apps/mobile/e2e`)

Maestro flows on an Android emulator against a local fixture server (E12 slice S2c, plan section 9.5). CI never signs in to real WorkOS and never calls a real backend.

| Path                    | What it is                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `flows/`                | Maestro flows. `engine-check.yaml` (the dev device check on Hermes) and, since S2a, `sign-in`, `sign-in-denied`, `not-invited`, `sign-out` and `session-ended`, and since S3, `check-in-walkthrough`, `check-in-backend-down` and `terms-required`. Each starts from a fixture reset (`scripts/fixture.js`) and a cleared app (`subflows/launch-signed-out.yaml`) |
| `scripts/`, `subflows/` | Maestro scripts that set the fixture scenario, and shared steps. Not flows: `maestro test flows` runs only `flows/`                                                                                                                                                                                                                                               |
| `fixture-server/`       | A WorkOS stand-in and canned `/v1` on one port (8787), Node built-ins only. Signing key, ids and tokens are made at runtime. Listens on loopback only                                                                                                                                                                                                             |
| `install-maestro.sh`    | Installs the pinned Maestro CLI and refuses a download whose SHA-256 differs from the one committed in the script                                                                                                                                                                                                                                                 |
| `run-android-flows.sh`  | Installs the debug APK and runs the given flow set (`full` or `smoke`) once per given theme (`light`, `dark` or both)                                                                                                                                                                                                                                             |

## The fixture server

```bash
bun apps/mobile/e2e/fixture-server/main.ts
```

The emulator reaches it as `http://10.0.2.2:8787` (the `e2e` profile in `eas.json` sets `EXPO_PUBLIC_API_URL` to that). Routes and scenarios are listed at the top of `fixture-server/server.ts`. A flow chooses a scenario before launching the app, for example with Maestro's `runScript` and `http.post` to `/__fixture/scenario` with `{"refresh": "rejected"}`. Each refresh replaces the refresh token; the old one gives back the same new pair for 30 seconds and is refused after that, as real WorkOS does (the owner's sign-in on 26 November 2026, spike notes).

### Check-in data (S3)

For the monthly check-in the server serves `GET /v1/accounts`, `GET /v1/account-details`, `GET /v1/snapshots/check-ins` and `PUT /v1/snapshots/:month` (bearer required; query strings are ignored). The data is six manual accounts in a saved order that is not web's check-in order, with last month recorded for all six, the month before for three, and nothing this month; last month is both started and completed. The mortgage has a rate and payment and a balance equal to last month's figure, so the engine offers a calculated figure. A `PUT` is applied as the backend does: liabilities stored negative, one row per account and month, a current-month write moves the balance, `checkIn: true` with a value starts the month and `complete: true` finishes it. Every reset rebuilds the data with new ids.

The `data` scenario key chooses `ok` (the default), `unavailable` (the four routes answer 503 `service_unavailable`) or `empty` (no accounts, no rows, no check-in months). For Home (S5) it also chooses `owner` or `renter` (the home-owning and renting households of `apps/e2e/support/personas.ts`, copied into `fixtures.ts` and pinned to the source by `home-data.test.ts`, with the six months before this one recorded) or `malformed` (the `ok` data with the first account's balance missing from `GET /v1/accounts`). For the accounts screens (S6) it also chooses `joint` (a joint 50% mortgage and home, an overdrawn current account and savings, two months recorded) or `twoMonths` (two recorded months only, below the history chart's three), both pinned by `home-data.test.ts`. `GET /__fixture/stats` also gives `snapshotPuts`, `putsWithoutCheckIn`, `latestStartedMonth`, `latestCompletedMonth` and `currentMonth` (the London month of the server's clock).

- `check-in-walkthrough.yaml` updates the first card, says "No change" to the second, keeps the next three and the mortgage's calculated figure, screenshots the summary, then `scripts/assert-check-in.js` fails the flow unless this month is completed, at least three saves arrived and all sent `checkIn: true`.
- `terms-required.yaml` starts with `{"terms": "required"}` (the API answers 403 `terms_not_accepted`, PR #939), signs in to the terms screen, switches to `{"terms": "agreed"}` and taps Try again until Home shows.
- `home-with-data.yaml` signs in as the home owner and checks the hero, its change line and the trend bars by test id, relaunches as the renter (the line saying the student loan is not counted shows too), then as `malformed` (the out-of-step error with Try again), with a screenshot of each. `home-empty.yaml` signs in with no accounts and checks the empty prompt's link and the check-in row. `home-strip.yaml` (S5b) signs in as the renter and checks both cells of the two-figure strip, then relaunches as `pension-only` and as `no-budget` (the one prompt with its link), with a screenshot of each.
- `accounts-list.yaml` opens the Accounts tab as the home owner, then the `joint`, `empty` and `malformed` households; `account-detail.yaml` opens the joint mortgage's page from the list and Back, then a link to an account that does not exist; `net-worth-history.yaml` opens history from Home's link as the home owner, then from the Accounts list with `twoMonths` (no chart yet). `account-add.yaml` (E12 S8) adds a savings account from the empty list and sees it on the list and Home, then is refused a student loan with no plan; `account-edit.yaml` updates the current account's balance in place and renames it in Edit; `account-delete.yaml` cancels, then confirms, the delete inside Edit. The stand-in applies `POST /v1/accounts`, `POST /v1/accounts/mortgage-with-property`, `PATCH /v1/accounts/:id` (with `If-Match`) and `DELETE /v1/accounts/:id` as the backend does (`fixture-server/account-writes.ts`). Each checks by test id with a screenshot of each state.
- `check-in-backend-down.yaml` starts with `{"data": "unavailable"}`, waits for the load error (the app retries twice first), checks the empty-state sentence is absent, switches to `{"data": "ok"}` and taps Try again until the first card shows.

Nothing in `app/` or `src/` may import from `e2e/` (Biome), and the production bundle check fails on the fixture address or `__fixture`.

## CI: `🤖 Mobile e2e (Android)`

On GitHub's Linux runner: `expo prebuild`, the debug APK, the fixture server and Metro on the runner, an API 34 emulator, then `run-android-flows.sh`. Screenshots and logs are uploaded as the `mobile-e2e-android` artifact for 7 days. Read-only permissions, no secrets, no Maestro Cloud, Maestro analytics off. No retries: a red run is read from the artifact. It is a required check and reports on every pull request.

What runs (owner, 26 November 2026; `scripts/mobile-e2e-scope.ts`, its reason is in the job summary):

| Event                                                                                                                                                                                          | Flows                            | Themes      |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ----------- |
| Push to `main`, and nightly at 02:23 UTC                                                                                                                                                       | every flow                       | light, dark |
| Pull request changing `apps/mobile/**`, this job's scripts or workflow block, `.github/actions/`, the root `package.json`, `bunfig.toml`, `.node-version`, or the app's packages in `bun.lock` | every flow                       | light       |
| Pull request changing only the shared packages the app uses (`finance-engine`, `api-contract`, `api-client`, `tokens`, `format`, `business-details`, `typescript-config`) or `turbo.json`      | smoke: `engine-check`, `sign-in` | light       |
| Any other pull request                                                                                                                                                                         | none: the job passes in seconds  |             |

The debug APK holds no JavaScript (Metro serves it), so it is cached. `scripts/android-apk-cache-key.ts` keys it on the prebuild output, `package.json`, the app config, the app's transitive lockfile set (native modules, Gradle plugins and Hermes included), the JDK and Android tools, and the workflow's prebuild and Gradle steps; every module autolinking would build must be in that set. Anything it cannot account for gives no key and the APK is built. Restores take an exact key only. Prebuild and the backup check run on a hit too. The nightly run always builds. The job summary says whether the APK was built or restored, and the key's inputs.

The runner runs one flow at a time and, before each flow and each theme switch, stops the app and waits for its screens to go. A flow's `clearState` on a live screen let Android's delayed task removal kill the freshly launched app (a black screen, seen twice on 25 November). If the screens stay, the run fails rather than retries. The emulator has 4096 MB: with the AVD default of 2560 MB, the first sign-in after boot ran it out of memory, Zygote could not fork Chrome's process and the flow stayed on the sign-in screen (26 November). A failed flow does not stop the others; each flow writes its own JUnit report. Every screenshot a flow that ran takes (`takeScreenshot: <name>-${THEME}`) must exist for each theme that ran.

It proves Hermes at runtime on Android only. iOS is a hand check on a Mac.

## By hand

Android Studio with an emulator running, then from `apps/mobile`.

**Never alongside the real settings.** A debug build loads its JavaScript from Metro on port 8081, whatever port a second Metro uses, so a second Metro for the fixture does nothing while the real one runs: the app keeps loading the real bundle (seen 26 November 2026). And Expo reads `.env.local` unless told not to, while Metro's cache can keep values from an earlier start. So: stop every other Metro first, start this one with `EXPO_NO_DOTENV=1` (Expo then reads no `.env` file at all, so the real `.env.local` cannot leak in) and `--clear` (no cached values).

```bash
lsof -ti tcp:8081 | xargs kill   # stops any Metro already on 8081, the real-config one included
bun e2e/fixture-server/main.ts &
EXPO_NO_DOTENV=1 EXPO_PUBLIC_API_URL=http://10.0.2.2:8787 EXPO_PUBLIC_WORKOS_API_URL=http://10.0.2.2:8787 \
  EXPO_PUBLIC_WORKOS_CLIENT_ID=client_e2e_fixture EXPO_PUBLIC_MARKETING_URL=https://flump.example \
  EXPO_PUBLIC_WEB_APP_URL=https://app.flump.example \
  bunx expo run:android --port 8081
maestro test -e THEME=light e2e/flows
```

You know it took when Sign in comes straight back signed in with no WorkOS page: the fixture's authorize page redirects at once. If a WorkOS page appears, the app is on the real settings; stop and start again from the first line. Go back to the real settings the same way: stop this Metro, then start yours without `EXPO_NO_DOTENV`.

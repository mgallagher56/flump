# Mobile end-to-end tests (`apps/mobile/e2e`)

Maestro flows on an Android emulator against a local fixture server (E12 slice S2c, plan section 9.5). CI never signs in to real WorkOS and never calls a real backend.

| Path                    | What it is                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `flows/`                | Maestro flows. `engine-check.yaml` (the dev device check on Hermes) and, since S2a, `sign-in`, `sign-in-denied`, `not-invited`, `sign-out` and `session-ended`, and since S3, `check-in-walkthrough`, `check-in-backend-down` and `terms-required`. Each starts from a fixture reset (`scripts/fixture.js`) and a cleared app (`subflows/launch-signed-out.yaml`) |
| `scripts/`, `subflows/` | Maestro scripts that set the fixture scenario, and shared steps. Not flows: `maestro test flows` runs only `flows/`                                                                                                                                                                                                                                               |
| `fixture-server/`       | A WorkOS stand-in and canned `/v1` on one port (8787), Node built-ins only. Signing key, ids and tokens are made at runtime. Listens on loopback only                                                                                                                                                                                                             |
| `install-maestro.sh`    | Installs the pinned Maestro CLI and refuses a download whose SHA-256 differs from the one committed in the script                                                                                                                                                                                                                                                 |
| `run-android-flows.sh`  | Installs the debug APK and runs every flow in light, then dark                                                                                                                                                                                                                                                                                                    |

## The fixture server

```bash
bun apps/mobile/e2e/fixture-server/main.ts
```

The emulator reaches it as `http://10.0.2.2:8787` (the `e2e` profile in `eas.json` sets `EXPO_PUBLIC_API_URL` to that). Routes and scenarios are listed at the top of `fixture-server/server.ts`. A flow chooses a scenario before launching the app, for example with Maestro's `runScript` and `http.post` to `/__fixture/scenario` with `{"refresh": "rejected"}`. It refreshes the strict way: each refresh token works once. Whether real WorkOS does the same is a question for the S2a spike.

### Check-in data (S3)

For the monthly check-in the server serves `GET /v1/accounts`, `GET /v1/account-details`, `GET /v1/snapshots/check-ins` and `PUT /v1/snapshots/:month` (bearer required; query strings are ignored). The data is six manual accounts in a saved order that is not web's check-in order, with last month recorded for all six, the month before for three, and nothing this month; last month is both started and completed. The mortgage has a rate and payment and a balance equal to last month's figure, so the engine offers a calculated figure. A `PUT` is applied as the backend does: liabilities stored negative, one row per account and month, a current-month write moves the balance, `checkIn: true` with a value starts the month and `complete: true` finishes it. Every reset rebuilds the data with new ids.

The `data` scenario key chooses `ok` (the default), `unavailable` (the four routes answer 503 `service_unavailable`) or `empty` (no accounts, no rows, no check-in months). `GET /__fixture/stats` also gives `snapshotPuts`, `putsWithoutCheckIn`, `latestStartedMonth`, `latestCompletedMonth` and `currentMonth` (the London month of the server's clock).

- `check-in-walkthrough.yaml` updates the first card, says "No change" to the second, keeps the next three and the mortgage's calculated figure, screenshots the summary, then `scripts/assert-check-in.js` fails the flow unless this month is completed, at least three saves arrived and all sent `checkIn: true`.
- `terms-required.yaml` starts with `{"terms": "required"}` (the API answers 403 `terms_not_accepted`, PR #939), signs in to the terms screen, switches to `{"terms": "agreed"}` and taps Try again until the signed-in screen shows.
- `check-in-backend-down.yaml` starts with `{"data": "unavailable"}`, waits for the load error (the app retries twice first), checks the empty-state sentence is absent, switches to `{"data": "ok"}` and taps Try again until the first card shows.

Nothing in `app/` or `src/` may import from `e2e/` (Biome), and the production bundle check fails on the fixture address or `__fixture`.

## CI: `🤖 Mobile e2e (Android)`

On GitHub's Linux runner: `expo prebuild` and a Gradle debug build, the fixture server and Metro on the runner, an API 34 emulator, then `run-android-flows.sh`. Screenshots and logs are uploaded as the `mobile-e2e-android` artifact for 7 days. Read-only permissions, no secrets, no Maestro Cloud, Maestro analytics off. No retries: a red run is read from the artifact. The runner runs one flow at a time and, before each flow and each theme switch, stops the app and waits for its screens to go. A flow's `clearState` on a live screen let Android's delayed task removal kill the freshly launched app (a black screen, seen twice on 25 November). If the screens stay, the run fails rather than retries. A failed flow does not stop the others; each flow writes its own JUnit report.

It proves Hermes at runtime on Android only. iOS is a hand check on a Mac. Not a required check until it has passed three runs in a row (owner step OS9).

## By hand

Android Studio with an emulator running, then from `apps/mobile`:

```bash
bun e2e/fixture-server/main.ts &
EXPO_PUBLIC_API_URL=http://10.0.2.2:8787 EXPO_PUBLIC_WORKOS_API_URL=http://10.0.2.2:8787 \
  EXPO_PUBLIC_WORKOS_CLIENT_ID=client_e2e_fixture EXPO_PUBLIC_MARKETING_URL=https://flump.example \
  bunx expo run:android
maestro test -e THEME=light e2e/flows
```

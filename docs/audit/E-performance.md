# Track E: Performance and optimisation

Method: code reading plus the existing build output (`apps/web/build`, `apps/marketing/dist`, the `stats.html` visualiser output in `apps/web/build/client`) and the route manifest. No browser, no rebuild, no servers. All sizes are from files I read or measured with `ls`/`gzip -c`. Nothing was modified.

## Summary

The front-end bundle picture is better than the Phase 0 headline suggests. The web app is already route-split by React Router, and recharts only loads on the chart routes. The marketing bundle is 534 KB raw but 148 KB gzipped, with `react-icons` tree-shaken correctly. The biggest real problems are elsewhere: a 1.35 MB PNG shown at 50x50 in the header of every page, tax receipts stored as base64 in a column that is returned by every list query, a sequential per-transaction query loop in bank sync running inside an HTTP request with no indexes anywhere, and Docker images that ship the whole monorepo `node_modules`.

Phase 1 leads that held up or were refined:

| Lead                           | Verdict                                                                                                                                                                                                                                   |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 522 KB single marketing bundle | Confirmed (534,297 bytes, 147,860 gzip). All 6 routes plus the 7 calculators are imported eagerly in `App.tsx:2-7`. No `lazy(` call exists anywhere in `apps/` or `packages/ui/src`.                                                      |
| recharts size                  | 308,549 bytes raw, 91,665 gzip (`CategoricalChart` chunk). In `stats.html` recharts is about 626 KB of source before minification. It is route-split (loaded only by 9 chart routes in the manifest), but loaded eagerly by those routes. |
| react-icons import style       | Fine. All imports are named from `react-icons/fa` or `react-icons/fi` (58 and 41 import statements). Web client carries about 76 KB of icon source in total. Not a problem.                                                               |
| Emotion runtime cost           | No component uses Emotion. Only `entry.client.tsx`, `entry.server.tsx` and `createEmotionCache.ts` reference it. Client cost is negligible (not in the top 30 modules of `stats.html`). Residual cost is on the server (E-13).            |
| 1.5 MB web server bundle       | Not examined in depth. It is a single SSR bundle containing the whole app plus recharts; it matters mostly for cold start, not per-request cost. See "To measure".                                                                        |

## Findings

### [E-01] 1.35 MB, 1024x1024 PNG rendered at 50x50 in the header of every page

- Severity: P1
- Location: apps/web/app/components/navigation/HomeLogo.tsx:3,8; apps/web/public/images/flump_logo.png; rendered via apps/web/app/root.tsx:110 (`<Header />`)
- Evidence: `HomeLogo` does `import logo from "/images/flump_logo.png"` and renders `<img height={50} width={50}>`. `file` reports `PNG image data, 1024 x 1024`; `ls -la` reports 1,352,124 bytes. `Header` is rendered unconditionally in `root.tsx`, so every route including `/login` pulls it. `apps/web/public/images/flump_logo_circle.png` (852,724 bytes) is not imported anywhere under `apps/` or `packages/` (grep) and is shipped in `build/client/images`. The PNG is served from `public/`, so it is not content-hashed.
- Impact: roughly 1.35 MB of transfer on first visit for a 50 px icon, which dominates the weight of the whole home page on a mobile connection and competes with LCP. It is the single largest asset on the site.
- Recommendation: export a 100x100 (2x) WebP/PNG or an SVG of the logo (target under 10 KB), and import it through Vite so it is hashed and cacheable. Delete the unused `flump_logo_circle.png`.
- Effort: S

### [E-02] Bank sync issues sequential per-transaction queries inside the HTTP request

- Severity: P1
- Location: apps/backend/src/finance.service.ts:315-410 (loop at 315, per-transaction loop at 386-405); callers at finance.service.ts:144 (`connectBank`) and :254-261 (refresh)
- Evidence: for each provider account the code runs `findOne`, `save`, a detail `findOne`, a detail `save`, then `fetchTransactions`, and for every returned transaction a `findOne` with a 5-column predicate (`accountId, userId, amount, description, timestamp`) followed by a `save` when it does not exist. Every call is awaited one at a time. For A accounts with T transactions each that is roughly 4A + 2AT round trips, all inside the request that the user is waiting on. There is no batching (`upsert` or `insert ... on conflict do nothing`) and no queue.
- Impact: a first sync of a Monzo/Starling account with a few hundred transactions is hundreds to thousands of serial DB round trips, likely tens of seconds, which risks HTTP and proxy timeouts and leaves the connection half-synced. Cost grows with history. Combined with E-03 each dedupe `findOne` is also a table scan.
- Recommendation: add a unique index on `(account_id, external_tx_id)` (or a hash of amount/description/timestamp if providers lack an id), then bulk `insert ... orIgnore` per account. Fetch existing keys in one `In()` query if an index cannot be added yet. Run the sync as a background job and have the endpoint return immediately with a status (the entity already has `last_synced_at`).
- Effort: M

### [E-03] No database indexes or relations on any entity; every query filters on an unindexed column

- Severity: P1
- Location: apps/backend/src/entities/*.ts (grep for `@Index`, `@ManyToOne`, `@OneToMany`, `@JoinColumn` finds nothing); apps/backend/src/app.module.ts:54,75 (`synchronize: true`)
- Evidence: the only indexed columns are the primary keys, `user_profiles.user_id` (unique) and `mcp_tokens.token_hash` (unique). `user_id` is queried without an index on `accounts`, `transactions`, `budget_entries`, `tax_records`, `bank_connections` and `mcp_tokens`; `account_id` is queried without an index on `account_details` and `transactions`. Postgres does not index foreign keys automatically, and there are no declared foreign keys at all. Typical queries: `account-intake.service.ts:86,140,224`, `budget.controller.ts:204`, `tax.controller.ts:32`, `finance.service.ts:77`, `mcp.service.ts:147` (transactions ordered by `timestamp` with a date range).
- Impact: invisible with seed data, but every page load does sequential scans that scale with all users' rows, not just the caller's. `transactions` grows fastest (E-02) and is scanned by user, by account, and by the dedupe predicate. Also no referential integrity, which is why `deleteBankConnection` and `deleteAccount` delete children by hand.
- Recommendation: add `@Index(["userId"])` on the five user-owned tables, `@Index(["accountId", "year", "month"])` on `account_details`, `@Index(["userId", "accountId", "timestamp"])` on `transactions`, and a unique index for transaction dedupe (E-02). Introduce real migrations at the same time, because with `synchronize: true` indexes would be applied by boot-time schema diff in production (see D-10).
- Effort: M

### [E-04] Tax receipts stored as base64 in the row and returned by every list query, page loader and MCP context

- Severity: P1
- Location: apps/backend/src/entities/tax-record.entity.ts:50 (`receipt_data` type `text`); apps/backend/src/tax.controller.ts:32 and :722 (full-entity `find`); apps/backend/src/mcp.service.ts:102; apps/web/app/routes/app.tax.tsx (loader passes `taxRecords`); apps/web/app/containers/tax/TaxContainer.tsx:140,188,302,2103-2154
- Evidence: the web client stores a data URL from a `FileReader` (`TaxContainer.tsx:230`) in `receiptData`. `GET /tax-records` does `find({ where: { userId } })` with no `select`, so each record's `receiptData` comes back inline. `TaxContainer.tsx:2103-2154` only needs it for the single record whose receipt is open. The `app.tax` loader returns the records to the route, so the base64 is serialised into the server-rendered HTML (`window.__reactRouterContext`) and re-sent on every revalidation. `mcp.service.ts:102` loads all tax records for the AI context pack, then casts with `as any`, so receipt payloads can also reach the MCP response path. I did not find a size limit on the upload.
- Impact: one 2 MB photographed receipt becomes about 2.7 MB of JSON in every tax-page SSR response, every `/tax-records` call, and every post-action revalidation, multiplied by the number of receipts. It slows the page, inflates Node memory, and wastes LLM context.
- Recommendation: exclude `receiptData` from list reads (`select` list or `@Column({ select: false })`), add `GET /tax-records/:id/receipt` fetched on demand, and ideally move receipts to object storage with a key in the row. Enforce a maximum upload size client- and server-side. Strip receipt fields in the MCP mapping.
- Effort: M

### [E-05] Redundant data fetching on every navigation (loaders, GET-time seeding, double queries)

- Severity: P2
- Location: apps/web/app/root.tsx:26-33 and apps/web/app/services/backend-client.server.ts:91-100; apps/backend/src/account-intake.service.ts:86-91,214-226,264-265; apps/backend/src/budget.controller.ts:204-211; apps/backend/src/tax.controller.ts:32-37
- Evidence:
  - The root loader fetches `/user-profile`. Every `/app/*` loader then calls `loadWorkspaceSnapshot`, which fetches `/accounts`, `/account-details` and `/user-profile` again (same payload twice per navigation).
  - `/accounts` already returns each account with its `details` (`getAccounts` in `account-intake.service.ts:140-165` attaches them, and `backend-client.server.ts:107` falls back to `accounts.flatMap(a => a.details)`), so `/account-details` re-queries and re-sends the same rows.
  - `getAccounts`, `getBudgetEntries` and `getTaxRecords` each run an extra `userProfileRepository.findOne` on every GET purely to decide whether to seed demo data, even when rows exist (`budget.controller.ts:204-211` does the profile lookup before checking `entries.length`).
  - `getPortfolioSnapshot` (`account-intake.service.ts:264-265`) calls `getAccounts` then `getAccountDetails`, which queries accounts and details a second time. The `/` route uses it (`routes/_index.tsx:39`) in parallel with `/accounts` and `/account-details`, so the home page runs about three account queries and three detail queries.
  - No `shouldRevalidate` exports exist in `apps/web/app` (grep), so every action revalidates the root loader and the route loader.
- Impact: a measurable share of server time and payload on every page, multiplied by E-03 (unindexed). Each fetch also travels web server to backend over HTTP.
- Recommendation: drop the `/account-details` call when accounts already embed details; short-circuit the profile lookup unless the table is empty; have `getPortfolioSnapshot` reuse the accounts it already loaded; pass the root loader's profile down instead of refetching; add `shouldRevalidate` to the simulator routes. Move demo seeding to onboarding instead of the read path.
- Effort: M

### [E-06] Marketing site ships one 534 KB bundle with every route and calculator, and hydrates it all

- Severity: P2
- Location: apps/marketing/src/App.tsx:2-12; apps/marketing/src/app-shell/entry-client.tsx:26; apps/marketing/vite.config.ts; apps/marketing/dist/client/assets/index-D1vn7MZz.js
- Evidence: `ls` shows `index-*.js` 534,297 bytes (147,860 gzip) and `index-*.css` 53,653 bytes (12,562 gzip). `App.tsx` imports `HomePage`, `ToolsIndexPage`, `ToolPage` (which pulls in the 7 calculators from `@repo/ui/calculators`, about 78 KB of source), `PricingPage`, `SecurityPage`, `McpPage` statically. No `React.lazy` or dynamic `import()` exists in `apps/marketing/src`. The page is server-rendered and then `hydrateRoot` hydrates the whole tree. Note the 522 KB figure in Phase 0 is raw; gzipped it is 148 KB, which is acceptable for a first visit but is mostly unused on the landing page.
- Impact: moderate. Landing-page visitors download and parse the calculator code and the other four routes before the page becomes interactive, which hurts TBT/INP on mid-range mobile. It is not a crisis at 148 KB gzip, so this is P2.
- Recommendation: `React.lazy` the `ToolPage`, `McpPage`, `PricingPage` and `SecurityPage` routes (SSR works with `lazy` plus `renderToString` only if the server preloads; with the current sync `renderToString` render, use `loadable`-style preloading or move to `renderToPipeableStream`). Alternatively split calculators out with `manualChunks`. Verify with a Lighthouse run.
- Effort: M

### [E-07] Web: recharts is loaded eagerly by chart routes, and the root route statically pulls a 99 KB shared UI chunk

- Severity: P2
- Location: apps/web/app/components/pension/PensionForecasterCard.tsx:18; apps/web/app/components/forecast/SavingsForecaster.tsx:4; apps/web/app/components/mortgage/OverpaymentSimulator.tsx:3; apps/web/app/components/budget/BudgetDashboard.tsx; apps/web/build/client/assets/manifest-203b2a3f.js
- Evidence: the manifest lists `CategoricalChart-CrJcBRD2.js` (308 KB, 92 KB gzip) as a static import of 9 routes (accounts index and detail, budget, debt, forecast, mortgage, pension, savings). It is not imported by `app._index`, `app.tax` or the tools routes, so splitting is already working at route level. `root` statically imports `Button-CwTtKhQT.js` (99 KB, 34 KB gzip) plus `context` and `FLPButtonGroup` chunks, so every page, including `/login`, carries them. `app.tax` is a single 68 KB chunk driven by a 2,000+ line `TaxContainer.tsx`. There are no `lazy()` calls to defer a chart that sits under a non-default tab (for example Pension's `forecaster | pots | rules` tabs or Budget's secondary views).
- Impact: moderate. The first navigation to a chart route pays about 92 KB gzip before the page is useful, even when the chart is below the fold or on a hidden tab. Bundle composition is otherwise reasonable (react-dom 525 KB source, react-router 266 KB, recharts 626 KB source, i18next 82 KB).
- Recommendation: wrap each chart in a `lazy` component with a skeleton, so the page shell and controls render before recharts arrives; preload on hover/focus of the nav link. Check what is inside the 99 KB `Button` chunk (it is a vendor-shared chunk, probably `react-icons` plus `@repo/ui`) and keep it out of the root if possible.
- Effort: M

### [E-08] Slider drag re-renders whole simulator cards and animated charts; no memoisation, deferral or debounce anywhere

- Severity: P2
- Location: apps/web/app/components/pension/PensionForecasterCard.tsx:248-260,1097-1172; apps/web/app/containers/debt/DebtContainer.tsx:110-129; apps/web/app/components/forecast/SavingsForecaster.tsx:38-60; packages/ui/src/primitives/SliderField/SliderField.tsx:35-39
- Evidence: `SliderField` calls `onChange` on every `input` event. State lives in the same component that renders the chart, so every pixel of drag recomputes the series and re-renders the whole card. A grep for `React.memo`, `memo(`, `useDeferredValue`, `useTransition` and `debounce` across `apps/web/app` and `packages/ui/src` finds none (only `useCallback` in a few stores). The compute itself is cheap: the series loops are bounded (at most 360 months; `debt-payoff.ts:205` caps `maxMonths` at 360), and the series are `useMemo`'d on their inputs. The Pension chart (`PensionForecasterCard.tsx:1151-1171`) does not set `isAnimationActive={false}`, so recharts re-animates the area on each data change; 8 occurrences of `isAnimationActive={false}` exist elsewhere in `apps/web/app`, but `AccountDetailChart`, `BudgetDashboard`, `UKTaxCalculator`, `OverpayVsSaveCompare` and the Pension chart lack it. In `DebtContainer.tsx:120-129`, `compareAvalancheAndSnowball` and `calculateDebtSchedule` both run the selected strategy's full schedule on each `extraPayment` change, so it is simulated twice.
- Impact: I could not measure this without a browser. By code reading, the dominant cost is likely React reconciliation of 1,200-line components plus recharts SVG re-render and animation on each drag tick, not the arithmetic. On a low-end phone this probably shows as dropped frames while dragging. Treat as a hypothesis to profile (see "To measure").
- Recommendation: set `isAnimationActive={false}` on all live-updating charts; feed the chart through `useDeferredValue(chartData)` so slider input stays responsive; extract the chart into a `React.memo` child so slider-only state changes that do not alter the series do not re-render it; reuse the `comparison` result for `scheduleResult` in `DebtContainer`.
- Effort: S for the animation flag, M for the rest

### [E-09] Derived state kept in effects causes double renders and silently overwrites local slider state

- Severity: P3
- Location: apps/web/app/components/pension/PensionForecasterCard.tsx:268-303; apps/web/app/containers/pension/PensionContainer.tsx:260-270; apps/web/app/containers/mortgage/MortgageContainer.tsx:149-165
- Evidence: `PensionForecasterCard` has six `useEffect` blocks whose only job is `setX(prop)` when an `initial*` prop changes. `PensionContainer.tsx:260-270` copies five profile values into five `edit*` state variables the same way. Each change therefore renders once with the stale value, then again after the effect. `MortgageContainer.tsx:149-165` seeds `loanAmount` from an effect keyed on `accounts`/`accountDetails`, so a loader revalidation (see E-05) resets what the user typed into the simulator.
- Impact: extra renders on each prop change, and a correctness-adjacent annoyance (a background revalidation overwriting an in-progress what-if). Minor performance cost on its own.
- Recommendation: key the card on the source value (`key={initialSalary}`) or derive during render; for user what-ifs keep an `override | undefined` state and compute `value = override ?? prop`.
- Effort: M

### [E-10] Docker: `.dockerignore` is root-anchored, runner images copy the full monorepo `node_modules`, and layers do not share a cache

- Severity: P2
- Location: .dockerignore; apps/web/Dockerfile:20-34, apps/backend/Dockerfile, apps/marketing/Dockerfile
- Evidence: the root `.dockerignore` lists `node_modules`, `dist`, `build`. In Docker these patterns match only at the context root, not nested paths (the web app's own `.dockerignore` correctly uses `/node_modules`; the root one needs `**/node_modules`). So `apps/web/node_modules` (38 MB locally), `packages/*/node_modules`, `apps/*/dist`, `apps/web/coverage` (16 MB), `apps/web/storybook-static` (14 MB) and `.react-router` are sent in the build context, and `COPY . .` in the build stage overlays host-built `node_modules` (macOS native binaries and symlinks) on top of the Linux install from the deps stage. The runner stage then does `COPY --from=build /app/node_modules`, `/app/packages` and `/app/apps/<app>`, i.e. the entire workspace install (3.3 GB locally, including Expo, Storybook, vitest) rather than production dependencies only, plus all sources, coverage and `storybook-static`. The three Dockerfiles copy the `package.json` files in different orders, so their dependency-install layers cannot be shared. There are no `--mount=type=cache` mounts for the Bun cache and no `turbo prune`. I did not build the images, so actual image sizes are unmeasured.
- Impact: slow builds and pulls, large images, slow cold starts on platforms that auto-stop machines. The nested `node_modules` overlay is also a correctness risk for reproducible builds.
- Recommendation: use `**/node_modules`, `**/dist`, `**/build`, `**/coverage`, `**/storybook-static`, `**/.react-router`, `docs`, `.github` in `.dockerignore`. Use `turbo prune <app> --docker` (or `bun install --production` in a final stage) so each image only carries its own dependencies. Keep one common `COPY package.json ...` ordering or a shared base image so the install layer is cached across the three services. Add a Bun cache mount.
- Effort: M

### [E-11] Turborepo and CI: build cache keyed on tests and stories, coverage always on, tracked outputs

- Severity: P2
- Location: turbo.json:9-14,23-26; apps/web/vite.config.mts:73; .github/workflows/ci-pipeline.yml; .github/actions/bun-setup/action.yml
- Evidence:
  - The `build` task uses `inputs: ["$TURBO_DEFAULT$", ".env*"]`, which includes test files, stories, coverage and docs inside each package, so editing a test or story invalidates the build cache.
  - `test` declares `outputs: ["coverage/**", ...]`, and per Phase 0 the coverage directories are committed to git (158 tracked files), so a cache restore rewrites tracked files.
  - `apps/web/vite.config.mts:73` sets `coverage.enabled: true`, so every `bun run test` (local and CI) runs v8 coverage instrumentation and writes HTML, lcov, clover and JSON reports, even when nobody reads them.
  - `check-types`, `test` and `build` all declare `dependsOn: ["^build", "generate", "^generate"]`, so each of the four parallel CI jobs rebuilds upstream packages unless the Turbo remote cache hits. The cache comes from `felixmosh/turborepo-gh-artifacts` plus `TURBO_TOKEN`/`TURBO_TEAM` secrets; a cache miss multiplies the work by about 4 jobs.
  - The Bun download cache is cached and keyed on `bun.lock` (good). `check-types` and `vitest` use `fetch-depth: 0` without needing history.
  - `bun run lint` is `biome check --write .` (Phase 0), so it can mutate files in CI.
- Impact: unnecessary cache invalidation and CPU time on every PR; coverage overhead on every test run. I did not have CI run timings, so the size of the effect is unknown.
- Recommendation: add `inputs` exclusions for `**/*.test.*`, `**/*.stories.*`, `coverage/**`; turn coverage off by default and enable it only in `test:coverage` or in CI via an environment variable; stop tracking coverage output. Drop `fetch-depth: 0` where unused. Pull job durations from GitHub Actions once access is available.
- Effort: S

### [E-12] `rollup-plugin-visualizer` always emits `stats.html` into the public client output

- Severity: P2
- Location: apps/web/vite.config.mts:34; apps/web/build/client/stats.html
- Evidence: `visualizer({ emitFile: true })` is unconditional in the plugin array, so every production build writes a 702,005-byte `stats.html` into `build/client`, which `react-router-serve` serves statically and the Dockerfile copies into the image.
- Impact: publicly downloadable build internals (every module path and size) and a small amount of extra build time. Low severity but trivially avoidable.
- Recommendation: enable it only when an `ANALYZE` env var is set.
- Effort: S

### [E-13] Leftover Emotion SSR pipeline and per-request i18next initialisation on every web response

- Severity: P3
- Location: apps/web/app/entry.server.tsx:29-37,55-58; apps/web/app/createEmotionCache.ts; apps/web/package.json:11-13
- Evidence: no component imports `@emotion/*` (grep: only `entry.server.tsx`, `entry.client.tsx`, `createEmotionCache.ts`), but every response is piped through `renderStylesToNodeStream()`, which scans the HTML stream for Emotion style tags that never exist, and the three `@emotion/*` packages stay in the dependency tree. Separately, every request creates a new i18next instance and re-initialises it with `i18next-fs-backend`, which reads the namespace JSON files from `./public/locales` on disk each time.
- Impact: small per-request CPU and I/O on the server, extra dependencies, and a stream transform in the hot path. Not a user-visible problem at current traffic.
- Recommendation: remove the Emotion cache provider and stream, and the dependencies, once confirmed unused by Storybook. Create the i18next instance once per locale with the resources preloaded, and call `cloneInstance` per request.
- Effort: S

### [E-14] Marketing server reads the HTML template from disk and re-imports the render module on every request; no cache headers on static assets

- Severity: P2
- Location: apps/marketing/server.ts:73-79,92-94,112
- Evidence: in production, each request runs `fs.readFileSync(.../dist/client/index.html)` (a synchronous call that blocks the event loop), `await import("./dist/server/entry-server.js")` (cached by the module system after the first call), and a synchronous `renderToString`-style `render(url)`. It also mutates `process.env.VITE_APP_URL` around the render call (a global shared between concurrent requests). Rendered HTML is not cached even though all 6 pages are static. `sirv` is called with `{ extensions: [] }` only, so no `maxAge` or `immutable` is passed; I did not check the headers sirv sends in this configuration, so verify in the browser that hashed `/assets/*` files carry a long `Cache-Control`.
- Impact: unneeded per-request latency and event-loop blocking on a content site; compression is present (`compression` middleware, line 73), which is good.
- Recommendation: read the template once at startup, pre-render or in-memory cache the HTML per path, and set `sirv("dist/client", { maxAge: 31536000, immutable: true })` for `/assets` with `no-cache` for HTML. Pass `appUrl` into `render` instead of through `process.env`.
- Effort: S

### [E-15] Render-blocking Google Fonts stylesheet and an unoptimised eager hero image

- Severity: P2
- Location: apps/web/app/root.tsx:16-22; apps/marketing/index.html:9-13; apps/web/app/components/home/HomeHero.tsx:222-235
- Evidence: both apps load a single `fonts.googleapis.com` stylesheet requesting three families and 12 weights (`Inter` 400-700, `JetBrains Mono` 400-700, `Plus Jakarta Sans` 600-900) as a blocking `<link rel="stylesheet">` (with `display=swap` and preconnect, which helps). The web home hero is `/illustrations/hero-wealth-engine.jpg`, 229,063 bytes, `loading="eager"`, no `width`/`height` attributes (only `maxHeight: 560px` and `width: 100%` in inline style), JPEG only, no `srcset`, no `fetchPriority`. The other four illustrations (165-307 KB each) are untouched JPEGs. `apps/marketing/public/illustrations/` ships the same five files (1.1 MB) but nothing in `apps/marketing/src` references them (grep), so they are dead weight in the marketing image.
- Impact: font CSS adds a cross-origin round trip before first paint; the hero is likely the LCP element on the web home page and has no reserved space, so it also risks CLS. Estimated impact is moderate; confirm with Lighthouse.
- Recommendation: self-host WOFF2 subsets (latin only) of the weights actually used, preload the primary one; trim weights; convert the hero to WebP/AVIF with `srcset`, explicit `width`/`height` and `fetchPriority="high"`. Delete the unused illustrations from `apps/marketing/public`.
- Effort: M

### [E-16] Backend minor hot-path costs: per-account sequential deletes, double MCP token writes, no response compression, unbounded list endpoints

- Severity: P3
- Location: apps/backend/src/finance.service.ts:288-292,77-80; apps/backend/src/mcp.service.ts:81-82; apps/backend/src/main.ts; apps/backend/src/budget.controller.ts:358-361
- Evidence: `deleteBankConnection` runs three awaited deletes per account in a `for` loop (details, transactions, account) where one `In(accountIds)` delete per table would do (the profile reset in `user-profile.service.ts:339-352` already uses `In()`). `mcp.service.ts:81-82` issues `increment` and then `update` as two separate awaited writes on every MCP tool call. `main.ts` configures CORS but no compression middleware (grep). `GET /transactions`, `/tax-records` and `/budget-entries` return all rows with no `take`/`skip`; the web app does not currently call `/transactions` (grep), so that one is latent rather than live. `resetBudgetEntries` loads then removes entries row by row via `remove(existing)` rather than a single `delete({ userId })`.
- Impact: small today for a single-user personal-finance volume; becomes noticeable only once bank sync fills `transactions`.
- Recommendation: batch the deletes, combine the two token writes into one `update`, add `compression()` (or rely on the proxy), and add `take`/cursor pagination to the transactions endpoint before the sync is widely used.
- Effort: S

## To measure later in a browser

1. Lighthouse (mobile, throttled) on marketing `/` and web `/`, `/app/pension`, `/app/mortgage`: LCP element (expected: hero JPEG on web), TBT, CLS, total transfer. Confirm E-01 and E-15.
2. Chrome DevTools Performance trace while dragging a slider on pension, mortgage, savings and debt with 4x CPU throttling: commit time per tick, scripting versus rendering versus recharts SVG. Re-run after `isAnimationActive={false}` and `useDeferredValue` (E-08).
3. React Profiler on `PensionForecasterCard` and `DebtContainer` to confirm which components re-render per tick.
4. Network tab on `/app/tax` with 3 to 5 uploaded receipts: HTML size, `/tax-records` payload, revalidation payload (E-04, E-05).
5. Response headers for `/assets/*` on marketing (sirv defaults) and on the web app (`react-router-serve`), plus gzip/brotli on both (E-14).
6. Web server bundle: parse `apps/web/build/server/index.js` composition (visualise the server build) and measure cold start time on the deployment platform.
7. Backend: `EXPLAIN ANALYZE` on the accounts, `account_details`, `transactions` and `tax_records` queries with a seeded dataset (10k transactions), before and after adding indexes (E-03); time a first bank sync with a realistic 500-transaction account (E-02).
8. Docker: `docker build` each image and compare sizes and build times before and after the `.dockerignore` and prune changes (E-10).
9. CI: collect real job durations and Turbo cache hit rates from GitHub Actions (E-11).

## Limits

- No runtime pass: no browser, no Lighthouse, no profiler, no database, no Docker build and no CI timing data. Impact estimates are qualitative and come from code and build artefacts only.
- Bundle numbers come from the existing build output, which was built on 2026-11-11 and may not match HEAD exactly. The `stats.html` aggregation is by raw source size per package, not minified size.
- I did not inspect the 1.5 MB web server bundle's contents, the `Button-*.js` chunk contents, or the Storybook build chunk-size warning.
- The sirv and `react-router-serve` cache headers were not observed.
- Cross-track issues seen while reading and already covered in `D-security.md` (unverified JWT, `deleteAccount` ownership, `synchronize: true` in production) are not repeated as findings here, only referenced where they interact with performance.

## Quick wins

1. Replace `flump_logo.png` (1.35 MB at 50x50) with a small SVG/WebP and delete the unused `flump_logo_circle.png` (E-01).
2. Set `isAnimationActive={false}` on the Pension, Account detail, Budget, Tax and Overpay-vs-Save charts (E-08).
3. Fix `.dockerignore` to use `**/` patterns and add `coverage`, `storybook-static`, `.react-router` (E-10).
4. Gate `visualizer()` behind an `ANALYZE` env var (E-12).
5. Add `@Index(["userId"])` and `@Index(["accountId"])` on the user-owned and account-owned entities (E-03).
6. Exclude `receiptData` from list queries with `select: false` and add an on-demand receipt endpoint (E-04).
7. Skip the redundant `/account-details` fetch and the profile lookup on each GET when rows exist (E-05).
8. Read the marketing HTML template once at startup and pass `maxAge`/`immutable` to sirv (E-14).
9. Turn off default coverage in `vite.config.mts` and exclude tests and stories from Turbo `build` inputs (E-11).
10. Self-host or trim the Google Fonts weights, and give the hero image dimensions and `fetchPriority` (E-15).

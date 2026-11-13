# Changelog

## [1.26.0](https://github.com/mgallagher56/flump/compare/flump/backend-v1.25.0...flump/backend-v1.26.0) (2026-11-13)


### Features ✨

* **backend:** add nullable term_months and fixed_rate_end_date to accounts ([8606712](https://github.com/mgallagher56/flump/commit/8606712773eb3a9df17af5c68a742cf5f1b673e1))
* **backend:** enforce contract validation behind CONTRACT_MODE=enforce (E21 phase 2) ([b594c35](https://github.com/mgallagher56/flump/commit/b594c3578645d66bdf5cde873405965482757ddd))
* **backend:** in-memory rate limiting per user and per IP (E20-N13) ([2cd7b84](https://github.com/mgallagher56/flump/commit/2cd7b849f0558516da85aed8e5e352d834741d1d))
* **backend:** log contract_rejected when enforce mode answers 400 (E21) ([0f4ae02](https://github.com/mgallagher56/flump/commit/0f4ae0267e919b56ac54e65d5ca5123c0ab19a10))
* **backend:** owner-allowlist MCP and PAT creation (E29-T8) ([1dc4bc4](https://github.com/mgallagher56/flump/commit/1dc4bc401ece801961ea042cee46877a86c1c75c))
* **backend:** readiness checks for pending migrations (E18-N5) ([dd5d99b](https://github.com/mgallagher56/flump/commit/dd5d99be636202d0f6a92afde1c9600cb92e1ea5))
* **backend:** Sentry error reporting, inert without a DSN (E18-N2) ([7c876e5](https://github.com/mgallagher56/flump/commit/7c876e54e2901f8b4f7296a0620659672be9b82e))
* **backend:** serve every route under /v1 as an alias (E21 phase 2) ([0cd1e13](https://github.com/mgallagher56/flump/commit/0cd1e138cdef81ee8bac60d7600a3c8f13ecb9ca))
* **ops:** Railway config as code, inert until config paths are set (E18-N8) ([44ee0b1](https://github.com/mgallagher56/flump/commit/44ee0b114c2ecce10aa956d8959abb3463d50426))


### Bug Fixes 🪲

* **api-contract,backend:** tax cap shape, hold tax back from default enforcement ([7027b17](https://github.com/mgallagher56/flump/commit/7027b176b7ef655ae9354733c24c36c3f6f34ed1))
* **backend:** bound rate-limit store, key IPv6 by /64, tighten classes (E20-N13) ([2259795](https://github.com/mgallagher56/flump/commit/2259795b3ddd311a44b02409bcb1f24ea6df1e94))
* **backend:** fail-closed MCP access, kill switch on tokens, dev-bypass hardening (E29-T8 review) ([74cd1b0](https://github.com/mgallagher56/flump/commit/74cd1b09121bca6c148cff7862763a6e034381f8))
* **backend:** import RateLimit decorator in controllers (E20-N13) ([ac58b41](https://github.com/mgallagher56/flump/commit/ac58b41d1993975e9c089c1aa469bd11850f7a58))
* **backend:** match the /v1 prefix case-insensitively ([27e7354](https://github.com/mgallagher56/flump/commit/27e73547d3c3b2379317e2344950f06b03bd3390))
* **backend:** never let the rejection log turn a 400 into a 500 ([e7f5265](https://github.com/mgallagher56/flump/commit/e7f52652d3927a79767fb6cf3ad48ff20307a4bf))
* **backend:** treat a malformed migrations count as not ready (E18-N5) ([931a40a](https://github.com/mgallagher56/flump/commit/931a40a5c3c7154c29d7fb6c183317182f825626))
* **backend:** withhold Sentry exception messages, keep crash-on-rejection, lazy SDK load (E18-N2) ([6caec03](https://github.com/mgallagher56/flump/commit/6caec03c79f6e664f69ea61c351784ea360cf7ff))
* **ci:** read Nest's protected staticInstanceRef through a cast so the backend test project type-checks ([6c74204](https://github.com/mgallagher56/flump/commit/6c7420447853c26424083ecaf186d2cccc9c842f))
* **ci:** restore Nest's static logger after the Sentry envelope scenario (E18-N2) ([606b3ba](https://github.com/mgallagher56/flump/commit/606b3ba1a524babd4e911e8a74898f1f71b4aac5))
* remove all references to the flump.co.uk domain ([6a5d86a](https://github.com/mgallagher56/flump/commit/6a5d86a9912cf43847a17a717b17a6562e685618))
* **web,finance-engine:** reconcile web payloads with the contract so tax and mcp-tokens enforce (E21) ([f7f1f8b](https://github.com/mgallagher56/flump/commit/f7f1f8b26710a3bf904e3127e8508537af485d1f))


### Build 🛠️

* **docker:** workspace-proof the three server Dockerfiles and add a CI image check (E12 T0.8, T2.23) ([e9455f8](https://github.com/mgallagher56/flump/commit/e9455f8b08fe6da287ac45866a61bc70adc04675))


### Tests 🧪

* **backend:** assert the route inventory still sees every call the browser makes through the /api proxy (E20-N5) ([49266fd](https://github.com/mgallagher56/flump/commit/49266fd04ed759b5503e81a05adeadbd26b377e7))
* **backend:** lower the web call-site floor to 50 after E20-N5 removed the dead HttpProfileAdapter (E20-N5) ([519acdd](https://github.com/mgallagher56/flump/commit/519acdde2e0ae372b34e4e9ccc924e0bdee13734))
* **backend:** MCP guard wiring tests and env docs (E29-T8 review) ([e7b871c](https://github.com/mgallagher56/flump/commit/e7b871c2544f760359054702abe1ca2cfc3913a9))


### Miscellaneous 🙃

* **docker:** harden images (non-root, healthcheck, exec-form CMD, dockerignore) and assert in CI (E18-N6) ([d5a63bc](https://github.com/mgallagher56/flump/commit/d5a63bceedda43730b1d6921c0b8a780865d8850))

## [1.25.0](https://github.com/mgallagher56/flump/compare/flump/backend-v1.24.0...flump/backend-v1.25.0) (2026-11-12)


### Features ✨

* **api-contract:** add @flump/api-contract with request schemas and route manifest ([98515fa](https://github.com/mgallagher56/flump/commit/98515faa0b41cde3a367195e73f8d301b3bc7752))
* **backend:** numeric transformer for decimal columns ([b675557](https://github.com/mgallagher56/flump/commit/b6755577f26b7655a6597bbbd34b843e4d40a14a))
* **backend:** shadow-mode request validation against @flump/api-contract ([32e0281](https://github.com/mgallagher56/flump/commit/32e02812d9a9326210ccb3765ef72554352595bc))
* **e19:** bank connection owner-only, stop storing synced transactions ([04842ef](https://github.com/mgallagher56/flump/commit/04842ef09d59e3b9a398d85adfd771c523288f05))
* **e19:** browser storage minimisation and log hygiene ([a36ad79](https://github.com/mgallagher56/flump/commit/a36ad798021863e19f6d796fe426060dc5cc8df6))
* **e19:** closed-beta allowlist guard and invite-only page ([e7f0ae9](https://github.com/mgallagher56/flump/commit/e7f0ae9e3a3d76f0cf4b9f8d47c8ad2d695df7c4))


### Bug Fixes 🪲

* backend and engine agree Self Assessment is off by default; repair main tests ([d4a2d09](https://github.com/mgallagher56/flump/commit/d4a2d09a7c845f5b3e7af67b9bc5825927419ae6))
* **backend:** bound shadow log volume and scale the money tolerance ([b825301](https://github.com/mgallagher56/flump/commit/b8253013cdcc05ab2c133475ad6be8d7211558ad))

## [1.24.0](https://github.com/mgallagher56/flump/compare/flump/backend-v1.23.0...flump/backend-v1.24.0) (2026-11-12)


### Features ✨

* **backend:** add /health liveness and /health/ready readiness; enable graceful shutdown hooks ([ab4dad9](https://github.com/mgallagher56/flump/commit/ab4dad9ba0a15cf63402fc383d975a72ac911064))
* **backend:** add baseline and bank-token-clear migrations ([03513fe](https://github.com/mgallagher56/flump/commit/03513fec90c86900b8ea93b44cb48bc4e72e4f3e))
* **backend:** add database config resolver with TLS and strict-environment rules ([4ea4d96](https://github.com/mgallagher56/flump/commit/4ea4d96b30f7fb9a5c48671353fcc83efa6892c3))
* **backend:** add WorkOS JWT and dev-bypass token verifiers with boot validation ([1f25c32](https://github.com/mgallagher56/flump/commit/1f25c32548b3b7b2ba415f3f98966721b4b6f57f))
* **backend:** remove TCP proxy, validate CORS, add helmet and body limits, own-email password reset ([330e6ca](https://github.com/mgallagher56/flump/commit/330e6caa50e36cb9b87614183e9186022166acf1))
* **backend:** RemoveSeededExampleData migration deletes seeded rows and mock identity data ([d1877b1](https://github.com/mgallagher56/flump/commit/d1877b111e61e5713201f4fc683e84e1dfd4c484))


### Bug Fixes 🪲

* **backend:** accept both WorkOS issuer forms, allow WORKOS_ISSUER override, log failing claim, pin jose ([10b9e25](https://github.com/mgallagher56/flump/commit/10b9e25e595d6282c0018c42871b0bfc0b4b6e47))
* **backend:** allow-list tax record writes and verify transaction account ownership ([fe3c9ef](https://github.com/mgallagher56/flump/commit/fe3c9ef26d18a1b33c2bd0f2bddc4ff3087a3f2a))
* **backend:** check account ownership before deleting its transactions ([9b02818](https://github.com/mgallagher56/flump/commit/9b028180b4f48407ae70f06f66d78ab50d9d4da4))
* **backend:** getBudgetEntries never seeds, seed-defaults idempotent, drop reset route ([ed4c2a8](https://github.com/mgallagher56/flump/commit/ed4c2a85c566ce638b2765cbb269c876cfa43345))
* **backend:** guard destructive migration tests and make the token clear run once ([0831a45](https://github.com/mgallagher56/flump/commit/0831a457701188bc73e30302b1270211c30b1902))
* **backend:** ignore client-supplied ids and ownership on account and transaction writes ([9b80210](https://github.com/mgallagher56/flump/commit/9b8021090d6a07f25b7016f208cfcd08060e53b2))
* **backend:** never seed accounts on getAccounts or getPortfolioSnapshot ([a956d7e](https://github.com/mgallagher56/flump/commit/a956d7e361ad70b8027e8486650a56f5bd8c3e0b))
* **backend:** never seed tax records on getTaxRecords, add no-seed guard spec ([b33c7ae](https://github.com/mgallagher56/flump/commit/b33c7ae290aa7ce153be9cfab89e0009be59c7cc))
* **backend:** race-safe lazy profile creation ([bb22354](https://github.com/mgallagher56/flump/commit/bb2235401095c851f4bdb5d2f90d8ab7d2c2e623))
* **backend:** register bank-connections refresh route, reject blank budget name on PATCH ([5a31449](https://github.com/mgallagher56/flump/commit/5a31449b2cb13ce810139ef42e135a2bca22307c))
* **backend:** reject query strings in assertSafeTestDatabase URLs ([6c716f3](https://github.com/mgallagher56/flump/commit/6c716f3cfe85bd1c1c6396a285065e4456f28d50))
* **backend:** require exp claim and make test helper noSub real ([ce5aa44](https://github.com/mgallagher56/flump/commit/ce5aa44c9959ff8684691b318678cd175d45f196))
* **backend:** stop returning bank tokens and handle cleared or undecryptable connections ([277a835](https://github.com/mgallagher56/flump/commit/277a835365dd8932bb07f36cd9e481937a5366fe))
* **backend:** validate database and banking config at boot from a single options source ([2a8ed2a](https://github.com/mgallagher56/flump/commit/2a8ed2add8a65eb43b7bbb0a634d6040710f4070))
* **backend:** verify WorkOS tokens and fail closed, drop mock auth and callback bypass ([3053656](https://github.com/mgallagher56/flump/commit/30536567bb0698e2909fe7756fc0cff093f95406))
* **backend:** warn on plaintext remote DB, document dev schema setup, keep CLI from auto-running migrations ([96d80e2](https://github.com/mgallagher56/flump/commit/96d80e2cfcc0f6ae31b54df9192bb3c081357833))
* **banking:** require the encryption key outside development and throw on failed decrypt ([560eb84](https://github.com/mgallagher56/flump/commit/560eb84166c78f475ae407c76efd70dfcb585f77))
* **deps:** update typeorm to v1 ([ad4cd80](https://github.com/mgallagher56/flump/commit/ad4cd80637c9e59d1dd39728446799cc96eaa54f))
* **mcp:** accept only personal access tokens and return 401 for every auth failure ([1195e94](https://github.com/mgallagher56/flump/commit/1195e94f4e1b60b6a05f9df160a5166df8972b4c))
* **security:** address PR 390 review (honest reset errors, limiter reset and /64 keys, trust-proxy env, CORS warn-and-deny, SECURITY_CONTACT-gated security.txt, isFlumpHost cases) ([5bd34ea](https://github.com/mgallagher56/flump/commit/5bd34ea20bb6ab22bee5b4b929a2b6d05022ccf1))
* **security:** trust one proxy hop in production, nonce marketing theme script, ledger and stale rule ([cb4c1c2](https://github.com/mgallagher56/flump/commit/cb4c1c2e5b8ed52ade52f31f4942fb04923da15c))
* **ui,backend:** name EmptyState landmark, clarify README hash placeholder ([e9eb297](https://github.com/mgallagher56/flump/commit/e9eb2973f5e34584bf5bd31867dddecef896744a))
* web-to-backend contract bugs (account currency, budget entry name, PATCH accounts) ([c4d709b](https://github.com/mgallagher56/flump/commit/c4d709b7aba398be55313255c397319031aea8f5))


### Build 🛠️

* **test:** add coverage include lists per workspace and untrack committed coverage output ([e9d78fd](https://github.com/mgallagher56/flump/commit/e9d78fd3f1144308ad30899dc6f26dfbdfbc19e6))


### CI 🤖

* allow-list the seed-cleanup migration in check:auth, drop mock ids from README ([900aaf0](https://github.com/mgallagher56/flump/commit/900aaf04a0e909ca609552d5309fee8e0127660a))
* run the real-Postgres migration suite in CI and pass its env through turbo ([09cca20](https://github.com/mgallagher56/flump/commit/09cca20fd1bf8d084c71f29c114ff5e8253a0776))


### Documentation 📙

* add pre-deploy checklist and make example secret placeholders fail loudly ([fd91d3a](https://github.com/mgallagher56/flump/commit/fd91d3a1f32f5cc80c95efcb49ea5fef19b83690))
* document database, TLS, banking key and migrations configuration ([32333c7](https://github.com/mgallagher56/flump/commit/32333c766bebda1c9a050e5b59981c9396fb5583))


### Tests 🧪

* **backend:** add cross-user access tests for account, transaction, connection, budget and tax resources ([a842568](https://github.com/mgallagher56/flump/commit/a842568ca859b3c4590a98bc12d5de6fa94e5401))
* **backend:** add web-to-backend route inventory guard (E23 P0-2) ([9fc27ba](https://github.com/mgallagher56/flump/commit/9fc27ba7e643111cb7d30d8ee70de1c9a1b33ba9))
* **backend:** derive migration list from src/migrations via shared discoverMigrations helper ([ba123d7](https://github.com/mgallagher56/flump/commit/ba123d7648be5968479208b0182025c825c1ab32))
* **backend:** fail collection when REQUIRE_DB_TESTS=1 and no test database is set ([00e6709](https://github.com/mgallagher56/flump/commit/00e67098ba395a68defc8e4b88e78e6629a11ee0))
* **backend:** harden contract test (split-field reset, discovered migrations, honest pairing) ([fa11e76](https://github.com/mgallagher56/flump/commit/fa11e7612f06ebc3727e6633af4102c37c7e7540))
* **backend:** load discovered migrations lazily (no top-level await, hoisted vi.mock safe) ([c18685b](https://github.com/mgallagher56/flump/commit/c18685b4ab37cc96cfd493257e10e91b93dda260))
* **backend:** lower route-inventory sanity floors to the real counts ([1b2de34](https://github.com/mgallagher56/flump/commit/1b2de34820d2add1a0f373b3fac33b70e38df61c))
* **backend:** MCP context pack for a new user writes no accounts or data ([e6371b6](https://github.com/mgallagher56/flump/commit/e6371b6d1dd8db88711bba5d4857a42c75e66c25))
* **backend:** require 'test' as a whole word in the safe test database name ([983c7c1](https://github.com/mgallagher56/flump/commit/983c7c1f8e0b06e2a650dc9b215646eda4370c1d))
* **backend:** run vitest files serially so real-Postgres suites do not race ([f1db970](https://github.com/mgallagher56/flump/commit/f1db97049ccc7388dc9ae5409995288159e2c3e8))
* **backend:** tighten route inventory (no guessing, strict param matching, pinned counts) ([7ca7a70](https://github.com/mgallagher56/flump/commit/7ca7a70667bffe6f8d6e4cd9e4d7d072bac0ab2b))
* **backend:** web-to-backend contract test on real Postgres (E23 P0-3) ([94d783c](https://github.com/mgallagher56/flump/commit/94d783c91eb5602e0547441e8b0276cc350de645))
* **ci:** route tests, audit gate, token and tabular-nums ratchets, coverage floors ([e96cf81](https://github.com/mgallagher56/flump/commit/e96cf81e8e858030899848f57a8a1d7904e86fdc))
* coverage tasks (turbo otherwise strips them and the suite skips). ([09cca20](https://github.com/mgallagher56/flump/commit/09cca20fd1bf8d084c71f29c114ff5e8253a0776))
* keep web onboarding twin literal (web tsconfig cannot import backend files); no Function type ([89da968](https://github.com/mgallagher56/flump/commit/89da968b9bd4f31f088b2ee5a436b553a017c3f8))


### Miscellaneous 🙃

* **backend:** type-check test/ via tsconfig.test.json in check-types ([13830e9](https://github.com/mgallagher56/flump/commit/13830e9c5ba182ddd662785c24f0c8d93aabd9b9))

## [1.23.0](https://github.com/mgallagher56/flump/compare/flump/backend-v1.22.2...flump/backend-v1.23.0) (2026-11-11)


### Features ✨

* **marketing,backend,web:** add unit tests and increase vitest coverage across backend and marketing apps ([5473e7d](https://github.com/mgallagher56/flump/commit/5473e7dc59fee7cab67dc250bbd124d133398897))

## [1.22.2](https://github.com/mgallagher56/flump/compare/flump/backend-v1.22.1...flump/backend-v1.22.2) (2026-11-11)

### Miscellaneous 🙃

- **backend:** fix user profile controller ([be5e275](https://github.com/mgallagher56/flump/commit/be5e275a1fb979d94010a5246c70be7c618eb782))

## [1.22.1](https://github.com/mgallagher56/flump/compare/flump/backend-v1.22.0...flump/backend-v1.22.1) (2026-11-11)

### Bug Fixes 🪲

- **backend:** fix dockerfile ([6f869cf](https://github.com/mgallagher56/flump/commit/6f869cf012ec42948fd2258ad44ea2d5219bf2c2))

## [1.22.0](https://github.com/mgallagher56/flump/compare/flump/backend-v1.21.3...flump/backend-v1.22.0) (2026-11-10)

### Features ✨

- **architecture:** resolve design system review findings, colocated directory law, and strict backend types ([4806f3a](https://github.com/mgallagher56/flump/commit/4806f3a34fb7d4eb3912913853177a46d287b0ff))
- **banking:** enable live Open Banking for all popular banks and add Trading 212 ([bcd56d6](https://github.com/mgallagher56/flump/commit/bcd56d6da4a19f00d4afe609c60a2df26e53ebb3))
- **banking:** remove dummy data and enable real bank connections ([a78b7de](https://github.com/mgallagher56/flump/commit/a78b7ded2d7063597497d675173900b059cba2a6))
- **design-system:** consolidate semantic tokens, enforce colocated architecture, and configure Storybook 10 suite ([b629a1b](https://github.com/mgallagher56/flump/commit/b629a1bf0fe89ea03bfab4eedb89f7ff882f007e))

### Bug Fixes 🪲

- **ci:** add @radix-ui/react-tabs to ui dependencies and fix backend account intake types ([7f996b1](https://github.com/mgallagher56/flump/commit/7f996b1f442b62ab255945438360a504f85a1114))
- **docker:** include banking and finance-engine package.json in Dockerfiles ([83923df](https://github.com/mgallagher56/flump/commit/83923df4d914395482137681cd7380e547839df9))

### Refactor 🔥

- **arch:** deepen modules, consolidate finance engine, and isolate banking seam ([d516793](https://github.com/mgallagher56/flump/commit/d5167938b6e343439c9bcdea944d49365162d66d))

## [1.21.3](https://github.com/mgallagher56/flump/compare/flump/backend-v0.0.1...flump/backend-v1.21.3) (2026-11-10)

### Features ✨

- add pension and savings pages, compound forecasters, UK auto-enrolment rules, and onboarding wizards ([fcae1cb](https://github.com/mgallagher56/flump/commit/fcae1cb654048091caa53443e4af4887baed5403))
- add user initials thumbnail and profile picture upload support ([6612d56](https://github.com/mgallagher56/flump/commit/6612d56a088a0613e91dbed272798afa01995657))
- **backend:** add production Dockerfile and host binding ([864eb24](https://github.com/mgallagher56/flump/commit/864eb24cd107025093cfb9f5b3f07640a8f57256))
- improve tax planner, profile settings, budget customization, and dashboard UX ([134de6f](https://github.com/mgallagher56/flump/commit/134de6fb7ddef2b8d3be5abdf18ff5e8e8b12288))
- simplify pension forecaster UI, fix mobile nav height, and improve runway calculator ([8abe89f](https://github.com/mgallagher56/flump/commit/8abe89fe4bb9848d8d7725385842411aafa193dd))
- **ui:** institutional fintech UI/UX refactor and 2-column simulator layouts ([92885f1](https://github.com/mgallagher56/flump/commit/92885f128d9ac4526aa1496d85b8ee96de2b3816))
- **ux:** embed interactive sandboxes, connect mobile bottom bar, add centered donut metric, and remove health scoring ([eba2184](https://github.com/mgallagher56/flump/commit/eba21845efa86e616873f5385557e1c199048724))

### Bug Fixes 🪲

- **deps:** pin dependencies ([b69b5ce](https://github.com/mgallagher56/flump/commit/b69b5cebf960dfa37f3176c5d1bce0a9f14c88be))
- **deps:** pin dependencies ([d5963a6](https://github.com/mgallagher56/flump/commit/d5963a680c465b63671523ce26ceb788ee341dad))
- **deps:** update nest monorepo to v12 ([8083ce7](https://github.com/mgallagher56/flump/commit/8083ce7fb2c272fa58bd10027ef1287fed6af272))

### Refactor 🔥

- **backend:** delegate banking sync, sign rules, and crypto to @flump/banking ([829ce87](https://github.com/mgallagher56/flump/commit/829ce876cd4af933e353d227fcf05ebdb9807e7a))

### Miscellaneous 🙃

- **deploy:** configure per-service Dockerfile paths and inject runtime API_URL ([265c7b0](https://github.com/mgallagher56/flump/commit/265c7b07ac4e684a949c30dcf53ef0ca86e2dea8))
- **deps:** prune unused dependencies and align vitest versions ([e08b3bc](https://github.com/mgallagher56/flump/commit/e08b3bc4948ce28eb1f8efc25d243d8fa89db6c7))
- re-architect monorepo with bun, nestjs, react 19, and radix ([6e143b1](https://github.com/mgallagher56/flump/commit/6e143b19a7f307c88af390e3207f9f8f1285ae09))
- run lint and typescript checks and fix violations ([b5975fb](https://github.com/mgallagher56/flump/commit/b5975fb7d62aa7aa70aa281b43b11cdbf5d8d9c7))
- stop tracking environmental configurations and build artifacts ([6bd773a](https://github.com/mgallagher56/flump/commit/6bd773a1db81c0972c2afb07e9a18e8ebd2bb42a))
- **web:** release 1.20.0 ([1f2a83d](https://github.com/mgallagher56/flump/commit/1f2a83d1b3f1b2470283e3dc60bd627a7444f34e))
- **web:** release 1.21.0 ([a1a66d3](https://github.com/mgallagher56/flump/commit/a1a66d35611c46a5f98d6dac4e155dd219d42fd3))
- **web:** release 1.21.3 ([cba2855](https://github.com/mgallagher56/flump/commit/cba28559b66c1065b2e654d9e32d11eb463152eb))

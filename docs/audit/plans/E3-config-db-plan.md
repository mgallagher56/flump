# E3 Config and Database Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Production refuses to boot with missing or insecure configuration, the schema is managed by migrations, and bank tokens are encrypted with a real key and never returned to clients.

**Architecture:** Pure `resolve*` functions take an env record and throw on bad config (the same shape as E1's `resolveAuthMode`); Nest provider factories call them so the process fails before listening. TypeORM options come from one function shared by the app and a CLI `data-source.ts`. Two migrations: an idempotent baseline and a one-off token clear. A mapper strips token fields from every bank connection response.

**Tech Stack:** NestJS 12, TypeORM 1.1.2 (Postgres), Vitest 5, Bun, Docker (OrbStack) for migration tests.

**Spec:** [E3-config-db-design.md](E3-config-db-design.md). Findings covered: D-10, N-01, C-19, A-01, B-04, D-11, N-02. D-12 is a human task (see the end).

## Global Constraints

- Errors name the variable and never print a value.
- Production requires `DATABASE_URL`, or all of `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`; no defaults for credentials; `DB_PASSWORD` equal to `postgres` or empty is rejected.
- Production requires `BANKING_TOKEN_ENCRYPTION_KEY` of at least 32 characters. The committed default key is allowed only when `NODE_ENV` is `development` or `test`.
- Database TLS: non-local connections verify certificates by default; `DB_SSL_CA` is passed through; `DB_SSL=no-verify` is the explicit opt-out and logs a warning; `DB_SSL=false` means no TLS; unknown `DB_SSL` values throw.
- `synchronize` is true only when `DB_SYNCHRONIZE=true` and the environment is not strict; `DB_SYNCHRONIZE=true` in a strict environment throws. Migrations run on boot in production (`migrationsRun: true`).
- No bank connection response contains `accessToken` or `refreshToken`.
- `safeDecryptBankingToken` throws on any failed decrypt; it never returns the input.
- Tests first for each behaviour (project `tdd` skill). Before any PR run the four gates (AGENTS.md section 5): `bun run lint`, `bun run check-types`, `bun run test`, `bun run build`; `bun run lint` reformats three unrelated `CHANGELOG.md` files, so restore them with `git checkout --` and do not commit them.
- Commits only when the user asks; the commit steps are for that moment. Messages end with the session's attribution line.

**Ruling in this plan (differs from the spec's wording, same intent):** "production" for config purposes is **strict mode**: `NODE_ENV` is anything other than `development` or `test` (including unset). The spec already uses this rule for the banking key; applying it to the database settings too means an unset `NODE_ENV` on a deploy fails closed instead of silently using local defaults. Local development must set `NODE_ENV=development` (E1 already requires it for the auth dev bypass); document it in `.env.example`.

## Review Focus

1. **Hostname containing "localhost":** a production URL such as `postgres://u:p@localhost-db.internal/x` must not be treated as local (the current code uses `url.includes("localhost")`). Compare the parsed hostname to `localhost`, `127.0.0.1`, `::1` exactly (Task 1).
2. **Malformed `DATABASE_URL`:** an unparseable URL throws naming `DATABASE_URL`, with no part of the URL in the message; a URL carrying `?sslmode=...` is accepted and `DB_SSL` still decides TLS (Task 1).
3. **Unset `NODE_ENV`:** strict mode, so required variables are enforced (Tasks 1 and 2).
4. **Second instance booting during migration:** both migrations are idempotent, so a concurrent or repeated run is harmless (Task 4).
5. **Cleared or undecryptable connection:** syncing a connection whose tokens are null, or whose ciphertext fails to decrypt, marks it `error` and returns a reconnect message; it never returns a 500 with key material or ciphertext (Task 5).

---

## File structure

| File                                                  | Responsibility                                                                 |
| ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| `apps/backend/src/config/db.config.ts` (create)       | `resolveDbConfig(env)`, `isStrictEnv(env)`                                     |
| `apps/backend/src/config/typeorm.options.ts` (create) | `ENTITIES`, `typeOrmOptionsFromEnv(env)` shared by the app and the CLI         |
| `apps/backend/src/config/config.module.ts` (create)   | Boot-time validation provider: calls `resolveDbConfig` and `resolveBankingKey` |
| `apps/backend/src/data-source.ts` (create)            | TypeORM CLI entry for migrations                                               |
| `apps/backend/src/migrations/` (create)               | `Baseline1794355200000`, `ClearBankTokens1794355300000`                        |
| `apps/backend/src/bank-connection.public.ts` (create) | `toPublicConnection`                                                           |
| `packages/banking/src/server/crypto.ts` (modify)      | `resolveBankingKey`, strict decrypt                                            |
| `apps/backend/src/app.module.ts` (modify)             | Use `typeOrmOptionsFromEnv` and the config module                              |
| `apps/backend/src/finance.service.ts` (modify)        | Public responses, reconnect handling                                           |

---

### Task 1: Database config resolver

**Files:**

- Create: `apps/backend/src/config/db.config.ts`
- Test: `apps/backend/src/config/db.config.spec.ts`

**Interfaces:**

- Produces:
  - `type Env = Record<string, string | undefined>`
  - `isStrictEnv(env: Env): boolean` (true unless `NODE_ENV` is `development` or `test`)
  - `interface DbConfig { connection: { url: string } | { host: string; port: number; username: string; password: string; database: string }; ssl: false | { rejectUnauthorized: boolean; ca?: string }; synchronize: boolean; migrationsRun: boolean; warnings: string[] }`
  - `resolveDbConfig(env: Env): DbConfig`

- [ ] **Step 1: Write failing tests** in `db.config.spec.ts`:
  - strict env with `{}` throws; message names `DATABASE_URL` and does not contain `postgres` as a value
  - strict env with `DB_HOST`, `DB_USER`, `DB_NAME` but no `DB_PASSWORD` throws naming `DB_PASSWORD`; `DB_PASSWORD: "postgres"` throws; `DB_PASSWORD: ""` throws
  - `NODE_ENV: "development"` with `{}` returns the local defaults (host `localhost`, port 5432, user/password/database `postgres`), `ssl: false`, `synchronize: false`, `migrationsRun: false`
  - `NODE_ENV: "production"` with `DATABASE_URL: "postgres://u:p@db.example.com/x"` returns `ssl: { rejectUnauthorized: true }`, `migrationsRun: true`, `synchronize: false`
  - `DB_SSL_CA: "-----CA-----"` is passed as `ssl.ca`
  - `DB_SSL: "no-verify"` gives `ssl.rejectUnauthorized: false` and one warning naming `DB_SSL`; `DB_SSL: "false"` gives `ssl: false`; `DB_SSL: "bogus"` throws naming `DB_SSL`
  - local URL `postgres://u:p@localhost/x` gives `ssl: false`; `postgres://u:p@localhost-db.internal/x` gives verifying TLS (Review Focus 1); `127.0.0.1` and `[::1]` are local
  - malformed `DATABASE_URL: "not a url"` throws naming `DATABASE_URL`, message contains no part of the input (Review Focus 2); `postgres://u:p@db.example.com/x?sslmode=require` is accepted
  - `DB_SYNCHRONIZE: "true"` with `NODE_ENV: "development"` gives `synchronize: true`; with strict env throws naming `DB_SYNCHRONIZE`
  - no thrown message contains any supplied secret value (loop over a set of secrets)
- [ ] **Step 2: Run** `cd apps/backend && bunx vitest run src/config/db.config.spec.ts`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement** the signatures above in `db.config.ts`; parse `DATABASE_URL` with `new URL`, wrap the parse failure in a generic error that names the variable.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(backend): add database config resolver with TLS and strict-environment rules`.

---

### Task 2: Banking key and strict decrypt

**Files:**

- Modify: `packages/banking/src/server/crypto.ts`, `packages/banking/src/server/index.ts` (export `resolveBankingKey`)
- Test: `packages/banking/src/server/crypto.test.ts`, and any `orchestrator.test.ts` case that relied on the raw-token fallback

**Interfaces:**

- Produces: `resolveBankingKey(env: Record<string, string | undefined>): string`. Strict env (NODE_ENV not `development`/`test`): requires `BANKING_TOKEN_ENCRYPTION_KEY` of length 32 or more, else throws naming the variable. Non-strict: returns the variable if set, else the committed default. `getDerivedKey` uses `keyOverride ?? resolveBankingKey(process.env)`. `safeDecryptBankingToken(token, keyOverride?)` keeps its signature but throws on any non-empty token that is not decryptable.

- [ ] **Step 1: Write failing tests:**
  - `resolveBankingKey({ NODE_ENV: "production" })` throws naming `BANKING_TOKEN_ENCRYPTION_KEY`; so does `{}` (unset NODE_ENV, Review Focus 3) and a 31-character key; a 32-character key in production returns it; the thrown message contains no key value
  - `{ NODE_ENV: "development" }` and `{ NODE_ENV: "test" }` return the default when the variable is unset and the variable when set
  - round trip with a supplied key; decrypting with a different key throws; `safeDecryptBankingToken("plaintext-token")` throws (non-encrypted input); `safeDecryptBankingToken("")` still returns `""`
  - ciphertext produced under key A cannot be read under key B (assert throws, no raw return)
- [ ] **Step 2: Run** `cd packages/banking && bunx vitest run src/server/crypto.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** in `crypto.ts`. Update `orchestrator.ts` `decryptToken` doc comment (no longer "returns plaintext if not encrypted"); adjust any `orchestrator.test.ts` case that depended on the old behaviour and list it in your report.
- [ ] **Step 4: Run** `cd packages/banking && bunx vitest run`. Expected: PASS. Then rebuild for the backend: `bunx turbo run build --filter=@flump/banking`.
- [ ] **Step 5: Commit** `fix(banking): require the encryption key outside development and throw on failed decrypt`.

---

### Task 3: Wire config into the app, one options source, CLI data source

**Files:**

- Create: `apps/backend/src/config/typeorm.options.ts`, `apps/backend/src/config/config.module.ts`, `apps/backend/src/data-source.ts`
- Modify: `apps/backend/src/app.module.ts`, `apps/backend/package.json` (scripts)
- Test: `apps/backend/src/config/config.module.spec.ts`, `apps/backend/src/config/typeorm.options.spec.ts`

**Interfaces:**

- Consumes: `resolveDbConfig`, `resolveBankingKey`.
- Produces:
  - `export const ENTITIES: Function[]` (the eight entities, once)
  - `typeOrmOptionsFromEnv(env: Env): TypeOrmModuleOptions` returning `type: "postgres"`, `entities: ENTITIES`, `migrations: [<glob to ./migrations/*{.ts,.js}>]`, `synchronize`, `migrationsRun`, `ssl`, and the connection fields from `resolveDbConfig`
  - `@Global() class AppConfigModule` providing a `BOOT_CONFIG` value that calls both resolvers; logs each `warnings` entry with the Nest `Logger`
  - `data-source.ts` default-exports a `DataSource` built from `typeOrmOptionsFromEnv(process.env)`
  - scripts: `migration:run`, `migration:revert`, `migration:generate` using `data-source.ts`

- [ ] **Step 1: Write failing tests:**
  - `typeOrmOptionsFromEnv` returns `synchronize: false` and `migrationsRun: true` for `{ NODE_ENV: "production", DATABASE_URL: "postgres://u:p@db.example.com/x", BANKING_TOKEN_ENCRYPTION_KEY: ... }`; `entities` has length 8 and contains `BankConnection`
  - compiling `AppConfigModule` with `NestFactory.createApplicationContext` (`abortOnError: false`, the pattern from `auth.module.spec.ts`) rejects for a strict env missing `BANKING_TOKEN_ENCRYPTION_KEY`, naming it, and resolves for a valid one; the `no-verify` warning is logged once when set
- [ ] **Step 2: Run** `cd apps/backend && bunx vitest run src/config`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above. In `app.module.ts` import `AppConfigModule` before `TypeOrmModule`, replace both inline option branches with `TypeOrmModule.forRootAsync({ useFactory: () => typeOrmOptionsFromEnv(process.env) })` and reuse `ENTITIES` in `forFeature`. Keep the `ConfigModule.forRoot` call first so `.env` loads before the factories run.
- [ ] **Step 4: Run** `cd apps/backend && bunx vitest run` and `bunx tsc --noEmit`. Expected: PASS and clean. Fix any spec that built the old options inline.
- [ ] **Step 5: Commit** `fix(backend): validate database and banking config at boot from a single options source`.

---

### Task 4: Baseline and token-clear migrations

**Files:**

- Create: `apps/backend/src/migrations/Baseline1794355200000.ts`, `apps/backend/src/migrations/ClearBankTokens1794355300000.ts`
- Test: `apps/backend/src/migrations/migrations.integration.spec.ts`
- Modify: `apps/backend/vitest.config.ts` only if the integration spec needs its own include; prefer `describe.skipIf(!process.env.TEST_DATABASE_URL)` so `bun run test` stays green without a database

**Interfaces:**

- Consumes: `data-source.ts`, `typeOrmOptionsFromEnv`.
- Produces: two `MigrationInterface` classes. `Baseline.up(queryRunner)`: if `await queryRunner.hasTable("user_profiles")` (and the other entity tables) return without changes; otherwise run the SQL TypeORM generates for the current entities. `Baseline.down` is a no-op with a comment saying why. `ClearBankTokens.up`: `UPDATE bank_connections SET access_token = NULL, refresh_token = NULL, status = 'error'`; `down` is a no-op.

- [ ] **Step 1: Start a throwaway database:** `docker run --rm -d --name flump-e3-pg -e POSTGRES_PASSWORD=postgres -p 55432:5432 postgres:18-alpine`; use `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:55432/postgres` (local URL, so no TLS). Expected: container healthy after a few seconds (`docker exec flump-e3-pg pg_isready`).
- [ ] **Step 2: Write failing integration tests** (skipped without `TEST_DATABASE_URL`; each test uses a fresh schema or drops it first):
  - baseline on an empty database creates all eight tables (assert via `information_schema.tables`)
  - running migrations twice in a row changes nothing and records each migration once in the `migrations` table (Review Focus 4)
  - a database built by the old route (`dataSource.synchronize()` first, then `runMigrations`) is left unchanged by the baseline and records it as applied
  - after `ClearBankTokens`, seeded `bank_connections` rows have null tokens and `status = 'error'`; with zero rows it succeeds
- [ ] **Step 3: Run** `cd apps/backend && TEST_DATABASE_URL=postgres://postgres:postgres@localhost:55432/postgres bunx vitest run src/migrations`. Expected: FAIL (migrations missing).
- [ ] **Step 4: Create the migrations.** For the baseline, obtain the SQL TypeORM would run on an empty database (the schema builder's `log()` against a freshly created empty database through `data-source.ts`) and embed it as `queryRunner.query(...)` calls inside the `hasTable` guard; do not hand-write the DDL.
- [ ] **Step 5: Run** the same command. Expected: PASS. Then run it once without `TEST_DATABASE_URL` and confirm the suite is skipped, not failed.
- [ ] **Step 6: Stop the container:** `docker rm -f flump-e3-pg`.
- [ ] **Step 7: Commit** `feat(backend): add baseline and bank-token-clear migrations`.

---

### Task 5: Public bank connection responses and reconnect handling

**Files:**

- Create: `apps/backend/src/bank-connection.public.ts`
- Modify: `apps/backend/src/finance.service.ts` (`getBankConnections`, `connectBank`, `syncBankConnection`, and the error handling in sync)
- Test: `apps/backend/src/bank-connection.public.spec.ts`, `apps/backend/src/finance.service.spec.ts`

**Interfaces:**

- Produces:
  - `interface PublicBankConnection { id: string; institutionId: string; institutionName: string; status: "connected" | "disconnected" | "error"; authType: "oauth" | "token"; expiresAt: Date | null; lastSyncedAt: Date; createdAt: Date; updatedAt: Date }`
  - `toPublicConnection(connection: BankConnection): PublicBankConnection`

- [ ] **Step 1: Write failing tests:**
  - `toPublicConnection` output has none of `accessToken`, `refreshToken`, `userId` (assert `Object.keys`) and keeps the listed fields
  - `getBankConnections("userA")` returns only user A's rows and no token fields (in-memory repository from E1)
  - `connectBank` token path returns `connection` without token fields
  - `syncBankConnection` on a connection whose `accessToken` is null leaves it `error` and throws `BadRequestException` whose message asks the user to reconnect, not a 500 (Review Focus 5)
  - `syncBankConnection` where decryption throws (ciphertext under another key) marks the connection `error`, throws `BadRequestException`, and the message contains neither the ciphertext nor key text
- [ ] **Step 2: Run** `cd apps/backend && bunx vitest run src/bank-connection.public.spec.ts src/finance.service.spec.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the mapper and use it in the three methods; map the decrypt and null-token cases to the reconnect `BadRequestException` after saving `status: "error"`.
- [ ] **Step 4: Run** `cd apps/backend && bunx vitest run`. Expected: PASS (existing controller specs that read token fields from responses need updating; list each).
- [ ] **Step 5: Commit** `fix(backend): stop returning bank tokens and handle cleared or undecryptable connections`.

---

### Task 6: Docs and full verification

**Files:**

- Modify: `apps/backend/.env.example`, `README.md` (environment section and a short "Migrations" section), `apps/web/.env.example` (`SESSION_SECRET`)

- [ ] **Step 1: Document** `NODE_ENV=development` for local runs, `BANKING_TOKEN_ENCRYPTION_KEY` (required outside development/test, 32+ characters, how to generate one with `openssl rand -hex 32`), `DB_SSL` (`false`, `no-verify`, unset), `DB_SSL_CA`, `DB_SYNCHRONIZE` (development only), `SESSION_SECRET`, and migrations commands (`bun run --cwd apps/backend migration:run`, `migration:generate`). Say that users with existing bank connections must reconnect once after deploy.
- [ ] **Step 2: Run the four gates:** `bun run check-types`, `bun run test`, `bun run build`, and `bunx biome check .` read-only for lint (compare to the known baseline: three `CHANGELOG.md` format errors, about 126 warnings); then `bun run lint` only if you restore the changelogs afterwards. Expected: zero new errors.
- [ ] **Step 3: Check the E1 guard script:** `bash scripts/check-no-mock-auth.sh` exits 0.
- [ ] **Step 4: Run the migration suite once more** against a fresh container (Task 4 steps 1, 3, 6) as the final evidence.
- [ ] **Step 5: Commit** `docs: document database, TLS, banking key and migrations configuration`.

---

## Human tasks (not code)

1. **D-12 rotation:** rotate, in order, the WorkOS API key and client credentials, the database password and `JWT_SECRET` found in git history; update the deployment environment; review secret stores in Railway and GitHub.
2. **Before deploy:** confirm the production tables match the entities (schema diff or `\d` on the eight tables) and note how many rows `bank_connections` has.
3. **Before deploy:** set `BANKING_TOKEN_ENCRYPTION_KEY`; decide `DB_SSL=no-verify` or `DB_SSL_CA` if the provider uses a self-signed certificate; set `NODE_ENV=production` explicitly.

## Not in this plan

Validation layer (D-08, B-02), seeded fake data (E2), loader error states (E5), purging secrets from git history.

## Self-review

- **Spec coverage:** boot-time config check (Tasks 1, 2, 3); TLS (Task 1); schema management and baseline (Tasks 3, 4); bank tokens, strict decrypt, token clear, public responses (Tasks 2, 4, 5); docs and env (Task 6); D-12 as human tasks. The strict-mode ruling is called out in the header.
- **Type consistency:** `Env`, `isStrictEnv`, `DbConfig`, `resolveDbConfig`, `resolveBankingKey`, `typeOrmOptionsFromEnv`, `ENTITIES`, `toPublicConnection` are defined once and used with the same names.
- **Proportion:** most steps are signatures and test names; the only generated artefact (the baseline SQL) is derived by tooling, not written in the plan.

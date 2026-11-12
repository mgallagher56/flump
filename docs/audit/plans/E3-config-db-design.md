# E3 design: secrets, config and database safety

Status: **draft for review.** Nothing in this spec has been implemented. Source: [EPICS.md](../EPICS.md) epic E3. Follows epic E1 (merged in PR 369), whose boot-time pattern (`resolveAuthMode`) this reuses.

## Purpose and success criteria

Production refuses to boot with missing or insecure configuration, schema changes go through migrations, and bank credentials are never encrypted with a public key or returned to clients.

Done when all of these hold:

1. In production the backend refuses to start unless the database is explicitly configured (`DATABASE_URL`, or every `DB_*` variable) with no default password, and `BANKING_TOKEN_ENCRYPTION_KEY` is set to at least 32 characters. Errors name the variable and never print a value.
2. Database TLS verifies certificates by default for non-local connections. Turning verification off requires an explicit setting and logs a warning.
3. `synchronize` is never on in production. It can only be switched on in development with an explicit flag.
4. The schema is created and changed by migrations. A baseline migration exists that does not fail on a database that already has the tables.
5. The committed default encryption key cannot be used in production. A failed decrypt throws instead of returning the stored value.
6. No bank connection response contains `accessToken` or `refreshToken`.
7. Existing stored bank tokens are cleared and connections marked `error`, so users reconnect.
8. `.env.example` and the README document every variable this epic introduces.

## Decisions already made

| Decision             | Choice                                                                              | Reason                                                                                                       |
| -------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Schema management    | **Baseline migration now**, migrations run on boot in production, `synchronize` off | Fixes the root cause (B-04) in one go                                                                        |
| Existing bank tokens | **Force reconnect**: clear tokens, mark connections `error`                         | No old key to carry; the audit found the bank-connect flow partly mocked, so few real connections are likely |

## Findings covered

D-10, N-01, C-19, A-01, B-04 (database), D-11 (bank token key and exposure), N-02 (env validation), D-12 (rotation, human task). Not covered: full DTO validation (D-08, B-02), seeded fake data (E2), error rendering (E5).

## Facts from the code that shape the design

- `apps/backend/src/app.module.ts` sets `synchronize: true` in both database branches, `ssl: { rejectUnauthorized: false }` for any non-local `DATABASE_URL`, and defaults `DB_PASSWORD` to `postgres` in the discrete-variable branch. There is no migrations directory and no migration script in `apps/backend/package.json`. TypeORM is `1.1.2`.
- `packages/banking/src/server/crypto.ts` derives the key from `keyOverride ?? process.env.BANKING_TOKEN_ENCRYPTION_KEY ?? DEFAULT_DEV_KEY` (a literal in the file). `safeDecryptBankingToken` returns the input on any failure, including a wrong key. `BANKING_TOKEN_ENCRYPTION_KEY` is absent from `apps/backend/.env.example`.
- `FinanceController.getBankConnections` returns the `BankConnection` entity unmodified, so encrypted `accessToken` and `refreshToken` reach the browser. `connectBank` and sync responses return the entity too.
- The backend Dockerfile builds with `NODE_ENV=production` and runs `bun dist/main.js`, so migrations need to be reachable from the compiled output.
- E1 added `resolveAuthMode(env)` in `apps/backend/src/auth/auth.config.ts` as a pure function wired through a Nest provider factory, so the process fails before listening. E3 follows the same shape.

## Design

### 1. Boot-time configuration check

A new `apps/backend/src/config/db.config.ts` exports pure functions that take an env record, like `resolveAuthMode`:

- `resolveDbConfig(env)` returns the connection settings (url or host, port, user, password, database), `ssl` (`false` or `{ rejectUnauthorized: boolean; ca?: string }`), `synchronize` and `migrationsRun`, or throws.
  - In production (`NODE_ENV === "production"`): requires `DATABASE_URL`, or all of `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`. No defaults for credentials. `DB_PASSWORD` equal to `postgres` or empty is rejected.
  - Outside production the existing local defaults stay, so local development is unchanged.
- `resolveBankingKey(env)` returns the secret or throws. In production it requires `BANKING_TOKEN_ENCRYPTION_KEY` of at least 32 characters. Outside production the committed default key is allowed only when `NODE_ENV` is `development` or `test`; any other value (including unset) requires the variable.

Errors name variables only (the same rule as E1).

### 2. Database TLS

- Local URLs (`localhost`, `127.0.0.1`) or `DB_SSL=false`: no TLS (unchanged).
- Anything else: `{ rejectUnauthorized: true }`, plus `ca` from `DB_SSL_CA` if set.
- `DB_SSL=no-verify`: `{ rejectUnauthorized: false }` and a one-time warning naming the variable. This is the explicit opt-out for providers with self-signed certificates.
- Unknown `DB_SSL` values throw.

### 3. Schema management

- `synchronize` is false. It is true only when `DB_SYNCHRONIZE=true` and `NODE_ENV !== "production"`; `DB_SYNCHRONIZE=true` in production is a boot error.
- A `migrations/` directory under `apps/backend/src`, registered in the TypeORM options (a glob that works from `dist/`). `migrationsRun: true` in production. Scripts in `apps/backend/package.json`: `migration:run`, `migration:revert`, `migration:generate`, using a small `data-source.ts` that reuses `resolveDbConfig`.
- **Baseline migration** (`<timestamp>-Baseline.ts`) generated from today's entities against an empty local Postgres. Its `up()` first checks `queryRunner.hasTable(...)` for the entity tables; if the core tables already exist it does nothing and returns, so a database created by `synchronize` just records the baseline as applied. `down()` is a no-op (dropping the schema on revert is not safe).
- The baseline-skip assumes production matches the current entities. `synchronize` kept it that way, so this holds unless someone altered the database by hand. The plan includes a check to run against production before deploy.

### 4. Bank tokens

- `crypto.ts`: replace the key lookup with `resolveBankingKey`. Remove the silent fallback to the default key in production. `safeDecryptBankingToken` throws on a failed decrypt (a wrong key, a damaged value, a non-encrypted legacy value) instead of returning the input.
- A second migration `<timestamp>-ClearBankTokens.ts` sets `access_token = NULL`, `refresh_token = NULL`, `status = 'error'` for every row in `bank_connections`. On a fresh database it affects zero rows.
- Public response shape: a `toPublicConnection(connection)` mapper returning `id, institutionId, institutionName, status, authType, expiresAt, lastSyncedAt, createdAt, updatedAt` and no token fields. Used by `getBankConnections`, `connectBank` and `syncBankConnection` responses.
- Consequence: users with existing connections see `error` status and must reconnect once.

### 5. Documentation

`apps/backend/.env.example` and the README environment section gain: `BANKING_TOKEN_ENCRYPTION_KEY` (required in production, at least 32 characters), `DB_SSL` (`false`, `no-verify`, unset), `DB_SSL_CA`, `DB_SYNCHRONIZE` (development only), `SESSION_SECRET` (required by the web server), and a short "migrations" section (how to run and generate).

### 6. Secrets in git history (D-12), human task

Not code. A checklist in the plan: rotate the WorkOS API key and client credentials, the database password and `JWT_SECRET`, in that order, and update the deployment environment; check the Railway and GitHub secret stores. Rewriting history is a separate decision for you and is not part of this epic.

## Error handling

- Boot errors are thrown from the provider factory before `listen`, naming the variable only.
- A decrypt failure surfaces as a sync error on that connection; the connection is marked `error` and the user sees a reconnect prompt. The error message never includes token or key material.

## Testing (test-first, project `tdd` skill)

- `resolveDbConfig` and `resolveBankingKey`: every production-missing case throws naming the variable; no message contains a supplied value; local development defaults still work; unknown `DB_SSL` throws; `DB_SYNCHRONIZE=true` in production throws.
- TLS: default verifies; `no-verify` disables and warns; `DB_SSL_CA` is passed through.
- Crypto: round trip with a supplied key; wrong key throws (no raw fallback); non-encrypted input throws; the default key works only with `NODE_ENV=development` or `test`; production without the variable throws.
- Public mapper: output never has `accessToken` or `refreshToken`; controller responses for list, connect and sync contain no token fields (real service with the in-memory repository helper from E1).
- Migrations: against a real Postgres (Docker is available on this machine via OrbStack, so use a throwaway container): run the baseline on an empty database (tables created), run it again on the same database (no change), run it on a database whose tables were built by the old `synchronize` (skipped, recorded). Run `ClearBankTokens` on seeded rows.

## Rollout and risk

1. Before deploy, against production: confirm the tables match the entities (a schema diff or `\d` on the eight tables), and note how many rows `bank_connections` has.
2. Set `BANKING_TOKEN_ENCRYPTION_KEY` (32+ characters, generated, stored only in the deployment environment) and review the database variables. If the provider uses a self-signed certificate, set `DB_SSL=no-verify` consciously, or supply `DB_SSL_CA`.
3. Deploy. The baseline is recorded without changing tables; `ClearBankTokens` clears tokens; users reconnect.
4. Rotate the secrets from D-12 around the same time.
5. Rollback is a normal redeploy; do not re-enable `synchronize` in production to recover.

## Out of scope

Validation layer (D-08, B-02), seeded fake data (E2), loader error states (E5), purging secrets from git history, per-environment secrets management tooling.

## Open questions

1. Does the production database provider require a self-signed certificate? This decides whether `DB_SSL=no-verify` is needed on day one.
2. Is it acceptable to start a throwaway Postgres container on this machine for the migration tests? Docker (OrbStack) is present.

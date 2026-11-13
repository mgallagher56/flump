# Flump

<div align="center">

**Personal finance dashboard, UK tax optimisation engine and long-term wealth forecasting platform.**

[![TypeScript](https://img.shields.io/badge/TypeScript-7.0-blue.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.3-61dafb.svg?logo=react&logoColor=white)](https://react.dev/)
[![React Router](https://img.shields.io/badge/React%20Router-7.18-f44250.svg?logo=reactrouter&logoColor=white)](https://reactrouter.com/)
[![Bun](https://img.shields.io/badge/Bun-1.4-fbf0df.svg?logo=bun&logoColor=black)](https://bun.sh/)
[![Turborepo](https://img.shields.io/badge/Turborepo-2.11-ef4444.svg?logo=turborepo&logoColor=white)](https://turbo.build/repo)
[![Biome](https://img.shields.io/badge/Biome-2.6-60a5fa.svg?logo=biome&logoColor=white)](https://biomejs.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-5.0-729b1b.svg?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Panda CSS](https://img.shields.io/badge/Panda%20CSS-2.4-f6cf45.svg)](https://panda-css.com/)

[Overview](#overview) •
[Features](#features) •
[Monorepo Architecture](#monorepo-architecture) •
[Tech Stack](#tech-stack) •
[Quick Start](#quick-start) •
[Scripts](#available-scripts) •
[Testing & Quality](#testing--quality) •
[Contributing](#contributing)

</div>

---

## Overview

**Flump** is an open-source financial management and decision-making platform built specifically to demystify personal finance and taxation. It bridges the gap between everyday budgeting, net worth tracking, and forward-looking financial decisions – with built-in engines for the UK tax system, pension auto-enrolment rules, rental property landlord restrictions (Section 24), and mortgage optimisation scenarios.

Designed as a modern Turborepo monorepo, Flump brings together a high-performance web dashboard, a mobile companion app with biometric authentication, an enterprise-grade NestJS backend, and shared TypeScript domain packages.

For a granular breakdown of every live route, component, and user interaction, consult the **[Pages & Features Catalog](docs/pages_and_features.md)**.

---

## Features

### 🚀 Onboarding and modular dashboard

- **Tailored setup wizard**: Interactive questionnaire that automatically customises the user's navigation and widgets to match their needs.
- **Financial health score**: Comprehensive rating assessing emergency fund liquidity, debt, savings velocity, and tax planning.
- **Customisable dashboard**: Reorderable and resizable widgets (`normal` vs. `wide`) with a disabled widget tray to hide or surface features at will.
- **Setup checklist**: Guided onboarding milestones persisted to the user profile.

### 🏦 Wealth and account management

- **Net worth tracking**: Real-time aggregation of total assets, liabilities, and overall net worth.
- **Multi-account hub**: Filterable tabs for current accounts, savings, investments, pensions, credit cards, mortgages, loans, and owed money.
- **Historical monthly balance ledger**: Grid tracking monthly balances across years with inline editing and multi-year projection capabilities.
- **Asset allocation visualiser**: Interactive allocation charts visualising distribution across cash, equity, and debt.
- **Open Banking integrations**: Bank connection management with automated sync and status indicators.

### 📊 Cash flow budgeting and runway engine

- **Budget setup wizard**: Quick-start setup with sensible default UK expenditure benchmarks.
- **50/30/20 cash flow breakdown**: Visualises monthly surplus or deficit across needs, wants, and savings.
- **Category tables**: Dedicated tracking for housing, bills, living expenses, savings, and income, with weekly, monthly, and annual frequency conversions.
- **Custom expense categories**: Create, rename, and delete custom budget categories.
- **Emergency runway calculator**: Calculates exact months of emergency runway based on liquid reserves divided by monthly essential outgoings, with scenario cutback toggles.

### 💰 Savings and investments hub

- **Interest rate (AER) tracking**: Calculates weighted average interest rate across all cash ISAs and high-yield savings accounts.
- **Monthly savings targets**: Monitor ongoing regular contributions toward wealth goals.
- **Compound growth forecaster**: Multi-year compound growth projections (1, 3, 5, 10, and 20 years).

### 🛡️ Pension and retirement planning

- **Auto-enrolment and salary sacrifice**: Model employee and employer contributions, qualifying earnings bands, and National Insurance savings from salary sacrifice.
- **Multiple pension pots**: Track active workplace schemes and consolidated legacy pots.
- **Retirement forecaster**: Projects total pension pot size at target retirement age with custom growth and inflation assumptions.

### 🏡 Mortgage optimisation engine

- **Residential and buy to let (BTL)**: Full support for repayment and interest-only mortgages across owner-occupied and rental properties.
- **Amortisation schedules**: Complete breakdown of principal vs. interest over the entire loan term.
- **Overpayment simulator**: Computes interest saved and months shaved off through recurring or one-off lump-sum overpayments.
- **Mortgage vs ISA comparison**: Compares paying down mortgage debt against investing in an ISA or savings account, accounting for marginal tax rates.

### 📈 Planning and long-term wealth forecaster

- **10–30 year wealth trajectories**: Forecasts net worth trajectories under current vs. hypothetical savings habits.
- **PAYE take-home estimator**: Net pay calculations accounting for Personal Allowance, tax bands (basic, higher, additional), and the **£100,000 Personal Allowance taper**.
- **Salary increase modeller**: Simulates net monthly gains from a pay rise or bonus and pipes the surplus directly into the compound wealth projection.

### 🇬🇧 UK tax and Self Assessment hub

- **Fiscal tax year P&L**: Filter and organise income and expenses by UK tax years (6 April to 5 April), with a tool to clone records between tax years.
- **Self-employed and sole trader tax**: Computes taxable trading profits, allowable expenses, Income Tax, and **Class 4 National Insurance contributions**.
- **Section 24 rental landlord rules**: Accounts for non-deductible mortgage interest and computes the 20% basic-rate tax credit.
- **Property ownership share %**: Custom ownership splits for jointly owned rental properties.
- **Digital receipt capture**: Upload PDFs, image receipts, or capture camera photos directly attached to expense records.
- **Live Self Assessment liability estimator**: Real-time tax bill estimation and filing deadline notices.

### ⚙️ User profile and app customisation

- **Feature toggles**: Selectively enable or disable core tools to keep the navigation bar focused.
- **Multi-currency support**: Switch between GBP, USD, EUR, and other global currencies.
- **Theme switcher**: Dark and light modes with system preference sync.

### 📱 Multi-platform ecosystem

- **Web dashboard (`apps/web`)**: Server-rendered React Router 7 app styled with Panda CSS, supporting accessible UI primitives and full keyboard navigation.
- **Mobile companion (`apps/mobile-companion`)**: Native iOS and Android app built with Expo and React Native, featuring FaceID/TouchID biometric authentication.
- **Marketing site (`apps/marketing`)**: Fast, SEO-optimised landing site powered by Express and Vite.

---

## Monorepo Architecture

Flump is organized as a workspace monorepo managed by [Turborepo](https://turbo.build/repo) and [Bun](https://bun.sh):

```
flump/
├── apps/
│   ├── web/                # React Router 7 + React 19 web app (Panda CSS, WorkOS AuthKit)
│   ├── backend/            # NestJS REST API with TypeORM & PostgreSQL
│   ├── mobile-companion/   # Expo / React Native mobile app with biometric auth
│   └── marketing/          # SSR landing & marketing site (Express + Vite)
│
├── packages/
│   ├── common/             # Pure TypeScript domain models, tax rules, and calculation engines
│   ├── ui/                 # Shared Panda CSS design tokens, recipes, and accessible components
│   ├── app-shell/          # Shared layout & SSR hydration utilities
│   └── typescript-config/  # Shared tsconfig bases across the monorepo
│
├── docker-compose.yml      # Local PostgreSQL container service
└── docs/                   # Product specifications and business logic documentation
```

### Domain Packages

- **`@repo/common`**: Houses pure mathematical calculators and domain logic (`taxCalculator.ts`, `taxRules.ts`, mortgage amortisation formulas, auto-enrolment logic). Zero framework dependencies so it can be shared seamlessly across Web, Backend, and Mobile.
- **`@repo/ui`**: Design system library with Panda CSS tokens, recipe variants, and custom UI primitives (including accessible `FLPCheckbox`, modal dialogs, and navigation menus).

---

## Tech Stack

| Layer                    | Technologies                                                                                                                                 |
| :----------------------- | :------------------------------------------------------------------------------------------------------------------------------------------- |
| **Monorepo & Build**     | [Bun](https://bun.sh/) (Workspace package manager), [Turborepo](https://turbo.build/repo) (Task orchestration)                               |
| **Frontend Web**         | [React 19](https://react.dev/), [React Router 7](https://reactrouter.com/), [Panda CSS](https://panda-css.com/), [Jotai](https://jotai.org/) |
| **Backend & API**        | [NestJS](https://nestjs.com/), [TypeORM](https://typeorm.io/), [PostgreSQL](https://www.postgresql.org/)                                     |
| **Mobile App**           | [Expo](https://expo.dev/) (SDK 58), [React Native](https://reactnative.dev/), Expo Local Authentication                                      |
| **Authentication**       | [WorkOS AuthKit](https://workos.com/authkit)                                                                                                 |
| **Charts & Visuals**     | [Recharts](https://recharts.org/), [D3 Shape](https://d3js.org/)                                                                             |
| **Linting & Formatting** | [Biome](https://biomejs.dev/)                                                                                                                |
| **Testing**              | [Vitest](https://vitest.dev/), [Playwright](https://playwright.dev/) (browser runner), Testing Library, MSW                                  |
| **Design System**        | [Storybook 10](https://storybook.js.org/)                                                                                                    |

---

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (`>= 1.4.0`)
- [Node.js](https://nodejs.org/) (`>= 20.0.0`)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for local PostgreSQL database)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/mgallagher56/flump.git
cd flump
bun install
```

### 2. Environment Variables

Copy the example environment files for both the web client and backend services:

```bash
# Web application
cp apps/web/.env.example apps/web/.env.local

# Backend service
cp apps/backend/.env.example apps/backend/.env
```

Key environment configurations:

- `VITE_WORKOS_CLIENT_ID`: Your WorkOS client identifier.
- `VITE_WORKOS_REDIRECT_URI`: OAuth callback URL (default: `http://localhost:5173/callback`).
- `VITE_API_URL`: Backend API endpoint (default: `http://localhost:4000`).
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: PostgreSQL credentials.

Authentication environment contract (auth fails closed):

- `WORKOS_CLIENT_ID`: **required in production** (backend). Without it the backend refuses to start and the error names the variable.
- `WORKOS_ISSUER`: optional. By default the single accepted issuer is derived as `https://api.workos.com/user_management/<WORKOS_CLIENT_ID>` (logged at boot). When set it is one exact https URL that replaces the derived value, for custom auth domains; an invalid value fails boot. The token `client_id` claim must also equal `WORKOS_CLIENT_ID`.
- `AUTH_DEV_BYPASS=true`: **local development only.** It is honoured only when `NODE_ENV=development`, cannot be combined with `WORKOS_API_KEY`, and is refused in production by both the backend (at boot) and the web server (the check runs when its server code loads, so the process fails at startup). Errors name the variable, never its value.
- Never commit mock tokens: `bun run check:auth` fails CI if dev-session literals appear outside the dev-bypass allow-list.

Configuration and database environment contract (the backend validates this at boot and fails closed):

- `NODE_ENV`: only `development` and `test` are relaxed. Anything else, **including unset**, is strict (production rules), so set `NODE_ENV=production` explicitly in deployments and `NODE_ENV=development` locally.
- `BANKING_TOKEN_ENCRYPTION_KEY`: **required in strict mode, at least 32 characters** (`openssl rand -hex 32`). The built-in default key only works in development/test. Changing the key makes stored bank tokens undecryptable.
- `DATABASE_URL`: optional alternative to the `DB_*` variables. The app splits it into discrete fields and **ignores its query string** (for example `?sslmode=require`); configure TLS with `DB_SSL`. In strict mode the database must be configured explicitly and `DB_PASSWORD` must not be the default.
- `DB_SSL`: unset verifies the server certificate for non-local hosts and uses no TLS for localhost; `true` forces TLS; `false` disables TLS; `no-verify` uses TLS without certificate verification (explicit opt-out, logs a warning). `DB_SSL_CA` optionally supplies a PEM CA certificate for private or self-signed CAs and only applies when TLS is on. `DB_SSL=false` disables TLS entirely (a remote host logs a warning); use it only for a local or private-network database.
- `DB_SYNCHRONIZE=true`: lets TypeORM auto-alter the schema. **Development/test only**; in strict mode the backend refuses to start with it set.
- Bank tokens are no longer returned by the API: bank connection responses omit them.
- **Existing bank connections:** the `ClearBankTokens` migration nulls every stored bank token and marks connected connections `error` (already disconnected ones stay disconnected). Users with existing bank connections must reconnect once after the deploy.

### Migrations

In strict mode (production) the backend runs pending migrations on boot. The schema is no longer managed by `synchronize`. A baseline migration records itself on a database that was previously built by `synchronize`, so existing databases adopt migrations without changes. Confirm the production tables match the entities before the first deploy.

**Pre-deploy checklist (first production deploy of this epic):**

1. Take a database backup first. The boot runs migrations automatically, and `ClearBankTokens` irreversibly nulls every stored bank token (its `down()` is a no-op).
2. Set `NODE_ENV=production` explicitly.
3. Set `BANKING_TOKEN_ENCRYPTION_KEY` (32+ characters, generated with `openssl rand -hex 32`, never the example text) and the database variables.
4. Decide the TLS setting: leave `DB_SSL` unset to verify certificates, use `DB_SSL_CA` for a private CA, and use `no-verify` only as a conscious opt-out.
5. Expect connected users to reconnect their bank once.
6. The baseline migration records itself on a database already built by `synchronize`. If only some of the eight tables exist it throws a "partial schema" error: the boot fails and nothing is changed. Reconcile the schema by hand, then redeploy.

Commands run from `apps/backend`. They do not set `NODE_ENV`, so they work against production settings:

```bash
cd apps/backend
bun run migration:run        # apply pending migrations
bun run migration:revert     # removes the last migration record only (see warning below)
bun run migration:generate src/migrations/<Name>   # generate from entity changes
```

**Do not revert the current migrations.** Both have no-op `down()` methods, so `migration:revert` only deletes the migration record: it does not restore schema or tokens. Reverting `ClearBankTokens` would make the next boot clear every bank token again, including those of users who already reconnected. The CLI never auto-runs pending migrations; use `migration:run` explicitly.

To run against production-like settings, set the environment explicitly, for example `NODE_ENV=production DATABASE_URL=... BANKING_TOKEN_ENCRYPTION_KEY=... bun run migration:run`.

The migration integration tests need a real PostgreSQL and are skipped unless `TEST_DATABASE_URL` is set. Use a throwaway container and a dedicated database:

```bash
docker run --rm -d --name flump-e3-pg -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=flump_e3_test -p 55432:5432 postgres:18-alpine
cd apps/backend
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:55432/flump_e3_test \
  bunx vitest run src/migrations
docker rm -f flump-e3-pg
```

These tests are destructive, so a safety guard always refuses a non-local host (`localhost`, `127.0.0.1`, `::1`) and refuses a database whose name does not contain `test` unless `ALLOW_DESTRUCTIVE_DB_TESTS=1` is set. Never point them at a development or production database.

The migration integration suite (`apps/backend/src/migrations/migrations.integration.spec.ts`) needs a real Postgres and is skipped locally unless `TEST_DATABASE_URL` is set. It drops the `public` schema, so it only accepts a local host and a database name containing `test`. CI runs it in the vitest job against a Postgres 18 service container with `REQUIRE_DB_TESTS=1`, so a missing database fails the job instead of skipping. `turbo.json` lists `TEST_DATABASE_URL` and `REQUIRE_DB_TESTS` under `env` for the test tasks, so `bun run test` from the repo root passes them through.

### 3. Start Local Database (PostgreSQL)

```bash
# Start local PostgreSQL container
docker compose up -d
```

Development and test do not create tables on boot, so run the migrations once against the new database (the `.env` copied from the example already has `NODE_ENV=development`; the migration scripts do not set it themselves):

```bash
cd apps/backend
NODE_ENV=development bun run migration:run
```

Alternatively set `DB_SYNCHRONIZE=true` in `apps/backend/.env` to let TypeORM sync the schema for a throwaway development database.

### 4. Run Development Servers

Start all workspaces in development mode using Turborepo:

```bash
bun run dev
```

- **Web Dashboard**: `http://localhost:5173`
- **Backend API**: `http://localhost:4000`
- **Marketing Site**: `http://localhost:3001`
- **Supabase Studio**: `http://localhost:54323`

To start an individual app:

```bash
# Web only
bun --filter @flump/web dev

# Backend only
bun --filter backend dev

# Mobile companion (Expo)
bun --filter mobile-companion dev
```

---

## Available Scripts

Root-level scripts orchestrated via Turborepo:

| Command                 | Action                                                                  |
| :---------------------- | :---------------------------------------------------------------------- |
| `bun run dev`           | Starts all applications in watch mode                                   |
| `bun run build`         | Builds all packages and applications                                    |
| `bun run lint`          | Runs [Biome](https://biomejs.dev/) checks (read-only, as CI does)       |
| `bun run lint:fix`      | Applies Biome's safe lint and format fixes across the workspace         |
| `bun run format`        | Auto-formats code across all packages using Biome                       |
| `bun run test`          | Runs unit and integration test suites via [Vitest](https://vitest.dev/) |
| `bun run test:coverage` | Executes tests with V8 code coverage reports                            |
| `bun run check-types`   | Type-checks all packages via TypeScript compilers                       |
| `bun run verify`        | Runs full production build verification                                 |

### Component Development & Storybook

To develop and test UI components in isolation:

```bash
bun --filter @flump/web storybook
```
Storybook will be accessible at `http://localhost:6006`.

---

## Testing & Quality

Flump enforces strict quality standards across all workspaces:

1. **Static Analysis & Formatting**: Biome ensures consistent syntax and code style with sub-second linting speeds.
2. **Strict TypeScript & Type Coverage**: All core calculation logic and UI packages enforce strict TypeScript rules with high type coverage thresholds.
3. **Unit & Integration Tests**: Business logic in `@repo/common` (tax formulas, Section 24 credit caps, pension forecasters) is backed by comprehensive Vitest test matrices.
4. **Browser Component Testing**: Web components run in Vitest using Playwright browser runners to verify genuine DOM rendering and keyboard interactions.

Run tests locally:

```bash
bun run test
```

---

## Dependency audit gate

`bun run check:audit` (`scripts/check-audit.ts`) wraps `bun audit --json` and runs as the `🛡️ Dependency audit` CI job on pull requests, pushes to `main` and a weekly schedule (Mondays 06:17 UTC).

- **Threshold**: `high` and `critical` advisories fail; `moderate` and `low` are ignored.
- **Allow-list**: `audit-allowlist.json` is an array of `{ "id", "package", "severity", "reason", "expires" }`. `id` is the GHSA id (or the numeric id from `bun audit`), `expires` is an ISO `YYYY-MM-DD` date no more than 90 days away. Expired, malformed or reason-less entries fail the gate; entries whose advisory has disappeared produce a warning to remove them.
- **Retry**: if `bun audit` yields no usable JSON (registry outage), the script waits 10 seconds and retries once. JSON that parsed is never retried.
- **Exit codes**: `0` clean, `1` real advisory failures, `2` no usable report after the retry (or unreadable allow-list / unrecognised report shape).

| Event                      | Exit 1 (advisories)                                           | Exit 2 (outage / unreadable)   |
| :------------------------- | :------------------------------------------------------------ | :----------------------------- |
| `pull_request`             | Job fails (`::error::` plus job summary)                      | `::warning::` only, job passes |
| push to `main`, `schedule` | `::warning::` plus job summary listing advisories, job passes | `::warning::` only, job passes |

Advisories only report on `main` and `schedule` so Railway "Wait for CI" deploys are never blocked by a new upstream advisory; check the job summary of the scheduled run and triage it. An outage is not the PR's fault, so exit 2 never fails a run. Exit 3 (a broken `audit-allowlist.json` or an unrecognised report shape) is a repo bug, not an outage, so it fails the job on every event.

To add an allow entry, append to `audit-allowlist.json` with a concrete reason and an `expires` date at most 90 days out, then revisit it before it lapses:

```json
{
  "id": "GHSA-xxxx-xxxx-xxxx",
  "package": "example",
  "severity": "high",
  "reason": "No fixed version; dev-only",
  "expires": "2027-01-31"
}
```

---

## Design law baselines (check:laws)

`bun run check:laws` runs two ratchets that enforce the AGENTS.md design laws on `packages/ui/src`, `apps/web/app` and `apps/marketing/src` (tests, stories and the token definition file are skipped):

- **Design tokens** (`scripts/check-design-tokens.ts`): counts raw hex/`rgb()`/`hsl()` colours and primitive scale tokens (`indigo.600`) inside string literals. Anchors such as `href="#faq"` are not colours.
- **Tabular numbers** (`scripts/check-tabular-nums.ts`): flags files that format numbers (`useFormatCurrency`, `Intl.NumberFormat`, `toLocaleString`, `toFixed`) without `tabular-nums`. It is a file-wide heuristic, so `toFixed` is flagged even for non-financial numbers.

Existing violations are recorded in `scripts/design-token-baseline.json` and `scripts/tabular-baseline.txt`. New files, and any file above its baseline, fail. Entries that have dropped or disappeared are stale and also fail, so the baselines can only shrink. After fixing violations, regenerate them:

```bash
bun scripts/check-design-tokens.ts --write-baseline
bun scripts/check-tabular-nums.ts --write-baseline
```

Review the baseline diff before committing. It may only shrink; growing it needs a justification in the PR. The E9 colocation migration will move and rename baselined files, so baseline keys (file paths) will change at that point.

---

## Contributing

1. **Create a branch**:

   ```bash
   git checkout -b feat/your-feature-name
   ```
2. **Commit conventions**:
   This project uses [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`, etc.).
   Automated release notes and version bumping are powered by [Release Please](https://github.com/googleapis/release-please).
3. **Validate changes**:
   Before pushing, verify linting, types, and tests pass:

   ```bash
   bun run lint
   bun run check-types
   bun run test
   ```
4. **Open a Pull Request**:
   Push your branch and open a PR against `main` (the primary branch for all merges and releases).

---

## License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).

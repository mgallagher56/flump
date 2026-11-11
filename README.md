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
- `VITE_API_URL`: Backend API endpoint (default: `http://localhost:3000`).
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: PostgreSQL credentials.

Authentication environment contract (auth fails closed):

- `WORKOS_CLIENT_ID`: **required in production** (backend). Without it the backend refuses to start and the error names the variable.
- `AUTH_DEV_BYPASS=true`: **local development only.** It is honoured only when `NODE_ENV=development`, cannot be combined with `WORKOS_API_KEY`, and is refused in production by both the backend (at boot) and the web server (the check runs when its server code loads, so the process fails at startup). Errors name the variable, never its value.
- `SESSION_SECRET`: required by the web server.
- Never commit mock tokens: `bun run check:auth` fails CI if dev-session literals appear outside the dev-bypass allow-list.

### 3. Start Local Database (PostgreSQL)

```bash
# Start local PostgreSQL container
docker compose up -d
```

### 4. Run Development Servers

Start all workspaces in development mode using Turborepo:

```bash
bun run dev
```

- **Web Dashboard**: `http://localhost:5173`
- **Backend API**: `http://localhost:3000`
- **Marketing Site**: `http://localhost:4000`
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
| `bun run lint`          | Runs [Biome](https://biomejs.dev/) checks across the workspace          |
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

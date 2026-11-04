# Flump

<div align="center">

**Personal finance dashboard, UK tax optimization engine, and long-term wealth forecasting platform.**

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

**Flump** is an open-source financial management and decision-making platform built specifically to demystify personal finance and taxation. It bridges the gap between everyday budgeting, net worth tracking, and forward-looking financial decisions—with built-in engines for the UK tax system, pension auto-enrolment rules, rental property landlord restrictions (Section 24), and mortgage optimization scenarios.

Designed as a modern Turborepo monorepo, Flump brings together a high-performance web dashboard, a mobile companion app with biometric authentication, an enterprise-grade NestJS backend, and shared TypeScript domain packages.

For a granular breakdown of every live route, component, and user interaction, consult the **[Pages & Features Catalog](docs/pages_and_features.md)**.

---

## Features

### 🚀 Onboarding & Modular Dashboard

- **Tailored Setup Wizard**: Interactive questionnaire that automatically customizes the user's navigation and widgets to match their needs.
- **Financial Health Score**: Comprehensive rating assessing emergency fund liquidity, debt, savings velocity, and tax planning.
- **Customizable Dashboard**: Reorderable and resizable widgets (`normal` vs. `wide`) with a disabled widget tray to hide or surface features at will.
- **Setup Checklist**: Guided onboarding milestones persisted to the user profile.

### 🏦 Wealth & Account Management

- **Net Worth Tracking**: Real-time aggregation of total assets, liabilities, and overall net worth.
- **Multi-Account Hub**: Filterable tabs for Current, Savings, Investments, Pensions, Credit Cards, Mortgages, Loans, and Owed money.
- **Historical Monthly Balance Ledger**: Grid tracking monthly balances across years with inline editing and multi-year projection capabilities.
- **Asset Allocation Visualizer**: Interactive allocation charts visualizing distribution across cash, equity, and debt.
- **Open Banking Integrations**: Bank connection management with automated sync and status indicators.

### 📊 Cash Flow Budgeting & Runway Engine

- **Budget Setup Wizard**: Quick-start setup with sensible default UK expenditure benchmarks.
- **50/30/20 Cash Flow Breakdown**: Visualizes monthly surplus/deficit across Needs, Wants, and Savings.
- **Category Tables**: Dedicated tracking for Housing, Bills, Living Expenses, Savings, and Income, with weekly/monthly/annual frequency conversions.
- **Custom Expense Categories**: Create, rename, and delete custom budget categories.
- **Emergency Runway Calculator**: Calculates exact months of survival runway based on liquid reserves divided by monthly burn rate, with scenario cutback toggles.

### 💰 Savings & Investments Hub

- **Interest Rate (APY) Tracking**: Calculates weighted average interest rate across all cash ISAs and high-yield savings accounts.
- **Monthly Savings Targets**: Monitor ongoing regular contributions toward wealth goals.
- **Compound Growth Forecaster**: Multi-year compound growth projections (1, 3, 5, 10, and 20 years).

### 🛡️ Pension & Retirement Planning

- **Auto-Enrolment & Salary Sacrifice**: Model employee and employer contributions, qualifying earnings bands, and National Insurance savings from salary sacrifice.
- **Multiple Pension Pots**: Track active workplace schemes and consolidated legacy pots.
- **Retirement Forecaster**: Projects total pension pot size at target retirement age with custom growth and inflation assumptions.

### 🏡 Mortgage Optimization Engine

- **Residential & Buy-to-Let (BTL)**: Full support for repayment and interest-only mortgages across owner-occupied and rental properties.
- **Amortization Schedules**: Complete breakdown of principal vs. interest over the entire loan term.
- **Overpayment Simulator**: Computes interest saved and months shaved off through recurring or one-off lump-sum overpayments.
- **Mortgage vs. ISA Comparison**: Compares paying down mortgage debt against investing in an ISA or savings account, accounting for marginal tax rates.

### 📈 Planning & Long-Term Wealth Forecaster

- **10-30 Year Wealth Trajectories**: Forecasts net worth trajectories under current vs. hypothetical savings habits.
- **PAYE Take-Home Estimator**: Net pay calculations accounting for personal allowance, tax bands (Basic, Higher, Additional), and the **£100,000 personal allowance taper**.
- **"What If" Salary Increase Modeler**: Simulates net monthly gains from a pay rise or bonus and pipes the surplus directly into the compound wealth projection.

### 🇬🇧 UK Tax & Self-Assessment Hub

- **Fiscal Tax-Year P&L**: Filter and organize income and expenses by UK tax years (6 April to 5 April), with a tool to clone records between tax years.
- **Self-Employed & Sole Trader Tax**: Computes taxable trading profits, allowable expenses, Income Tax, and **Class 4 National Insurance contributions**.
- **Section 24 Rental Landlord Rules**: Accounts for non-deductible mortgage interest and computes the 20% basic-rate tax reducer.
- **Property Ownership Share %**: Custom ownership splits for jointly owned rental properties.
- **Digital Receipt Capture**: Upload PDFs, image receipts, or capture camera photos directly attached to expense records.
- **Live Self-Assessment Liability Estimator**: Real-time tax bill estimation and filing deadline notices.

### ⚙️ User Profile & App Customization

- **Feature Toggles**: Selectively enable or disable core tools to keep the navigation bar focused.
- **Multi-Currency Support**: Switch between GBP, USD, EUR, and other global currencies.
- **Theme Switcher**: Dark and light modes with system preference sync.

### 📱 Multi-Platform Ecosystem

- **Web Dashboard (`apps/web`)**: Server-rendered React Router 7 app styled with Panda CSS, supporting accessible UI primitives and full keyboard navigation.
- **Mobile Companion (`apps/mobile-companion`)**: Native iOS and Android app built with Expo and React Native, featuring FaceID/TouchID biometric authentication.
- **Marketing Site (`apps/marketing`)**: Fast, SEO-optimized landing site powered by Express and Vite.

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

- **`@repo/common`**: Houses pure mathematical calculators and domain logic (`taxCalculator.ts`, `taxRules.ts`, mortgage amortization formulas, auto-enrolment logic). Zero framework dependencies so it can be shared seamlessly across Web, Backend, and Mobile.
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
   Push your branch and open a PR against `dev`.

---

## License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).

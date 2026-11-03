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

---

## Features

### 🏦 Wealth & Account Management

- **Net Worth Tracking**: Real-time aggregation of total assets, total liabilities, and net worth across all connected and manual accounts.
- **Multi-Account Support**: Manage Current, Savings, Credit Cards, Investments, Personal Loans, and Mortgages in one unified view.
- **Asset Allocation Visualizer**: Interactive allocation charts breaking down your capital distribution across liquid cash, investments, equity, and debt.
- **Transaction Logs & Categorization**: Filter, search, and categorize historical income and expenses (Groceries, Utilities, Salary, Interest, Subscriptions).

### 📈 Planning & Long-Term Forecasting

- **Pension Forecaster**: Projects retirement wealth with compound interest growth, factoring in UK auto-enrolment rules (qualifying earnings band between £6,240 and £50,270, standard 8% total contributions with 3% minimum employer match), salary sacrifice, and custom retirement age targets.
- **Runway & Emergency Fund Calculator**: Stress-tests your finances by calculating your cash runway under varying monthly burn rates and fixed expenditure scenarios.
- **Compound Savings Calculator**: Simulates multi-year savings trajectories with variable interest rates, regular deposits, and compounding frequencies.
- **Cash Flow Budgeting**: Create flexible monthly budgets to monitor discretionary vs. non-discretionary spending.

### 🇬🇧 UK Tax & Self-Assessment Hub

- **PAYE Take-Home Estimator**: Accurate net pay projections accounting for standard UK personal allowance (£12,570), tax bands (Basic, Higher, Additional), and the **£100,000 personal allowance taper** (reducing allowance by £1 for every £2 earned above £100k).
- **Self-Employed & Sole Trader Tax**: Computes taxable trading profits, allowable expenses, Income Tax liabilities, and **Class 4 National Insurance contributions** (6% and 2% thresholds).
- **Rental Property & Section 24 Landlord Rules**: Accounts for the restriction on deducting mortgage interest as an allowable expense, calculating the replacement **20% basic-rate tax reducer** capped at the lower of mortgage interest, net rental profit, or total taxable income. Supports custom ownership share splits for jointly owned properties.
- **Fiscal Tax-Year P&L**: Auto-groups transactions by standard UK HMRC tax years (6 April to 5 April) with digital receipt attachment support.

### 🏡 Mortgage Optimization Engine

- **Amortization Tracking**: Tracks principal balance, current interest rate, and remaining loan duration.
- **Overpayment Simulator**: Calculates the exact interest saved and years shaved off your mortgage through recurring or lump-sum overpayments.
- **Mortgage vs. ISA Investment Comparison**: Compares the guaranteed return of paying down mortgage debt against investing in a tax-sheltered Stocks & Shares ISA, factoring in your marginal income tax bracket.

### 📱 Multi-Platform Ecosystem

- **Web Dashboard (`apps/web`)**: Server-rendered React Router 7 application styled with Panda CSS, supporting light/dark modes, accessible UI primitives, and full keyboard navigation.
- **Mobile Companion (`apps/mobile-companion`)**: Native iOS and Android app built with Expo and React Native, featuring FaceID/TouchID biometric authentication for quick transaction entry and balance checks.
- **Marketing Site (`apps/marketing`)**: Fast, SEO-optimized landing page powered by Express and Vite.

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

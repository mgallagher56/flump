# flump Domain Glossary

This glossary defines the canonical domain vocabulary for the Flump personal finance platform and architecture seams.

## Core Financial Modeling

### FinancialBaseline

The unified, canonical snapshot of an individual's financial profile (income, debts, regular expenses, emergency funds, tax status, and retirement goals). Modeled as a pure in-memory data structure in `@flump/finance-engine` without transport or presentation leakage.

### ProfilePersistenceAdapter

The persistence seam for financial baseline state across sessions. Provides `getBaseline`, `saveBaseline`, `getSeed`, `saveSeed`, and `clearSeed`. Implementations include in-memory test fakes (`InMemoryProfileAdapter`) and browser storage (`BrowserCookieSeedAdapter`).

### PortfolioSnapshot

The evaluated state of a user's liquid, invested, and property assets at a given date, calculating net worth, liquid runway, and asset allocations through pure mathematical projection.

### DebtPayoffStrategy

The algorithmic schedule for clearing non-mortgage liabilities. Implementations include Avalanche (highest interest rate first) and Snowball (smallest balance first).

## Open Banking & Aggregation

### BankProvider

The seam decoupling Flump from each bank or broker's API (`packages/banking/src/server/interface.ts`). Exposes `getAuthUrl`, `exchangeCode`, `refreshToken`, `revokeConnection`, `fetchAccounts` and `fetchTransactions`, and rejects with a `BankProviderError` rather than substituting default data. Implemented by the Monzo, Starling, Trading 212 and Open Banking standard providers. It replaced the older `BankingProviderAdapter`, which has been deleted.

### BankSyncOrchestrator

The deep module responsible for credential encryption (AES-256-GCM), token lifecycle refreshing, account identity resolution, balance sign enforcement, and transaction deduplication across all banking providers.

## Application Architecture

### ProfileLifecycle

The deep application service in the backend that encapsulates user onboarding, demographic updates, third-party identity synchronization (WorkOS), and transactional multi-table data reset.

### AccountIntake

The backend module managing account provisioning, banking provider linkage, manual balance overrides, and idempotent snapshot rollups.

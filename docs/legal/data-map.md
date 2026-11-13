# Data map (engineering inventory)

Status: DRAFT v0.1, written by an engineer from the code. It is **not legal advice and has not
been reviewed** by the owner or a solicitor. Lawful bases, retention periods and transfer
mechanisms belong in the governance documents (ROPA, retention schedule, processor register),
not here. Re-verify against the entities, storage keys and log calls before relying on it.

Reflects E19 phase A changes: bank connection owner-only, synced transactions not stored,
self-hosted fonts, and log hygiene. The 1-hour seed cookie and the `/logout` storage wipe landed
in PR 421.

## Server-side data (Postgres on Railway)

| Data                                                                                                                                                                                                       | Table / place                   | Written by                       | Notes                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity: WorkOS user id, email, name, password hash, sessions                                                                                                                                             | WorkOS (hosted AuthKit, US)     | Sign-up and sign-in              | Backend reads only `sub` and the `email` claim from the access token; name changes sync to WorkOS                                                                            |
| Profile: names, avatar URL (may be a data URL), currency, country, employment type, income, mortgage, pension and savings settings, dashboard config, onboarding flags                                     | `user_profiles`                 | User                             | Detailed income and property data                                                                                                                                            |
| Accounts: name, type, balance, rate, contribution, `connection_id`, `external_account_id`                                                                                                                  | `accounts`                      | User, or bank sync               | Debt balances can indicate vulnerability                                                                                                                                     |
| Monthly balance history (monthly snapshots, E30): one value per account per Europe/London month, with `user_id`, `as_of_date`, `source` (`onboarding`, `manual`, `connected`, `backfill`) and `updated_at` | `account_details`               | User, onboarding, or bank sync   | `user_id` column since E30, so erasure and export go by owner; deleted when the account or the user's financial data is deleted. A manual value wins over sync for its month |
| Check-in completions: which months the user confirmed their balances (month and timestamp only, no figures)                                                                                                | `snapshot_checkins`             | User                             | Keyed by `user_id`; deleted with the user's financial data. Reminder scheduling (E30 PR3) will read it                                                                       |
| Transactions: amount, description, category, timestamp                                                                                                                                                     | `transactions`                  | `POST /transactions` only        | **Bank sync no longer stores transactions** and a migration removes those already stored                                                                                     |
| Budget entries incl. free-text notes                                                                                                                                                                       | `budget_entries`                | User                             | Free text may contain anything                                                                                                                                               |
| Tax records incl. notes and receipt file as base64                                                                                                                                                         | `tax_records`                   | User                             | Receipts are large blobs returned in lists (D10 minimisation is a later phase)                                                                                               |
| Bank connections: institution, status, **encrypted** access and refresh tokens, expiry, last sync                                                                                                          | `bank_connections`              | Bank connect                     | AES-256-GCM; public responses strip tokens. Connect is owner-allowlisted only                                                                                                |
| MCP tokens: name, hash, prefix, scopes, anonymise flag, expiry, usage                                                                                                                                      | `mcp_tokens`                    | User                             | Hash only, never the token                                                                                                                                                   |
| MCP outputs (accounts, budget, tax, simulations)                                                                                                                                                           | Not stored                      | Sent to the user's own AI client | Flump cannot recall data once sent                                                                                                                                           |
| Application logs                                                                                                                                                                                           | Railway log stream              | Backend, web, marketing          | Provider and identity errors now log class and leading phrase only, never bodies or tokens                                                                                   |
| Backups                                                                                                                                                                                                    | Not evidenced in the repo (E18) |                                  |                                                                                                                                                                              |

### Retention and erasure of monthly history (E30)

- `account_details` and `snapshot_checkins` carry `user_id`. `POST /user-profile/reset-financial-data` deletes both by `user_id` (and `account_details` also by the user's account ids), inside the same transaction as the other financial tables; deleting one account removes that account's history rows.
- There is no automatic expiry in the code. The retention period for monthly history is a governance decision (retention schedule, owner or solicitor) and is **open**.
- Export: no export endpoint exists yet; the E19 portability addendum and E30 PR4 (CSV export) will cover this table by `user_id`.
- Migration `EvolveAccountDetailsForSnapshots1794356100000` deleted history rows whose account no longer existed (they had no owner and could not be exported or erased).

## Browser storage

| Key                                              | Type                                 | Content                                                            | Lifetime / clearing                                             |
| ------------------------------------------------ | ------------------------------------ | ------------------------------------------------------------------ | --------------------------------------------------------------- |
| WorkOS AuthKit session cookie                    | httpOnly cookie                      | Encrypted session                                                  | Library-controlled                                              |
| `flump_onboarding_seed`                          | Cookie (host-only) plus localStorage | Salary, debts, savings, pension pot, age from the marketing teaser | **1 hour**, `Secure` on https; removed on `/logout` form submit |
| `flump_has_session`                              | Cookie (host-only)                   | `1`                                                                | 30 days; used by marketing Header, callback and logout          |
| `flump-theme`                                    | localStorage                         | `light` or `dark`                                                  | Device preference, kept                                         |
| `flump_financial_baseline_v2` (and legacy `_v1`) | localStorage                         | Full financial baseline                                            | Removed on `/logout` form submit                                |
| `flump_runway_calculator_settings`               | localStorage                         | Calculator settings                                                | Removed on `/logout` form submit                                |
| `flump_setup_checklist_dismissed`                | localStorage                         | Boolean                                                            | Removed on `/logout` form submit                                |

Fonts are self-hosted, so no request to Google Fonts. No analytics or trackers were found.

## Data flows

- Browser to web (Railway) to backend (Railway) to Postgres (Railway). The browser also calls the backend with a bearer token.
- Browser to WorkOS hosted AuthKit (US) for sign-in, sign-up and password reset.
- Backend to Monzo, Starling and Trading 212 APIs with the owner's token (owner-allowlisted only).
- Backend `/mcp` to the user's AI client, under the user's own account with that vendor.

# Data map (engineering inventory)

Status: DRAFT v0.1, written by an engineer from the code. It is **not legal advice and has not
been reviewed** by the owner or a solicitor. Lawful bases, retention periods and transfer
mechanisms belong in the governance documents (ROPA, retention schedule, processor register),
not here. Re-verify against the entities, storage keys and log calls before relying on it.

Reflects E19 phase A changes: bank connection owner-only, synced transactions not stored,
self-hosted fonts, and log hygiene. The 1-hour seed cookie and the `/logout` storage wipe landed
in PR 421. BE-04 added account deletion, the data export and a fuller financial reset (section
"Account deletion, export and reset" below).

## Server-side data (Postgres on Railway)

| Data                                                                                                                                                                                                       | Table / place                   | Written by                       | Notes                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity: WorkOS user id, email, name, password hash, sessions                                                                                                                                             | WorkOS (hosted AuthKit, US)     | Sign-up and sign-in              | Backend reads only `sub`, the `email` claim and `auth_time` (recent-login check) from the access token; name changes sync to WorkOS; account deletion deletes the WorkOS user      |
| Profile: names, avatar URL (may be a data URL), currency, country, employment type, income, mortgage, pension and savings settings, dashboard config, onboarding flags                                     | `user_profiles`                 | User                             | Detailed income and property data                                                                                                                                                  |
| Accounts: name, type, balance, rate, contribution, `connection_id`, `external_account_id`                                                                                                                  | `accounts`                      | User, or bank sync               | Debt balances can indicate vulnerability                                                                                                                                           |
| Monthly balance history (monthly snapshots, E30): one value per account per Europe/London month, with `user_id`, `as_of_date`, `source` (`onboarding`, `manual`, `connected`, `backfill`) and `updated_at` | `account_details`               | User, onboarding, or bank sync   | `user_id` column since E30, so erasure and export go by owner; deleted when the account or the user's financial data is deleted. A manual value wins over sync for its month       |
| Check-in completions: which months the user confirmed their balances (month and timestamp only, no figures)                                                                                                | `snapshot_checkins`             | User                             | Keyed by `user_id`; deleted with the user's financial data. Reminder scheduling (E30 PR3) will read it                                                                             |
| Transactions: amount, description, category, timestamp                                                                                                                                                     | `transactions`                  | `POST /transactions` only        | **Bank sync no longer stores transactions** and a migration removes those already stored                                                                                           |
| Budget entries incl. free-text notes                                                                                                                                                                       | `budget_entries`                | User                             | Free text may contain anything                                                                                                                                                     |
| Tax records incl. notes and receipt file as base64                                                                                                                                                         | `tax_records`                   | User                             | Receipts are large blobs, read only by the receipt route; included in the data export                                                                                              |
| Bank connections: institution, status, **encrypted** access and refresh tokens, expiry, last sync                                                                                                          | `bank_connections`              | Bank connect                     | AES-256-GCM; public responses strip tokens. Connect is owner-allowlisted only. Never exported                                                                                      |
| Pending bank consents: institution, a hash of the random OAuth state, the PKCE verifier (encrypted), redirect URI, expiry (ten minutes)                                                                    | `bank_oauth_states`             | Bank connect (OAuth)             | Single use, deleted when used or on the next connect after expiry. Deleted on erasure and reset. Exported without the hash, verifier or redirect URI                               |
| MCP tokens: name, hash, prefix, scopes, anonymise flag, expiry, usage                                                                                                                                      | `mcp_tokens`                    | User                             | Hash only, never the token. Revoked (deleted) by a financial reset; exported as metadata only                                                                                      |
| Spreadsheet imports: staged rows (account names and values), counts, validation errors, the prior values kept for undo                                                                                     | `import_batches`                | User (import)                    | Deleted by a financial reset and by account deletion; exported except the browser retry key                                                                                        |
| AI connection audit log: tool name, scopes, outcome, timings, response size, token id, keyed hash of the arguments (no amounts, no free text)                                                              | `agent_audit_events`            | `/mcp` tool calls                | 13-month retention. **Kept** by a financial reset (security log); deleted with the account; exported except the keyed hash                                                         |
| Account deletion tombstone: HMAC-SHA256 of the user id (keyed with `DELETION_TOMBSTONE_KEY`), deletion time, when the login was removed, expiry                                                            | `account_deletion_tombstones`   | `DELETE /user-profile`           | **No personal data**: the hash cannot be reversed without the key. Kept **24 months** (owner decision D1, recommended option, not yet confirmed), then purged on the next deletion |
| MCP outputs (accounts, budget, tax, simulations)                                                                                                                                                           | Not stored                      | Sent to the user's own AI client | Flump cannot recall data once sent                                                                                                                                                 |
| Application logs                                                                                                                                                                                           | Railway log stream              | Backend, web, marketing          | Provider and identity errors now log class and leading phrase only, never bodies or tokens                                                                                         |
| Backups                                                                                                                                                                                                    | Not evidenced in the repo (E18) |                                  |                                                                                                                                                                                    |

### Retention and erasure of monthly history (E30)

- `account_details` and `snapshot_checkins` carry `user_id`. `POST /user-profile/reset-financial-data` deletes both by `user_id` (and `account_details` also by the user's account ids), inside the same transaction as the other financial tables; deleting one account removes that account's history rows.
- There is no automatic expiry in the code. The retention period for monthly history is a governance decision (retention schedule, owner or solicitor) and is **open**.
- Export: `GET /user-profile/export` includes both tables (see "Export document" below).
- Migration `EvolveAccountDetailsForSnapshots1794356100000` deleted history rows whose account no longer existed (they had no owner and could not be exported or erased).

## Account deletion, export and reset (BE-04)

Every table that carries `user_id` is listed once in `apps/backend/src/privacy/user-data-registry.ts`
with its delete, export and reset handling. A unit test fails when an entity with a user id is not
in the registry, or when a column is neither exported nor excluded with a reason; a real-Postgres
test checks the catalogue's `user_id` tables against the registry.

### Deletion (`DELETE /user-profile`)

- The person types `DELETE` and must have signed in within the last 15 minutes (WorkOS `auth_time`
  claim); otherwise 400 or 403 `recent_login_required`.
- Bank consent: before the transaction, Flump asks each bank to revoke its access (BE-12). This is
  best effort: a 10-second limit and one retry when the bank says "try later". The deletion goes
  ahead whatever the bank answers. The audit event `bank_consent_revoke` has counts, typed failure
  codes and institution ids only, with no user id, tokens or bank text. Banks with no revoke
  endpoint (all except Monzo today) count as `unsupported`; the person removes access in their
  bank's app. Disconnecting one bank does the same, and the response says whether it worked.
- One database transaction deletes every row with the user's id from every registry table (children
  first, profile last; history and transactions keyed to the user's account ids go too, whatever
  their `user_id`) and writes the tombstone. A failure rolls all of it back.
- `liability_sign_backfill` (the BE-05 migration's before-image of old and new balance signs) has no
  user id; its rows go with the account by `ON DELETE CASCADE`. It is not in the export, because the
  current balances are.
- From the moment the tombstone commits, every authenticated route refuses the user's tokens with
  410 `{ error: "account_deleted" }` (not 401, so the web app does not loop through sign-in while the
  WorkOS login still exists). Only `DELETE /user-profile` stays open, for retries. `/mcp` is not
  behind that guard, but its tokens are deleted with the account.
- The delete sweep then runs once more (and again on every retry), removing rows that a request
  already in flight during the transaction wrote.
- Then the WorkOS user is deleted, which removes the login and ends its WorkOS sessions. If WorkOS
  fails, the answer is still 200 with `status: "identity_pending"`: the data is already gone, and the
  same request repeated later finishes the job (nothing left to delete, the tombstone is found by its
  hash, WorkOS is retried). A WorkOS 404 counts as already deleted.
- Audit: one `account_deleted` log line after commit with the tombstone id and per-table row
  counts. No user id, names or amounts.
- `DELETION_TOMBSTONE_KEY` must be at least 32 characters. Without a usable key outside local
  development and test (or anywhere on Railway), deletion answers 503 and changes nothing; every
  other route keeps working.
- **Never rotate `DELETION_TOMBSTONE_KEY`.** Tombstones are found by recomputing the HMAC under the
  same key; after a rotation every existing tombstone is unfindable, so pending deletions cannot be
  retried cleanly and erased accounts' tokens are no longer refused.

### Export document (`GET /user-profile/export`)

One JSON document, streamed as `flump-export-YYYY-MM-DD.json` with `Cache-Control: no-store`. Its
shape is `AccountExportDocument` in `packages/api-contract/src/domains/profile.ts`
(`schemaVersion` 1):

| Key                                              | Content                                                                        |
| ------------------------------------------------ | ------------------------------------------------------------------------------ |
| `schemaVersion`, `exportedAt`, `userId`, `notes` | Envelope: format version, export time (ISO 8601), the caller's id, plain notes |
| `profile`                                        | `user_profiles` row (object, or null if never created)                         |
| `accounts`, `accountDetails`, `transactions`     | Accounts, monthly balance history, transactions                                |
| `bankConnections`                                | Linked banks: institution, status, expiry, last sync. Never the tokens         |
| `bankOAuthStates`                                | Bank consents started in the last ten minutes: institution and expiry only     |
| `budgetEntries`, `taxRecords`                    | Budget and tax records, receipts as base64 data URLs                           |
| `snapshotCheckins`, `importBatches`              | Confirmed months; spreadsheet imports and their undo data                      |
| `mcpTokens`, `agentAuditEvents`                  | AI connection token metadata (name, prefix, scopes, usage) and its audit log   |

Left out on purpose: bank access and refresh tokens, the bank OAuth state hash and PKCE verifier, MCP token hashes, the import retry key and the
keyed hash of agent arguments. The login (email, password) lives in WorkOS and is not in the file.
Rows are read in one read-only snapshot transaction, a page at a time, with a 30 s statement timeout, a 60 s idle-in-transaction timeout and a 2-minute overall deadline, so a slow client cannot hold a database connection. Limited to 10 exports an hour
per user.

### Financial reset (`POST /user-profile/reset-financial-data`)

Also needs a recent sign-in. Deletes every registry table marked `financial-clear` (accounts,
history, transactions, check-ins, imports, bank connections, budget, tax), revokes consent at each
bank first (as for deletion), revokes (deletes) MCP tokens and pending bank consents, keeps the agent audit log, and sets every financial profile field back to its default,
including employment type, tax region, birth year, student loan plans, housing status and costs
(M-PRIV1). Names, avatar, currency, country and layout preferences stay.

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

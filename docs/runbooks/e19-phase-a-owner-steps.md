# E19 phase A: owner steps

Engineering for E19 phase A (privacy, legal and regulatory) is merged in small PRs. Some of it
needs an owner action on Railway or WorkOS. This file lists them. It is not legal advice and
makes no claim of legal review.

## Bank connection is owner-only (D3-B)

Backend env (production):

| Variable                            | Value                                          | Effect                                                                                    |
| ----------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `BANK_CONNECTIONS_ALLOWED_USER_IDS` | your WorkOS user id (comma-separated for more) | those users may connect, sync and refresh                                                 |
| `BANK_CONNECTIONS_ENABLED`          | leave unset                                    | unset means off in production, on elsewhere. `true` opens it to every user, do not set it |

- Everyone else gets `404 {"error":"feature_disabled"}` from `POST /bank-connections` and the
  refresh and sync endpoints. Listing and disconnecting existing connections still work.
- The web app asks `GET /bank-connections/capability` and hides every connect entry point when it
  says `enabled: false` (or the call fails).
- Find your WorkOS user id in the WorkOS dashboard (Users), or decode your access token `sub`.
- Store builds stay off: do not ship the connect UI in mobile.

## Synced transactions are no longer stored (D8-A)

- Bank sync keeps balances only. It no longer fetches or saves transactions.
- Migration `DeleteSyncedTransactions1794355500000` deletes the transactions already stored. It
  only removes rows whose account is linked to a bank connection (`accounts.connection_id IS NOT
  NULL`). Transactions on manually created accounts are never touched. The table has no source
  column, so that link is the only reliable marker of "came from sync".
- **It runs at boot on the next deploy and cannot be undone** (`down` is a no-op). Take a
  `pg_dump` first (same as the deploy checklist).
- It is guarded to run once, so a second instance cannot delete rows created after the first run.

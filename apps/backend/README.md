# Flump backend

## Rollout note: RemoveSeededExampleData1794355400000

This migration runs on boot (`migrationsRun`) and **deletes rows irreversibly** (`down()` is a no-op):

- tax records whose fingerprint matches one of 62 hashes of the old seeded ledger (name, amount, date, frequency, category, source and end date must all be unchanged),
- the four old seed accounts, only when every field is unchanged, they have no bank connection, no `account_details` and no `transactions`,
- budget template rows (`is_default`) with the exact template values and `updated_at = created_at`,
- every row owned by the retired mock identities (the ids listed in `MOCK_USER_IDS` in the migration file), in all user-owned tables (including `user_profiles`).

Before deploying:

1. **Back up the database.** There is no way back.
2. Run the read-only counts below against production and check they are what you expect. Surprising numbers (for example many near-matches) mean stop and revisit the decision.
3. Deploy the no-seeding changes first so nothing re-creates the rows.

The migration logs counts only (never ids, names or amounts).

### Pre-deploy read-only counts

```sql
-- Tax records matching a seed fingerprint (expect up to 62 per user that was seeded).
SELECT count(*) AS tax_fingerprint_matches
FROM tax_records
WHERE md5(
  "name" || '|' || to_char("amount", 'FM999999999990.00') || '|' || to_char("date", 'YYYY-MM-DD')
  || '|' || "frequency" || '|' || "category" || '|' || "source"
  || '|' || coalesce(to_char("end_date", 'YYYY-MM-DD'), '')
) = ANY (ARRAY[ /* paste the 62 hash strings from the exported SEEDED_TAX_FINGERPRINTS array in RemoveSeededExampleData1794355400000.ts, as quoted literals */ ]::text[]);

-- Accounts that exactly equal a seed account and have nothing attached.
SELECT count(*) AS exact_seed_accounts
FROM accounts a
JOIN (VALUES
  ('Main Checking', 'Current', 2450.75, NULL::numeric, NULL::numeric),
  ('High Yield Savings', 'Saving', 15800.00, 4.50, 250.00),
  ('Cash ISA — Trading 212', 'Saving', 42100.50, 7.00, 300.00),
  ('Workplace Pension — Nest', 'Pension', 18500.00, 5.50, 433.00)
) AS s(name, type, balance, interest_rate, monthly_contribution)
  ON a."name" = s.name AND a."type" = s.type AND a."balance" = s.balance
 AND a."interest_rate" IS NOT DISTINCT FROM s.interest_rate
 AND a."monthly_contribution" IS NOT DISTINCT FROM s.monthly_contribution
WHERE a."is_current" IS NOT DISTINCT FROM true AND a."currency" = 'GBP'
  AND a."connection_id" IS NULL AND a."external_account_id" IS NULL
  AND NOT EXISTS (SELECT 1 FROM account_details d WHERE d."account_id" = a."id"::text)
  AND NOT EXISTS (SELECT 1 FROM transactions t WHERE t."account_id" = a."id"::text);

-- Budget rows flagged as template rows, and how many were never edited.
SELECT count(*) AS is_default_rows,
       count(*) FILTER (WHERE "updated_at" = "created_at") AS never_edited
FROM budget_entries WHERE "is_default" = true;

-- Rows under the mock identities, per table. Run in psql with the ids from
-- MOCK_USER_IDS in the migration file, e.g. psql -v mock_ids='{id1,id2}' (Postgres array literal).
SELECT 'accounts' AS tbl, count(*) FROM accounts WHERE "user_id" = ANY(:'mock_ids'::text[])
UNION ALL SELECT 'account_details', count(*) FROM account_details WHERE "account_id" IN
  (SELECT "id"::text FROM accounts WHERE "user_id" = ANY(:'mock_ids'::text[]))
UNION ALL SELECT 'transactions', count(*) FROM transactions WHERE "user_id" = ANY(:'mock_ids'::text[])
UNION ALL SELECT 'bank_connections', count(*) FROM bank_connections WHERE "user_id" = ANY(:'mock_ids'::text[])
UNION ALL SELECT 'budget_entries', count(*) FROM budget_entries WHERE "user_id" = ANY(:'mock_ids'::text[])
UNION ALL SELECT 'mcp_tokens', count(*) FROM mcp_tokens WHERE "user_id" = ANY(:'mock_ids'::text[])
UNION ALL SELECT 'tax_records', count(*) FROM tax_records WHERE "user_id" = ANY(:'mock_ids'::text[])
UNION ALL SELECT 'user_profiles', count(*) FROM user_profiles WHERE "user_id" = ANY(:'mock_ids'::text[]);
```

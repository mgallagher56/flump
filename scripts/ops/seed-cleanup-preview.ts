// seed-cleanup-preview.ts: prints a read-only SQL file that COUNTS what the
// RemoveSeededExampleData migration would delete. It never deletes and never selects row data.
//
// Usage (bun, from the repo root):
//   bun scripts/ops/seed-cleanup-preview.ts | psql "$PGURL" -v owner='<WorkOS user id>' -f -
// The owner id is REQUIRED (same rules as prod-counts.sql): unset, empty, a placeholder
// (contains < or >, or starts with your/owner/user_xxx/changeme/todo/placeholder/xxx) or a
// retired mock id aborts with a non-zero exit. The "owner overlap" section counts the owner's own
// rows that match each seed fingerprint (review these before deploying: they would be deleted too).
// A successful run ends with the line "== OK: preview complete". If that line is missing the
// pipeline failed (a failed `bun` piped into psql prints nothing).
//
// The constants come from the migration itself. The two jsonb predicates below are copies of
// the migration's WHERE clauses (they are not exported); scripts/ops/seed-cleanup-preview.test.ts
// compares them with the migration source and with a real run so they cannot drift silently.
import {
  MOCK_USER_IDS,
  SEEDED_ACCOUNTS,
  SEEDED_BUDGET_ENTRIES,
  SEEDED_TAX_FINGERPRINTS,
  TAX_FINGERPRINT_SQL,
} from "../../apps/backend/src/migrations/RemoveSeededExampleData1794355400000";

const literal = (value: string): string => `'${value.replaceAll("'", "''")}'`;
const textArray = (values: readonly string[]): string =>
  `ARRAY[${values.map(literal).join(", ")}]::text[]`;
const jsonLiteral = (value: unknown): string => `${literal(JSON.stringify(value))}::jsonb`;

// Verbatim from the migration (jsonb_to_recordset ... WHERE), as a SELECT of matching ids.
export const ACCOUNT_MATCH_FROM = `"accounts" a, jsonb_to_recordset(${jsonLiteral(SEEDED_ACCOUNTS)}) AS s(
           "name" text, "type" text, "balance" numeric, "interestRate" numeric,
           "monthlyContribution" numeric, "isCurrent" boolean)
         WHERE a."name" = s."name" AND a."type" = s."type" AND a."balance" = s."balance"
           AND a."interest_rate" IS NOT DISTINCT FROM s."interestRate"
           AND a."monthly_contribution" IS NOT DISTINCT FROM s."monthlyContribution"
           AND a."is_current" IS NOT DISTINCT FROM s."isCurrent"
           AND a."currency" = 'GBP'
           AND a."connection_id" IS NULL AND a."external_account_id" IS NULL
           AND NOT EXISTS (SELECT 1 FROM "account_details" d WHERE d."account_id" = a."id"::text)
           AND NOT EXISTS (SELECT 1 FROM "transactions" t WHERE t."account_id" = a."id"::text)`;

export const BUDGET_MATCH_FROM = `"budget_entries" b, jsonb_to_recordset(${jsonLiteral(SEEDED_BUDGET_ENTRIES)}) AS s(
           "category" text, "name" text, "amount" numeric, "isIncome" boolean,
           "isPrimaryIncome" boolean, "isEssential" boolean)
         WHERE b."is_default" = true AND b."category" = s."category" AND b."name" = s."name"
           AND b."amount" = s."amount" AND b."frequency" = 'monthly'
           AND b."is_income" = s."isIncome" AND b."is_primary_income" = s."isPrimaryIncome"
           AND b."is_essential" = s."isEssential" AND b."notes" IS NULL
           AND b."updated_at" = b."created_at"`;

export interface PreviewOptions {
  // Tests pass fingerprints of generic rows, like the migration's constructor parameter.
  taxFingerprints?: readonly string[];
}

export function buildPreviewSql(options: PreviewOptions = {}): string {
  const taxFingerprints = options.taxFingerprints ?? SEEDED_TAX_FINGERPRINTS;
  for (const fingerprint of taxFingerprints) {
    if (!/^[0-9a-f]{32}$/.test(fingerprint)) throw new Error("unexpected tax fingerprint format");
  }
  const TAX_MATCH = `${TAX_FINGERPRINT_SQL} = ANY(${textArray(taxFingerprints)})`;
  const MOCK = textArray(MOCK_USER_IDS);

  const taxIds = `SELECT "id" FROM "tax_records" WHERE ${TAX_MATCH}`;
  const accountIds = `SELECT a."id" FROM ${ACCOUNT_MATCH_FROM}`;
  const budgetIds = `SELECT b."id" FROM ${BUDGET_MATCH_FROM}`;

  // The migration deletes in order and counts mock rows AFTER the seed deletes, so a mock-owned
  // row that also matches a seed fingerprint is counted once, under its seed label.
  const mockCount = {
    account_details: `(SELECT count(*) FROM "account_details" WHERE "account_id" IN
      (SELECT "id"::text FROM "accounts" WHERE "user_id" = ANY(${MOCK})))`,
    transactions: `(SELECT count(*) FROM "transactions" WHERE "user_id" = ANY(${MOCK}))`,
    accounts: `(SELECT count(*) FROM "accounts" WHERE "user_id" = ANY(${MOCK}) AND "id" NOT IN (${accountIds}))`,
    bank_connections: `(SELECT count(*) FROM "bank_connections" WHERE "user_id" = ANY(${MOCK}))`,
    budget_entries: `(SELECT count(*) FROM "budget_entries" WHERE "user_id" = ANY(${MOCK}) AND "id" NOT IN (${budgetIds}))`,
    mcp_tokens: `(SELECT count(*) FROM "mcp_tokens" WHERE "user_id" = ANY(${MOCK}))`,
    tax_records: `(SELECT count(*) FROM "tax_records" WHERE "user_id" = ANY(${MOCK}) AND "id" NOT IN (${taxIds}))`,
    user_profiles: `(SELECT count(*) FROM "user_profiles" WHERE "user_id" = ANY(${MOCK}))`,
  };

  const mockTotal = Object.values(mockCount).join("\n    + ");
  const mockLines = Object.entries(mockCount)
    .map(([table, sql]) => `SELECT 'mockIdentityRows.${table}|' || ${sql};`)
    .join("\n");

  return `-- Generated by scripts/ops/seed-cleanup-preview.ts. Read-only: counts only.
\\set ON_ERROR_STOP on
\\set QUIET on
\\pset format unaligned
\\pset tuples_only on
SET client_encoding = 'UTF8';

-- The owner id is required: abort (non-zero exit) when it is unset, empty, a placeholder or a mock id.
\\if :{?owner}
\\else
  \\echo 'ERROR: pass the owner id: psql ... -v owner=<your WorkOS user id> -f -'
  DO $$ BEGIN RAISE EXCEPTION 'psql variable owner is required (-v owner=...)'; END $$;
\\endif
SELECT :'owner' = '' AS owner_empty \\gset
\\if :owner_empty
  \\echo 'ERROR: owner must not be empty'
  DO $$ BEGIN RAISE EXCEPTION 'psql variable owner must not be empty'; END $$;
\\endif
SELECT (lower(:'owner') ~ '[<>]'
  OR lower(:'owner') ~ '^(your|owner|user_xxx|changeme|todo|placeholder|xxx)'
  OR lower(:'owner') = ANY(${MOCK})) AS owner_placeholder \\gset
\\if :owner_placeholder
  \\echo 'ERROR: owner looks like a placeholder or a mock id; pass your real WorkOS user id'
  DO $$ BEGIN RAISE EXCEPTION 'psql variable owner is a placeholder or mock id'; END $$;
\\endif

BEGIN READ ONLY;

\\echo '== would remove (labels match the migration log line)'
SELECT 'taxRecords|' || (SELECT count(*) FROM "tax_records" WHERE ${TAX_MATCH});
SELECT 'accounts|' || (SELECT count(DISTINCT a."id") FROM ${ACCOUNT_MATCH_FROM});
SELECT 'budgetEntries|' || (SELECT count(DISTINCT b."id") FROM ${BUDGET_MATCH_FROM});
SELECT 'mockIdentityRows|' || (
    ${mockTotal});
SELECT 'summary|taxRecords=' || (SELECT count(*) FROM "tax_records" WHERE ${TAX_MATCH})
  || ' accounts=' || (SELECT count(DISTINCT a."id") FROM ${ACCOUNT_MATCH_FROM})
  || ' budgetEntries=' || (SELECT count(DISTINCT b."id") FROM ${BUDGET_MATCH_FROM})
  || ' mockIdentityRows=' || (
    ${mockTotal});

\\echo '== mock identity rows per table (after seed matches are excluded)'
${mockLines}

\\echo '== owner overlap: the owner''s own rows matching a seed fingerprint (review before deploy)'
SELECT 'owner.taxRecords|' || (SELECT count(*) FROM "tax_records" WHERE "user_id" = :'owner' AND ${TAX_MATCH});
SELECT 'owner.accounts|' || (SELECT count(DISTINCT a."id") FROM ${ACCOUNT_MATCH_FROM} AND a."user_id" = :'owner');
SELECT 'owner.budgetEntries|' || (SELECT count(DISTINCT b."id") FROM ${BUDGET_MATCH_FROM} AND b."user_id" = :'owner');

ROLLBACK;
\\echo '== OK: preview complete'
`;
}

if (import.meta.main) {
  process.stdout.write(buildPreviewSql());
}

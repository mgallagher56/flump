// Synthetic rows for the DB-backed ops tests (not a test file itself). Every value is made up.
import type { Client } from "pg";
import { Baseline1794355200000 } from "../../apps/backend/src/migrations/Baseline1794355200000";
import {
  SEEDED_ACCOUNTS,
  SEEDED_BUDGET_ENTRIES,
  TAX_FINGERPRINT_SQL,
} from "../../apps/backend/src/migrations/RemoveSeededExampleData1794355400000";
import { resetSchema, runInTransaction } from "./db-test-support";

export const OWNER = "user_owner_synthetic";
export const OTHER = "user_other_synthetic";
export const SENTINEL_NAME = "SENTINEL-NAME-XYZ";
export const SENTINEL_TOKEN = "SENTINEL-TOKEN-XYZ";

// Tax rows named like this stand in for the real seed rows: the test derives their
// fingerprints in Postgres and passes them to the migration's constructor.
const SEEDLIKE = "seedlike-tax";

const tax = (client: Client, userId: string, name: string, amount = "100.00") =>
  client.query(
    `INSERT INTO tax_records (user_id, type, source, category, name, amount, frequency, date)
     VALUES ($1, 'income', 'rental', 'rent', $2, $3, 'monthly', '2024-04-06')`,
    [userId, name, amount],
  );

const account = (
  client: Client,
  userId: string,
  seed: {
    name: string;
    type: string;
    balance: number;
    interestRate: number | null;
    monthlyContribution: number | null;
  },
) =>
  client
    .query(
      `INSERT INTO accounts (user_id, name, type, balance, interest_rate, monthly_contribution, is_current, currency)
       VALUES ($1, $2, $3, $4, $5, $6, true, 'GBP') RETURNING id::text AS id`,
      [userId, seed.name, seed.type, seed.balance, seed.interestRate, seed.monthlyContribution],
    )
    .then((r) => r.rows[0].id as string);

export async function buildSyntheticDatabase(client: Client): Promise<void> {
  await resetSchema(client);
  await runInTransaction(client, new Baseline1794355200000());
  await client.query(
    "CREATE TABLE migrations (id SERIAL PRIMARY KEY, timestamp bigint NOT NULL, name varchar NOT NULL)",
  );
  await client.query(
    "INSERT INTO migrations (timestamp, name) VALUES (1794355200000, 'Baseline1794355200000')",
  );

  // Tax: seed-like rows for another user, the owner (overlap) and a mock identity; plus
  // rows that must survive (owner's own, sentinel-named).
  await tax(client, OTHER, `${SEEDLIKE}-1`, "10.00");
  await tax(client, OTHER, `${SEEDLIKE}-2`, "20.00");
  await tax(client, OWNER, `${SEEDLIKE}-3`, "30.00");
  await tax(client, "user_mock", `${SEEDLIKE}-4`, "40.00");
  await tax(client, "user_mock", "mock-plain-tax", "5.00");
  await tax(client, OWNER, SENTINEL_NAME, "123.45");
  await tax(client, OWNER, "owner-plain-tax", "7.00");

  // Accounts: the four seeded accounts for another user, one for the owner (overlap), one
  // mock-owned seed tuple (counted as accounts), one mock account holding details (mock).
  for (const seed of SEEDED_ACCOUNTS) await account(client, OTHER, seed);
  await account(client, OWNER, SEEDED_ACCOUNTS[0]);
  await account(client, "dev_user_123", SEEDED_ACCOUNTS[1]);
  const mockWithDetails = await account(client, "user_mock", {
    name: "Mock saver",
    type: "Saving",
    balance: 1,
    interestRate: null,
    monthlyContribution: null,
  });
  await account(client, OWNER, {
    name: SENTINEL_NAME,
    type: "Current",
    balance: 999.99,
    interestRate: null,
    monthlyContribution: null,
  });
  await client.query(
    "INSERT INTO account_details (account_id, month, value, year) VALUES ($1, 1, 5.00, 2025), ($1, 2, 6.00, 2025)",
    [mockWithDetails],
  );
  await client.query(
    "INSERT INTO transactions (account_id, user_id, amount, description, category) VALUES ($1, 'user_mock', 1.00, 'mock tx', 'misc'), ($1, $2, 2.00, $3, 'misc')",
    [mockWithDetails, OWNER, SENTINEL_NAME],
  );

  // Budget: untouched template for another user and the owner's untouched Gym row (overlap);
  // an edited template row (updated_at later) and a mock plain row.
  for (const entry of SEEDED_BUDGET_ENTRIES) {
    await client.query(
      `INSERT INTO budget_entries (user_id, category, name, amount, frequency, is_income, is_primary_income, is_essential, is_default)
       VALUES ($1, $2, $3, $4, 'monthly', $5, $6, $7, true)`,
      [
        OTHER,
        entry.category,
        entry.name,
        entry.amount,
        entry.isIncome,
        entry.isPrimaryIncome,
        entry.isEssential,
      ],
    );
  }
  const gym = SEEDED_BUDGET_ENTRIES.find((e) => e.name === "Gym");
  const netflix = SEEDED_BUDGET_ENTRIES.find((e) => e.name === "Netflix");
  if (!gym || !netflix) throw new Error("fixture template rows missing");
  for (const [entry, edited] of [
    [gym, false],
    [netflix, true],
  ] as const) {
    await client.query(
      `INSERT INTO budget_entries (user_id, category, name, amount, frequency, is_income, is_primary_income, is_essential, is_default, updated_at)
       VALUES ($1, $2, $3, $4, 'monthly', false, false, $5, true, ${edited ? "now() + interval '1 day'" : "now()"})`,
      [OWNER, entry.category, entry.name, entry.amount, entry.isEssential],
    );
  }
  await client.query(
    `INSERT INTO budget_entries (user_id, category, name, amount) VALUES ('user_mock', 'misc', 'mock budget', 1), ($1, 'misc', $2, 2)`,
    [OWNER, SENTINEL_NAME],
  );

  // Bank connections with (fake) tokens, user profiles and MCP tokens.
  await client.query(
    `INSERT INTO bank_connections (user_id, institution_id, institution_name, access_token, refresh_token, status) VALUES
       ($1, 'inst', $2, $3, $3, 'connected'),
       ($1, 'inst', $2, NULL, $3, 'error'),
       ($1, 'inst', $2, NULL, NULL, 'disconnected'),
       ('user_mock', 'inst', 'Mock bank', 'mock-token', NULL, 'connected')`,
    [OWNER, SENTINEL_NAME, SENTINEL_TOKEN],
  );
  await client.query(
    "INSERT INTO user_profiles (user_id, display_name) VALUES ($1, $2), ('dev_user_123', 'Mock')",
    [OWNER, SENTINEL_NAME],
  );
  await client.query(
    "INSERT INTO mcp_tokens (user_id, name, token_hash, token_prefix) VALUES ($1, $2, $3, 'flmp_xxxx'), ('user_mock', 'mock', 'mock-hash', 'flmp_yyyy')",
    [OWNER, SENTINEL_NAME, SENTINEL_TOKEN],
  );
}

export async function seedLikeFingerprints(client: Client): Promise<string[]> {
  const result = await client.query(
    `SELECT ${TAX_FINGERPRINT_SQL} AS fp FROM tax_records WHERE "name" LIKE '${SEEDLIKE}-%' ORDER BY "name"`,
  );
  return result.rows.map((row) => row.fp as string);
}

export const TABLES = [
  "account_details",
  "accounts",
  "bank_connections",
  "budget_entries",
  "mcp_tokens",
  "tax_records",
  "transactions",
  "user_profiles",
] as const;

export async function tableCounts(client: Client): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const table of TABLES) {
    const result = await client.query(`SELECT count(*)::int AS n FROM "${table}"`);
    counts[table] = result.rows[0].n as number;
  }
  return counts;
}

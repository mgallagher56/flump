// seed-synthetic.ts: replace ALL user data in the STAGING database with synthetic personas
// (E18-N11, "switch before friends"). Never run it against production.
//
// Usage (bun, from the repo root; owner step, see docs/runbooks/staging.md):
//   STAGING_PGURL='<staging url>' [PGURL='<production url>'] \
//     bun scripts/ops/seed-synthetic.ts --persona P1=<WorkOS user id> [--persona P2=<id> ...]
//
// Refuses (exit 2, nothing written) unless ALL hold:
//   - STAGING_PGURL is a plain single-host postgres URL (no host=, port=, dbname=, service=
//     parameters, no host list) and, when PGURL is also set, names a different host:port/database
//   - the database comment is exactly 'flump-staging', checked on the SAME connection and inside
//     the same transaction that writes (staging-marker.ts)
//   - every public table is known to this script (a new table must be added here on purpose)
//   - every --persona id looks like a WorkOS user id and no id is used twice
// Then, in ONE transaction: deletes every row of the user-data tables (never `migrations`), child
// tables first, and inserts the chosen personas with parameterised SQL. Running it again gives
// the same state. Prints table counts only, never row data or connection strings.
import {
  assertDistinctTargets,
  assertStagingMarker,
  connectionTarget,
  type MarkerQueryable,
} from "./staging-marker";
import {
  PERSONA_KEYS,
  type PersonaKey,
  SYNTHETIC_PERSONAS,
  type SyntheticPersona,
} from "./synthetic-personas";

// Children first: account_details.account_id and transactions.account_id are uuid foreign keys
// to accounts with ON DELETE CASCADE (BE-08), and the order stays child-before-parent.
export const USER_DATA_TABLES = [
  "transactions",
  "snapshot_checkins",
  "account_details",
  "import_batches",
  // BE-05 before-image of re-signed liability rows (child of accounts, ON DELETE CASCADE).
  "liability_sign_backfill",
  "accounts",
  "bank_connections",
  // BE-12 pending bank OAuth consents (random state hash and PKCE verifier, ten minutes).
  "bank_oauth_states",
  "budget_entries",
  "agent_audit_events",
  "mcp_tokens",
  // BE-09 stored create responses for Idempotency-Key retries (they echo the rows they created).
  "idempotency_keys",
  "tax_records",
  "user_profiles",
  // BE-04 deletion proofs: cleared too, so a persona id erased during staging testing can be seeded
  // again (a tombstone would otherwise refuse every request for that id).
  "account_deletion_tombstones",
  // BE-07 shared rate-limit counters (keys built from user ids and client IPs, short windows):
  // cleared so a reseed starts every persona with fresh limits.
  "rate_limit_buckets",
] as const;

export type PersonaAssignment = Partial<Record<PersonaKey, string>>;
export type SeedCounts = Record<(typeof USER_DATA_TABLES)[number], number>;

export interface SeedClient extends MarkerQueryable {
  query(sql: string, params?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>;
}

const WORKOS_USER_ID = /^user_[A-Za-z0-9]{6,40}$/;

export function validateAssignment(assignment: PersonaAssignment): Array<[PersonaKey, string]> {
  const entries = Object.entries(assignment) as Array<[PersonaKey, string]>;
  if (entries.length === 0) throw new Error("Give at least one --persona P1=<WorkOS user id>.");
  const seen = new Set<string>();
  for (const [key, id] of entries) {
    if (!PERSONA_KEYS.includes(key)) {
      throw new Error(`Unknown persona '${key}' (use ${PERSONA_KEYS.join(", ")}).`);
    }
    if (!WORKOS_USER_ID.test(id)) {
      throw new Error(`The id for ${key} is not a WorkOS user id (user_...); no placeholders.`);
    }
    if (seen.has(id)) throw new Error("Each persona needs its own WorkOS user id.");
    seen.add(id);
  }
  return entries.sort(([a], [b]) => a.localeCompare(b));
}

async function insertPersona(db: SeedClient, persona: SyntheticPersona, userId: string) {
  const p = persona.profile;
  await db.query(
    `INSERT INTO user_profiles
       (user_id, display_name, first_name, last_name, employment_type, annual_salary,
        monthly_take_home, has_mortgage, pension_percent, pension_employer_percent,
        is_salary_sacrifice, has_rental_income, rental_income_monthly, enabled_pages,
        dashboard_widgets, dashboard_widget_order, onboarding_completed)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14,$14,true)`,
    [
      userId,
      p.displayName,
      p.firstName,
      p.lastName,
      p.employmentType,
      p.annualSalary,
      p.monthlyTakeHome,
      p.hasMortgage ?? false,
      p.pensionPercent ?? 5,
      p.pensionEmployerPercent ?? 3,
      p.isSalarySacrifice ?? true,
      p.hasRentalIncome ?? false,
      p.rentalIncomeMonthly ?? null,
      p.enabledPages.join(","), // TypeORM simple-array storage
    ],
  );

  for (const a of persona.accounts) {
    const { rows } = await db.query(
      `INSERT INTO accounts
         (user_id, name, type, balance, interest_rate, monthly_contribution, term_months,
          fixed_rate_end_date, is_current, currency)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'GBP') RETURNING id::text AS id`,
      [
        userId,
        a.name,
        a.type,
        a.balance,
        a.interestRate ?? null,
        a.monthlyContribution ?? null,
        a.termMonths ?? null,
        a.fixedRateEndDate ?? null,
        a.isCurrent ?? true,
      ],
    );
    const accountId = rows[0]?.id as string;
    for (const h of a.history ?? []) {
      await db.query(
        `INSERT INTO account_details (account_id, user_id, year, month, value, as_of_date, source)
         VALUES ($1,$2,$3,$4,$5, make_date($3::int, $4::int, 1), 'backfill')`,
        [accountId, userId, h.year, h.month, h.value],
      );
    }
  }

  for (const b of persona.budget) {
    await db.query(
      `INSERT INTO budget_entries
         (user_id, category, name, amount, frequency, is_income, is_primary_income, is_essential,
          is_default)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,false)`,
      [
        userId,
        b.category,
        b.name,
        b.amount,
        b.frequency ?? "monthly",
        b.isIncome ?? false,
        b.isPrimaryIncome ?? false,
        b.isEssential ?? true,
      ],
    );
  }

  for (const t of persona.tax) {
    await db.query(
      `INSERT INTO tax_records (user_id, type, source, category, name, amount, frequency, date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [userId, t.type, t.source, t.category, t.name, t.amount, t.frequency, t.date],
    );
  }
}

// The client must be a dedicated, connected connection: BEGIN/COMMIT are issued on it.
export async function seedSynthetic(
  db: SeedClient,
  assignment: PersonaAssignment,
): Promise<SeedCounts> {
  const entries = validateAssignment(assignment);
  await db.query("BEGIN");
  try {
    await db.query("SET LOCAL lock_timeout = '10s'"); // never wait forever on the backend
    await assertStagingMarker(db); // same connection and transaction as the writes
    // Block concurrent writers (the running backend) until we commit.
    await db.query(
      `LOCK TABLE ${USER_DATA_TABLES.map((t) => `"${t}"`).join(", ")} IN ACCESS EXCLUSIVE MODE`,
    );

    const { rows: tables } = await db.query(
      "SELECT table_name FROM information_schema.tables " +
        "WHERE table_schema = 'public' AND table_type = 'BASE TABLE'",
    );
    const unknown = tables
      .map((r) => String(r.table_name))
      .filter(
        (name) => name !== "migrations" && !(USER_DATA_TABLES as readonly string[]).includes(name),
      );
    if (unknown.length > 0) {
      throw new Error(
        `Refusing: public tables this script does not know (${unknown.join(", ")}); ` +
          "add them to USER_DATA_TABLES in seed-synthetic.ts first.",
      );
    }

    for (const table of USER_DATA_TABLES) await db.query(`DELETE FROM "${table}"`);
    for (const [key, userId] of entries) {
      await insertPersona(db, SYNTHETIC_PERSONAS[key], userId);
    }

    const counts = {} as SeedCounts;
    for (const table of USER_DATA_TABLES) {
      const { rows } = await db.query(`SELECT count(*)::int AS n FROM "${table}"`);
      counts[table] = Number(rows[0]?.n);
    }
    await db.query("COMMIT");
    return counts;
  } catch (error) {
    // A failed ROLLBACK (for example a dead connection) must not hide the original error.
    await db.query("ROLLBACK").catch(() => undefined);
    throw error;
  }
}

export function parseArgs(argv: string[]): PersonaAssignment {
  const assignment: PersonaAssignment = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] !== "--persona") throw new Error(`Unknown argument '${argv[i]}'.`);
    const value = argv[++i] ?? "";
    const eq = value.indexOf("=");
    if (eq < 1) throw new Error("--persona needs the form P1=<WorkOS user id>.");
    const key = value.slice(0, eq) as PersonaKey;
    if (key in assignment) throw new Error(`--persona ${key} given twice.`);
    assignment[key] = value.slice(eq + 1);
  }
  return assignment;
}

async function main(): Promise<void> {
  const env: Record<string, string | undefined> = process.env; // not turbo task inputs
  const stagingUrl = env.STAGING_PGURL ?? "";
  const productionUrl = env.PGURL ?? "";
  if (!stagingUrl) throw new Error("STAGING_PGURL is required.");
  connectionTarget(stagingUrl); // plain single-host URL, no override parameters
  if (productionUrl) assertDistinctTargets(productionUrl, stagingUrl);
  const assignment = parseArgs(process.argv.slice(2));
  validateAssignment(assignment);

  const { Client } = (await import("../../apps/backend/node_modules/pg")) as {
    Client: new (config: {
      connectionString: string;
    }) => SeedClient & { connect(): Promise<void>; end(): Promise<void> };
  };
  const client = new Client({ connectionString: stagingUrl });
  await client.connect();
  try {
    const counts = await seedSynthetic(client, assignment);
    console.log(`seeded personas: ${Object.keys(assignment).sort().join(", ")}`);
    for (const [table, n] of Object.entries(counts)) console.log(`${table}|${n}`);
    console.log("== OK: synthetic seed complete");
  } finally {
    await client.end();
  }
}

if (import.meta.main) {
  main().catch((error: Error) => {
    console.error(`ERROR: ${error.message}`);
    process.exit(2);
  });
}

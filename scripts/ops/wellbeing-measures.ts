// wellbeing-measures.ts: the owner's aggregate reading of the E35 section 7 W9 measures
// (docs/audit/plans/E35-encouragement-and-wellbeing.md, section 7). Read-only.
//
// Usage (bun, from the repo root; the owner runs it against the database to read):
//   PGURL='<database url>' bun scripts/ops/wellbeing-measures.ts [--today YYYY-MM-DD]
//
// `--today` replaces London today (for a repeatable reading); without it the database works out
// today on the Europe/London clock.
//
// Limits to keep in mind when reading: `accounts_with_figure` counts accounts that exist today, so
// a deleted account drops out of past months and earlier totals can shift between readings.
// `debts_with_goal` takes "owed now" from the account's current balance, not its latest monthly
// figure. The W5 questions after a check-in were removed on 28 Nov 2026, so their answers are no
// longer read here.
//
// What it prints, as `label|value|...` lines, aggregate only:
//   - check-ins completed per month (snapshot_checkins), the last 13 months
//   - per month, the last 12: accounts that existed, and how many of them have a figure entered or
//     confirmed for the month (account_details, any source but `backfill`)
//   - debts with a goal the person set: how many, how many have a figure from the goal's month or
//     before, the total change in the amount owed since then (negative is paid down) and how many
//     owe less, the same or more
//   - goals whose date has passed: how many, how many have an amount and a figure on or before the
//     date to judge by, and how many of those were reached (a debt owing no more than the amount,
//     anything else holding at least the amount; the same rule as the account page)
//
// Never printed: a user id, an account id or any row for one person. Everything runs in one READ
// ONLY transaction that is rolled back. Small counts can still point at a person in a small beta:
// read them with that in mind, and never share them outside the owner.

// ---------------------------------------------------------------------------------------------
/** Minimal client surface, so tests can pass a pg Client. */
export interface Queryable {
  query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
}

/** Today on the London clock, or the `--today` date. $1 is that date or null. */
const TODAY = `COALESCE($1::date, (now() AT TIME ZONE 'Europe/London')::date)`;

/** The account types that are debts (stored negative), as in apps/web isLiabilityType. */
const LIABILITY_TYPES = `('Mortgage', 'Loan', 'Credit Card', 'Overdraft', 'Student Loan')`;

/** Each measure: a label for its lines and one aggregate query. No query selects an id. */
export const MEASURES: ReadonlyArray<{ label: string; columns: readonly string[]; sql: string }> = [
  {
    label: "check_ins_completed",
    columns: ["month", "completed"],
    sql: `SELECT month, count(*)::int AS completed
          FROM snapshot_checkins
          WHERE completed_at IS NOT NULL
            AND month >= to_char(${TODAY} - interval '12 months', 'YYYY-MM')
            AND month <= to_char(${TODAY}, 'YYYY-MM')
          GROUP BY month ORDER BY month`,
  },
  {
    label: "accounts_with_figure",
    columns: ["month", "accounts", "with_figure"],
    sql: `WITH months AS (
            SELECT m::date AS first_day, (m + interval '1 month')::date AS next_first
            FROM generate_series(
              date_trunc('month', ${TODAY}) - interval '11 months',
              date_trunc('month', ${TODAY}),
              interval '1 month'
            ) AS m
          )
          SELECT to_char(months.first_day, 'YYYY-MM') AS month,
            count(a.id)::int AS accounts,
            count(a.id) FILTER (WHERE EXISTS (
              SELECT 1 FROM account_details d
              WHERE d.account_id = a.id
                AND d.year = EXTRACT(YEAR FROM months.first_day)::int
                AND d.month = EXTRACT(MONTH FROM months.first_day)::int
                AND d.source <> 'backfill'
            ))::int AS with_figure
          FROM months
          LEFT JOIN accounts a
            ON (a.created_at AT TIME ZONE 'Europe/London')::date < months.next_first
          GROUP BY months.first_day ORDER BY months.first_day`,
  },
  {
    label: "debts_with_goal",
    columns: [
      "debts_with_goal",
      "with_figure_at_goal",
      "change_in_owed",
      "owe_less",
      "owe_same",
      "owe_more",
    ],
    sql: `WITH goal_debts AS (
            SELECT abs(a.balance) AS owed_now,
              (SELECT abs(d.value) FROM account_details d
               WHERE d.account_id = g.account_id
                 AND (d.year * 12 + d.month) <=
                   (EXTRACT(YEAR FROM g.created_at AT TIME ZONE 'Europe/London')::int * 12
                    + EXTRACT(MONTH FROM g.created_at AT TIME ZONE 'Europe/London')::int)
               ORDER BY d.year DESC, d.month DESC LIMIT 1) AS owed_at_goal
            FROM account_goals g
            JOIN accounts a ON a.id = g.account_id
            WHERE a.type IN ${LIABILITY_TYPES}
              AND (g.created_at AT TIME ZONE 'Europe/London')::date <= ${TODAY}
          )
          SELECT count(*)::int AS debts_with_goal,
            count(owed_at_goal)::int AS with_figure_at_goal,
            COALESCE(sum(owed_now - owed_at_goal), 0)::numeric(14, 2)::text AS change_in_owed,
            count(*) FILTER (WHERE owed_now < owed_at_goal)::int AS owe_less,
            count(*) FILTER (WHERE owed_now = owed_at_goal)::int AS owe_same,
            count(*) FILTER (WHERE owed_now > owed_at_goal)::int AS owe_more
          FROM goal_debts`,
  },
  {
    label: "goals_date_passed",
    columns: ["date_passed", "judged", "reached"],
    sql: `WITH due AS (
            SELECT g.target_amount, a.type IN ${LIABILITY_TYPES} AS liability,
              (SELECT d.value FROM account_details d
               WHERE d.account_id = g.account_id AND d.as_of_date <= g.target_date
               ORDER BY d.as_of_date DESC LIMIT 1) AS value_by_date
            FROM account_goals g
            JOIN accounts a ON a.id = g.account_id
            WHERE g.target_date IS NOT NULL AND g.target_date < ${TODAY}
          )
          SELECT count(*)::int AS date_passed,
            count(*) FILTER (WHERE target_amount IS NOT NULL AND value_by_date IS NOT NULL)::int
              AS judged,
            count(*) FILTER (
              WHERE target_amount IS NOT NULL AND value_by_date IS NOT NULL
                AND CASE WHEN liability THEN abs(value_by_date) <= target_amount
                         ELSE value_by_date >= target_amount END
            )::int AS reached
          FROM due`,
  },
];

/**
 * Runs every measure in one READ ONLY transaction, always rolled back, and returns the lines to
 * print: `label|value|...` with the column names first for each measure.
 */
export async function readWellbeingMeasures(
  db: Queryable,
  today: string | null = null,
): Promise<string[]> {
  const lines: string[] = [];
  await db.query("BEGIN READ ONLY");
  try {
    for (const measure of MEASURES) {
      lines.push(`== ${measure.label}|${measure.columns.join("|")}`);
      // Only the measures that read today take the date (pg refuses an unused parameter).
      const { rows } = await db.query(measure.sql, measure.sql.includes("$1") ? [today] : []);
      for (const row of rows) {
        lines.push(
          [measure.label, ...measure.columns.map((column) => String(row[column] ?? ""))].join("|"),
        );
      }
    }
  } finally {
    await db.query("ROLLBACK");
  }
  return lines;
}

/** `--today YYYY-MM-DD`, or null for London today. Throws on anything else. */
export function parseToday(argv: readonly string[]): string | null {
  const at = argv.indexOf("--today");
  if (at === -1) return null;
  const value = argv[at + 1] ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("--today must be YYYY-MM-DD");
  return value;
}

if (import.meta.main) {
  const env: Record<string, string | undefined> = process.env; // not turbo task inputs
  const url = env.PGURL ?? "";
  if (!url) {
    console.error("PGURL is required.");
    process.exit(2);
  }
  let today: string | null;
  try {
    today = parseToday(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "bad arguments");
    process.exit(2);
  }
  // pg is a dependency of the backend only, as in seed-synthetic.ts.
  const { Client } = (await import("../../apps/backend/node_modules/pg")) as {
    Client: new (config: {
      connectionString: string;
    }) => Queryable & { connect(): Promise<void>; end(): Promise<void> };
  };
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    for (const line of await readWellbeingMeasures(client, today)) console.log(line);
  } finally {
    await client.end();
  }
}

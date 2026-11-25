// wellbeing-measures.ts: the owner's aggregate reading of E35 W5 and the section 7 W9 measures
// (docs/audit/plans/E35-encouragement-and-wellbeing.md, section 7). Read-only.
//
// Usage (bun, from the repo root; the owner runs it against the database to read):
//   PGURL='<database url>' bun scripts/ops/wellbeing-measures.ts [--today YYYY-MM-DD]
//
// `--today` replaces London today (for a repeatable reading); without it the database works out
// today on the Europe/London clock.
//
// What it prints, as `label|value|...` lines, aggregate only:
//   - per quarter: how many answered "More in control", "About the same" and "More worried", how
//     many gave no feeling but wrote something, how many skipped both, and how many wrote text
//   - the number of profiles with the questions switched off, out of all profiles
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
// Never printed: a user id, an account id, any row for one person, or the free text. Everything
// runs in one READ ONLY transaction that is rolled back. Small counts can still point at a person
// in a small beta: read them with that in mind, and never share them outside the owner.
//
// ---------------------------------------------------------------------------------------------
// Reading the free text (separate, on purpose: the answers are personal data that may be
// sensitive). The one query, which selects the quarter and the text only, never a user id, and
// sorts by the text so the order says nothing about who wrote first:
//
//   SELECT quarter, worse_text FROM wellbeing_answers
//   WHERE worse_text IS NOT NULL ORDER BY quarter, worse_text;
//
// ---------------------------------------------------------------------------------------------
// THE ONE WRITE. Not run by this script. Run it by hand, deliberately, and only to remove one
// free-text answer that holds health details (or other special category data). It blanks the text
// and keeps the feeling, without the owner ever seeing whose answer it was. Copy the quarter and
// the text exactly as the query above printed them; psql quotes both. Every answer in that
// quarter with exactly that text is blanked, and psql prints the count changed (`UPDATE n`):
//
//   psql "$PGURL" -v quarter='2026-10-01' -v exact_text='<the answer, exactly>' <<'SQL'
//   UPDATE wellbeing_answers SET worse_text = NULL
//   WHERE quarter = :'quarter'::date AND worse_text = :'exact_text';
//   SQL
//
// `UPDATE 0` means nothing matched (check the text was copied exactly). Nothing else here writes.
// ---------------------------------------------------------------------------------------------
/** Minimal client surface, so tests can pass a pg Client. */
export interface Queryable {
  query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
}

/** Today on the London clock, or the `--today` date. $1 is that date or null. */
const TODAY = `COALESCE($1::date, (now() AT TIME ZONE 'Europe/London')::date)`;

/** The account types that are debts (stored negative), as in apps/web isLiabilityType. */
const LIABILITY_TYPES = `('Mortgage', 'Loan', 'Credit Card', 'Overdraft', 'Student Loan')`;

/** Each measure: a label for its lines and one aggregate query. No query selects an id or text. */
export const MEASURES: ReadonlyArray<{ label: string; columns: readonly string[]; sql: string }> = [
  {
    label: "answers_by_quarter",
    columns: [
      "quarter",
      "more_in_control",
      "about_the_same",
      "more_worried",
      "no_feeling_with_text",
      "skipped",
      "with_text",
    ],
    sql: `SELECT quarter::text AS quarter,
            count(*) FILTER (WHERE feeling = 'more_in_control')::int AS more_in_control,
            count(*) FILTER (WHERE feeling = 'about_the_same')::int AS about_the_same,
            count(*) FILTER (WHERE feeling = 'more_worried')::int AS more_worried,
            count(*) FILTER (WHERE feeling IS NULL AND worse_text IS NOT NULL)::int
              AS no_feeling_with_text,
            count(*) FILTER (WHERE feeling IS NULL AND worse_text IS NULL)::int AS skipped,
            count(*) FILTER (WHERE worse_text IS NOT NULL)::int AS with_text
          FROM wellbeing_answers
          GROUP BY quarter ORDER BY quarter`,
  },
  {
    label: "switched_off",
    columns: ["switched_off", "profiles"],
    sql: `SELECT count(*) FILTER (WHERE NOT wellbeing_questions)::int AS switched_off,
            count(*)::int AS profiles
          FROM user_profiles`,
  },
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

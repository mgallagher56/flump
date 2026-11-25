import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { discoverMigrations } from "../../apps/backend/src/testing/discoverMigrations";
import { DB_TESTS_ENABLED, resetSchema, runInTransaction, withClient } from "./db-test-support";
import { MEASURES, parseToday, type Queryable, readWellbeingMeasures } from "./wellbeing-measures";

const SOURCE = readFileSync(resolve(import.meta.dir, "wellbeing-measures.ts"), "utf8");
/** The source without its comment lines: the header documents the one write, the code has none. */
const CODE = SOURCE.split("\n")
  .filter((line) => !line.trimStart().startsWith("//"))
  .join("\n");

describe("wellbeing-measures (static)", () => {
  test("the code holds no write; the one documented write lives in the header comment only", () => {
    expect(CODE).not.toMatch(/\b(UPDATE|DELETE|INSERT|DROP|TRUNCATE|ALTER|CREATE)\s/);
    expect(SOURCE).toContain("// THE ONE WRITE. Not run by this script.");
    expect(SOURCE).toMatch(
      /\/\/ {3}UPDATE wellbeing_answers SET worse_text = NULL\n\/\/ {3}WHERE quarter = :'quarter'::date AND worse_text = :'exact_text';/,
    );
  });

  test("the documented free-text query selects the quarter and the text, never a user id", () => {
    expect(SOURCE).toContain(
      "//   SELECT quarter, worse_text FROM wellbeing_answers\n//   WHERE worse_text IS NOT NULL ORDER BY quarter, worse_text;",
    );
  });

  test("no measure prints an id or the text", () => {
    for (const { columns } of MEASURES) {
      const banned = ["id", "user_id", "account_id", "worse_text", "label", "value"];
      expect(columns.filter((c) => banned.includes(c))).toEqual([]);
    }
  });

  test("parseToday takes a YYYY-MM-DD date or nothing, and refuses anything else", () => {
    expect(parseToday([])).toBeNull();
    expect(parseToday(["--today", "2026-11-25"])).toBe("2026-11-25");
    expect(() => parseToday(["--today"])).toThrow("--today must be YYYY-MM-DD");
    expect(() => parseToday(["--today", "25/11/2026"])).toThrow("--today must be YYYY-MM-DD");
  });

  test("runs inside one READ ONLY transaction that is rolled back, also when a query fails", async () => {
    const calls: string[] = [];
    const failing: Queryable = {
      query: async (sql: string) => {
        calls.push(sql.trim().split(/\s+/).slice(0, 2).join(" "));
        if (calls.length === 3) throw new Error("boom");
        return { rows: [] };
      },
    };
    await expect(readWellbeingMeasures(failing, "2026-11-25")).rejects.toThrow("boom");
    expect(calls[0]).toBe("BEGIN READ");
    expect(calls.at(-1)).toBe("ROLLBACK");
    expect(calls).toHaveLength(4);
  });
});

describe.skipIf(!DB_TESTS_ENABLED)("wellbeing-measures (real Postgres, all migrations)", () => {
  const SENTINEL_TEXT = "SENTINEL worse text";
  const ids: string[] = [];

  beforeAll(async () => {
    await withClient(async (client) => {
      await resetSchema(client);
      for (const Migration of await discoverMigrations()) {
        await runInTransaction(client, new (Migration as new () => never)());
      }
      const q = (sql: string, params: unknown[] = []) => client.query(sql, params);
      for (const [user, on] of [
        ["user_w1", true],
        ["user_w2", false],
        ["user_w3", true],
      ] as const) {
        await q("INSERT INTO user_profiles (user_id, wellbeing_questions) VALUES ($1, $2)", [
          user,
          on,
        ]);
      }
      for (const [user, quarter, feeling, text] of [
        ["user_w1", "2026-07-01", "more_in_control", null],
        ["user_w2", "2026-07-01", null, null],
        ["user_w1", "2026-10-01", "more_worried", SENTINEL_TEXT],
        ["user_w3", "2026-10-01", null, "other words"],
        ["user_w2", "2026-10-01", "about_the_same", null],
      ]) {
        await q(
          "INSERT INTO wellbeing_answers (user_id, quarter, feeling, worse_text) VALUES ($1, $2, $3, $4)",
          [user, quarter, feeling, text],
        );
      }
      for (const [user, month, done] of [
        ["user_w1", "2026-10", true],
        ["user_w2", "2026-10", true],
        ["user_w1", "2026-11", false],
        ["user_w1", "2025-10", true],
        ["user_w3", "2025-11", true],
      ] as const) {
        await q(
          `INSERT INTO snapshot_checkins (user_id, month, completed_at) VALUES ($1, $2, ${done ? "now()" : "NULL"})`,
          [user, month],
        );
      }
      const account = async (user: string, type: string, balance: number, created: string) => {
        const { rows } = await q(
          `INSERT INTO accounts (user_id, name, type, balance, currency, created_at)
           VALUES ($1, 'Acct', $2, $3, 'GBP', $4::timestamptz) RETURNING id`,
          [user, type, balance, created],
        );
        ids.push(rows[0].id);
        return rows[0].id as string;
      };
      const saver = await account("user_w1", "Saving", 150, "2026-10-05T10:00:00Z");
      const loan = await account("user_w1", "Loan", -800, "2026-09-10T10:00:00Z");
      const card = await account("user_w3", "Credit Card", -300, "2026-11-01T10:00:00Z");
      const current = await account("user_w2", "Current", 20, "2026-08-01T10:00:00Z");
      const figure = (
        accountId: string,
        user: string,
        asOf: string,
        value: number,
        source: string,
      ) =>
        q(
          `INSERT INTO account_details (account_id, user_id, year, month, value, as_of_date, source)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            accountId,
            user,
            Number(asOf.slice(0, 4)),
            Number(asOf.slice(5, 7)),
            value,
            asOf,
            source,
          ],
        );
      await figure(saver, "user_w1", "2026-10-31", 150, "manual");
      await figure(saver, "user_w1", "2026-11-25", 150, "backfill");
      await figure(loan, "user_w1", "2026-09-30", -1000, "manual");
      await figure(loan, "user_w1", "2026-10-31", -900, "confirmed");
      await figure(loan, "user_w1", "2026-11-20", -800, "manual");
      await figure(card, "user_w3", "2026-11-02", -300, "manual");
      const goal = (
        accountId: string,
        user: string,
        amount: number | null,
        date: string | null,
        created: string,
      ) =>
        q(
          `INSERT INTO account_goals (account_id, user_id, target_amount, target_date, created_at)
           VALUES ($1, $2, $3, $4, $5::timestamptz)`,
          [accountId, user, amount, date, created],
        );
      await goal(loan, "user_w1", 500, "2026-11-15", "2026-10-15T10:00:00Z");
      await goal(card, "user_w3", 0, null, "2026-11-01T12:00:00Z");
      await goal(saver, "user_w1", 100, "2026-10-31", "2026-10-06T10:00:00Z");
      await goal(current, "user_w2", null, "2026-09-01", "2026-08-02T10:00:00Z");
    });
  }, 120_000);

  afterAll(async () => {
    await withClient(resetSchema);
  });

  test("prints the hand-worked aggregates and nothing that identifies a person", async () => {
    const lines = await withClient((client) => readWellbeingMeasures(client, "2026-11-25"));
    const of = (label: string) => lines.filter((l) => l.startsWith(`${label}|`));

    // Q3: user_w1 in control, user_w2 skipped. Q4: user_w1 worried with text, user_w3 text only,
    // user_w2 about the same.
    expect(of("answers_by_quarter")).toEqual([
      "answers_by_quarter|2026-07-01|1|0|0|0|1|0",
      "answers_by_quarter|2026-10-01|0|1|1|1|0|2",
    ]);
    expect(of("switched_off")).toEqual(["switched_off|1|3"]);
    // 13 months back from Nov 2026 starts at Nov 2025: Oct 2025 and the unfinished Nov 2026 drop.
    expect(of("check_ins_completed")).toEqual([
      "check_ins_completed|2025-11|1",
      "check_ins_completed|2026-10|2",
    ]);
    // Aug: the current account only. Sep: the loan has a figure, the current account none.
    // Oct: saver and loan have figures. Nov: the saver's only figure is a backfill, so loan and
    // card of four accounts.
    const accounts = of("accounts_with_figure");
    expect(accounts).toHaveLength(12);
    expect(accounts.slice(0, 8).every((l) => l.endsWith("|0|0"))).toBe(true);
    expect(accounts.slice(8)).toEqual([
      "accounts_with_figure|2026-08|1|0",
      "accounts_with_figure|2026-09|2|1",
      "accounts_with_figure|2026-10|3|2",
      "accounts_with_figure|2026-11|4|2",
    ]);
    // Loan: goal set in Oct, owed 900 then, 800 now: -100. Card: 300 then and now: 0.
    // Total change -100.00; one owes less, one the same.
    expect(of("debts_with_goal")).toEqual(["debts_with_goal|2|2|-100.00|1|1|0"]);
    // Dates passed: loan (15 Nov), saver (31 Oct), current account (1 Sep, no amount: not judged).
    // Loan owed 900 at 31 Oct, its latest figure by 15 Nov, over 500: not reached. Saver held 150
    // by 31 Oct, at least 100: reached.
    expect(of("goals_date_passed")).toEqual(["goals_date_passed|3|2|1"]);

    const text = lines.join("\n");
    expect(text).not.toContain("user_w");
    expect(text).not.toContain("SENTINEL");
    expect(text).not.toContain("other words");
    for (const id of ids) expect(text).not.toContain(id);
  });

  test("today moves the windows: a reading at 31 Oct 2026 sees the loan goal's date as not passed", async () => {
    const lines = await withClient((client) => readWellbeingMeasures(client, "2026-10-31"));
    // Only the current account's goal (1 Sep) has passed; the saver's date is today, not passed.
    expect(lines).toContain("goals_date_passed|1|0|0");
    // The card's goal was set on 1 Nov, after this reading's today.
    expect(lines).toContain("debts_with_goal|1|1|-100.00|1|0|0");
  });
});

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkFreshness, type DrillEntry, parseDrillLog } from "./check-restore-drill";

const LOG = (entries: string) => `# Restore drill log

## Template (copy below this line, fill in, do not edit the template)

\`\`\`text
### YYYY-MM-DD HH:MM UTC - <reason>
Result (pass/fail):
\`\`\`

## Entries

<!-- append new entries below -->
${entries}`;

const entry = (date: string, result: string, reason = "monthly drill") =>
  `\n### ${date} 09:30 UTC - ${reason}\nDump file name: flump-prod-x.dump.age\nResult (pass/fail): ${result}\nNotes: none\n`;

const at = (day: string) => new Date(`${day}T12:00:00Z`);

describe("parseDrillLog", () => {
  test("ignores the template and reads entries with their result", () => {
    const entries = parseDrillLog(
      LOG(entry("2026-11-20", "pass") + entry("2026-12-20", "FAIL", "pre-BE-05")),
    );
    expect(entries).toEqual([
      { date: "2026-11-20", reason: "monthly drill", result: "pass" },
      { date: "2026-12-20", reason: "pre-BE-05", result: "fail" },
    ]);
  });

  test("an entry without a filled result is unknown", () => {
    expect(parseDrillLog(LOG(entry("2026-11-20", "")))[0].result).toBe("unknown");
  });

  test("requires the Entries section", () => {
    expect(() => parseDrillLog("# nothing here")).toThrow("Entries");
  });

  test("the real drill log parses", () => {
    const real = readFileSync(join(import.meta.dir, "../../docs/runbooks/drill-log.md"), "utf8");
    expect(() => parseDrillLog(real)).not.toThrow();
  });
});

describe("checkFreshness", () => {
  const pass = (date: string): DrillEntry => ({ date, reason: "r", result: "pass" });

  test("passes within 90 days of the last passing drill and fails after", () => {
    expect(checkFreshness([pass("2027-01-01")], at("2027-04-01")).ok).toBe(true); // 90 days
    const stale = checkFreshness([pass("2027-01-01")], at("2027-04-02")); // 91 days
    expect(stale.ok).toBe(false);
    expect(stale.message).toContain("91 days ago");
  });

  test("a newer failed drill does not refresh the clock", () => {
    const v = checkFreshness(
      [pass("2027-01-01"), { date: "2027-03-30", reason: "r", result: "fail" }],
      at("2027-04-15"),
    );
    expect(v.ok).toBe(false);
    expect(v.message).toContain("2027-01-01");
  });

  test("uses the newest passing drill whatever the entry order", () => {
    expect(checkFreshness([pass("2027-03-01"), pass("2026-12-01")], at("2027-04-15")).ok).toBe(
      true,
    );
  });

  test("a future-dated entry fails instead of satisfying the law forever", () => {
    const v = checkFreshness([pass("2030-01-01")], at("2027-01-01"));
    expect(v.ok).toBe(false);
    expect(v.message).toContain("after today");
  });

  test("an empty log passes with a warning before the first-drill date and fails on it", () => {
    const early = checkFreshness([], at("2026-12-01"), 90, "2026-12-15");
    expect(early.ok).toBe(true);
    expect(early.message).toContain("WARNING");
    expect(checkFreshness([], at("2026-12-15"), 90, "2026-12-15").ok).toBe(false);
  });
});

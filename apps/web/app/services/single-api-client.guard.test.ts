import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guard: one API base URL, one fetch path.
 *
 * - Only `config.server.ts` may contain "localhost:4000" or read VITE_API_URL.
 * - Requests to the API base go only through `services/backend-client.server.ts` and the future
 *   `services/api-client.ts`.
 *
 * Files that still break a rule are on ALLOW_LIST. It is a ratchet: a file off the list that
 * offends fails, and a listed file that no longer offends (or offends on more lines than recorded)
 * fails, so the list can only shrink as the migration lands.
 */

type RuleId = "localhost-4000" | "vite-api-url-read" | "direct-api-fetch";

interface Rule {
  id: RuleId;
  pattern: RegExp;
  /** Files (relative to apps/web/app, posix) that may legitimately break this rule. */
  exempt: string[];
}

const RULES: Rule[] = [
  { id: "localhost-4000", pattern: /localhost:4000/, exempt: ["config.server.ts"] },
  {
    id: "vite-api-url-read",
    pattern: /(?:process\.env|import\.meta\.env|\.env\??|\bENV\??)\??\.VITE_API_URL/,
    exempt: ["config.server.ts"],
  },
  {
    id: "direct-api-fetch",
    pattern: /\bfetch\(\s*(?:`\$\{)?(?:apiUrl|apiBaseUrl|this\.getBaseUrl\(\)|apiConfig)/,
    exempt: ["services/backend-client.server.ts", "services/api-client.ts"],
  },
];

interface Offence {
  rule: RuleId;
  line: number;
}

/** Returns every line of `source` that breaks a rule, skipping rules `file` is exempt from. */
function scanSource(file: string, source: string): Offence[] {
  const offences: Offence[] = [];
  const lines = source.split("\n");
  for (const rule of RULES) {
    if (rule.exempt.includes(file)) continue;
    lines.forEach((text, index) => {
      if (rule.pattern.test(text)) offences.push({ rule: rule.id, line: index + 1 });
    });
  }
  return offences;
}

interface AllowEntry {
  reason: string;
  /** Maximum number of offending lines per rule. The file must offend each listed rule. */
  rules: Partial<Record<RuleId, number>>;
}

/**
 * Remaining offenders. 3 distinct files carry the 8 base URL fallback lines (14 before the route
 * actions moved to backendFetch). Remove an entry when the file is migrated to backend-client.server.ts or services/api-client.ts.
 */
const ALLOW_LIST: Record<string, AllowEntry> = {
  "hooks/useUserProfile.ts": {
    reason: "Client hook and HttpProfileAdapter read the URL from window.ENV, env and a literal",
    rules: { "localhost-4000": 6, "vite-api-url-read": 12, "direct-api-fetch": 7 },
  },
  "containers/budget/BudgetContainer.tsx": {
    reason: "Client container reads the URL from env, window.ENV and a literal",
    rules: { "localhost-4000": 1, "vite-api-url-read": 2, "direct-api-fetch": 5 },
  },
  "routes/app.onboarding.tsx": {
    reason: "Client-side seeding hand-rolls fetch with the fallback base URL (Task D)",
    rules: { "localhost-4000": 1, "vite-api-url-read": 2, "direct-api-fetch": 2 },
  },
};

const APP_DIR = join(__dirname, "..");
const SKIPPED = /\.(test|spec|stories)\.tsx?$|\.d\.ts$/;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      return name === "node_modules" || name === "__tests__" || name === "__snapshots__"
        ? []
        : walk(full);
    }
    return /\.tsx?$/.test(name) && !SKIPPED.test(name) ? [full] : [];
  });
}

function scanApp(): Map<string, Offence[]> {
  const result = new Map<string, Offence[]>();
  for (const full of walk(APP_DIR)) {
    const file = relative(APP_DIR, full).split("\\").join("/");
    const offences = scanSource(file, readFileSync(full, "utf8"));
    if (offences.length > 0) result.set(file, offences);
  }
  return result;
}

function countByRule(offences: Offence[]): Partial<Record<RuleId, number>> {
  const counts: Partial<Record<RuleId, number>> = {};
  for (const { rule } of offences) counts[rule] = (counts[rule] ?? 0) + 1;
  return counts;
}

/** Builds template placeholders without tripping noTemplateCurlyInString. */
const D = "$";

describe("scanner self-test", () => {
  it("flags a fixture that breaks every rule", () => {
    const fixture = [
      'const apiUrl = process.env.VITE_API_URL || "http://localhost:4000";',
      "const res = await fetch(`" + D + "{apiUrl}/accounts`);",
      "const other = import.meta.env.VITE_API_URL;",
    ].join("\n");
    const rules = new Set(scanSource("routes/fixture.tsx", fixture).map((o) => o.rule));
    expect(rules).toEqual(new Set(["localhost-4000", "vite-api-url-read", "direct-api-fetch"]));
  });

  it("flags the other spellings the code base uses", () => {
    const cases = [
      "(import.meta as any).env?.VITE_API_URL",
      "(window as Window).ENV?.VITE_API_URL",
      "await fetch(`" + D + "{this.getBaseUrl()}/user-profile`, {",
      "fetch(`" + D + "{apiConfig.apiBaseUrl}/x`)",
    ];
    for (const line of cases) {
      expect(scanSource("routes/fixture.tsx", line), line).not.toHaveLength(0);
    }
  });

  it("ignores clean code and unrelated fetches", () => {
    expect(scanSource("routes/ping.tsx", 'await fetch("/ping");')).toEqual([]);
    expect(scanSource("routes/x.tsx", "const { apiBaseUrl } = apiConfig;")).toEqual([]);
  });

  it("honours the exemptions", () => {
    const line = 'const u = process.env.VITE_API_URL ?? "http://localhost:4000";';
    expect(scanSource("config.server.ts", line)).toEqual([]);
    expect(
      scanSource("services/backend-client.server.ts", "fetch(`" + D + "{apiConfig.apiBaseUrl}/x`)"),
    ).toEqual([]);
    expect(scanSource("services/api-client.ts", "fetch(`" + D + "{apiBaseUrl}/x`)")).toEqual([]);
  });

  it("walks real files", () => {
    const files = walk(APP_DIR).map((f) => relative(APP_DIR, f).split("\\").join("/"));
    expect(files).toContain("config.server.ts");
    expect(files).toContain("root.tsx");
    expect(files.some((f) => /\.(test|stories)\./.test(f))).toBe(false);
  });
});

describe("single API client guard", () => {
  const found = scanApp();

  it("allows no offending file outside the allow-list", () => {
    const unexpected = [...found.keys()].filter((file) => !(file in ALLOW_LIST));
    expect(unexpected, "new files break the one-base-URL / one-fetch-path rule").toEqual([]);
  });

  it("requires every allow-listed file to still offend, so the list shrinks", () => {
    const stale = Object.keys(ALLOW_LIST).filter((file) => !found.has(file));
    expect(stale, "remove these files from ALLOW_LIST").toEqual([]);
  });

  it("requires each allow-listed rule to still be broken and never exceed its recorded count", () => {
    const problems: string[] = [];
    for (const [file, entry] of Object.entries(ALLOW_LIST)) {
      const actual = countByRule(found.get(file) ?? []);
      for (const rule of Object.keys(actual) as RuleId[]) {
        if (!(rule in entry.rules)) problems.push(`${file}: new rule ${rule}`);
      }
      for (const [rule, max] of Object.entries(entry.rules) as [RuleId, number][]) {
        const count = actual[rule] ?? 0;
        if (count === 0) problems.push(`${file}: ${rule} no longer offends, remove it`);
        else if (count > max) problems.push(`${file}: ${rule} has ${count} lines, recorded ${max}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it("records 3 files for the 8 base URL fallback lines", () => {
    const files = [...found.entries()].filter(([, o]) =>
      o.some((x) => x.rule === "localhost-4000"),
    );
    expect(files).toHaveLength(3);
    const lines = files.reduce(
      (n, [, o]) => n + o.filter((x) => x.rule === "localhost-4000").length,
      0,
    );
    expect(lines).toBe(8);
  });
});

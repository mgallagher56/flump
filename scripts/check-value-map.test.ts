import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  type Problem,
  parseValueMap,
  type RepoView,
  RULES,
  renderViews,
  staleViews,
  tableRefs,
  type ValueMap,
  validateMap,
} from "./lib/value-map";
import {
  type Baseline,
  checkCoverage,
  compareProblems,
  compareWarnings,
  findingIdsIn,
  lowerBaseline,
  validateBaseline,
} from "./lib/value-map-check";
import {
  blankComments,
  findSecondFormulas,
  findStorageKeys,
  readEntities,
  readRegistry,
} from "./lib/value-map-sources";

const FIXTURES = join(import.meta.dir, "__fixtures__/value-map");
const fixture = (name: string) => readFileSync(join(FIXTURES, name), "utf8");

/** The fixture map's virtual paths, served from the fixture files. */
const FILES: Record<string, string> = {
  "apps/backend/src/entities/account.entity.ts": fixture("account.entity.ts"),
  "apps/web/app/state/storage.ts": fixture("storage.ts"),
  "apps/web/app/routes/dashboard.tsx": fixture("dashboard.tsx"),
  "packages/finance-engine/src/picture/selectors/net-worth.ts": fixture("net-worth.ts"),
};

const entities = readEntities("account.entity.ts", fixture("account.entity.ts"));
const registryText = fixture("user-data-registry.ts");

function repoOf(files: Record<string, string> = FILES): RepoView {
  return {
    exists: (path) => path in files,
    read: (path) => files[path] ?? null,
    tables: new Map(entities.map((e) => [e.table, new Set(e.columns.map((c) => c.column))])),
  };
}

const freshMap = (): ValueMap => parseValueMap(fixture("value-map.yaml"));

/** Every problem the check would report for this map, registry and set of files. */
function problemsOf(
  map: ValueMap,
  options: { registry?: string; files?: Record<string, string> } = {},
): Problem[] {
  const files = options.files ?? FILES;
  const foundKeys = Object.entries(files).flatMap(([file, text]) => findStorageKeys(file, text));
  return [
    ...validateMap(map, repoOf(files)),
    ...checkCoverage({
      map,
      entities,
      registry: readRegistry("user-data-registry.ts", options.registry ?? registryText),
      foundKeys,
    }),
  ];
}
const rulesOf = (problems: Problem[]) => problems.map((p) => p.rule);

describe("one home per value: the repo", () => {
  test("passes on today's tree", () => {
    const run = spawnSync("bun", [resolve(import.meta.dir, "check-value-map.ts")], {
      encoding: "utf8",
    });
    expect(run.stderr.split("\n").filter((l) => /^(FAIL|STALE)/.test(l))).toEqual([]);
    expect(run.status).toBe(0);
    expect(run.stdout).toContain("check-value-map: OK");
  });
});

describe("one home per value: the fixture map", () => {
  test("passes every rule", () => {
    expect(problemsOf(freshMap())).toEqual([]);
  });

  test("reads the fixture entity and registry", () => {
    expect(entities).toEqual([
      {
        className: "Account",
        table: "accounts",
        columns: [
          { property: "id", column: "id" },
          { property: "userId", column: "user_id" },
          { property: "name", column: "name" },
          { property: "balance", column: "balance" },
          { property: "createdAt", column: "created_at" },
        ],
      },
    ]);
    const [entry] = readRegistry("user-data-registry.ts", registryText);
    expect(entry.entity).toBe("Account");
    expect([...entry.facts]).toEqual([
      ["name", "account-name"],
      ["balance", "account-balance"],
    ]);
    // The spread of KEYS is followed.
    expect([...entry.notFacts].sort()).toEqual(["createdAt", "id", "userId"]);
  });
});

describe("malformed", () => {
  test("an unknown verdict fails, and says which verdicts exist", () => {
    const map = freshMap();
    (map.facts[0] as { verdict: string }).verdict = "fine";
    const problems = problemsOf(map);
    expect(rulesOf(problems)).toEqual([RULES.malformed]);
    expect(problems[0].message).toContain("Use one of: holds, manual");
  });

  test("an unknown store status fails", () => {
    const map = freshMap();
    map.facts[0].other_stores = [{ ...(map.facts[0].other_stores?.[0] as never), status: "copy" }];
    expect(rulesOf(problemsOf(map))).toEqual([RULES.malformed]);
  });

  test("a duplicate id fails, across facts and figures", () => {
    const map = freshMap();
    map.figures[0].id = "account-balance";
    const problems = problemsOf(map);
    expect(rulesOf(problems)).toEqual([RULES.malformed]);
    expect(problems[0].message).toContain('duplicate id "account-balance"');
  });

  test("a browser key that holds user data must name its fact", () => {
    const map = freshMap();
    delete map.browser_storage[0].fact;
    expect(problemsOf(map).map((p) => p.message)).toEqual([
      "browser key flump_fixture_baseline: holds user data but names no fact. Add fact: with the id of the fact it copies",
    ]);
  });

  test("a column both tied to a fact and marked as no fact fails", () => {
    const registry = registryText.replace(
      "createdAt: WRITTEN_AT",
      'createdAt: WRITTEN_AT, name: "x"',
    );
    expect(rulesOf(problemsOf(freshMap(), { registry }))).toEqual([RULES.malformed]);
  });
});

describe("no-source-of-truth", () => {
  test("a fact with no source of truth fails", () => {
    const map = freshMap();
    (map.facts[1] as { source_of_truth?: unknown }).source_of_truth = undefined;
    const problems = problemsOf(map);
    expect(rulesOf(problems)).toEqual([RULES.noSourceOfTruth]);
    expect(problems[0].subject).toBe("account-name");
  });

  test("a fact that is not stored anywhere fails", () => {
    const map = freshMap();
    map.facts[1].source_of_truth = {
      ref: "not stored: inferred from the name",
      path: "apps/backend/src/entities/account.entity.ts",
    };
    expect(rulesOf(problemsOf(map))).toEqual([RULES.noSourceOfTruth]);
  });
});

describe("figure-outside-engine", () => {
  test("a figure computed outside packages/finance-engine fails", () => {
    const map = freshMap();
    map.figures[0].computed_by = {
      function: "Dashboard",
      path: "apps/web/app/routes/dashboard.tsx",
    };
    const problems = problemsOf(map);
    expect(rulesOf(problems)).toEqual([RULES.figureOutsideEngine]);
    expect(problems[0].message).toContain("Move the arithmetic into an engine function");
  });

  test("a figure described in words rather than named by one function fails", () => {
    const map = freshMap();
    map.figures[0].computed_by.function = "balances summed on the page";
    expect(rulesOf(problemsOf(map))).toEqual([RULES.figureOutsideEngine]);
  });
});

describe("dead-path, dead-symbol and dead-column", () => {
  test("a path to a file that no longer exists fails", () => {
    const map = freshMap();
    map.facts[0].readers = [{ surface: "dashboard", path: "apps/web/app/routes/gone.tsx:12" }];
    const problems = problemsOf(map);
    expect(rulesOf(problems)).toEqual([RULES.deadPath]);
    expect(problems[0].message).toContain("no such file apps/web/app/routes/gone.tsx:12");
  });

  test("a function that is no longer in its file fails", () => {
    const map = freshMap();
    map.figures[0].computed_by.function = "selectNetWorthToday";
    expect(rulesOf(problemsOf(map))).toEqual([RULES.deadSymbol]);
  });

  test("a column that no longer exists fails, in a list of columns too", () => {
    const map = freshMap();
    map.facts[1].source_of_truth.ref = "accounts.name, nickname";
    const problems = problemsOf(map);
    expect(rulesOf(problems)).toEqual([RULES.deadColumn]);
    expect(problems[0].subject).toBe("fact account-name source of truth -> accounts.nickname");
  });

  test("a table that no longer exists fails", () => {
    const map = freshMap();
    map.facts[1].source_of_truth.ref = "account_rows.name";
    expect(rulesOf(problemsOf(map))).toEqual([RULES.deadColumn]);
  });

  test("a registry valueMap that names a column the entity does not have fails", () => {
    const registry = registryText.replace(
      'balance: "account-balance" }',
      'balance: "account-balance", nickname: "account-name" }',
    );
    expect(rulesOf(problemsOf(freshMap(), { registry }))).toEqual([RULES.deadColumn]);
  });

  test("free-text refs name no table", () => {
    const tables = repoOf().tables;
    expect(tableRefs("engine default 45,000", tables)).toEqual([]);
    expect(tableRefs("localStorage flump_x", tables)).toEqual([]);
    expect(tableRefs("accounts row of type Property", tables)).toEqual([{ table: "accounts" }]);
    expect(tableRefs("user_profiles.a, b and their has_ flags", tables)).toEqual([
      { table: "user_profiles", column: "a" },
      { table: "user_profiles", column: "b" },
    ]);
  });
});

describe("unmapped-column", () => {
  test("a column with no place in the value map fails, and says where to add it", () => {
    const registry = registryText.replace(", createdAt: WRITTEN_AT", "");
    const problems = problemsOf(freshMap(), { registry });
    expect(rulesOf(problems)).toEqual([RULES.unmappedColumn]);
    expect(problems[0].subject).toBe("accounts.created_at");
    expect(problems[0].message).toContain("add it to valueMap.facts");
  });

  test("a table with no valueMap at all fails", () => {
    const registry = registryText.replace(/valueMap: \{[\s\S]*?\n {4}\},\n/, "");
    expect(problemsOf(freshMap(), { registry }).map((p) => p.subject)).toEqual(["accounts"]);
  });

  test("a column tied to a fact the map does not have fails", () => {
    const registry = registryText.replace('"account-name"', '"account-label"');
    const problems = problemsOf(freshMap(), { registry });
    expect(rulesOf(problems)).toEqual([RULES.unmappedColumn]);
    expect(problems[0].message).toContain('fact "account-label"');
  });

  test("a table marked as holding no user facts passes with a reason, fails without one", () => {
    const ok = registryText.replace(
      /valueMap: \{[\s\S]*?\n {4}\}/,
      'valueMap: { noUserFacts: "agent tokens, no money" }',
    );
    expect(problemsOf(freshMap(), { registry: ok })).toEqual([]);
    const bad = registryText.replace(
      /valueMap: \{[\s\S]*?\n {4}\}/,
      'valueMap: { noUserFacts: "x" }',
    );
    expect(rulesOf(problemsOf(freshMap(), { registry: bad }))).toEqual([RULES.malformed]);
  });
});

describe("browser storage keys", () => {
  test("a key in the code that the map does not list fails, with its file and line", () => {
    const files = {
      ...FILES,
      "apps/web/app/state/more.ts": 'localStorage.setItem("flump_new_key", "1");\n',
    };
    const problems = problemsOf(freshMap(), { files });
    expect(rulesOf(problems)).toEqual([RULES.unmappedStorageKey]);
    expect(problems[0].message).toContain("apps/web/app/state/more.ts:1");
  });

  test("a listed key that no code writes any more fails", () => {
    const map = freshMap();
    map.browser_storage.push({
      key: "flump_old_key",
      storage: "localStorage",
      user_data: false,
      path: "apps/web/app/state/storage.ts",
      note: "gone",
    });
    expect(rulesOf(problemsOf(map))).toEqual([RULES.deadStorageKey]);
  });

  test("keys in comments, and files that touch no storage, are ignored", () => {
    expect(findStorageKeys("a.ts", fixture("storage.ts")).map((k) => k.key)).toEqual([
      "flump_fixture_baseline",
      "flump.fixture-seen.",
    ]);
    expect(findStorageKeys("b.ts", 'export const FILE = "flump-export.json";')).toEqual([]);
  });
});

describe("stale-views", () => {
  const map = freshMap();
  const views = renderViews(map);
  const same = (_name: string, text: string) => text;

  test("views that match a fresh render pass", () => {
    expect(staleViews(map, (name) => views[name] ?? null, same)).toEqual([]);
  });

  test("a view edited by hand, or a map changed without regenerating, fails", () => {
    expect(staleViews(map, (name) => (name === "links.md" ? "edited" : views[name]), same)).toEqual(
      ["links.md"],
    );
    const changed = freshMap();
    changed.facts[1].name = "Account nickname";
    expect(staleViews(changed, (name) => views[name] ?? null, same)).toContain("by-fact.md");
  });
});

describe("baseline", () => {
  const known: Problem = { rule: RULES.noSourceOfTruth, subject: "property-kind", message: "m" };
  const baseline: Baseline = {
    problems: { "no-source-of-truth:property-kind": { findings: ["HM-3"] } },
    secondFormulas: { "apps/web/x.ts": { counts: { "share-arithmetic": 2 }, findings: ["JO-2"] } },
  };

  test("a known problem passes, a new one fails, a fixed one is stale", () => {
    const fresh: Problem = { rule: RULES.deadPath, subject: "p", message: "m" };
    expect(compareProblems([known, fresh], baseline)).toEqual({
      failures: [fresh],
      known: [known],
      stale: [],
    });
    expect(compareProblems([], baseline).stale).toEqual(["no-source-of-truth:property-kind"]);
  });

  test("every entry needs a finding id that exists in FINDINGS.md", () => {
    const ids = findingIdsIn("### HM-3 A title\n### JO-2 Another\n");
    expect(validateBaseline(baseline, ids)).toEqual([]);
    const bad: Baseline = {
      problems: { "x:y": { findings: [] }, "x:z": { findings: ["ZZ-9"] } },
      secondFormulas: {},
    };
    expect(validateBaseline(bad, ids)).toHaveLength(2);
  });

  test("--write-baseline only removes and lowers, never adds or raises", () => {
    const hits = [
      { file: "apps/web/x.ts", line: 1, rule: "share-arithmetic" as const, text: "" },
      { file: "apps/web/new.ts", line: 1, rule: "share-arithmetic" as const, text: "" },
    ];
    const fresh: Problem = { rule: RULES.deadPath, subject: "p", message: "m" };
    expect(lowerBaseline(baseline, [known, fresh], hits)).toEqual({
      problems: { "no-source-of-truth:property-kind": { findings: ["HM-3"] } },
      secondFormulas: {
        "apps/web/x.ts": { counts: { "share-arithmetic": 1 }, findings: ["JO-2"] },
      },
    });
    const more = [...hits, { ...hits[0], line: 2 }, { ...hits[0], line: 3 }];
    expect(lowerBaseline(baseline, [], more)).toEqual({
      problems: {},
      secondFormulas: {
        "apps/web/x.ts": { counts: { "share-arithmetic": 2 }, findings: ["JO-2"] },
      },
    });
  });
});

describe("second formulas (warning only)", () => {
  const rulesIn = (source: string, file = "apps/web/app/page.tsx") =>
    findSecondFormulas(file, source).map((h) => h.rule);

  test("summing saved balances is flagged; summing what-if inputs that are not saved fields is not", () => {
    expect(rulesIn("const t = accounts.reduce((sum, a) => sum + a.balance, 0);")).toEqual([
      "sum-of-saved-amounts",
    ]);
    expect(rulesIn("let t = 0; for (const d of debts) t += d.minimumPaymentGbp;")).toEqual([
      "sum-of-saved-amounts",
    ]);
    expect(rulesIn("const t = cuts.reduce((sum, c) => sum + c.extra, 0);")).toEqual([]);
  });

  test("applying a share by hand is flagged; calling the engine is not", () => {
    expect(rulesIn("const mine = account.balance * (account.sharePercent / 100);")).toEqual([
      "share-arithmetic",
    ]);
    expect(rulesIn("const mine = applyAccountShare(account.balance, account);")).toEqual([]);
  });

  test("converting a saved amount between monthly and yearly is flagged; a term in years is not", () => {
    expect(rulesIn("const yearly = monthlyRent * 12;")).toEqual(["monthly-yearly"]);
    expect(rulesIn("const months = termYears * 12;")).toEqual([]);
  });

  test("patterns in comments are not flagged, and lines stay true", () => {
    const source = "// total += a.balance\n/* a.sharePercent / 100 */\nconst x = salary / 12;\n";
    expect(findSecondFormulas("a.ts", source)).toEqual([
      { file: "a.ts", line: 3, rule: "monthly-yearly", text: "salary / 12" },
    ]);
    expect(
      blankComments("a.tsx", "const s = \"it's // here\"; // gone\n<p>Don't</p>; /* x */"),
    ).toBe("const s = \"it's // here\";        \n<p>Don't</p>;        ");
  });

  test("a new warning says what to do; a known one is summarised; more than known is reported", () => {
    const map = parseValueMap(fixture("value-map.yaml"));
    const hit = { file: "apps/web/x.ts", line: 4, rule: "share-arithmetic" as const, text: "" };
    const empty: Baseline = { problems: {}, secondFormulas: {} };
    const fresh = compareWarnings([hit], empty, map).fresh;
    expect(fresh).toHaveLength(1);
    expect(fresh[0].message).toContain("net-worth: selectNetWorth");
    expect(fresh[0].message).toContain("this rule only warns");

    const baseline: Baseline = {
      problems: {},
      secondFormulas: {
        "apps/web/x.ts": { counts: { "share-arithmetic": 1 }, findings: ["JO-2"] },
      },
    };
    expect(compareWarnings([hit], baseline, map).known).toHaveLength(1);
    const over = compareWarnings([hit, { ...hit, line: 9 }], baseline, map);
    expect(over.overBaseline[0]).toContain("2 matches, more than the 1 known (JO-2) at lines 4, 9");
    expect(compareWarnings([], baseline, map).improved).toEqual([
      "apps/web/x.ts [share-arithmetic] 0 matches, baseline 1",
    ]);
  });
});

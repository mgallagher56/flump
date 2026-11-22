import { describe, expect, test } from "bun:test";
import {
  discoverMarketingRoutes,
  FM_RULES,
  type FmIndex,
  type FmPageEntry,
  type FmRepoView,
  parseFmIndex,
  parseFmPage,
  parseValueMapRefs,
  renderFunctionalityViews,
  staleFunctionalityViews,
  type ValueMapRefs,
  validateFunctionalityMap,
} from "./functionality-map";

const VALID_INDEX_YAML = `
version: 1
excluded_routes:
  - route_file: apps/web/app/routes/healthz.ts
    reason: Health check endpoint.
`;

const VALID_PAGE_YAML = `
id: retirement
app: web
route: /app/retirement
title: Retirement plan
auth: required
purpose: See an estimate of yearly retirement income.
route_file: apps/web/app/routes/app.retirement.tsx
sections:
  - id: hero
    component: apps/web/app/features/retirement/RetirementPlanner.tsx
    facts_read: [retirement-plan]
    figures_shown: [retirement-income]
  - id: plan-details
    component: apps/web/app/features/retirement/RetirementPlanner.tsx
`;

const VALID_VALUE_MAP_YAML = `
facts:
  - id: retirement-plan
figures:
  - id: retirement-income
`;

const DEFAULT_FILES = new Set([
  "apps/web/app/routes/healthz.ts",
  "apps/web/app/routes/app._index.tsx",
  "apps/web/app/routes/app.retirement.tsx",
  "apps/web/app/features/retirement/RetirementPlanner.tsx",
]);

function makeRepo(
  files: Set<string> = DEFAULT_FILES,
  fileContents: Record<string, string> = {},
): FmRepoView {
  return {
    exists: (path) => files.has(path),
    read: (path) => fileContents[path] ?? null,
  };
}

function makePageEntry(yaml: string, overrides: Partial<FmPageEntry> = {}): FmPageEntry {
  return {
    filePath: "docs/system/functionality-map/pages/web/retirement.yaml",
    expectedApp: "web",
    expectedId: "retirement",
    page: parseFmPage(yaml),
    ...overrides,
  };
}

describe("functionality-map", () => {
  const valueMap: ValueMapRefs = parseValueMapRefs(VALID_VALUE_MAP_YAML);
  const retirementRoute = ["apps/web/app/routes/app.retirement.tsx"];

  test("validates a clean index and page with zero problems", () => {
    const problems = validateFunctionalityMap({
      index: parseFmIndex(VALID_INDEX_YAML),
      pages: [makePageEntry(VALID_PAGE_YAML)],
      repo: makeRepo(),
      valueMap,
      discoveredRoutes: ["apps/web/app/routes/healthz.ts", ...retirementRoute],
    });
    expect(problems).toEqual([]);
  });

  test("rejects duplicate page and section IDs", () => {
    const index: FmIndex = { version: 1, excluded_routes: [] };
    const dupPageYaml = `
id: retirement
app: web
route: /app/retirement
title: Retirement
auth: required
purpose: Test duplicates.
route_file: apps/web/app/routes/app.retirement.tsx
sections:
  - id: hero
    component: apps/web/app/features/retirement/RetirementPlanner.tsx
  - id: hero
    component: apps/web/app/features/retirement/RetirementPlanner.tsx
`;
    const entry = makePageEntry(dupPageYaml);
    const problems = validateFunctionalityMap({
      index,
      pages: [entry, entry],
      repo: makeRepo(),
      valueMap,
      discoveredRoutes: retirementRoute,
    });
    const dupes = problems.filter((p) => p.rule === FM_RULES.duplicateId);
    expect(dupes.map((d) => d.subject)).toEqual([
      "web/retirement.hero",
      "web:retirement",
      "web/retirement.hero",
    ]);
  });

  test("rejects invalid IDs, filename mismatches, and app mismatches", () => {
    const badYaml = VALID_PAGE_YAML.replace("id: retirement", "id: Not_Kebab").replace(
      "app: web",
      "app: marketing",
    );
    const problems = validateFunctionalityMap({
      index: { version: 1, excluded_routes: [] },
      pages: [makePageEntry(badYaml)],
      repo: makeRepo(),
      valueMap,
      discoveredRoutes: retirementRoute,
    });
    expect(
      problems.some((p) => p.rule === FM_RULES.malformed && p.message.includes("kebab-case")),
    ).toBe(true);
    expect(
      problems.some(
        (p) => p.rule === FM_RULES.malformed && p.message.includes('does not match folder "web"'),
      ),
    ).toBe(true);
  });

  test("rejects missing required page fields and an invalid auth mode", () => {
    const yaml = VALID_PAGE_YAML.replace("title: Retirement plan\n", "")
      .replace("auth: required", "auth: everyone")
      .replace("purpose: See an estimate of yearly retirement income.\n", "");
    const messages = validateFunctionalityMap({
      index: { version: 1, excluded_routes: [] },
      pages: [makePageEntry(yaml)],
      repo: makeRepo(),
      valueMap,
      discoveredRoutes: retirementRoute,
    })
      .filter((p) => p.rule === FM_RULES.malformed)
      .map((p) => p.message.replace(/^page \S+: /, ""));
    expect(messages).toEqual([
      "title is required",
      "auth must be one of required, public, anonymous-only, admin",
      "purpose is required",
    ]);
  });

  test("rejects retired per-control keys on pages and sections as malformed", () => {
    const yaml = VALID_PAGE_YAML.replace(
      "route_file:",
      "entry_points: [Main nav]\nroute_file:",
    ).replace(
      "  - id: plan-details\n",
      "  - id: plan-details\n    capabilities: []\n    when: always\n",
    );
    const malformed = validateFunctionalityMap({
      index: { version: 1, excluded_routes: [] },
      pages: [makePageEntry(yaml)],
      repo: makeRepo(),
      valueMap,
      discoveredRoutes: retirementRoute,
    }).filter((p) => p.rule === FM_RULES.malformed);
    expect(malformed.map((m) => m.subject)).toEqual([
      "page docs/system/functionality-map/pages/web/retirement.yaml",
      "web/retirement.plan-details",
    ]);
    expect(malformed[0]?.message).toContain("unknown key(s) entry_points");
    expect(malformed[1]?.message).toContain("unknown key(s) capabilities, when");
  });

  test("detects missing file paths for route_file and component", () => {
    const files = new Set(["apps/web/app/routes/app.retirement.tsx"]);
    const problems = validateFunctionalityMap({
      index: { version: 1, excluded_routes: [] },
      pages: [makePageEntry(VALID_PAGE_YAML)],
      repo: makeRepo(files),
      valueMap,
      discoveredRoutes: retirementRoute,
    });
    const dead = problems.filter((p) => p.rule === FM_RULES.deadPath);
    expect(dead.map((d) => d.subject)).toEqual([
      "web/retirement.hero.component -> apps/web/app/features/retirement/RetirementPlanner.tsx",
      "web/retirement.plan-details.component -> apps/web/app/features/retirement/RetirementPlanner.tsx",
    ]);

    const noRouteFile = validateFunctionalityMap({
      index: { version: 1, excluded_routes: [] },
      pages: [makePageEntry(VALID_PAGE_YAML)],
      repo: makeRepo(new Set(["apps/web/app/features/retirement/RetirementPlanner.tsx"])),
      valueMap,
      discoveredRoutes: [],
    }).filter((p) => p.rule === FM_RULES.deadPath);
    expect(noRouteFile.map((d) => d.subject)).toEqual([
      "page docs/system/functionality-map/pages/web/retirement.yaml.route_file -> apps/web/app/routes/app.retirement.tsx",
    ]);
  });

  test("detects unknown value-map fact and figure IDs on sections", () => {
    const unknownRefYaml = VALID_PAGE_YAML.replace("[retirement-plan]", "[no-such-fact]").replace(
      "[retirement-income]",
      "[no-such-figure]",
    );
    const problems = validateFunctionalityMap({
      index: { version: 1, excluded_routes: [] },
      pages: [makePageEntry(unknownRefYaml)],
      repo: makeRepo(),
      valueMap,
      discoveredRoutes: retirementRoute,
    });
    const refs = problems.filter((p) => p.rule === FM_RULES.unknownValueRef);
    expect(refs.map((r) => r.subject)).toEqual([
      "web/retirement.hero:facts_read:no-such-fact",
      "web/retirement.hero:figures_shown:no-such-figure",
    ]);
  });

  test("a fact ID is not accepted as a figure ID, nor a figure ID as a fact ID", () => {
    const swappedYaml = VALID_PAGE_YAML.replace(
      "facts_read: [retirement-plan]",
      "facts_read: [retirement-income]",
    ).replace("figures_shown: [retirement-income]", "figures_shown: [retirement-plan]");
    const refs = validateFunctionalityMap({
      index: { version: 1, excluded_routes: [] },
      pages: [makePageEntry(swappedYaml)],
      repo: makeRepo(),
      valueMap,
      discoveredRoutes: retirementRoute,
    }).filter((p) => p.rule === FM_RULES.unknownValueRef);
    expect(refs.map((r) => r.subject)).toEqual([
      "web/retirement.hero:facts_read:retirement-income",
      "web/retirement.hero:figures_shown:retirement-plan",
    ]);
  });

  test("rejects non-array facts_read and figures_shown as malformed", () => {
    const nonArrayYaml = VALID_PAGE_YAML.replace(
      "facts_read: [retirement-plan]",
      "facts_read: retirement-plan",
    ).replace("figures_shown: [retirement-income]", "figures_shown: retirement-income");
    const problems = validateFunctionalityMap({
      index: { version: 1, excluded_routes: [] },
      pages: [makePageEntry(nonArrayYaml)],
      repo: makeRepo(),
      valueMap,
      discoveredRoutes: retirementRoute,
    });
    const malformed = problems.filter((p) => p.rule === FM_RULES.malformed);
    expect(malformed.map((m) => m.subject)).toEqual([
      "web/retirement.hero.facts_read",
      "web/retirement.hero.figures_shown",
    ]);
  });

  test("errors on any unmapped route and rejects retired unmapped_allowlist", () => {
    const discovered = [...retirementRoute, "apps/web/app/routes/app.new-page.tsx"];
    const unmapped = validateFunctionalityMap({
      index: { version: 1, excluded_routes: [] },
      pages: [makePageEntry(VALID_PAGE_YAML)],
      repo: makeRepo(),
      valueMap,
      discoveredRoutes: discovered,
    });
    expect(unmapped).toHaveLength(1);
    expect(unmapped[0]?.rule).toBe(FM_RULES.unmappedRoute);
    expect(unmapped[0]?.subject).toBe("apps/web/app/routes/app.new-page.tsx");
    expect(unmapped[0]?.severity).toBe("error");

    const withRetiredAllowlist = validateFunctionalityMap({
      index: {
        version: 1,
        excluded_routes: [],
        unmapped_allowlist: ["apps/web/app/routes/app.new-page.tsx"],
      },
      pages: [makePageEntry(VALID_PAGE_YAML)],
      repo: makeRepo(),
      valueMap,
      discoveredRoutes: discovered,
    });
    expect(
      withRetiredAllowlist.some(
        (p) =>
          p.rule === FM_RULES.deadAllowlist &&
          p.subject === "index.unmapped_allowlist" &&
          p.severity === "error",
      ),
    ).toBe(true);
    expect(
      withRetiredAllowlist.some((p) => p.rule === FM_RULES.unmappedRoute && p.severity === "error"),
    ).toBe(true);
  });

  test("rejects an index version other than 1", () => {
    const problems = validateFunctionalityMap({
      index: { version: 2, excluded_routes: [] },
      pages: [],
      repo: makeRepo(),
      valueMap,
      discoveredRoutes: [],
    });
    expect(problems.map((p) => [p.rule, p.subject])).toEqual([
      [FM_RULES.malformed, "index.version"],
    ]);
  });

  test("rejects a duplicate excluded route_file", () => {
    const route = "apps/web/app/routes/healthz.ts";
    const problems = validateFunctionalityMap({
      index: {
        version: 1,
        excluded_routes: [
          { route_file: route, reason: "Health check." },
          { route_file: route, reason: "Health check again." },
        ],
      },
      pages: [],
      repo: makeRepo(),
      valueMap,
      discoveredRoutes: [route],
    });
    expect(problems.map((p) => [p.rule, p.subject])).toEqual([[FM_RULES.duplicateId, route]]);
  });

  test("an excluded route counts as covered", () => {
    const problems = validateFunctionalityMap({
      index: parseFmIndex(VALID_INDEX_YAML),
      pages: [],
      repo: makeRepo(),
      valueMap,
      discoveredRoutes: ["apps/web/app/routes/healthz.ts"],
    });
    expect(problems).toEqual([]);
  });

  test("renders overview and by-fact views and detects stale views", () => {
    const index = parseFmIndex(VALID_INDEX_YAML);
    const page = parseFmPage(VALID_PAGE_YAML);
    const views = renderFunctionalityViews([page], index);

    expect(Object.keys(views).sort()).toEqual(["by-fact.md", "overview.md"]);
    expect(views["overview.md"]).toContain("Mapped pages: 1 | Sections: 2 | Excluded routes: 1");
    expect(views["overview.md"]).toContain("### retirement: Retirement plan");
    expect(views["overview.md"]).toContain(
      "| `hero` | `apps/web/app/features/retirement/RetirementPlanner.tsx` | `retirement-plan` | `retirement-income` |",
    );
    expect(views["by-fact.md"]).toContain(
      "| `retirement-plan` | `web.retirement.hero` | web/retirement | `/app/retirement` |",
    );
    expect(views["by-fact.md"]).toContain(
      "| `retirement-income` | `web.retirement.hero` | web/retirement | `/app/retirement` |",
    );

    const identity = (_name: string, text: string) => text;
    expect(staleFunctionalityViews([page], index, (name) => views[name] ?? null, identity)).toEqual(
      [],
    );
    expect(
      staleFunctionalityViews(
        [page],
        index,
        (name) => (name === "by-fact.md" ? "outdated" : (views[name] ?? null)),
        identity,
      ),
    ).toEqual(["by-fact.md"]);
    expect(staleFunctionalityViews([page], index, () => null, identity)).toEqual([
      "overview.md",
      "by-fact.md",
    ]);
  });

  test("discovers marketing routes from App.tsx", () => {
    const appTsx = `
import { SecurityPage } from "./pages/SecurityPage";
import { HomePage } from "./pages/HomePage";
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/security" element={<SecurityPage />} />
    </Routes>
  );
}
`;
    const files = new Set([
      "apps/marketing/src/pages/SecurityPage/SecurityPage.tsx",
      "apps/marketing/src/pages/HomePage/HomePage.tsx",
    ]);
    const routes = discoverMarketingRoutes(
      makeRepo(files, { "apps/marketing/src/App.tsx": appTsx }),
    );
    expect(routes).toEqual([
      "apps/marketing/src/pages/HomePage/HomePage.tsx",
      "apps/marketing/src/pages/SecurityPage/SecurityPage.tsx",
    ]);
  });
});

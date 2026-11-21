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
unmapped_allowlist:
  - apps/web/app/routes/app._index.tsx
`;

const VALID_PAGE_YAML = `
id: retirement
app: web
route: /app/retirement
title: Retirement plan
auth: required
purpose: See an estimate of yearly retirement income.
entry_points:
  - Main nav
route_file: apps/web/app/routes/app.retirement.tsx
sections:
  - id: hero
    name: Headline estimate
    kind: hero
    component: apps/web/app/features/retirement/RetirementPlanner.tsx
    capabilities:
      - id: view-income
        goal: View estimated yearly income.
        mode: read
        facts_read: [retirement-plan]
        figures_shown: [retirement-income]
        actions:
          - id: add-birth-year
            control: link
            label: Add your year of birth
            effect: Navigates to profile.
            target: /app/profile
  - id: plan-details
    name: Plan details
    kind: form
    component: apps/web/app/features/retirement/RetirementPlanner.tsx
    capabilities:
      - id: save-plan
        goal: Save retirement plan.
        mode: write
        facts_written: [retirement-plan]
        actions:
          - id: save-btn
            control: submit
            label: Save plan
            effect: Saves plan.
            target: PUT /retirement-plan
            if_match: true
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

  test("validates a clean index and page with zero problems", () => {
    const index = parseFmIndex(VALID_INDEX_YAML);
    const pages = [makePageEntry(VALID_PAGE_YAML)];
    const problems = validateFunctionalityMap({
      index,
      pages,
      repo: makeRepo(),
      valueMap,
      discoveredRoutes: [
        "apps/web/app/routes/healthz.ts",
        "apps/web/app/routes/app._index.tsx",
        "apps/web/app/routes/app.retirement.tsx",
      ],
    });
    expect(problems).toEqual([]);
  });

  test("rejects duplicate page, section, capability, and action IDs", () => {
    const index: FmIndex = { version: 1, excluded_routes: [] };
    const dupPageYaml = `
id: retirement
app: web
route: /app/retirement
title: Retirement
auth: required
purpose: Test duplicates.
entry_points: [Nav]
route_file: apps/web/app/routes/app.retirement.tsx
sections:
  - id: hero
    name: Hero 1
    kind: hero
    component: apps/web/app/features/retirement/RetirementPlanner.tsx
    capabilities:
      - id: cap-one
        goal: Goal 1
        mode: read
        actions:
          - id: act-one
            control: button
            label: One
            effect: Effect one
          - id: act-one
            control: button
            label: Two
            effect: Effect two
      - id: cap-one
        goal: Goal 2
        mode: read
        actions: []
  - id: hero
    name: Hero 2
    kind: hero
    component: apps/web/app/features/retirement/RetirementPlanner.tsx
    capabilities: []
`;
    const entry = makePageEntry(dupPageYaml);
    const problems = validateFunctionalityMap({
      index,
      pages: [entry, entry],
      repo: makeRepo(),
      valueMap,
      discoveredRoutes: ["apps/web/app/routes/app.retirement.tsx"],
    });
    const dupes = problems.filter((p) => p.rule === FM_RULES.duplicateId);
    expect(dupes.map((d) => d.subject)).toEqual([
      "web/retirement.hero.cap-one.act-one",
      "web/retirement.hero.cap-one",
      "web/retirement.hero",
      "web:retirement",
      "web/retirement.hero.cap-one.act-one",
      "web/retirement.hero.cap-one",
      "web/retirement.hero",
    ]);
  });

  test("rejects invalid IDs, filename mismatches, and app mismatches", () => {
    const badYaml = VALID_PAGE_YAML.replace("id: retirement", "id: Not_Kebab").replace(
      "app: web",
      "app: marketing",
    );
    const entry = makePageEntry(badYaml);
    const problems = validateFunctionalityMap({
      index: { version: 1, excluded_routes: [] },
      pages: [entry],
      repo: makeRepo(),
      valueMap,
      discoveredRoutes: ["apps/web/app/routes/app.retirement.tsx"],
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

  test("detects missing file paths for route_file and component", () => {
    const files = new Set(["apps/web/app/routes/app.retirement.tsx"]);
    const problems = validateFunctionalityMap({
      index: { version: 1, excluded_routes: [] },
      pages: [makePageEntry(VALID_PAGE_YAML)],
      repo: makeRepo(files),
      valueMap,
      discoveredRoutes: ["apps/web/app/routes/app.retirement.tsx"],
    });
    const dead = problems.filter((p) => p.rule === FM_RULES.deadPath);
    expect(dead.length).toBe(2);
    expect(dead[0]?.subject).toContain("RetirementPlanner.tsx");
  });

  test("detects unknown value-map fact and figure IDs", () => {
    const unknownRefYaml = VALID_PAGE_YAML.replace("retirement-plan", "no-such-fact").replace(
      "retirement-income",
      "no-such-figure",
    );
    const problems = validateFunctionalityMap({
      index: { version: 1, excluded_routes: [] },
      pages: [makePageEntry(unknownRefYaml)],
      repo: makeRepo(),
      valueMap,
      discoveredRoutes: ["apps/web/app/routes/app.retirement.tsx"],
    });
    const refs = problems.filter((p) => p.rule === FM_RULES.unknownValueRef);
    expect(refs.map((r) => r.subject)).toEqual([
      "web/retirement.hero.view-income:facts_read:no-such-fact",
      "web/retirement.hero.view-income:figures_shown:no-such-figure",
    ]);
  });

  test("warns on unmapped routes when unmapped_allowlist exists, errors when removed", () => {
    const discovered = [
      "apps/web/app/routes/app.retirement.tsx",
      "apps/web/app/routes/app.new-page.tsx",
    ];
    const withAllowlist = validateFunctionalityMap({
      index: { version: 1, excluded_routes: [], unmapped_allowlist: [] },
      pages: [makePageEntry(VALID_PAGE_YAML)],
      repo: makeRepo(),
      valueMap,
      discoveredRoutes: discovered,
    });
    expect(withAllowlist).toHaveLength(1);
    expect(withAllowlist[0]?.rule).toBe(FM_RULES.unmappedRoute);
    expect(withAllowlist[0]?.severity).toBe("warn");

    const withoutAllowlist = validateFunctionalityMap({
      index: { version: 1, excluded_routes: [] },
      pages: [makePageEntry(VALID_PAGE_YAML)],
      repo: makeRepo(),
      valueMap,
      discoveredRoutes: discovered,
    });
    expect(withoutAllowlist).toHaveLength(1);
    expect(withoutAllowlist[0]?.rule).toBe(FM_RULES.unmappedRoute);
    expect(withoutAllowlist[0]?.severity).toBe("error");
  });

  test("fails when unmapped_allowlist contains an already-mapped route", () => {
    const problems = validateFunctionalityMap({
      index: {
        version: 1,
        excluded_routes: [],
        unmapped_allowlist: ["apps/web/app/routes/app.retirement.tsx"],
      },
      pages: [makePageEntry(VALID_PAGE_YAML)],
      repo: makeRepo(),
      valueMap,
      discoveredRoutes: ["apps/web/app/routes/app.retirement.tsx"],
    });
    expect(problems).toHaveLength(1);
    expect(problems[0]?.rule).toBe(FM_RULES.deadAllowlist);
    expect(problems[0]?.severity).toBe("error");
  });

  test("renders overview, actions-index, and by-fact views and detects stale views", () => {
    const index = parseFmIndex(VALID_INDEX_YAML);
    const page = parseFmPage(VALID_PAGE_YAML);
    const views = renderFunctionalityViews([page], index);

    expect(Object.keys(views).sort()).toEqual(["actions-index.md", "by-fact.md", "overview.md"]);
    expect(views["overview.md"]).toContain("### retirement — Retirement plan");
    expect(views["actions-index.md"]).toContain("`web.retirement.hero.view-income.add-birth-year`");
    expect(views["by-fact.md"]).toContain("`retirement-plan` | writes");
    expect(views["by-fact.md"]).toContain("`retirement-plan` | reads");
    expect(views["by-fact.md"]).toContain(
      "`retirement-income` | `web.retirement.hero.view-income`",
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

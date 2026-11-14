/**
 * Backend module-boundary law (BE-13; audit M22, architecture dimension). `apps/backend/src` has
 * three layers, and imports only point down:
 *
 * - the composition root (`main.ts`, `app.module.ts`), which may import anything;
 * - domain modules (`src/modules/<name>/`), one Nest module each, which may import platform code
 *   and only the other domain modules listed for them in `MODULE_DEPENDENCIES`;
 * - platform code (everything else: auth, config, contract, entities, security, observability and
 *   so on), which never imports a domain module. Within it, `entities/` imports only `entities/`.
 *
 * `MODULE_DEPENDENCIES` is the domain graph. It must name every folder under `src/modules` and
 * stay acyclic. Adding an edge is a design decision: change it here, in review, on purpose.
 * Tests, `testing/` helpers and `__fixtures__/` are exempt (a spec may reach across to wire a
 * real dependency).
 *
 * Standalone: exit 0 passes. Run by scripts/check-backend-laws.ts in `check:laws`.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const repoRoot = resolve(import.meta.dir, "../..");
export const BACKEND_SRC = "apps/backend/src";

/** Each domain module and the domain modules it may import. Keep it a DAG. */
export const MODULE_DEPENDENCIES: Readonly<Record<string, readonly string[]>> = {
  snapshots: [],
  budget: [],
  tax: [],
  banking: ["snapshots"],
  imports: ["snapshots"],
  finance: ["banking", "snapshots"],
  privacy: ["banking"],
  profile: ["banking", "privacy", "snapshots"],
  agent: ["finance", "imports", "profile"],
};

const COMPOSITION_ROOT = new Set(["main.ts", "app.module.ts"]);

export type Layer =
  | { kind: "root" }
  | { kind: "module"; name: string }
  | { kind: "platform"; area: string };

export interface BoundaryViolation {
  file: string;
  line: number;
  rule: "platform-imports-module" | "undeclared-module-edge" | "entities-import" | "graph";
  text: string;
}

/** Layer of a path relative to `apps/backend/src`. */
export function layerOf(srcRelative: string): Layer {
  if (COMPOSITION_ROOT.has(srcRelative)) return { kind: "root" };
  const parts = srcRelative.split("/");
  if (parts[0] === "modules" && parts.length > 2) return { kind: "module", name: parts[1] };
  return { kind: "platform", area: parts.length > 1 ? parts[0] : "" };
}

/** Production source only: no specs, tests, `testing/` helpers or fixtures. */
export function isCoveredFile(srcRelative: string): boolean {
  if (!srcRelative.endsWith(".ts") || srcRelative.endsWith(".d.ts")) return false;
  if (/\.(spec|test)\.ts$/.test(srcRelative)) return false;
  if (/(^|\/)(testing|__fixtures__)\//.test(srcRelative)) return false;
  return true;
}

const IMPORT_SPEC =
  /(?:^|\n)\s*(?:import|export)\b[^"'`;]*?\bfrom\s*["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']\s*\)|(?:^|\n)\s*import\s*["']([^"']+)["']/g;

/** Relative import specifiers in `source`, with their line numbers. */
export function relativeImports(source: string): { spec: string; line: number }[] {
  const out: { spec: string; line: number }[] = [];
  IMPORT_SPEC.lastIndex = 0;
  for (let m = IMPORT_SPEC.exec(source); m !== null; m = IMPORT_SPEC.exec(source)) {
    const spec = m[1] ?? m[2] ?? m[3];
    if (!spec?.startsWith(".")) continue;
    const at = m.index + m[0].indexOf(spec);
    out.push({ spec, line: source.slice(0, at).split("\n").length });
  }
  return out;
}

/** Checks one import edge between two `src`-relative paths. */
export function checkEdge(from: string, to: string): BoundaryViolation["rule"] | null {
  const a = layerOf(from);
  const b = layerOf(to);
  if (a.kind === "root") return null;
  if (a.kind === "platform") {
    if (b.kind === "module") return "platform-imports-module";
    if (a.area === "entities" && !(b.kind === "platform" && b.area === "entities")) {
      return "entities-import";
    }
    return null;
  }
  if (b.kind === "module" && b.name !== a.name) {
    return (MODULE_DEPENDENCIES[a.name] ?? []).includes(b.name) ? null : "undeclared-module-edge";
  }
  if (b.kind === "root") return "undeclared-module-edge";
  return null;
}

/** Problems with the declared graph itself: unknown names, missing folders, cycles. */
export function checkGraph(moduleDirs: readonly string[]): string[] {
  const problems: string[] = [];
  const declared = new Set(Object.keys(MODULE_DEPENDENCIES));
  for (const dir of moduleDirs) {
    if (!declared.has(dir)) problems.push(`src/modules/${dir} is not in MODULE_DEPENDENCIES`);
  }
  for (const [name, deps] of Object.entries(MODULE_DEPENDENCIES)) {
    if (!moduleDirs.includes(name))
      problems.push(`MODULE_DEPENDENCIES names ${name}, which has no folder`);
    for (const dep of deps) {
      if (!declared.has(dep)) problems.push(`${name} depends on unknown module ${dep}`);
    }
  }
  const state = new Map<string, "visiting" | "done">();
  const visit = (name: string, path: string[]): void => {
    if (state.get(name) === "done") return;
    if (state.get(name) === "visiting") {
      problems.push(`cycle: ${[...path.slice(path.indexOf(name)), name].join(" -> ")}`);
      return;
    }
    state.set(name, "visiting");
    for (const dep of MODULE_DEPENDENCIES[name] ?? []) visit(dep, [...path, name]);
    state.set(name, "done");
  };
  for (const name of declared) visit(name, []);
  return problems;
}

function resolveImport(fromAbs: string, spec: string): string | null {
  const base = resolve(dirname(fromAbs), spec.replace(/\.js$/, ""));
  for (const candidate of [`${base}.ts`, join(base, "index.ts"), base]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

export function scanBackend(root: string = repoRoot): BoundaryViolation[] {
  const srcAbs = resolve(root, BACKEND_SRC);
  const violations: BoundaryViolation[] = [];
  const modulesAbs = join(srcAbs, "modules");
  const moduleDirs = existsSync(modulesAbs)
    ? readdirSync(modulesAbs).filter((d) => statSync(join(modulesAbs, d)).isDirectory())
    : [];
  for (const problem of checkGraph(moduleDirs)) {
    violations.push({
      file: "scripts/backend-laws/check-module-boundaries.ts",
      line: 0,
      rule: "graph",
      text: problem,
    });
  }
  for (const full of walk(srcAbs)) {
    const from = relative(srcAbs, full);
    if (!isCoveredFile(from)) continue;
    const source = readFileSync(full, "utf8");
    for (const { spec, line } of relativeImports(source)) {
      const target = resolveImport(full, spec);
      if (!target || !target.startsWith(srcAbs)) continue;
      const rule = checkEdge(from, relative(srcAbs, target));
      if (rule) violations.push({ file: `${BACKEND_SRC}/${from}`, line, rule, text: spec });
    }
  }
  return violations;
}

if (import.meta.main) {
  const violations = scanBackend();
  if (violations.length) {
    console.error(`check-module-boundaries: ${violations.length} violation(s)`);
    for (const v of violations) console.error(`  ${v.file}:${v.line} [${v.rule}] ${v.text}`);
    console.error(
      "Platform code never imports src/modules; a domain module imports only the modules MODULE_DEPENDENCIES lists for it.",
    );
    process.exit(1);
  }
  console.log("check-module-boundaries: OK");
}

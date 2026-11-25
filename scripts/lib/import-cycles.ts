/**
 * Runtime import cycles inside one package (finance-engine, run by check-one-tax-engine.ts).
 *
 * A cycle means a module can be read before it has finished initialising, and Metro prints a
 * require-cycle warning for it in the mobile app. Only edges that survive compilation count:
 * - `import type` and `export type` are always erased, so they are ignored;
 * - an import whose every named specifier is `type X` is erased by tsc unless
 *   `verbatimModuleSyntax` is on (it then stays as a side-effect import) and by Babel's default
 *   TypeScript transform (Metro), so it is ignored unless `keepTypeSpecifierImports` is set;
 * - everything else counts: value imports, mixed imports, `export * from`, `export { x } from`,
 *   bare `import "./x"` and dynamic `import("./x")`.
 * Only relative specifiers are followed. Pure: callers supply the sources.
 */

export interface ImportCycleOptions {
  /** True when the package's tsconfig sets `verbatimModuleSyntax`. */
  keepTypeSpecifierImports?: boolean;
}

/** Drops block comments and `//` line comments (a `//` after `:` is kept, so URLs survive). */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** Runtime relative specifiers imported or re-exported by one module. */
export function runtimeImports(source: string, options: ImportCycleOptions = {}): string[] {
  const code = stripComments(source);
  const found: string[] = [];
  // The clause may not cross a `;` or the start of another import or export statement, so a
  // statement with no `from` (such as `export type Foo = string`) never swallows the next import.
  const fromClause =
    /^[ \t]*(import|export)\s+((?:(?!\n[ \t]*(?:import|export)\b)[^;])*?)\s+from\s+["']([^"']+)["']/gm;
  for (const m of code.matchAll(fromClause)) {
    const clause = (m[2] ?? "").trim();
    const spec = m[3] ?? "";
    if (!spec.startsWith(".") || isErased(clause, options)) continue;
    found.push(spec);
  }
  for (const m of code.matchAll(/^[ \t]*import\s+["']([^"']+)["']/gm)) {
    const spec = m[1] ?? "";
    if (spec.startsWith(".")) found.push(spec);
  }
  for (const m of code.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)) {
    const spec = m[1] ?? "";
    if (spec.startsWith(".")) found.push(spec);
  }
  return found;
}

function isErased(clause: string, options: ImportCycleOptions): boolean {
  if (/^type\b/.test(clause)) return true;
  if (options.keepTypeSpecifierImports) return false;
  const braces = /^\{([\s\S]*)\}$/.exec(clause);
  if (!braces) return false;
  const names = (braces[1] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s !== "");
  return names.length > 0 && names.every((n) => /^type\s/.test(n));
}

/** Resolves "./x.js" against `fromFile` to a key of `files` (x.ts, x.tsx or x/index.ts), if any. */
function resolveSpecifier(
  fromFile: string,
  spec: string,
  files: ReadonlyMap<string, string>,
): string | null {
  const dir = fromFile.includes("/") ? fromFile.slice(0, fromFile.lastIndexOf("/")) : "";
  const parts = dir === "" ? [] : dir.split("/");
  for (const seg of spec.split("/")) {
    if (seg === "..") parts.pop();
    else if (seg !== ".") parts.push(seg);
  }
  const base = parts.join("/").replace(/\.(js|ts|tsx|mjs)$/, "");
  for (const candidate of [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
    if (files.has(candidate)) return candidate;
  }
  return null;
}

/** A closed import path through one strongly connected component, e.g. [a, b, a]. */
function cyclePath(component: readonly string[], graph: ReadonlyMap<string, string[]>): string[] {
  const members = new Set(component);
  const start = component[0] ?? "";
  const seen = new Set<string>();
  const walk = (node: string, path: string[]): string[] | null => {
    for (const next of graph.get(node) ?? []) {
      if (next === start) return [...path, start];
      if (!members.has(next) || seen.has(next)) continue;
      seen.add(next);
      const found = walk(next, [...path, next]);
      if (found) return found;
    }
    return null;
  };
  return walk(start, [start]) ?? [start, start];
}

/**
 * Every runtime import cycle, one per strongly connected component with more than one module (or
 * a module that imports itself), as a closed path starting at the component's first file in
 * sorted order: ["a.ts", "b.ts", "a.ts"]. Keys of `files` are package-relative paths.
 */
export function findImportCycles(
  files: ReadonlyMap<string, string>,
  options: ImportCycleOptions = {},
): string[][] {
  const graph = new Map<string, string[]>();
  for (const [file, source] of files) {
    const targets = runtimeImports(source, options)
      .map((spec) => resolveSpecifier(file, spec, files))
      .filter((t): t is string => t !== null);
    graph.set(file, [...new Set(targets)].sort());
  }

  // Tarjan's strongly connected components.
  let index = 0;
  const indexOf = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const components: string[][] = [];

  const visit = (node: string): void => {
    indexOf.set(node, index);
    low.set(node, index);
    index++;
    stack.push(node);
    onStack.add(node);
    for (const next of graph.get(node) ?? []) {
      if (!indexOf.has(next)) {
        visit(next);
        low.set(node, Math.min(low.get(node) ?? 0, low.get(next) ?? 0));
      } else if (onStack.has(next)) {
        low.set(node, Math.min(low.get(node) ?? 0, indexOf.get(next) ?? 0));
      }
    }
    if (low.get(node) === indexOf.get(node)) {
      const component: string[] = [];
      let member: string | undefined;
      do {
        member = stack.pop();
        if (member === undefined) break;
        onStack.delete(member);
        component.push(member);
      } while (member !== node);
      const selfLoop = component.length === 1 && (graph.get(node) ?? []).includes(node);
      if (component.length > 1 || selfLoop) components.push(component.sort());
    }
  };

  for (const node of [...graph.keys()].sort()) if (!indexOf.has(node)) visit(node);
  return components
    .sort((a, b) => (a[0] ?? "").localeCompare(b[0] ?? ""))
    .map((component) => cyclePath(component, graph));
}

/** The failure line for one cycle: the path and the fix. */
export function importCycleMessage(path: readonly string[]): string {
  return `runtime import cycle: ${path.join(" -> ")}. Fix: move the shared piece to a module both can import`;
}

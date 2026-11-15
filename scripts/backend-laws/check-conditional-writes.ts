/**
 * Conditional-writes law (BE-16; audit M7). An edit of a saved record must not silently overwrite
 * a change made somewhere else (another tab, an AI connection). So:
 *
 * 1. every PATCH and PUT route in the contract manifest is `etag: "conditional"` (it accepts
 *    `If-Match` and answers 412 when the record changed since), or is listed with its reason in
 *    `UNCONDITIONAL_UPDATE_ROUTES`; a listed route that no longer needs the exception fails too;
 * 2. the backend handler of every conditional route reads the `if-match` header;
 * 3. every web call (`apiFetch`, `apiFetchVersioned`, `backendFetch`) that sends PATCH or PUT to
 *    a conditional route passes `ifMatch`, and every conditional route has at least one web
 *    caller that does. A write whose method or path the scan cannot read fails, so a wrapper
 *    cannot hide one.
 *
 * Standalone: exit 0 passes. Run by scripts/check-backend-laws.ts in `check:laws`.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import {
  allRoutes,
  isConditionalRoute,
  type RouteDefinition,
  UNCONDITIONAL_UPDATE_ROUTES,
} from "../../packages/api-contract/src/manifest";

const repoRoot = resolve(import.meta.dir, "../..");
const WEB_ROOT = "apps/web/app";
const BACKEND_ROOT = "apps/backend/src";

/** The web functions that send a request to the API. */
const WEB_CALLERS = ["apiFetch", "apiFetchVersioned", "backendFetch"] as const;

type RouteLike = Pick<RouteDefinition, "id" | "method" | "path" | "etag">;

export interface WebWrite {
  file: string;
  line: number;
  /** PATCH or PUT, or null when the call's method is not a string literal. */
  method: "PATCH" | "PUT" | null;
  /** The path with `${...}` as `:param`, or null when it is not a literal. */
  endpoint: string | null;
  sendsIfMatch: boolean;
}

/** The argument text of a call starting at `open` (the index of its `(`), parens balanced. */
function callArguments(source: string, open: number): string {
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "(") depth++;
    else if (source[i] === ")" && --depth === 0) return source.slice(open + 1, i);
  }
  return source.slice(open + 1);
}

/** Blanks comments and import declarations, keeping every line break so line numbers hold. */
function withoutCommentsAndImports(source: string): string {
  const blank = (text: string) => text.replace(/[^\n]/g, " ");
  return source
    .replace(/^import\s[\s\S]*?\sfrom\s*["'][^"']+["'];?/gm, blank)
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/^\s*\/\/.*$/gm, blank);
}

/** Replaces each `${...}` (braces balanced) of a template literal's text with `:param`. */
function withParams(template: string): string {
  let out = "";
  for (let i = 0; i < template.length; i++) {
    if (template[i] === "$" && template[i + 1] === "{") {
      let depth = 0;
      let j = i + 1;
      for (; j < template.length; j++) {
        if (template[j] === "{") depth++;
        else if (template[j] === "}" && --depth === 0) break;
      }
      out += ":param";
      i = j;
    } else {
      out += template[i];
    }
  }
  return out;
}

/** The text of the template literal starting at `start` (a backtick), nested `${}` included. */
function templateLiteral(text: string, start: number): string | null {
  let depth = 0;
  for (let i = start + 1; i < text.length; i++) {
    if (text[i] === "$" && text[i + 1] === "{") depth++;
    else if (text[i] === "}" && depth > 0) depth--;
    else if (text[i] === "`" && depth === 0) return text.slice(start + 1, i);
  }
  return null;
}

/**
 * Every web call in `source` that writes with PATCH or PUT, or whose method cannot be read (a
 * variable, a shorthand property or a spread), which the law treats as a possible write.
 */
export function findWebWrites(source: string, file: string): WebWrite[] {
  const text = withoutCommentsAndImports(source);
  const writes: WebWrite[] = [];
  const mention = new RegExp(`\\b(?:${WEB_CALLERS.join("|")})\\b`, "g");
  for (const match of text.matchAll(mention)) {
    const index = match.index ?? 0;
    const after = text.slice(index + match[0].length);
    const open = /^\s*(?:<[^>()]*>)?\s*\(/.exec(after);
    // A declaration (`function apiFetch(`, `export function ...`) or a mention as a value.
    if (!open || /\bfunction\s+$/.test(text.slice(Math.max(0, index - 20), index))) continue;
    const args = callArguments(after, open[0].length - 1);
    const literal = /\bmethod:\s*["'](GET|POST|PATCH|PUT|DELETE)["']/.exec(args)?.[1];
    const unreadable =
      (!literal && (/\bmethod\s*:/.test(args) || /[{,]\s*method\s*[,}]/.test(args))) ||
      /\.\.\.\w+/.test(args);
    if (literal !== "PATCH" && literal !== "PUT" && !unreadable) continue;
    const trimmed = args.trimStart();
    const quoted = /^(["'])(\/[^"']*)\1/.exec(trimmed);
    const template = trimmed.startsWith("`") ? templateLiteral(trimmed, 0) : null;
    const endpoint = quoted ? (quoted[2] ?? null) : template ? withParams(template) : null;
    writes.push({
      file,
      line: text.slice(0, index).split("\n").length,
      method: literal === "PATCH" || literal === "PUT" ? literal : null,
      endpoint,
      sendsIfMatch: /\bifMatch\b/.test(args) && !/\bifMatch:\s*undefined\b/.test(args),
    });
  }
  return writes;
}

/** The route a web call's method and path refer to, if any. */
export function routeFor(
  routes: readonly RouteLike[],
  method: string,
  endpoint: string,
): RouteLike | undefined {
  const segments = endpoint.replace(/^\//, "").split("/");
  return routes.find((route) => {
    if (route.method !== method) return false;
    const template = route.path.split("/");
    if (template.length !== segments.length) return false;
    return template.every((part, i) =>
      part.startsWith(":") ? segments[i] !== "" : part === segments[i],
    );
  });
}

/** True when the handler under `@Patch("path")` or `@Put("path")` reads the `if-match` header. */
export function handlerReadsIfMatch(controllerSource: string, route: RouteLike): boolean {
  const verb = route.method === "PUT" ? "Put" : "Patch";
  // A controller may carry a path prefix: `@Controller("tax-records")` with `@Patch(":id")`.
  const prefix = /@Controller\(\s*["']([^"']+)["']\s*\)/.exec(controllerSource)?.[1];
  let path = route.path;
  if (prefix) {
    if (path !== prefix && !path.startsWith(`${prefix}/`)) return false;
    path = path.slice(prefix.length).replace(/^\//, "");
  }
  const escaped = path.replace(/[.*+?^${}()|[\]\\/:]/g, "\\$&");
  const decorator = new RegExp(`@${verb}\\(\\s*["']/?${escaped}["']\\s*\\)`);
  const start = decorator.exec(controllerSource);
  if (!start) return false;
  const rest = controllerSource.slice(start.index + start[0].length);
  const next = /@(?:Get|Post|Put|Patch|Delete)\(/.exec(rest);
  const handler = next ? rest.slice(0, next.index) : rest;
  return /@Headers\(\s*["']if-match["']\s*\)/i.test(handler);
}

export interface ConditionalWritesInput {
  routes: readonly RouteLike[];
  unconditional: readonly string[];
  webWrites: readonly WebWrite[];
  /** The text of every backend controller. */
  controllers: readonly string[];
}

/** The law's failures, one line each. Empty when it holds. */
export function checkConditionalWrites(input: ConditionalWritesInput): string[] {
  const { routes, unconditional, webWrites, controllers } = input;
  const errors: string[] = [];
  const conditional = (route: RouteLike) => route.etag === "conditional";
  const updates = routes.filter((r) => r.method === "PATCH" || r.method === "PUT");

  for (const route of updates) {
    if (!conditional(route) && !unconditional.includes(route.id)) {
      errors.push(
        `${route.id} (${route.method} /${route.path}) takes no If-Match: make it etag: "conditional", or list it in UNCONDITIONAL_UPDATE_ROUTES with its reason`,
      );
    }
    if (conditional(route) && !controllers.some((source) => handlerReadsIfMatch(source, route))) {
      errors.push(
        `${route.id} is conditional in the contract, but no backend handler for ${route.method} /${route.path} reads the if-match header`,
      );
    }
  }
  for (const id of unconditional) {
    const route = updates.find((r) => r.id === id);
    if (!route)
      errors.push(`UNCONDITIONAL_UPDATE_ROUTES lists ${id}, which is not an update route`);
    else if (conditional(route)) {
      errors.push(`UNCONDITIONAL_UPDATE_ROUTES lists ${id}, which is conditional: remove it`);
    }
  }

  const sent = new Set<string>();
  for (const write of webWrites) {
    const at = `${write.file}:${write.line}`;
    if (write.method === null || write.endpoint === null) {
      errors.push(
        `${at}: a web API call whose method or path is not a literal cannot be checked: write the method and path out`,
      );
      continue;
    }
    const route = routeFor(routes, write.method, write.endpoint);
    if (!route) {
      errors.push(`${at}: ${write.method} ${write.endpoint} matches no contract route`);
      continue;
    }
    if (!conditional(route)) continue;
    if (write.sendsIfMatch) sent.add(route.id);
    else {
      errors.push(
        `${at}: ${write.method} ${write.endpoint} (${route.id}) sends no ifMatch: pass the version the page read`,
      );
    }
  }
  for (const route of updates.filter(conditional)) {
    if (!sent.has(route.id)) {
      errors.push(`${route.id} is conditional, but no web caller sends ifMatch to it`);
    }
  }
  return errors;
}

/** Production source only: no tests, stories or fixtures. */
export function isProductionSource(path: string): boolean {
  return (
    /\.(ts|tsx)$/.test(path) &&
    !/\.(test|spec|stories)\.(ts|tsx)$/.test(path) &&
    !/\.d\.ts$/.test(path) &&
    !/(^|\/)(__fixtures__|__mocks__|testing)\//.test(path)
  );
}

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name !== "node_modules" && name !== "styled-system") out.push(...sourceFiles(full));
    } else if (isProductionSource(full)) {
      out.push(full);
    }
  }
  return out;
}

if (import.meta.main) {
  const webWrites = sourceFiles(join(repoRoot, WEB_ROOT)).flatMap((full) =>
    findWebWrites(readFileSync(full, "utf8"), relative(repoRoot, full)),
  );
  const controllers = sourceFiles(join(repoRoot, BACKEND_ROOT))
    .filter((full) => full.endsWith(".controller.ts"))
    .map((full) => readFileSync(full, "utf8"));
  const errors = checkConditionalWrites({
    routes: allRoutes,
    unconditional: UNCONDITIONAL_UPDATE_ROUTES,
    webWrites,
    controllers,
  });
  if (errors.length > 0) {
    console.error(`check-conditional-writes: ${errors.length} problem(s):`);
    for (const error of errors) console.error(`  - ${error}`);
    console.error(
      "\nEvery edit of a saved record sends If-Match and handles 412 (docs/api/versioning.md).",
    );
    process.exit(1);
  }
  const conditional = allRoutes.filter(isConditionalRoute).length;
  console.log(
    `check-conditional-writes: OK (${conditional} conditional route(s), ${webWrites.length} web write(s) checked)`,
  );
}

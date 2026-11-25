/**
 * Filesystem loader for docs/system/functionality-map/ and repo route discovery.
 * Shared by scripts/generate-functionality-map.ts and scripts/check-functionality-map.ts.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import {
  discoverMarketingRoutes,
  FM_APPS,
  type FmIndex,
  type FmPageEntry,
  type FmRepoView,
  parseFmIndex,
  parseFmPage,
  parseValueMapRefs,
  type ValueMapRefs,
} from "./functionality-map";

const FM_DIR = "docs/system/functionality-map";
const FM_INDEX_PATH = `${FM_DIR}/index.yaml`;
const FM_PAGES_DIR = `${FM_DIR}/pages`;
export const FM_VIEWS_DIR = `${FM_DIR}/generated`;
const VALUE_MAP_PATH = "docs/system/value-map.yaml";

const WEB_ROUTES_DIR = "apps/web/app/routes";
const IGNORED_WEB_ROUTE = /^(\.|.*(\.(test|spec)\.(js|jsx|ts|tsx))$)/;
/** Expo Router routes (E12): every file under apps/mobile/app except layouts and tests. */
const MOBILE_ROUTES_DIR = "apps/mobile/app";
const IGNORED_MOBILE_ROUTE = /^(\.|_layout\.|.*\.(test|spec)\.(js|jsx|ts|tsx)$)/;

function* walkFiles(dir: string): Generator<string> {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    if (entry === "__tests__" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      yield* walkFiles(full);
    } else {
      yield full;
    }
  }
}

/** Discovers all web route files under `apps/web/app/routes`, marketing routes in `App.tsx` and mobile routes under `apps/mobile/app`. */
export function discoverAllRoutes(repoRoot: string, repo: FmRepoView): string[] {
  const webRoutes: string[] = [];
  const webDir = resolve(repoRoot, WEB_ROUTES_DIR);
  for (const full of walkFiles(webDir)) {
    const name = basename(full);
    if (IGNORED_WEB_ROUTE.test(name)) continue;
    if (!/\.(ts|tsx|js|jsx)$/.test(name)) continue;
    webRoutes.push(relative(repoRoot, full).split("\\").join("/"));
  }
  const marketingRoutes = discoverMarketingRoutes(repo);
  const mobileRoutes: string[] = [];
  for (const full of walkFiles(resolve(repoRoot, MOBILE_ROUTES_DIR))) {
    const name = basename(full);
    if (IGNORED_MOBILE_ROUTE.test(name) || !/\.(ts|tsx|js|jsx)$/.test(name)) continue;
    mobileRoutes.push(relative(repoRoot, full).split("\\").join("/"));
  }
  return [...webRoutes, ...marketingRoutes, ...mobileRoutes].sort();
}

export function createRepoView(repoRoot: string): FmRepoView {
  return {
    exists: (path) => existsSync(resolve(repoRoot, path)),
    read: (path) => {
      const full = resolve(repoRoot, path);
      return existsSync(full) ? readFileSync(full, "utf8") : null;
    },
  };
}

export function loadFunctionalityMap(repoRoot: string): {
  index: FmIndex;
  pages: FmPageEntry[];
  valueMap: ValueMapRefs;
} {
  const indexText = readFileSync(resolve(repoRoot, FM_INDEX_PATH), "utf8");
  const index = parseFmIndex(indexText);

  const pages: FmPageEntry[] = [];
  for (const app of FM_APPS) {
    const appDir = resolve(repoRoot, FM_PAGES_DIR, app);
    if (!existsSync(appDir)) continue;
    const files = readdirSync(appDir)
      .filter((f) => f.endsWith(".yaml"))
      .sort();
    for (const file of files) {
      const full = join(appDir, file);
      const filePath = relative(repoRoot, full).split("\\").join("/");
      const expectedId = file.replace(/\.yaml$/, "");
      pages.push({
        filePath,
        expectedApp: app,
        expectedId,
        page: parseFmPage(readFileSync(full, "utf8")),
      });
    }
  }

  const valueMapText = readFileSync(resolve(repoRoot, VALUE_MAP_PATH), "utf8");
  const valueMap = parseValueMapRefs(valueMapText);

  return { index, pages, valueMap };
}

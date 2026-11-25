/**
 * Mobile bundle search (E12 S1a, S1b): after `expo export`, fails when a production bundle carries
 * development-only code. The engine check screen, the tax vector catalogue and the gallery must be stripped by
 * the `__DEV__` guards; a known production string must be present, so a search that reads nothing
 * cannot pass by accident.
 *
 * It also reads each bundle's source map and fails if any package was bundled from more than one
 * install. That is the claim behind the expo-doctor duplicate tolerance in scripts/run-expo-doctor.ts:
 * Bun's isolated linker leaves same-version copies on disk, but Metro must bundle only one.
 *
 *   bun scripts/check-mobile-bundle.ts apps/mobile/dist
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Strings that only development code contains: the device check screen (route `engine-check`) and
 * the vector catalogue (S1a), and the component gallery (route `gallery`) with the components'
 * named states that only it and the tests import (S1b).
 */
export const DEV_ONLY_MARKERS = [
  "Device check",
  "All vectors pass",
  "Tax vectors",
  "ewni.incomeTax.",
  "All formatting cases match",
  "Component gallery",
  "200% text",
  "Plain pressable",
] as const;

/**
 * Strings only the e2e fixture server and the `e2e` build profile carry (S2c): the address the
 * emulator uses to reach the fixture server, and its control route prefix. A production bundle
 * that contains either was built against the fixture server or imported it.
 */
export const FIXTURE_MARKERS = ["10.0.2.2:8787", "__fixture"] as const;

/** A string every production bundle must contain (the tagline on the first screen). */
export const PRODUCTION_MARKER = "Finance without the fog";

export const PLATFORMS = ["ios", "android"] as const;

export interface BundleFinding {
  readonly file: string;
  readonly problem: string;
}

/** Check one bundle's bytes. Hermes bytecode keeps string literals as plain UTF-8 in its string table. */
export function checkBundle(file: string, bytes: Buffer): BundleFinding[] {
  const text = bytes.toString("latin1");
  const findings: BundleFinding[] = DEV_ONLY_MARKERS.filter((m) => text.includes(m)).map((m) => ({
    file,
    problem: `contains development-only text "${m}"`,
  }));
  for (const m of FIXTURE_MARKERS) {
    if (text.includes(m)) findings.push({ file, problem: `contains e2e fixture text "${m}"` });
  }
  if (!text.includes(PRODUCTION_MARKER)) {
    findings.push({ file, problem: `does not contain "${PRODUCTION_MARKER}"` });
  }
  return findings;
}

/**
 * Where one bundled source file was installed from, keyed by package: a Bun store directory, any
 * other `node_modules` folder, or a workspace package's top folder (so `src` and `dist` of the same
 * package count as two copies). Sources outside all three (the app itself, Metro's shims) give none.
 */
export function installOf(source: string): { name: string; install: string } | undefined {
  const bun = source.match(/node_modules\/\.bun\/([^/]+)\/node_modules\/((?:@[^/]+\/)?[^/]+)\//);
  if (bun?.[1] && bun[2]) return { name: bun[2], install: `.bun/${bun[1]}` };
  const plain = source.match(/^(.*node_modules\/((?:@[^/]+\/)?[^/]+))\//);
  if (plain?.[1] && plain[2]) return { name: plain[2], install: plain[1] };
  const workspace = source.match(/(?:^|\/)packages\/([^/]+)\/([^/]+)\//);
  if (workspace?.[1] && workspace[2]) {
    return {
      name: `workspace:${workspace[1]}`,
      install: `packages/${workspace[1]}/${workspace[2]}`,
    };
  }
  return undefined;
}

/** Packages that a source map lists from more than one install, with those installs. */
export function packagesBundledTwice(sources: readonly string[]): Map<string, string[]> {
  const installs = new Map<string, Set<string>>();
  for (const source of sources) {
    const found = installOf(source);
    if (!found) continue;
    const dirs = installs.get(found.name) ?? new Set<string>();
    dirs.add(found.install);
    installs.set(found.name, dirs);
  }
  return new Map(
    [...installs]
      .filter(([, dirs]) => dirs.size > 1)
      .map(([name, dirs]) => [name, [...dirs].sort()]),
  );
}

/** Check one bundle's source map. A missing map, or one that lists no installed package, fails. */
export function checkSourceMap(file: string, mapText: string | undefined): BundleFinding[] {
  if (mapText === undefined) return [{ file, problem: "has no source map next to it" }];
  let sources: unknown;
  try {
    sources = (JSON.parse(mapText) as { sources?: unknown }).sources;
  } catch {
    return [{ file, problem: "has a source map that is not valid JSON" }];
  }
  if (!Array.isArray(sources) || !sources.some((s) => String(s).includes("node_modules/.bun/"))) {
    return [{ file, problem: "has a source map that lists no installed package" }];
  }
  return [...packagesBundledTwice(sources.map(String))].map(([name, dirs]) => ({
    file,
    problem: `bundles ${name} from more than one install: ${dirs.join(", ")}`,
  }));
}

export function findBundles(distDir: string): { platform: string; files: string[] }[] {
  return PLATFORMS.map((platform) => {
    const dir = join(distDir, "_expo/static/js", platform);
    const files = existsSync(dir)
      ? readdirSync(dir)
          .filter((f) => /\.(hbc|js)$/.test(f))
          .map((f) => join(dir, f))
      : [];
    return { platform, files };
  });
}

if (import.meta.main) {
  const distDir = resolve(process.argv[2] ?? "apps/mobile/dist");
  const findings: BundleFinding[] = [];
  for (const { platform, files } of findBundles(distDir)) {
    if (files.length === 0) findings.push({ file: platform, problem: "no bundle exported" });
    for (const file of files) {
      findings.push(...checkBundle(file, readFileSync(file)));
      const map = `${file}.map`;
      findings.push(
        ...checkSourceMap(file, existsSync(map) ? readFileSync(map, "utf8") : undefined),
      );
    }
  }
  for (const f of findings) console.error(`FAIL ${f.file}: ${f.problem}`);
  if (findings.length > 0) process.exit(1);
  console.log(
    "check-mobile-bundle: OK (no development-only code, one copy of each package, iOS and Android)",
  );
}

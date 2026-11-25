/**
 * Mobile bundle search (E12 S1a): after `expo export`, fails when a production bundle carries
 * development-only code. The engine check screen and the tax vector catalogue must be stripped by
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

/** Strings that only the dev device check screen (route `engine-check`) and the vector catalogue contain. */
export const DEV_ONLY_MARKERS = [
  "Device check",
  "All vectors pass",
  "Tax vectors",
  "ewni.incomeTax.",
  "All formatting cases match",
] as const;

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
  if (!text.includes(PRODUCTION_MARKER)) {
    findings.push({ file, problem: `does not contain "${PRODUCTION_MARKER}"` });
  }
  return findings;
}

/** Packages that a source map lists from more than one install directory, with those directories. */
export function packagesBundledTwice(sources: readonly string[]): Map<string, string[]> {
  const installs = new Map<string, Set<string>>();
  for (const source of sources) {
    const m = source.match(/node_modules\/\.bun\/([^/]+)\/node_modules\/((?:@[^/]+\/)?[^/]+)\//);
    if (!m?.[1] || !m[2]) continue;
    const dirs = installs.get(m[2]) ?? new Set<string>();
    dirs.add(m[1]);
    installs.set(m[2], dirs);
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

/**
 * Mobile bundle search (E12 S1a): after `expo export`, fails when a production bundle carries
 * development-only code. The engine check screen and the tax vector catalogue must be stripped by
 * the `__DEV__` guards; a known production string must be present, so a search that reads nothing
 * cannot pass by accident.
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
    for (const file of files) findings.push(...checkBundle(file, readFileSync(file)));
  }
  for (const f of findings) console.error(`FAIL ${f.file}: ${f.problem}`);
  if (findings.length > 0) process.exit(1);
  console.log("check-mobile-bundle: OK (no development-only code in the iOS or Android bundle)");
}

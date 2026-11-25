/**
 * Proves from the `expo prebuild` output that Android Auto Backup and device transfer leave out the
 * secure store, where the app keeps the refresh token (E12 S2a, storage design condition):
 *
 *   bun scripts/check-android-backup.ts apps/mobile/android
 *
 * Passes when the app's manifest turns backup off, or when it names both rule files and each one
 * excludes the `SecureStore` shared preferences (Android adds ".xml" to a sharedpref path) in every
 * section that includes shared preferences. The rule files are looked up in the app's resources,
 * then in expo-secure-store's, which Gradle merges into the app.
 */
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";

export interface BackupFinding {
  readonly problem: string;
}

const attr = (manifest: string, name: string): string | undefined => {
  const application = manifest.match(/<application\b[^>]*>/s)?.[0] ?? "";
  return application.match(new RegExp(`android:${name}="([^"]*)"`))?.[1];
};

/** Each section that backs up shared preferences must exclude the secure store. */
export function rulesExcludeSecureStore(xml: string, sections: readonly string[]): string[] {
  const problems: string[] = [];
  const excludes = /<exclude\s+domain="sharedpref"\s+path="SecureStore(?:\.xml)?"\s*\/>/;
  for (const section of sections) {
    const body = xml.match(new RegExp(`<${section}\\b[^>]*>([\\s\\S]*?)</${section}>`))?.[1];
    if (body === undefined) {
      problems.push(`<${section}> is missing, so its default backs up everything`);
    } else if (!excludes.test(body)) {
      problems.push(`<${section}> does not exclude the SecureStore shared preferences`);
    }
  }
  return problems;
}

export function checkBackup(
  manifest: string,
  readRule: (name: string) => string | undefined,
): BackupFinding[] {
  if (attr(manifest, "allowBackup") === "false") return [];
  const findings: BackupFinding[] = [];
  const pairs = [
    ["fullBackupContent", ["full-backup-content"]],
    ["dataExtractionRules", ["cloud-backup", "device-transfer"]],
  ] as const;
  for (const [name, sections] of pairs) {
    const ref = attr(manifest, name);
    const file = ref?.match(/^@xml\/([\w]+)$/)?.[1];
    if (!file) {
      findings.push({
        problem: `the manifest has no android:${name}, so backup copies everything`,
      });
      continue;
    }
    const xml = readRule(file);
    if (xml === undefined) {
      findings.push({ problem: `${file}.xml was not found` });
      continue;
    }
    for (const problem of rulesExcludeSecureStore(xml, sections)) {
      findings.push({ problem: `${file}.xml: ${problem}` });
    }
  }
  return findings;
}

if (import.meta.main) {
  const androidDir = resolve(process.argv[2] ?? "apps/mobile/android");
  const manifestPath = join(androidDir, "app/src/main/AndroidManifest.xml");
  if (!existsSync(manifestPath)) {
    console.error(`check-android-backup: no manifest at ${manifestPath}; run expo prebuild first`);
    process.exit(1);
  }
  const appRequire = createRequire(join(androidDir, "..", "package.json"));
  const libraryRes = join(
    dirname(appRequire.resolve("expo-secure-store/package.json")),
    "android/src/main/res/xml",
  );
  const readRule = (name: string) => {
    for (const dir of [join(androidDir, "app/src/main/res/xml"), libraryRes]) {
      const path = join(dir, `${name}.xml`);
      if (existsSync(path)) return readFileSync(path, "utf8");
    }
    return undefined;
  };
  const findings = checkBackup(readFileSync(manifestPath, "utf8"), readRule);
  if (findings.length > 0) {
    for (const f of findings) console.error(`check-android-backup: ${f.problem}`);
    process.exit(1);
  }
  console.log(
    "check-android-backup: OK (Auto Backup and device transfer leave out the secure store)",
  );
}

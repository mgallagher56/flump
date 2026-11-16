import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export interface PackageRecord {
  name: string;
  version: string;
  license?: string;
}

export interface CycloneDxComponent {
  type: "library";
  "bom-ref": string;
  name: string;
  version: string;
  purl: string;
  licenses?: Array<{ license: { id: string } }>;
}

export interface CycloneDxBom {
  bomFormat: "CycloneDX";
  specVersion: "1.5";
  serialNumber: string;
  version: number;
  metadata: {
    timestamp: string;
    component: {
      type: "application";
      name: string;
      version: string;
    };
  };
  components: CycloneDxComponent[];
}

export function buildPackagePurl(name: string, version: string): string {
  const encodedName = name.startsWith("@")
    ? `%40${encodeURIComponent(name.slice(1)).replace(/%2F/gi, "/")}`
    : encodeURIComponent(name);
  return `pkg:npm/${encodedName}@${encodeURIComponent(version)}`;
}

export function buildCycloneDxSbom(opts: {
  appName: string;
  appVersion: string;
  packages: PackageRecord[];
  timestamp?: string;
  serialNumber?: string;
}): CycloneDxBom {
  const unique = new Map<string, PackageRecord>();
  for (const pkg of opts.packages) {
    if (!pkg.name || !pkg.version) continue;
    const key = `${pkg.name}@${pkg.version}`;
    if (!unique.has(key)) unique.set(key, pkg);
  }

  const components: CycloneDxComponent[] = [...unique.values()]
    .sort((a, b) => `${a.name}@${a.version}`.localeCompare(`${b.name}@${b.version}`))
    .map((pkg) => {
      const purl = buildPackagePurl(pkg.name, pkg.version);
      return {
        type: "library",
        "bom-ref": purl,
        name: pkg.name,
        version: pkg.version,
        purl,
        ...(pkg.license ? { licenses: [{ license: { id: pkg.license } }] } : {}),
      };
    });

  return {
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    serialNumber: opts.serialNumber ?? `urn:uuid:${randomUUID()}`,
    version: 1,
    metadata: {
      timestamp: opts.timestamp ?? new Date().toISOString(),
      component: {
        type: "application",
        name: opts.appName,
        version: opts.appVersion,
      },
    },
    components,
  };
}

function readPackageJson(file: string): PackageRecord | null {
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as {
      name?: unknown;
      version?: unknown;
      license?: unknown;
    };
    if (typeof parsed.name !== "string" || typeof parsed.version !== "string") return null;
    const license =
      typeof parsed.license === "string" && parsed.license.trim() ? parsed.license : undefined;
    return { name: parsed.name, version: parsed.version, ...(license ? { license } : {}) };
  } catch {
    return null;
  }
}

/** Walks `node_modules` directories under `rootDir` (including `.bun` stores) to collect installed packages. */
export function collectInstalledPackages(rootDir: string): PackageRecord[] {
  const results: PackageRecord[] = [];
  const visited = new Set<string>();

  const walkNodeModules = (nmDir: string) => {
    if (!existsSync(nmDir)) return;
    for (const entry of readdirSync(nmDir, { withFileTypes: true })) {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
      const full = join(nmDir, entry.name);
      if (visited.has(full)) continue;
      visited.add(full);

      if (entry.name === ".bun") {
        for (const bunEntry of readdirSync(full, { withFileTypes: true })) {
          if (!bunEntry.isDirectory()) continue;
          walkNodeModules(join(full, bunEntry.name, "node_modules"));
        }
        continue;
      }

      if (entry.name.startsWith("@")) {
        for (const scoped of readdirSync(full, { withFileTypes: true })) {
          if (!scoped.isDirectory() && !scoped.isSymbolicLink()) continue;
          const pkgDir = join(full, scoped.name);
          const rec = readPackageJson(join(pkgDir, "package.json"));
          if (rec) results.push(rec);
          walkNodeModules(join(pkgDir, "node_modules"));
        }
        continue;
      }

      const rec = readPackageJson(join(full, "package.json"));
      if (rec) results.push(rec);
      walkNodeModules(join(full, "node_modules"));
    }
  };

  walkNodeModules(join(rootDir, "node_modules"));
  for (const group of ["apps", "packages"]) {
    const groupDir = join(rootDir, group);
    if (!existsSync(groupDir)) continue;
    for (const ws of readdirSync(groupDir, { withFileTypes: true })) {
      if (ws.isDirectory()) walkNodeModules(join(groupDir, ws.name, "node_modules"));
    }
  }
  return results;
}

function argValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx >= 0 ? args[idx + 1] : undefined;
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const app = argValue(args, "--app") ?? "workspace";
  const outPath = argValue(args, "--out") ?? `sbom-${app}.cdx.json`;
  const packagesJsonPath = argValue(args, "--packages-json");
  const rootDir = resolve(argValue(args, "--root") ?? ".");

  const rootPkg = readPackageJson(join(rootDir, "package.json"));
  const appVersion = rootPkg?.version ?? "0.0.0";

  let packages: PackageRecord[];
  if (packagesJsonPath) {
    packages = JSON.parse(readFileSync(packagesJsonPath, "utf8")) as PackageRecord[];
  } else {
    packages = collectInstalledPackages(rootDir);
  }

  const bom = buildCycloneDxSbom({
    appName: `flump-${app}`,
    appVersion,
    packages,
  });
  mkdirSync(dirname(resolve(outPath)), { recursive: true });
  writeFileSync(resolve(outPath), `${JSON.stringify(bom, null, 2)}\n`, "utf8");
  console.log(`generate-sbom: wrote ${bom.components.length} component(s) to ${outPath}`);
}

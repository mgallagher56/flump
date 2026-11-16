import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildCycloneDxSbom, buildPackagePurl, collectInstalledPackages } from "./generate-sbom";

describe("generate-sbom (E36 H2)", () => {
  test("buildPackagePurl encodes scoped and unscoped npm packages", () => {
    expect(buildPackagePurl("zod", "3.24.0")).toBe("pkg:npm/zod@3.24.0");
    expect(buildPackagePurl("@flump/mcp", "1.0.0")).toBe("pkg:npm/%40flump/mcp@1.0.0");
  });

  test("buildCycloneDxSbom deduplicates, sorts, and emits valid CycloneDX 1.5 JSON", () => {
    const bom = buildCycloneDxSbom({
      appName: "flump-backend",
      appVersion: "1.18.0",
      timestamp: "2026-11-16T00:00:00.000Z",
      serialNumber: "urn:uuid:00000000-0000-4000-8000-000000000001",
      packages: [
        { name: "zod", version: "3.24.0", license: "MIT" },
        { name: "zod", version: "3.24.0", license: "MIT" },
        { name: "@nestjs/common", version: "12.4.2" },
      ],
    });

    expect(bom.bomFormat).toBe("CycloneDX");
    expect(bom.specVersion).toBe("1.5");
    expect(bom.metadata.component).toEqual({
      type: "application",
      name: "flump-backend",
      version: "1.18.0",
    });
    expect(bom.components).toEqual([
      {
        type: "library",
        "bom-ref": "pkg:npm/%40nestjs/common@12.4.2",
        name: "@nestjs/common",
        version: "12.4.2",
        purl: "pkg:npm/%40nestjs/common@12.4.2",
      },
      {
        type: "library",
        "bom-ref": "pkg:npm/zod@3.24.0",
        name: "zod",
        version: "3.24.0",
        purl: "pkg:npm/zod@3.24.0",
        licenses: [{ license: { id: "MIT" } }],
      },
    ]);
  });

  test("collectInstalledPackages walks node_modules including scoped and .bun directories", () => {
    const dir = mkdtempSync(join(tmpdir(), "flump-sbom-test-"));
    try {
      mkdirSync(join(dir, "node_modules/zod"), { recursive: true });
      writeFileSync(
        join(dir, "node_modules/zod/package.json"),
        JSON.stringify({ name: "zod", version: "3.24.0", license: "MIT" }),
      );
      mkdirSync(join(dir, "node_modules/.bun/express@5.0.0/node_modules/express"), {
        recursive: true,
      });
      writeFileSync(
        join(dir, "node_modules/.bun/express@5.0.0/node_modules/express/package.json"),
        JSON.stringify({ name: "express", version: "5.0.0" }),
      );
      mkdirSync(join(dir, "apps/web/node_modules/@repo/ui"), { recursive: true });
      writeFileSync(
        join(dir, "apps/web/node_modules/@repo/ui/package.json"),
        JSON.stringify({ name: "@repo/ui", version: "0.0.1" }),
      );

      const found = collectInstalledPackages(dir);
      expect(found.map((p) => `${p.name}@${p.version}`).sort()).toEqual([
        "@repo/ui@0.0.1",
        "express@5.0.0",
        "zod@3.24.0",
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

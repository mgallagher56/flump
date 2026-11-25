import "reflect-metadata";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";
import { PrivacyModule } from "../privacy/privacy.module";
import { SnapshotsModule } from "../snapshots/snapshots.module";
import { AgentModule } from "./agent.module";

/**
 * E35 W5: the free-text answer after a check-in ("Did anything here make you feel worse?") is
 * never reachable by an MCP tool. The tools read data only through this module's services and the
 * modules it imports, so the guard is: no source the tools run reads the table, and the module
 * imports neither the snapshots module (which owns the answers) nor the privacy module (whose
 * export holds every table, the answers among them).
 */
const repoRoot = join(__dirname, "..", "..", "..", "..", "..");
const MCP_SOURCE_DIRS = [__dirname, join(repoRoot, "packages", "mcp", "src")];
const WELLBEING = /wellbeing|worse_?text/i;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.ts$/.test(name) && !/\.(spec|test)\.ts$/.test(name) ? [path] : [];
  });
}

describe("MCP tools cannot read the wellbeing answers (E35 W5)", () => {
  it("no MCP or agent source mentions the answers or their text", () => {
    const files = MCP_SOURCE_DIRS.flatMap(sourceFiles);
    expect(files.length).toBeGreaterThan(10);
    const hits = files
      .filter((file) => WELLBEING.test(readFileSync(file, "utf8")))
      .map((file) => relative(repoRoot, file));
    expect(hits).toEqual([]);
  });

  it("the agent module imports neither the snapshots module nor the export", () => {
    const imports: unknown[] = Reflect.getMetadata(MODULE_METADATA.IMPORTS, AgentModule) ?? [];
    expect(imports.length).toBeGreaterThan(0);
    expect(imports).not.toContain(SnapshotsModule);
    expect(imports).not.toContain(PrivacyModule);
  });
});

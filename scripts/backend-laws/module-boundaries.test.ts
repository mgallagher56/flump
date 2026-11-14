import { describe, expect, it } from "bun:test";
import {
  checkEdge,
  checkGraph,
  isCoveredFile,
  layerOf,
  MODULE_DEPENDENCIES,
  relativeImports,
  scanBackend,
} from "./check-module-boundaries";

describe("module-boundaries law", () => {
  it("passes on the repository as it stands", () => {
    expect(scanBackend()).toEqual([]);
  });

  it("classifies the composition root, domain modules and platform code", () => {
    expect(layerOf("app.module.ts")).toEqual({ kind: "root" });
    expect(layerOf("main.ts")).toEqual({ kind: "root" });
    expect(layerOf("modules/tax/tax.service.ts")).toEqual({ kind: "module", name: "tax" });
    expect(layerOf("modules/banking/providers/monzo.provider.ts")).toEqual({
      kind: "module",
      name: "banking",
    });
    expect(layerOf("auth/auth.guard.ts")).toEqual({ kind: "platform", area: "auth" });
    expect(layerOf("data-source.ts")).toEqual({ kind: "platform", area: "" });
  });

  it("covers production files only", () => {
    expect(isCoveredFile("modules/tax/tax.service.ts")).toBe(true);
    expect(isCoveredFile("modules/tax/tax.service.spec.ts")).toBe(false);
    expect(isCoveredFile("testing/hotQueries.ts")).toBe(false);
    expect(isCoveredFile("modules/banking/providers/__fixtures__/fake-bank.ts")).toBe(false);
  });

  it("refuses platform code that imports a domain module", () => {
    expect(checkEdge("auth/auth.guard.ts", "modules/privacy/account-deletion.service.ts")).toBe(
      "platform-imports-module",
    );
    expect(checkEdge("app.module.ts", "modules/privacy/privacy.module.ts")).toBeNull();
  });

  it("keeps entities free of everything but entities", () => {
    expect(checkEdge("entities/account.entity.ts", "entities/numeric.transformer.ts")).toBeNull();
    expect(checkEdge("entities/account.entity.ts", "config/db.config.ts")).toBe("entities-import");
  });

  it("allows declared module edges and refuses the rest", () => {
    expect(
      checkEdge("modules/agent/agent-data.service.ts", "modules/finance/finance.service.ts"),
    ).toBeNull();
    expect(checkEdge("modules/finance/finance.service.ts", "modules/agent/mcp.service.ts")).toBe(
      "undeclared-module-edge",
    );
    expect(checkEdge("modules/tax/tax.service.ts", "modules/budget/budget.service.ts")).toBe(
      "undeclared-module-edge",
    );
    expect(checkEdge("modules/tax/tax.controller.ts", "auth/auth.guard.ts")).toBeNull();
    expect(checkEdge("modules/tax/tax.module.ts", "app.module.ts")).toBe("undeclared-module-edge");
  });

  it("declares an acyclic graph that matches the module folders", () => {
    expect(checkGraph(Object.keys(MODULE_DEPENDENCIES))).toEqual([]);
    expect(checkGraph([...Object.keys(MODULE_DEPENDENCIES), "reports"])).toEqual([
      "src/modules/reports is not in MODULE_DEPENDENCIES",
    ]);
  });

  it("finds static, re-export, side-effect and dynamic relative imports", () => {
    const source = [
      'import { a } from "./a";',
      'import type { B } from "../b";',
      'export { c } from "./c";',
      'import "./side-effect";',
      'const d = await import("./d");',
      'import { e } from "@flump/api-contract";',
    ].join("\n");
    expect(relativeImports(source)).toEqual([
      { spec: "./a", line: 1 },
      { spec: "../b", line: 2 },
      { spec: "./c", line: 3 },
      { spec: "./side-effect", line: 4 },
      { spec: "./d", line: 5 },
    ]);
  });
});

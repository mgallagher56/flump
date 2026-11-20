import { SUPPORTED_UK_TAX_YEARS } from "@flump/finance-engine";
import { describe, expect, it } from "vitest";
import { McpTaxYear } from "./mcp-tokens.js";

describe("McpTaxYear", () => {
  it("lists exactly the engine's supported tax years, in order", () => {
    expect(McpTaxYear.options).toEqual([...SUPPORTED_UK_TAX_YEARS]);
  });
});

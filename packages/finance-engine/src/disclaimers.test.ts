import { describe, expect, it } from "vitest";
import { BETA_NOTICE, MCP_NOTICE, PROJECTION_NOTICE, REGULATORY_STATUS } from "./disclaimers.js";

describe("canonical disclaimers", () => {
  it("BETA_NOTICE says guidance, not advice, and unreviewed", () => {
    expect(BETA_NOTICE).toContain("not advice");
    expect(BETA_NOTICE).toContain("unreviewed");
  });

  it("MCP_NOTICE is flagged as guidance and unverified", () => {
    expect(MCP_NOTICE).toBe(
      "Calculations from figures held in Flump. Guidance, not advice. Unverified.",
    );
  });

  it("PROJECTION_NOTICE frames projections as guidance, not advice", () => {
    expect(PROJECTION_NOTICE).toMatch(/^Guidance, not advice\./);
  });

  it("keeps FCA wording out of the canonical strings (claims guard bans it)", () => {
    for (const text of [BETA_NOTICE, MCP_NOTICE, PROJECTION_NOTICE]) {
      expect(text).not.toMatch(/\bFCA\b/);
    }
  });

  it("REGULATORY_STATUS throws if used, because FCA wording is owner-only", () => {
    expect(() => String(REGULATORY_STATUS)).toThrow(/owner/i);
    expect(() => `${REGULATORY_STATUS}`).toThrow(/owner/i);
    expect(() => REGULATORY_STATUS.length).toThrow(/owner/i);
  });
});

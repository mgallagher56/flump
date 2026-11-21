import { describe, expect, it } from "vitest";
import {
  BETA_NOTICE,
  INVESTMENT_RISK_NOTICE,
  MCP_NOTICE,
  MORTGAGE_ESTIMATE_STANDALONE_NOTICE,
  PROJECTION_NOTICE,
  REGULATORY_STATUS,
} from "./disclaimers.js";

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

  it("INVESTMENT_RISK_NOTICE keeps its fixed wording", () => {
    // Fixed wording (copy guide 7.3): never reworded without the owner.
    expect(INVESTMENT_RISK_NOTICE).toBe("Investment returns can go down as well as up.");
  });

  it("MORTGAGE_ESTIMATE_STANDALONE_NOTICE keeps its approved E39 wording", () => {
    expect(MORTGAGE_ESTIMATE_STANDALONE_NOTICE).toBe(
      "This is an estimate from your figures and the assumptions shown. It is not a lender's decision or a mortgage offer.",
    );
  });

  it("keeps FCA wording out of the canonical strings (claims guard bans it)", () => {
    for (const text of [
      BETA_NOTICE,
      MCP_NOTICE,
      PROJECTION_NOTICE,
      MORTGAGE_ESTIMATE_STANDALONE_NOTICE,
    ]) {
      expect(text).not.toMatch(/\bFCA\b/);
    }
  });

  it("REGULATORY_STATUS throws if used, because FCA wording is owner-only", () => {
    expect(() => String(REGULATORY_STATUS)).toThrow(/owner/i);
    expect(() => `${REGULATORY_STATUS}`).toThrow(/owner/i);
    expect(() => REGULATORY_STATUS.length).toThrow(/owner/i);
  });
});

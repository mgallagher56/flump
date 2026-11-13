import { describe, expect, it } from "vitest";
import {
  ALL_PAGE_KEYS,
  DEFAULT_DASHBOARD_WIDGETS,
  DEFAULT_ENABLED_PAGES,
  isPageEnabled,
  OPT_IN_PAGE_KEYS,
  stripRetiredKeys,
  stripRetiredRecordKeys,
} from "./pageConfig";

describe("opt-in modules (Self Assessment)", () => {
  it("keeps tax out of the defaults but in the full list", () => {
    expect(OPT_IN_PAGE_KEYS).toEqual(["tax"]);
    expect(DEFAULT_ENABLED_PAGES).not.toContain("tax");
    expect(DEFAULT_DASHBOARD_WIDGETS).not.toContain("tax");
    expect(ALL_PAGE_KEYS).toContain("tax");
  });

  it("treats a stored empty list as the defaults, and honours an explicit opt-in", () => {
    expect(isPageEnabled([], "tax")).toBe(false);
    expect(isPageEnabled([], "budget")).toBe(true);
    expect(isPageEnabled(["budget", "tax"], "tax")).toBe(true);
    expect(isPageEnabled(["budget"], "tax")).toBe(false);
  });
});

describe("retired module keys", () => {
  it("no longer lists forecast as a module", () => {
    expect(ALL_PAGE_KEYS as string[]).not.toContain("forecast");
    expect(DEFAULT_ENABLED_PAGES as string[]).not.toContain("forecast");
  });

  it("strips forecast from stored lists and keyed records", () => {
    expect(stripRetiredKeys(["accounts", "forecast", "tax"])).toEqual(["accounts", "tax"]);
    expect(stripRetiredRecordKeys({ accounts: "wide", forecast: "normal" })).toEqual({
      accounts: "wide",
    });
    expect(stripRetiredRecordKeys(null)).toBeUndefined();
  });
});

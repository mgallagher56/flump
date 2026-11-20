// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  ALL_DASHBOARD_WIDGET_KEYS,
  ALL_PAGE_KEYS,
  APP_PAGES,
  DEFAULT_DASHBOARD_WIDGETS,
  DEFAULT_ENABLED_PAGES,
  FOLLOWING_PAGE_KEYS,
  isPageEnabled,
  OPT_IN_PAGE_KEYS,
  stripRetiredKeys,
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

  it("strips forecast from stored lists", () => {
    expect(stripRetiredKeys(["accounts", "forecast", "tax"])).toEqual(["accounts", "tax"]);
  });
});

describe("modules that follow another page (owner, 20 Nov 2026: Retirement open to everyone, superseding RD9)", () => {
  it("never offers Retirement as a toggle, and shows it wherever Pension shows", () => {
    expect(FOLLOWING_PAGE_KEYS).toEqual({ retirement: "pension" });
    for (const list of [
      ALL_PAGE_KEYS,
      ALL_DASHBOARD_WIDGET_KEYS,
      DEFAULT_ENABLED_PAGES,
      DEFAULT_DASHBOARD_WIDGETS,
    ]) {
      expect(list).not.toContain("retirement");
    }
    // Nothing stored: the default set, which includes Pension.
    expect(isPageEnabled([], "retirement")).toBe(true);
    expect(isPageEnabled(null, "retirement")).toBe(true);
    expect(isPageEnabled(["accounts", "pension"], "retirement")).toBe(true);
    expect(isPageEnabled(["accounts"], "retirement")).toBe(false);
  });

  it("keeps the key and its page config, so stored profiles still parse", () => {
    expect(APP_PAGES.retirement.route).toBe("/app/retirement");
  });
});

// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  ALL_DASHBOARD_WIDGET_KEYS,
  ALL_PAGE_KEYS,
  APP_PAGES,
  type AppPageKey,
  DEFAULT_DASHBOARD_WIDGETS,
  DEFAULT_ENABLED_PAGES,
  isPageEnabled,
} from "./pageConfig";

describe("page config lookups", () => {
  it("gives every page a config that names its own key and an app route", () => {
    for (const [key, config] of Object.entries(APP_PAGES)) {
      expect(config.key).toBe(key);
      expect(config.route.startsWith("/app/")).toBe(true);
      expect(config.label.length).toBeGreaterThan(0);
    }
  });

  it("offers every toggleable page as a dashboard section, and the defaults as default sections", () => {
    expect(ALL_DASHBOARD_WIDGET_KEYS).toEqual(ALL_PAGE_KEYS);
    expect(DEFAULT_DASHBOARD_WIDGETS).toEqual(DEFAULT_ENABLED_PAGES);
    expect(DEFAULT_DASHBOARD_WIDGETS).toContain("budget");
  });

  it("falls back to the defaults when the stored value is not a list", () => {
    // A malformed stored value (text, not a list) must not switch on the opt-in tax page.
    const stored = "tax" as unknown as string[];
    expect(isPageEnabled(stored, "tax" as AppPageKey)).toBe(false);
    expect(isPageEnabled(stored, "budget")).toBe(true);
  });
});

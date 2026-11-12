import { describe, expect, it } from "vitest";
import { isPageEnabled } from "~/utils/pageConfig";
import { AUTH_NAV_ROUTES, filterNavRoutes } from "./navConfig";

const keys = (routes: ReturnType<typeof filterNavRoutes>) =>
  routes.flatMap((r) => (r.children ? r.children.map((c) => c.key) : [r.key]));

describe("navConfig", () => {
  it("never lists Forecast (it redirects to Savings)", () => {
    expect(keys(AUTH_NAV_ROUTES)).not.toContain("forecast");
  });

  it("includes Debt so it is reachable on desktop and mobile", () => {
    expect(keys(AUTH_NAV_ROUTES)).toContain("debt");
  });

  it("hides the opt-in Tax module and its empty group by default", () => {
    const routes = filterNavRoutes(AUTH_NAV_ROUTES, [], isPageEnabled);
    expect(keys(routes)).not.toContain("tax");
    expect(routes.find((r) => r.key === "planning")).toBeUndefined();
  });

  it("shows Tax once the module is enabled", () => {
    const routes = filterNavRoutes(AUTH_NAV_ROUTES, ["budget", "tax"], isPageEnabled);
    expect(keys(routes)).toEqual(["budget", "tax"]);
  });
});

import { describe, expect, it } from "vitest";
import { isPageEnabled } from "~/utils/pageConfig";
import { AUTH_NAV_ROUTES, filterNavRoutes } from "./navConfig";

const keys = (routes: ReturnType<typeof filterNavRoutes>) =>
  routes.flatMap((r) => (r.children ? r.children.map((c) => c.key) : [r.key]));
const topLevel = (routes: ReturnType<typeof filterNavRoutes>) => routes.map((r) => r.key);

describe("navConfig", () => {
  it("never lists Forecast (it redirects to Savings)", () => {
    expect(keys(AUTH_NAV_ROUTES)).not.toContain("forecast");
  });

  it("orders the top level Accounts, Budget, Tax and pay, Savings and pension, Borrowing", () => {
    expect(topLevel(AUTH_NAV_ROUTES)).toEqual([
      "accounts",
      "budget",
      "taxAndPay",
      "savingsAndPension",
      "borrowing",
    ]);
  });

  it("keeps Mortgage with Debt under Borrowing, not under Savings and pension", () => {
    const group = (key: string) =>
      AUTH_NAV_ROUTES.find((r) => r.key === key)?.children?.map((c) => c.key);
    expect(group("borrowing")).toEqual(["debt", "mortgage"]);
    expect(group("savingsAndPension")).toEqual(["savings", "pension"]);
  });

  it("has at most six top-level items", () => {
    expect(AUTH_NAV_ROUTES.length).toBeLessThanOrEqual(6);
  });

  it("collapses Tax and pay to a direct Take-home link while Self Assessment is off", () => {
    const routes = filterNavRoutes(AUTH_NAV_ROUTES, [], isPageEnabled);
    const taxAndPay = routes.find((r) => r.key === "taxAndPay");
    expect(taxAndPay?.children).toBeUndefined();
    expect(taxAndPay?.route).toBe("/app/take-home");
    expect(keys(routes)).not.toContain("tax");
  });

  it("shows Self Assessment as a child of Tax and pay once the module is enabled", () => {
    const routes = filterNavRoutes(AUTH_NAV_ROUTES, ["budget", "tax"], isPageEnabled);
    expect(routes.find((r) => r.key === "taxAndPay")?.children?.map((c) => c.key)).toEqual([
      "takeHome",
      "tax",
    ]);
  });

  it("collapses Borrowing to the single page left and drops empty groups", () => {
    const onlyDebt = filterNavRoutes(AUTH_NAV_ROUTES, ["debt"], isPageEnabled);
    const debt = onlyDebt.find((r) => r.key === "debt");
    expect(debt?.route).toBe("/app/debt");
    expect(debt?.children).toBeUndefined();
    expect(topLevel(onlyDebt)).not.toContain("borrowing");
    expect(topLevel(onlyDebt)).not.toContain("savingsAndPension");
    const none = filterNavRoutes(AUTH_NAV_ROUTES, ["budget"], isPageEnabled);
    expect(topLevel(none)).toEqual(["budget", "taxAndPay"]);
  });

  it("collapses to the page's own label by default and to the group's when collapseTo is group", () => {
    const enabledAll = () => true;
    const child = { key: "a", route: "/a" };
    const [byChild] = filterNavRoutes([{ key: "g", children: [child] }], [], enabledAll);
    expect(byChild.key).toBe("a");
    const [byGroup] = filterNavRoutes(
      [{ key: "g", collapseTo: "group", children: [child] }],
      [],
      enabledAll,
    );
    expect(byGroup.key).toBe("g");
    expect(byGroup.route).toBe("/a");
  });

  it("labels the Self Assessment page by its plain name, not the module key", () => {
    const tax = AUTH_NAV_ROUTES.flatMap((r) => r.children ?? []).find((c) => c.key === "tax");
    expect(tax?.label).toBe("selfAssessment");
  });
});

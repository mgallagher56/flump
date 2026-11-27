import { findMorePage } from "./navItems";
import { isPageEnabled, moreEntries, withSelfAssessment } from "./pageSwitches";

// Web's own drawer is compared over every combination by apps/web's mobileNavParity.test.tsx; these
// pin what only the app adds: the page a collapsed row opens, and the list Profile writes.
describe("pageSwitches", () => {
  it("with nothing stored lists the default groups, Self Assessment absent", () => {
    expect(moreEntries(undefined).map((e) => [e.kind, e.key])).toEqual([
      ["group", "savingsAndPension"],
      ["group", "borrowing"],
    ]);
    expect(isPageEnabled(undefined, "tax")).toBe(false);
    expect(isPageEnabled([], "tax")).toBe(false);
  });

  it("with Self Assessment on, Pay's group holds it under web's name and icon", () => {
    const list = withSelfAssessment([], true);
    const pay = moreEntries(list)[0];
    expect(pay).toEqual({
      kind: "group",
      key: "taxAndPay",
      label: "Pay",
      pages: [
        {
          key: "tax",
          label: "Self Assessment",
          icon: "file-text",
          webRoute: "/app/self-assessment",
        },
      ],
    });
  });

  it("a group left with one page opens that page, under the group's name when web says so", () => {
    // Debt only: "Debt and borrowing" (collapseTo group) opening Cards and loans.
    const [savings, borrowing] = moreEntries(["savings", "debt"]);
    expect(borrowing).toEqual({
      kind: "row",
      key: "borrowing",
      label: "Debt and borrowing",
      icon: "trending-down",
      webRoute: "/app/debt",
      pageKey: "debt",
    });
    // Savings only: the page's own name.
    expect(savings).toMatchObject({ kind: "row", key: "savings", label: "Savings" });
    for (const entry of [savings, borrowing]) {
      if (entry?.kind !== "row") throw new Error("expected a row");
      expect(findMorePage(entry.pageKey)?.webRoute).toBe(entry.webRoute);
    }
  });

  it("switching Self Assessment on keeps the stored pages, and an empty list keeps the defaults", () => {
    expect(withSelfAssessment(["budget", "savings"], true)).toEqual(["budget", "savings", "tax"]);
    expect(withSelfAssessment(["budget", "tax", "savings"], false)).toEqual(["budget", "savings"]);
    // Empty means the default set; switching on must not switch Savings and the rest off.
    expect(withSelfAssessment([], true)).toEqual([
      "accounts",
      "budget",
      "debt",
      "savings",
      "pension",
      "mortgage",
      "tax",
    ]);
    expect(withSelfAssessment(undefined, false)).toEqual([
      "accounts",
      "budget",
      "debt",
      "savings",
      "pension",
      "mortgage",
    ]);
  });
});

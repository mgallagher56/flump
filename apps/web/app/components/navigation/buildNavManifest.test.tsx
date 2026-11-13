import { describe, expect, it } from "vitest";
import { isPageEnabled } from "~/utils/pageConfig";
import {
  buildBottomBarItems,
  buildNavManifest,
  findActiveBottomBarKey,
  findActiveNavKey,
  MORE_NAV_KEY,
} from "./buildNavManifest";

const t = (key: string, fallback?: string) => fallback ?? key;
const base = { enabledPages: [] as string[], isPageEnabled, t };

describe("buildNavManifest", () => {
  it("signed out: Home only", () => {
    const items = buildNavManifest({ ...base, signedIn: false });
    expect(items.map((i) => i.key)).toEqual(["home"]);
    expect(items[0].href).toBe("/");
  });

  it("sandbox: Home links to the sandbox", () => {
    const [home] = buildNavManifest({ ...base, signedIn: false, sandbox: true });
    expect(home.href).toBe("/sandbox");
  });

  it("signed in: home plus the filtered nav, groups keep their children", () => {
    const items = buildNavManifest({
      ...base,
      signedIn: true,
      enabledPages: ["accounts", "budget", "savings", "pension", "debt", "mortgage"],
    });
    const keys = items.map((i) => i.key);
    expect(keys.slice(0, 3)).toEqual(["home", "accounts", "budget"]);
    const savings = items.find((i) => i.key === "savingsAndPension");
    expect(savings?.children?.map((c) => c.href)).toEqual(["/app/savings", "/app/pension"]);
    expect(savings?.href).toBe("/app/savings");
  });

  it("drops switched-off pages", () => {
    const items = buildNavManifest({ ...base, signedIn: true, enabledPages: ["accounts"] });
    expect(items.map((i) => i.key)).not.toContain("budget");
  });
});

describe("active keys", () => {
  const items = buildNavManifest({
    ...base,
    signedIn: true,
    enabledPages: ["accounts", "budget", "savings", "pension"],
  });
  it("matches a child by path prefix", () => {
    expect(findActiveNavKey(items, "/app/pension/projection")).toBe("pension");
  });
  it("matches Home only on exactly /", () => {
    expect(findActiveNavKey(items, "/")).toBe("home");
    expect(findActiveNavKey(items, "/app/budget")).toBe("budget");
  });
  it("bottom bar: Self Assessment belongs to Tax and pay", () => {
    expect(findActiveBottomBarKey("/app/self-assessment")).toBe("taxAndPay");
    expect(findActiveBottomBarKey("/app/debt")).toBeUndefined();
    expect(findActiveBottomBarKey("/sandbox")).toBe("home");
  });
});

describe("buildBottomBarItems", () => {
  it("four tabs plus More", () => {
    expect(buildBottomBarItems(t).map((i) => i.key)).toEqual([
      "home",
      "accounts",
      "budget",
      "taxAndPay",
      MORE_NAV_KEY,
    ]);
  });
});

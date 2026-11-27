// @vitest-environment node
import { describe, expect, it } from "vitest";
import { pageForPath, pageSource } from "./pageSet";
import { STATIC_PATHS } from "./utils/toolSlugs";

describe("pageForPath", () => {
  it("names the page App.tsx renders for each real path", () => {
    expect(STATIC_PATHS.map((path) => [path, pageForPath(path)])).toEqual([
      ["/", "HomePage"],
      ["/features", "FeaturesIndexPage"],
      ["/features/accounts", "FeaturePage"],
      ["/features/budget", "FeaturePage"],
      ["/features/pay", "FeaturePage"],
      ["/features/savings-and-pension", "FeaturePage"],
      ["/features/debt-and-borrowing", "FeaturePage"],
      ["/features/ai-connection", "AiConnectionPage"],
      ["/preview", "PreviewPage"],
      ["/pricing", "PricingPage"],
      ["/security", "SecurityPage"],
      ["/contact", "ContactPage"],
      ["/privacy", "PrivacyPage"],
      ["/terms", "TermsPage"],
      ["/cookies", "CookiesPage"],
      ["/accessibility", "AccessibilityPage"],
    ]);
  });

  it("matches like the router: any case, a trailing slash, a query or hash", () => {
    expect(pageForPath("/Pricing/")).toBe("PricingPage");
    expect(pageForPath("/features/PAY?from=home#top")).toBe("FeaturePage");
    expect(pageForPath("")).toBe("HomePage");
  });

  it("sends anything else to the not-found page", () => {
    expect(pageForPath("/features/unknown")).toBe("NotFoundPage");
    expect(pageForPath("/tools")).toBe("NotFoundPage");
  });

  it("names each page's module as the build manifest keys it", () => {
    expect(pageSource("HomePage")).toBe("src/pages/HomePage/index.ts");
  });
});

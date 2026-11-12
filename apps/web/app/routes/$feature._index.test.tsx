import { describe, expect, it } from "vitest";
import { loader } from "./$feature._index";

describe("$feature._index redirect route", () => {
  it("redirects legacy root paths to /app paths", async () => {
    const routes = [
      { feature: "accounts", expected: "/app/accounts" },
      { feature: "budget", expected: "/app/budget" },
      { feature: "debt", expected: "/app/debt" },
      { feature: "forecast", expected: "/app/savings#forecast" },
      { feature: "mortgage", expected: "/app/mortgage" },
      { feature: "onboarding", expected: "/app/onboarding" },
      { feature: "pension", expected: "/app/pension" },
      { feature: "profile", expected: "/app/profile" },
      { feature: "tax", expected: "/app/tax" },
    ];

    for (const { feature, expected } of routes) {
      const response = await loader({ params: { feature } } as any);
      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe(expected);
    }
  });

  it("redirects unknown feature to root /", async () => {
    const response = await loader({ params: { feature: "unknown-xyz" } } as any);
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/");
  });
});

import { afterEach, describe, expect, it } from "vitest";
import { connectTestClient, type TestHarness } from "../testing/client.js";
import { emptyUser, mortgageAndIsa } from "../testing/personas.js";

describe("compare_mortgage_overpay_vs_isa (E17-N1)", () => {
  let h: TestHarness | undefined;
  afterEach(async () => {
    await h?.close();
    h = undefined;
  });

  it("uses the persona's mortgage", async () => {
    h = await connectTestClient(mortgageAndIsa);
    const body = (await h.callJson("compare_mortgage_overpay_vs_isa", {})) as {
      currentMortgage: { balanceGbp: number; propertyValueGbp: number };
    };
    expect(body.currentMortgage.balanceGbp).toBe(255000);
    expect(body.currentMortgage.propertyValueGbp).toBe(410000);
  });

  it("KNOWN LEAK: an empty user is given a 350,000 property and 220,000 mortgage", async () => {
    h = await connectTestClient(emptyUser);
    const body = (await h.callJson("compare_mortgage_overpay_vs_isa", {})) as {
      currentMortgage: { balanceGbp: number; propertyValueGbp: number };
    };
    expect(body.currentMortgage).toMatchObject({ balanceGbp: 220000, propertyValueGbp: 350000 });
  });

  it("explicit zero balance returns the not-applicable message", async () => {
    h = await connectTestClient(mortgageAndIsa);
    const body = (await h.callJson("compare_mortgage_overpay_vs_isa", {
      hypotheticalMortgageBalanceGbp: 0,
    })) as { message: string };
    expect(body.message).toContain("No active mortgage balance");
  });
});

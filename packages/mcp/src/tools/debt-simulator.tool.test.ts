import { afterEach, describe, expect, it } from "vitest";
import { connectTestClient, type TestHarness } from "../testing/client.js";
import { emptyUser, renterWithUnknownAprCard } from "../testing/personas.js";

describe("simulate_debt_payoff (E17-N1)", () => {
  let h: TestHarness | undefined;
  afterEach(async () => {
    await h?.close();
    h = undefined;
  });

  it("simulates the user's card and passes the anonymise flag to the provider", async () => {
    h = await connectTestClient(renterWithUnknownAprCard);
    const body = (await h.callJson("simulate_debt_payoff", {})) as Record<string, unknown>;
    expect(body.strategy).toBe("AVALANCHE");
    expect(body.totalStartingDebtGbp).toBe(2400);
    expect(h.provider.calls).toEqual([{ userId: "user_test", anonymizeInstitutions: true }]);
  });

  it("COMPARE_BOTH returns a comparison", async () => {
    h = await connectTestClient(renterWithUnknownAprCard);
    const body = (await h.callJson("simulate_debt_payoff", { strategy: "COMPARE_BOTH" })) as {
      comparison: unknown;
    };
    expect(body.comparison).toBeDefined();
  });

  it("KNOWN LEAK: a card with no APR is simulated at 19.9% (removed by a later ticket)", async () => {
    h = await connectTestClient(renterWithUnknownAprCard);
    const unknown = await h.callJson("simulate_debt_payoff", {});
    const explicit = await h.callJson("simulate_debt_payoff", {
      customDebtsOverride: [
        {
          name: "Test Credit Card",
          balanceGbp: 2400,
          interestRateApr: 19.9,
          minimumPaymentGbp: 60,
        },
      ],
    });
    expect((unknown as Record<string, unknown>).totalInterestPaidGbp).toBe(
      (explicit as Record<string, unknown>).totalInterestPaidGbp,
    );
  });

  it("reports no debt for an empty user without leaking defaults", async () => {
    h = await connectTestClient(emptyUser);
    const body = (await h.callJson("simulate_debt_payoff", {})) as Record<string, unknown>;
    expect(body.totalStartingDebtGbp).toBe(0);
  });
});

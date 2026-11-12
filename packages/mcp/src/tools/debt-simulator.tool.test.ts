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
    await h.close();

    // Same card with the APR stated explicitly: nothing else about the input differs.
    h = await connectTestClient({
      ...renterWithUnknownAprCard,
      accounts: renterWithUnknownAprCard.accounts?.map((a) =>
        a.id === "cc_1" ? { ...a, interestRate: 19.9 } : a,
      ),
    });
    const explicit = await h.callJson("simulate_debt_payoff", {});
    expect(unknown).toEqual(explicit);
  });

  it("reports no debt for an empty user without leaking defaults", async () => {
    h = await connectTestClient(emptyUser);
    const body = (await h.callJson("simulate_debt_payoff", {})) as Record<string, unknown>;
    expect(body.totalStartingDebtGbp).toBe(0);
  });
});

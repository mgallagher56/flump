import { afterEach, describe, expect, it } from "vitest";
import {
  connectTestClient,
  omitAssumptions,
  TEST_TOKEN,
  type TestHarness,
} from "../testing/client.js";
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
    expect(omitAssumptions(unknown)).toEqual(omitAssumptions(explicit));
  });

  it("reports no debt for an empty user without leaking defaults", async () => {
    h = await connectTestClient(emptyUser);
    const body = (await h.callJson("simulate_debt_payoff", {})) as Record<string, unknown>;
    expect(body.totalStartingDebtGbp).toBe(0);
  });
});

describe("simulate_debt_payoff anonymisation (E17-N4)", () => {
  it("uses the pack's generic label when the token is anonymised", async () => {
    const h = await connectTestClient(renterWithUnknownAprCard);
    const text = await h.callText("simulate_debt_payoff", { strategy: "COMPARE_BOTH" });
    await h.close();
    expect(text).not.toContain("Test Credit Card");
    expect(text).toContain("Credit Card Account #1");
  });

  it("keeps the real name when the token is not anonymised", async () => {
    const h = await connectTestClient(renterWithUnknownAprCard, {
      token: { ...TEST_TOKEN, anonymizeInstitutions: false },
    });
    const text = await h.callText("simulate_debt_payoff", { strategy: "COMPARE_BOTH" });
    await h.close();
    expect(text).toContain("Test Credit Card");
  });
});

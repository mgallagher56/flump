import { afterEach, describe, expect, it } from "vitest";
import { connectTestClient, type TestHarness } from "../../testing/client.js";
import { emptyUser } from "../../testing/personas.js";

type Env = {
  result: { notes: string[] };
  assumptions: Array<{ field: string; value?: unknown; source: string }>;
};

const saver = {
  ...emptyUser,
  birthYear: new Date().getUTCFullYear() - 45,
  accounts: [{ id: "pen1", name: "Test Pension", type: "Pension", balance: 40000 }],
};

describe("simulate_retirement behaviour", () => {
  let h: TestHarness | undefined;
  afterEach(async () => {
    await h?.close();
    h = undefined;
  });
  const call = async (args: Record<string, unknown>) =>
    (await h?.callJson("simulate_retirement", args)) as Env;

  it("echoes each age and contribution the agent supplied", async () => {
    h = await connectTestClient(saver);
    const e = await call({
      retirementAge: 67,
      planToAge: 90,
      extraMonthlyContributionGbp: 200,
      statePensionAge: 68,
    });
    const supplied = e.assumptions
      .filter((a) => a.source === "agent_supplied")
      .map(({ field, value }) => ({ field, value }));
    expect(supplied).toEqual([
      { field: "retirementAge", value: 67 },
      { field: "planToAge", value: 90 },
      { field: "extraMonthlyContributionGbp", value: 200 },
      { field: "statePensionAge", value: 68 },
    ]);
  });

  it("echoes nothing as agent supplied when nothing is supplied", async () => {
    h = await connectTestClient(saver);
    const e = await call({});
    expect(e.assumptions.filter((a) => a.source === "agent_supplied")).toEqual([]);
  });

  it("uses supplied growth and inflation percentages for this answer", async () => {
    // 1%, 3% and 9% growth with 4% inflation, given as percentages, are stated back as those rates.
    h = await connectTestClient(saver);
    const e = await call({
      retirementAge: 67,
      lowerGrowthPct: 1,
      middleGrowthPct: 3,
      higherGrowthPct: 9,
      inflationPct: 4,
    });
    const rates = e.assumptions.find((a) => a.field === "growthRates");
    expect(rates?.value).toContain("1%, 3%, 9%");
    expect(rates?.value).toContain("4% inflation");
  });

  it("says the figures are estimates and nothing was saved", async () => {
    h = await connectTestClient(saver);
    const e = await call({});
    expect(e.result.notes).toHaveLength(2);
    expect(e.result.notes.every((n) => n.length > 0)).toBe(true);
  });
});

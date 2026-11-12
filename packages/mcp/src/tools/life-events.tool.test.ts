import { afterEach, describe, expect, it } from "vitest";
import { connectTestClient, type TestHarness } from "../testing/client.js";
import { mortgageAndIsa } from "../testing/personas.js";

describe("project_wealth_scenario (E17-N1)", () => {
  let h: TestHarness | undefined;
  afterEach(async () => {
    await h?.close();
    h = undefined;
  });

  it("projects a trajectory with no life events", async () => {
    h = await connectTestClient(mortgageAndIsa);
    const body = (await h.callJson("project_wealth_scenario", { horizonYears: 10 })) as {
      appliedScenariosCount: number;
      trajectorySummary: Array<{ year: number }>;
    };
    expect(body.appliedScenariosCount).toBe(0);
    expect(body.trajectorySummary.map((t) => t.year)).toEqual([0, 5, 10]);
  });

  it("applies a preset life event and lowers the scenario net worth", async () => {
    h = await connectTestClient(mortgageAndIsa);
    const base = (await h.callJson("project_wealth_scenario", { horizonYears: 10 })) as Record<
      string,
      number
    >;
    const withChild = (await h.callJson("project_wealth_scenario", {
      horizonYears: 10,
      lifeEvents: ["HAVE_CHILD"],
    })) as Record<string, number>;
    expect(withChild.appliedScenariosCount).toBe(1);
    expect(withChild.tenYearScenarioGbp).toBeLessThan(base.tenYearScenarioGbp as number);
  });
});

import { describe, expect, it } from "vitest";
import * as UI from "./index";

describe("UI package exports", () => {
  it("exports calculators, components, and tokens", () => {
    expect(UI.DebtSnowballCalculator).toBeDefined();
    expect(UI.MortgageVsIsaCalculator).toBeDefined();
    expect(UI.OverdraftCostCalculator).toBeDefined();
    expect(UI.Section24Calculator).toBeDefined();
    expect(UI.StudentLoanCalculator).toBeDefined();
    expect(UI.TaxTrapCalculator).toBeDefined();
    expect(UI.ZeroPercentCliffCalculator).toBeDefined();
    expect(UI.Button).toBeDefined();
    expect(UI.SectionBand).toBeDefined();
    expect(UI.AppSectionDivider).toBeDefined();
    expect(UI.EmptyState).toBeDefined();
    expect(UI.colors).toBeDefined();
  });
});

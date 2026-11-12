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

  it("exports the E15 non-colour tokens", () => {
    expect(UI.textStyles).toBeDefined();
    expect(UI.fontFamilies).toBeDefined();
    expect(UI.durations).toBeDefined();
    expect(UI.easings).toBeDefined();
    expect(UI.motionKeyframes).toBeDefined();
    expect(UI.zIndex).toBeDefined();
    expect(UI.sizes).toBeDefined();
    expect(UI.elevationShadows).toBeDefined();
    expect(UI.lineHeights).toBeDefined();
    expect(UI.fontWeights).toBeDefined();
    expect(UI.letterSpacings).toBeDefined();
  });

  it("exposes the preset with the E15 theme extensions", async () => {
    const { flumpPreset } = await import("../panda.preset");
    const extend = (flumpPreset as any).theme.extend;
    expect(extend.textStyles).toBeDefined();
    expect(extend.keyframes).toBeDefined();
    expect(extend.tokens.durations).toBeDefined();
    expect(extend.tokens.zIndex).toBeDefined();
  });
});

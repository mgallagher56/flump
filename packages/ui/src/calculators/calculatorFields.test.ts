import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { textInputStyle as debt } from "./DebtSnowballCalculator/DebtSnowballCalculator.styles";
import { textInputStyle as overdraft } from "./OverdraftCostCalculator/OverdraftCostCalculator.styles";
import { textInputStyle as student } from "./StudentLoanCalculator/StudentLoanCalculator.styles";
import { textInputStyle as zero } from "./ZeroPercentCliffCalculator/ZeroPercentCliffCalculator.styles";

describe("calculator text inputs use the input boundary token", () => {
  it.each([
    ["DebtSnowball", debt],
    ["OverdraftCost", overdraft],
    ["StudentLoan", student],
    ["ZeroPercentCliff", zero],
  ])("%s", (_name, cls) => {
    expect(cls).toContain("bd-c_border.input");
  });
});

describe("inline calculator number inputs use the input boundary token", () => {
  const files = [
    "MortgageVsIsaCalculator/MortgageVsIsaCalculator.tsx",
    "Section24Calculator/Section24Calculator.tsx",
    "TaxTrapCalculator/TaxTrapCalculator.tsx",
    "DebtSnowballCalculator/DebtSnowballCalculator.tsx",
  ];
  it.each(files)("%s has no <input> styled with the decorative border", (file) => {
    const src = readFileSync(join(__dirname, file), "utf8");
    const inputs = src.match(/<input[\s\S]*?\/>/g) ?? [];
    const inline = inputs.filter((i) => i.includes("style={{") && i.includes('type="number"'));
    expect(inline.length).toBeGreaterThan(0);
    for (const input of inline) {
      expect(input).not.toContain('"1px solid var(--colors-border)"');
      expect(input).toContain("var(--colors-border-input)");
    }
  });
});

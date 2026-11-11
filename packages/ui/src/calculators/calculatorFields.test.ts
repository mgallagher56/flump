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

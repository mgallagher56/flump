import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { textInputStyle as debt } from "./DebtSnowballCalculator/DebtSnowballCalculator.styles";
import { textInputStyle as student } from "./StudentLoanCalculator/StudentLoanCalculator.styles";
import { textInputStyle as zero } from "./ZeroPercentCliffCalculator/ZeroPercentCliffCalculator.styles";

describe("calculator text inputs use the input boundary token", () => {
  it.each([
    ["DebtSnowball", debt],
    ["StudentLoan", student],
    ["ZeroPercentCliff", zero],
  ])("%s", (_name, cls) => {
    expect(cls).toContain("bd-c_border.input");
  });
});

describe("number inputs in calculators use the input boundary token via styles files", () => {
  const dirs = ["MortgageVsIsaCalculator", "Section24Calculator", "DebtSnowballCalculator"];
  it.each(dirs)("%s has no inline styles and uses border.input", (dir) => {
    const tsx = readFileSync(join(__dirname, dir, `${dir}.tsx`), "utf8");
    const styles = readFileSync(join(__dirname, dir, `${dir}.styles.ts`), "utf8");
    expect(tsx).not.toContain("style={{");
    expect(styles).toContain('"border.input"');
  });
});

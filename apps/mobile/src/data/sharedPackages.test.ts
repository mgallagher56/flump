/**
 * E12 S1a acceptance 4: the shared packages load through the app's own toolchain (Babel, the
 * jest-expo resolver, Bun's isolated installs). Each import is checked with a real value, so a
 * package that resolved to an empty stub would fail.
 */
import { kindFromStatus } from "@flump/api-client";
import { ClientVersion } from "@flump/api-contract";
import { calculateUkTax } from "@flump/finance-engine";
import { formatCurrency } from "@flump/format";
import { dark, light } from "@flump/tokens/native";

describe("shared packages in the app", () => {
  it("@flump/finance-engine computes income tax", () => {
    // 2025/26, England: (30000 - 12570 personal allowance) x 20% basic rate = 3486.
    expect(calculateUkTax({ grossSalary: 30000, taxYear: "2025/26" }).incomeTaxGbp).toBe(3486);
  });

  it("@flump/format formats pounds the en-GB way", () => {
    expect(formatCurrency(1234)).toBe("£1,234");
  });

  it("@flump/api-contract validates with its Zod schemas", () => {
    expect(ClientVersion.safeParse("1.2.3").success).toBe(true);
    expect(ClientVersion.safeParse("one").success).toBe(false);
  });

  it("@flump/api-client maps a status to an error kind", () => {
    expect(kindFromStatus(401)).toBe("unauthorised");
  });

  it("@flump/tokens/native has the same colour keys in light and dark", () => {
    expect(Object.keys(dark.colors).sort()).toEqual(Object.keys(light.colors).sort());
    expect(Object.keys(light.colors)).toContain("surface.canvas");
  });
});

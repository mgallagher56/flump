import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { withRootLoader } from "~/test/rootLoaderRouter";
import { useFormatCurrency } from "./useFormatCurrency";
import { DEFAULT_PROFILE } from "./useUserProfile";

describe("useFormatCurrency", () => {
  it("formats whole pounds and pence in en-GB", () => {
    const { result } = renderHook(() => useFormatCurrency());
    expect(result.current.currency).toBe("GBP");
    expect(result.current.symbol).toBe("£");
    expect(result.current.formatCurrency(1234)).toBe("£1,234");
    expect(result.current.formatCurrencyDecimal(1234.56)).toBe("£1,234.56");
  });

  it("ignores a stored non-GBP profile currency", () => {
    // The saved profile comes from the root loader's data (audit slice 8).
    const { result } = renderHook(() => useFormatCurrency(), {
      wrapper: withRootLoader({ userProfile: { ...DEFAULT_PROFILE, currency: "USD" } }),
    });
    expect(result.current.currency).toBe("GBP");
    expect(result.current.formatCurrency(1234)).toBe("£1,234");
  });
});

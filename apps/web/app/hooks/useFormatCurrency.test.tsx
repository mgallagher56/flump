import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getCurrencySymbol, useFormatCurrency } from "./useFormatCurrency";
import { DEFAULT_PROFILE, useUserProfile } from "./useUserProfile";

describe("useFormatCurrency & getCurrencySymbol", () => {
  it("returns expected currency symbols for all supported currencies", () => {
    expect(getCurrencySymbol("USD")).toBe("$");
    expect(getCurrencySymbol("CAD")).toBe("$");
    expect(getCurrencySymbol("AUD")).toBe("$");
    expect(getCurrencySymbol("NZD")).toBe("$");
    expect(getCurrencySymbol("SGD")).toBe("$");
    expect(getCurrencySymbol("EUR")).toBe("€");
    expect(getCurrencySymbol("JPY")).toBe("¥");
    expect(getCurrencySymbol("INR")).toBe("₹");
    expect(getCurrencySymbol("ZAR")).toBe("R");
    expect(getCurrencySymbol("CHF")).toBe("CHF");
    expect(getCurrencySymbol("GBP")).toBe("£");
  });

  it("formats currency and decimals across all supported locales", () => {
    const { result: profileHook } = renderHook(() => useUserProfile());
    const currencies = [
      "GBP",
      "USD",
      "EUR",
      "AUD",
      "CAD",
      "NZD",
      "JPY",
      "INR",
      "ZAR",
      "SGD",
      "CHF",
    ];

    for (const curr of currencies) {
      act(() => {
        profileHook.current.setProfile({ ...DEFAULT_PROFILE, currency: curr });
      });
      const { result } = renderHook(() => useFormatCurrency());
      expect(result.current.currency).toBe(curr);
      expect(result.current.symbol).toBe(getCurrencySymbol(curr));
      expect(result.current.formatCurrency(1234)).toContain("1");
      expect(result.current.formatCurrencyDecimal(1234.56)).toContain("1");
    }

    act(() => {
      profileHook.current.setProfile(DEFAULT_PROFILE);
    });
  });
});

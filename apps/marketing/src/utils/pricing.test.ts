import { BUSINESS_DETAILS, formatPrice } from "@flump/business-details";
import { describe, expect, it } from "vitest";
import { PRICE_NOT_SET, PRICING, pricingFrom } from "./pricing";

describe("PRICING (E16 D10 b)", () => {
  it("is not-set while the price is a placeholder", () => {
    expect(PRICING.status).toBe(BUSINESS_DETAILS.price.isPlaceholder ? "not-set" : "set");
  });

  it("shows only 'Price not set' for a placeholder price: no example figure or label", () => {
    const placeholder = { ...BUSINESS_DETAILS.price, isPlaceholder: true };
    const pricing = pricingFrom(placeholder);
    expect(pricing).toEqual({ status: "not-set", display: PRICE_NOT_SET });
    expect(pricing.display).not.toContain(formatPrice(placeholder.value.monthly));
    expect(pricing.display).not.toContain(formatPrice(placeholder.value.annual));
    expect(pricing.display).not.toMatch(/£|Example figure/);
    expect(Object.keys(pricing).sort()).toEqual(["display", "status"]);
  });

  it("shows the real monthly price once one is set, with no annual billing option", () => {
    const real = { isPlaceholder: false, value: { ...BUSINESS_DETAILS.price.value, monthly: 3 } };
    expect(pricingFrom(real)).toEqual({ status: "set", display: `${formatPrice(3)} a month` });
    expect(pricingFrom(real).display).not.toMatch(/year|annual/i);
  });

  it("never exposes the placeholder price figures to the page today", () => {
    if (!BUSINESS_DETAILS.price.isPlaceholder) return;
    expect(PRICING.display).toBe(PRICE_NOT_SET);
    expect(JSON.stringify(PRICING)).not.toContain(String(BUSINESS_DETAILS.price.value.monthly));
  });
});

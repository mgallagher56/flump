import { BUSINESS_DETAILS } from "@flump/business-details";
import { describe, expect, it } from "vitest";
import { PRICING } from "./pricing";

describe("PRICING", () => {
  it("reads the price from the business details", () => {
    expect(PRICING.monthly).toBe(BUSINESS_DETAILS.price.value.monthly);
    expect(PRICING.annual).toBe(BUSINESS_DETAILS.price.value.annual);
    expect(PRICING.label).toBe(BUSINESS_DETAILS.price.value.label);
  });

  it("is not-set while the price is a placeholder", () => {
    expect(PRICING.status).toBe(BUSINESS_DETAILS.price.isPlaceholder ? "not-set" : "set");
  });
});

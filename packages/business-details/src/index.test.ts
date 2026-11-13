import { describe, expect, it } from "vitest";
import {
  assertLaunchReady,
  BUSINESS_DETAILS,
  type BusinessDetails,
  companyLine,
  formatPrice,
  isPublicLaunch,
  placeholderFields,
} from "./index";

const realDetails = (): BusinessDetails => {
  const clone = structuredClone(BUSINESS_DETAILS);
  for (const key of Object.keys(clone) as (keyof BusinessDetails)[])
    clone[key].isPlaceholder = false;
  return clone;
};

describe("BUSINESS_DETAILS", () => {
  it("holds the agreed placeholder values", () => {
    expect(BUSINESS_DETAILS.legalName.value).toBe("Flump Finance Ltd");
    expect(BUSINESS_DETAILS.companyNumber.value).toBe("00000000");
    expect(BUSINESS_DETAILS.registeredOffice.value).toBe(
      "Registered office address to be confirmed",
    );
    expect(BUSINESS_DETAILS.price.value).toEqual({
      monthly: 4.99,
      annual: 49,
      label: "Introductory price, subject to change",
    });
  });

  it("keeps emails on the RFC 2606 .invalid domain while they are placeholders", () => {
    expect(BUSINESS_DETAILS.supportEmail.value.endsWith(".invalid")).toBe(true);
    expect(BUSINESS_DETAILS.securityContact.value.endsWith(".invalid")).toBe(true);
  });
});

describe("formatPrice and companyLine", () => {
  it("formats en-GB", () => {
    expect(formatPrice(4.99)).toBe("£4.99");
    expect(formatPrice(49)).toBe("£49");
  });
  it("builds the footer line", () => {
    expect(companyLine(2026)).toBe(
      "© 2026 Flump Finance Ltd. Company number 00000000. Registered office address to be confirmed.",
    );
  });
});

describe("placeholderFields", () => {
  it("lists every placeholder with the strings that would leak into a build", () => {
    const keys = placeholderFields().map((f) => f.key);
    expect(keys).toContain("legalName");
    expect(keys).toContain("price");
    expect(keys).not.toContain("tradingName");
    expect(placeholderFields().find((f) => f.key === "price")?.strings).toEqual([
      "Introductory price, subject to change",
    ]);
  });
  it("is empty once every field is real", () => {
    expect(placeholderFields(realDetails())).toEqual([]);
  });
});

describe("launch guard", () => {
  it("detects a public launch only on exact true", () => {
    expect(isPublicLaunch({ ALLOW_INDEXING: "true" })).toBe(true);
    expect(isPublicLaunch({ FLUMP_LAUNCH: "true" })).toBe(true);
    expect(isPublicLaunch({ ALLOW_INDEXING: "1", FLUMP_LAUNCH: "TRUE" })).toBe(false);
    expect(isPublicLaunch({})).toBe(false);
  });
  it("fails a launch while placeholders remain", () => {
    expect(() => assertLaunchReady({ ALLOW_INDEXING: "true" })).toThrow(/legalName/);
    expect(() => assertLaunchReady({ FLUMP_LAUNCH: "true" })).toThrow(/Launch blocked/);
  });
  it("allows non-launch environments", () => {
    expect(() => assertLaunchReady({})).not.toThrow();
  });
  it("allows a launch once every placeholder is replaced", () => {
    expect(() => assertLaunchReady({ ALLOW_INDEXING: "true" }, realDetails())).not.toThrow();
  });
});

import { describe, expect, it } from "vitest";
import {
  assertLaunchReady,
  BUSINESS_DETAILS,
  type BusinessDetails,
  companyLine,
  formatPrice,
  isPublicLaunch,
  placeholderFields,
  shortCompanyLine,
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
      label: "Example figure only. No price is set.",
    });
  });

  it("keeps emails on the RFC 2606 .invalid domain while they are placeholders", () => {
    expect(BUSINESS_DETAILS.supportEmail.value.endsWith(".invalid")).toBe(true);
    expect(BUSINESS_DETAILS.securityContact.value.endsWith(".invalid")).toBe(true);
  });
});

describe("BUSINESS_DETAILS shape for the launch guard", () => {
  const stringKeys = (Object.keys(BUSINESS_DETAILS) as (keyof BusinessDetails)[]).filter(
    (key) => key !== "price",
  );

  it("gives every text field a non-empty value and a placeholder flag", () => {
    // Holds before and after launch: the guard reads `isPlaceholder`, and an empty or missing
    // value would print as blank text in every footer.
    for (const key of stringKeys) {
      const field = BUSINESS_DETAILS[key];
      expect(typeof field.value, key).toBe("string");
      expect((field.value as string).length, key).toBeGreaterThan(0);
      expect(typeof field.isPlaceholder, key).toBe("boolean");
    }
    expect(typeof BUSINESS_DETAILS.price.isPlaceholder).toBe("boolean");
  });

  it("flags any value that is still a stand-in as a placeholder", () => {
    // The documented stand-ins: an all-zero company number, an RFC 2606 `.invalid` mailbox, and
    // "to be confirmed" wording. A field holding one must be flagged, or the launch guard would
    // let it through. Once the owner replaces a value, its check simply no longer applies.
    const isStandIn = (value: string) =>
      /^0+$/.test(value) || value.endsWith(".invalid") || /to be confirmed/i.test(value);
    for (const key of stringKeys) {
      const field = BUSINESS_DETAILS[key];
      if (isStandIn(field.value as string)) expect(field.isPlaceholder, key).toBe(true);
    }
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
      "Example figure only. No price is set.",
    ]);
  });
  it("reports a text field's own value as the text that would leak", () => {
    // Only the company number is still a stand-in here, so it is the one field listed, and the
    // leaking text is its own value, not the price label.
    const details = realDetails();
    details.companyNumber = { value: "12345678", isPlaceholder: true };
    expect(placeholderFields(details)).toEqual([{ key: "companyNumber", strings: ["12345678"] }]);
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

describe("shortCompanyLine", () => {
  it("is the copyright year and the legal name only", () => {
    // "© " + 2026 + " " + the legal name, nothing else.
    expect(shortCompanyLine(2026)).toBe(`© 2026 ${BUSINESS_DETAILS.legalName.value}`);
    expect(shortCompanyLine(2026)).not.toContain("Company number");
  });
});

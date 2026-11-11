import { describe, expect, it } from "vitest";
import { SECURITY_CONTACT_EMAIL, securityMailto } from "./placeholders";

describe("placeholders", () => {
  it("uses an address that cannot resolve", () => {
    expect(SECURITY_CONTACT_EMAIL.endsWith(".invalid")).toBe(true);
  });
  it("encodes the subject", () => {
    expect(securityMailto()).toBe("mailto:security@example.invalid?subject=Security%20enquiry");
  });
});

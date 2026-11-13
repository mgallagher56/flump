import { describe, expect, it } from "vitest";
import { mailto, SIGNUP_MODE, signupCta } from "./site";

describe("site settings", () => {
  it("defaults to invite-only sign-up", () => {
    expect(SIGNUP_MODE).toBe("invite-only");
  });

  it("builds a mailto link with an encoded subject and none when omitted", () => {
    expect(mailto("a@example.invalid", "Flump beta invite request")).toBe(
      "mailto:a@example.invalid?subject=Flump%20beta%20invite%20request",
    );
    expect(mailto("a@example.invalid")).toBe("mailto:a@example.invalid");
  });

  it("points the sign-up CTA at the invite request while invite-only", () => {
    expect(signupCta("invite-only", "https://app.example.test")).toEqual({
      href: "/contact#beta",
      label: "Request an invite",
      shortLabel: "Request invite",
      external: false,
    });
  });

  it("points the sign-up CTA at the web app when open", () => {
    expect(signupCta("open", "https://app.example.test")).toEqual({
      href: "https://app.example.test/signup",
      label: "Get started",
      shortLabel: "Sign up",
      external: true,
    });
  });
});

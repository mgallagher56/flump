import { describe, expect, it } from "vitest";
import { ctaLabel } from "./ctaLabel";

describe("ctaLabel", () => {
  it("strips a trailing arrow so the icon is the only arrow", () => {
    expect(ctaLabel("Request an invite →")).toBe("Request an invite");
    expect(ctaLabel("Continue ->")).toBe("Continue");
    expect(ctaLabel("Next »")).toBe("Next");
  });

  it("leaves a plain label alone", () => {
    expect(ctaLabel("Continue to sign up")).toBe("Continue to sign up");
  });
});

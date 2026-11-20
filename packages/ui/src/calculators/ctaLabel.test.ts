// @vitest-environment node
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

  it("strips an arrow with no space before it, and spaces after it", () => {
    expect(ctaLabel("Continue->")).toBe("Continue");
    expect(ctaLabel("Next → ")).toBe("Next");
  });

  it("strips several trailing arrows in a row", () => {
    expect(ctaLabel("Next » »")).toBe("Next");
    expect(ctaLabel("Next →→")).toBe("Next");
  });

  it("keeps an arrow in the middle of a label", () => {
    expect(ctaLabel("Savings > ISA guide")).toBe("Savings > ISA guide");
  });

  it("trims trailing spaces from a label with no arrow", () => {
    expect(ctaLabel("Continue  ")).toBe("Continue");
  });
});

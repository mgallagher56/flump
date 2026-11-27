import { formatSignedChange, pounds } from "./accounts";

describe("pounds", () => {
  it("rounds half away from zero, as web's Intl does", () => {
    expect(pounds(2.5)).toBe("£3");
    expect(pounds(-2.5)).toBe("-£3");
  });

  it("rounds to whole pounds either way and never shows a signed zero", () => {
    expect(pounds(2.4)).toBe("£2");
    expect(pounds(-2.6)).toBe("-£3");
    expect(pounds(-0.4)).toBe("£0");
  });
});

describe("formatSignedChange", () => {
  it("signs a change after rounding it the same way", () => {
    expect(formatSignedChange(-2.5)).toBe("−£3");
    expect(formatSignedChange(2.5)).toBe("+£3");
    expect(formatSignedChange(0.4)).toBe("£0");
  });
});

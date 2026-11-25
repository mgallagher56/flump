// @vitest-environment node
import { describe, expect, it } from "vitest";
import { isUpcoming, longDate, safeNext, type TermsStatus, termsAsk, termsHeading } from "./terms";

const page = (version: string, changed = false) => ({
  version,
  updated: "25 November 2026",
  effectiveFrom: "2026-11-25",
  path: "/terms",
  changed,
});
const status = (over: Partial<TermsStatus>): TermsStatus => ({
  required: true,
  agreed: false,
  firstTime: false,
  terms: page("0.1"),
  privacyNotice: page("0.2"),
  ...over,
});

describe("terms acceptance helpers", () => {
  it("asks for agreement on a first visit or a terms change, and only reading for a privacy change", () => {
    expect(termsAsk(status({ firstTime: true }))).toBe("agree");
    expect(termsAsk(status({ terms: page("0.2", true) }))).toBe("agree");
    expect(termsAsk(status({ privacyNotice: page("0.3", true) }))).toBe("read-privacy");
  });

  it("picks the heading for each case", () => {
    expect(termsHeading(status({ firstTime: true }))).toBe("Please read and agree to our terms");
    expect(termsHeading(status({ terms: page("0.2", true) }))).toBe("Our terms have changed");
    expect(termsHeading(status({ privacyNotice: page("0.3", true) }))).toBe(
      "Our privacy notice has changed",
    );
    expect(
      termsHeading(status({ terms: page("0.2", true), privacyNotice: page("0.3", true) })),
    ).toBe("Our terms and privacy notice have changed");
  });

  it("is upcoming only when not required and not yet agreed", () => {
    expect(isUpcoming(status({ required: false, agreed: false }))).toBe(true);
    expect(isUpcoming(status({ required: true, agreed: false }))).toBe(false);
    expect(isUpcoming(status({ required: false, agreed: true }))).toBe(false);
  });

  it("writes a UK date in full", () => {
    expect(longDate("2026-12-09")).toBe("9 December 2026");
    expect(longDate("2027-01-01")).toBe("1 January 2027");
  });

  it("keeps the next page on this site, and never back to the acceptance page", () => {
    expect(safeNext("/app/budget?tab=x")).toBe("/app/budget?tab=x");
    expect(safeNext("/")).toBe("/");
    for (const bad of [
      "https://evil.example/",
      "//evil.example",
      "/\\evil.example",
      "javascript:alert(1)",
      "",
      null,
      "/terms-acceptance",
      "/terms-acceptance?next=/app",
      "/app\n",
    ]) {
      expect(safeNext(bad), String(bad)).toBe("/app");
    }
  });
});

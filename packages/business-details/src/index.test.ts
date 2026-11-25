import { describe, expect, it } from "vitest";
import {
  assertLaunchReady,
  BUSINESS_DETAILS,
  type BusinessDetails,
  companyLine,
  formatPrice,
  hasUpcomingAcceptanceChange,
  isPublicLaunch,
  LEGAL_PAGES,
  LEGAL_REVIEW_NOTE,
  legalPage,
  legalPageFromHistory,
  placeholderFields,
  shortCompanyLine,
  ukDate,
  versionInEffect,
  versionsAtLeastInEffect,
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

describe("legal pages", () => {
  it("lists the four pages once each, with a path on the marketing site", () => {
    expect(LEGAL_PAGES.map((page) => [page.key, page.path])).toEqual([
      ["privacy", "/privacy"],
      ["terms", "/terms"],
      ["cookies", "/cookies"],
      ["accessibility", "/accessibility"],
    ]);
  });

  it("gives every page a version and a full en-GB date", () => {
    for (const page of LEGAL_PAGES) {
      expect(page.version, page.key).toMatch(/^\d+\.\d+$/);
      expect(page.updated, page.key).toMatch(/^\d{1,2} [A-Z][a-z]+ \d{4}$/);
    }
  });

  it("keeps each page's history newest first, with distinct versions and UK dates", () => {
    for (const page of LEGAL_PAGES) {
      expect(page.history[0]?.version, page.key).toBe(page.version);
      expect(page.history[0]?.updated, page.key).toBe(page.updated);
      const versions = page.history.map((entry) => entry.version);
      expect(new Set(versions).size, page.key).toBe(versions.length);
      const dates = page.history.map((entry) => entry.effectiveFrom);
      for (const date of dates) expect(date, page.key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // Newest first: each version applies no earlier than the one after it.
      expect([...dates].sort().reverse(), page.key).toEqual(dates);
    }
  });

  it("finds a page by key and refuses an unknown one", () => {
    expect(legalPage("terms").title).toBe("Terms of use");
    expect(() => legalPage("nope" as never)).toThrow("Unknown legal page: nope");
  });

  it("never credits a solicitor or the owner with the review", () => {
    expect(LEGAL_REVIEW_NOTE).toBe(
      "Written and checked with AI tools for Flump's test phase. A solicitor has not reviewed this page.",
    );
  });
});

describe("versions in effect (terms acceptance)", () => {
  it("reads the UK date, not the UTC one", () => {
    // 23:30 UTC on 31 March 2027 is 00:30 on 1 April in London (BST, UTC+1).
    expect(ukDate(new Date("2027-03-31T23:30:00Z"))).toBe("2027-04-01");
    // 23:30 UTC on 1 December 2026 is still 1 December in London (GMT).
    expect(ukDate(new Date("2026-12-01T23:30:00Z"))).toBe("2026-12-01");
  });

  it("gives the current terms and privacy versions on and after their dates", () => {
    const now = new Date("2026-11-25T12:00:00Z");
    expect(versionInEffect("terms", now).version).toBe("0.1");
    expect(versionInEffect("privacy", now).version).toBe("0.2");
    expect(versionsAtLeastInEffect("privacy", now)).toEqual(["0.2"]);
  });

  it("has nothing coming once every newest version is in effect", () => {
    // The newest terms and privacy versions both apply from 25 November 2026.
    expect(hasUpcomingAcceptanceChange(new Date("2026-11-25T00:30:00Z"))).toBe(false);
    // The day before, the newest versions were still to come.
    expect(hasUpcomingAcceptanceChange(new Date("2026-11-24T12:00:00Z"))).toBe(true);
  });

  it("refuses a date before any version applied", () => {
    expect(() => versionInEffect("terms", new Date("2026-11-24T12:00:00Z"))).toThrow(
      "No version of terms is in effect on 2026-11-24",
    );
  });
});

describe("versions with a change coming (a test history, not LEGAL_PAGES)", () => {
  // Terms 0.2 published, applying from 9 December 2026; 0.1 in force before that.
  const pages = [
    legalPageFromHistory({
      key: "terms",
      path: "/terms",
      label: "Terms",
      title: "Terms of use",
      history: [
        { version: "0.2", updated: "25 November 2026", effectiveFrom: "2026-12-09" },
        { version: "0.1", updated: "25 November 2026", effectiveFrom: "2026-11-25" },
      ],
    }),
    legalPageFromHistory({
      key: "privacy",
      path: "/privacy",
      label: "Privacy",
      title: "Privacy notice",
      history: [{ version: "0.2", updated: "25 November 2026", effectiveFrom: "2026-11-25" }],
    }),
  ];

  it("keeps the old version in force until the new one's date, in UK time", () => {
    expect(versionInEffect("terms", new Date("2026-12-08T23:59:00Z"), pages).version).toBe("0.1");
    expect(versionInEffect("terms", new Date("2026-12-09T00:00:00Z"), pages).version).toBe("0.2");
  });

  it("counts an early agreement to the newer version while the older one is in force", () => {
    expect(versionsAtLeastInEffect("terms", new Date("2026-12-01T12:00:00Z"), pages)).toEqual([
      "0.2",
      "0.1",
    ]);
    expect(versionsAtLeastInEffect("terms", new Date("2026-12-09T12:00:00Z"), pages)).toEqual([
      "0.2",
    ]);
  });

  it("says a change is coming only before its date", () => {
    expect(hasUpcomingAcceptanceChange(new Date("2026-12-08T12:00:00Z"), pages)).toBe(true);
    expect(hasUpcomingAcceptanceChange(new Date("2026-12-09T12:00:00Z"), pages)).toBe(false);
  });
});

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  BrowserCookieSeedAdapter,
  BrowserStorageDriver,
  clearOnboardingSeed,
  hasSessionPresenceCookie,
  InMemoryProfileAdapter,
  InMemoryStorageDriver,
  isFlumpHost,
  ONBOARDING_SEED_STORAGE_KEY,
  parseCookieValue,
  persistOnboardingSeed,
  readAndClearOnboardingSeed,
  readOnboardingSeed,
  readOnboardingSeedFromHeader,
  SESSION_PRESENCE_COOKIE,
  setSessionPresenceCookie,
  setStorageDriver,
} from "./persistence.js";
import type { FinancialBaseline, OnboardingSeedPayload } from "./types.js";

describe("Profile Persistence", () => {
  it("operates in pure in-memory mode via InMemoryStorageDriver without browser globals", () => {
    const memoryDriver = new InMemoryStorageDriver();
    setStorageDriver(memoryDriver);

    try {
      const testSeed = { salary: 65000, age: 30 };
      persistOnboardingSeed(testSeed);

      const read = readOnboardingSeed();
      expect(read).toMatchObject(testSeed);

      clearOnboardingSeed();
      expect(readOnboardingSeed()).toBeNull();
    } finally {
      setStorageDriver(null);
    }
  });

  it("parseCookieValue extracts named cookie", () => {
    const header = "foo=bar; flump_onboarding_seed=hello123; other=xyz";
    expect(parseCookieValue(header, "flump_onboarding_seed")).toBe("hello123");
    expect(parseCookieValue(header, "not_found")).toBeNull();
    expect(parseCookieValue(null, "foo")).toBeNull();
    expect(parseCookieValue(undefined, "foo")).toBeNull();
  });

  describe("window / document storage and cookies", () => {
    let mockCookies = "";
    const mockStorage: Record<string, string> = {};

    beforeEach(() => {
      setStorageDriver(new BrowserStorageDriver());
      mockCookies = "";
      for (const key of Object.keys(mockStorage)) {
        delete mockStorage[key];
      }
      (globalThis as any).window = {
        location: { hostname: "app.flump.co.uk" },
        localStorage: {
          getItem: (key: string) => mockStorage[key] ?? null,
          setItem: (key: string, val: string) => {
            mockStorage[key] = val;
          },
          removeItem: (key: string) => {
            delete mockStorage[key];
          },
        },
      };
      (globalThis as any).document = {
        get cookie() {
          return mockCookies;
        },
        set cookie(val: string) {
          const [pair] = val.split(";");
          const eqIdx = pair.indexOf("=");
          const k = eqIdx > -1 ? pair.slice(0, eqIdx) : pair;
          const v = eqIdx > -1 ? pair.slice(eqIdx + 1) : "";

          if (val.includes("max-age=0") || val.includes("Max-Age=0")) {
            mockCookies = mockCookies
              .split("; ")
              .filter((c) => Boolean(c) && !c.startsWith(`${k}=`))
              .join("; ");
          } else {
            const existing = mockCookies
              ? mockCookies.split("; ").filter((c) => Boolean(c) && !c.startsWith(`${k}=`))
              : [];
            existing.push(`${k}=${v}`);
            mockCookies = existing.join("; ");
          }
        },
      };
    });

    afterEach(() => {
      setStorageDriver(null);
      delete (globalThis as any).window;
      delete (globalThis as any).document;
    });

    const samplePayload: OnboardingSeedPayload = {
      salary: 50000,
      stage: "STAGE_2_BUFFER_BUILD",
    };

    it("persists and reads onboarding seed from cookies and localStorage", () => {
      persistOnboardingSeed(samplePayload);
      expect(mockCookies).toContain(ONBOARDING_SEED_STORAGE_KEY);
      expect(mockStorage[ONBOARDING_SEED_STORAGE_KEY]).toBeDefined();

      const read = readOnboardingSeed();
      expect(read).toEqual(samplePayload);
    });

    it("falls back to localStorage if cookie is empty", () => {
      persistOnboardingSeed(samplePayload);
      mockCookies = ""; // Clear cookie only
      const read = readOnboardingSeed();
      expect(read).toEqual(samplePayload);
    });

    it("clears and reads and clears onboarding seed", () => {
      persistOnboardingSeed(samplePayload);
      const readAndCleared = readAndClearOnboardingSeed();
      expect(readAndCleared).toEqual(samplePayload);
      expect(readOnboardingSeed()).toBeNull();
    });

    it("handles session presence cookie setting and reading", () => {
      expect(hasSessionPresenceCookie()).toBe(false);
      setSessionPresenceCookie(true);
      expect(hasSessionPresenceCookie()).toBe(true);
      expect(hasSessionPresenceCookie("other=1; flump_has_session=1")).toBe(true);
      expect(hasSessionPresenceCookie("other=1; flump_has_session=0")).toBe(false);

      setSessionPresenceCookie(false);
      expect(hasSessionPresenceCookie()).toBe(false);
    });

    it("reads onboarding seed from request header", () => {
      persistOnboardingSeed(samplePayload);
      const rawCookie = mockCookies;
      expect(readOnboardingSeedFromHeader(rawCookie)).toEqual(samplePayload);
      expect(readOnboardingSeedFromHeader(null)).toBeNull();
      expect(readOnboardingSeedFromHeader("")).toBeNull();
      expect(readOnboardingSeedFromHeader("foo=bar")).toBeNull();
    });

    it("BrowserCookieSeedAdapter delegates seed operations", () => {
      const adapter = new BrowserCookieSeedAdapter();
      adapter.saveSeed(samplePayload);
      expect(adapter.getSeed()).toEqual(samplePayload);
      adapter.clearSeed();
      expect(adapter.getSeed()).toBeNull();
    });
  });

  it("BrowserCookieSeedAdapter implements ProfilePersistenceAdapter", () => {
    const adapter = new BrowserCookieSeedAdapter();
    const testBaseline: FinancialBaseline = {
      userId: "u123",
      taxYear: "2025/26",
      ukRegion: "ENGLAND_NI_WALES",
      employmentStatus: "PAYE",
      annualGrossSalary: 60000,
      annualBonusOrSideIncome: 0,
      pensionContributionPct: 5,
      employerPensionMatchPct: 3,
      isSalarySacrifice: true,
      studentLoanPlan: "NONE",
      propertyOwnershipSharePct: 100,
      financialStage: "STAGE_2_BUFFER_BUILD",
      enabledModules: ["accounts", "budget"],
    };

    adapter.saveBaseline(testBaseline);
    expect(adapter.getBaseline()).toEqual(testBaseline);
  });

  it("InMemoryProfileAdapter round-trips baseline and seed", () => {
    const adapter = new InMemoryProfileAdapter();
    const seed: OnboardingSeedPayload = {
      salary: 50000,
      stage: "STAGE_2_BUFFER_BUILD",
    };

    adapter.saveSeed(seed);
    expect(adapter.getSeed()).toEqual(seed);
    adapter.clearSeed();
    expect(adapter.getSeed()).toBeNull();
  });
});

describe("isFlumpHost", () => {
  it.each([
    ["flump.co.uk", true],
    ["app.flump.co.uk", true],
    ["FLUMP.CO.UK", true],
    ["App.Flump.Co.Uk", true],
    ["flump.co.uk.", true],
    ["app.flump.co.uk.", true],
    ["flump.co.uk:3000", true],
    ["app.flump.co.uk:443", true],
    ["flump.co.uk..", false],
    ["evilflump.co.uk", false],
    ["flump.co.uk.evil.example", false],
    ["127.0.0.1", false],
    ["127.0.0.1:3000", false],
    ["[::1]", false],
    ["[::1]:3000", false],
    ["::1", false],
    ["", false],
  ])("isFlumpHost(%j) is %s", (host, expected) => {
    expect(isFlumpHost(host)).toBe(expected);
  });
});
